import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    skills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          category: {
            type: "STRING",
            enum: [
              "Programming Languages",
              "Frameworks & Libraries",
              "Cloud & DevOps",
              "Databases",
              "Tools & Platforms",
              "Data & Analytics",
              "Soft Skills",
              "Domain Knowledge",
              "Other Technical",
            ],
          },
          proficiencyHint: {
            type: "STRING",
            enum: ["Beginner", "Intermediate", "Advanced"],
          },
        },
        required: ["name", "category", "proficiencyHint"],
      },
    },
    experienceLevel: {
      type: "STRING",
      enum: ["Entry Level", "Mid Level", "Senior Level", "Staff/Principal"],
    },
    jobTitles: { type: "ARRAY", items: { type: "STRING" } },
    industries: { type: "ARRAY", items: { type: "STRING" } },
    summary: { type: "STRING" },
  },
  required: ["skills", "experienceLevel", "jobTitles", "industries", "summary"],
};

const SYSTEM_PROMPT = `You are a resume parsing engine. Extract structured career information from the resume text. Return ONLY valid JSON matching the provided schema. Rules:
- skills: extract every concrete technical skill, tool, framework, language, platform, and notable soft skill actually mentioned. Deduplicate. Categorize accurately.
- experienceLevel: infer from years of experience and job titles. Entry (<2y), Mid (2-5y), Senior (5-8y), Staff/Principal (8y+ or principal/staff/architect titles).
- jobTitles: up to 10 distinct role titles held by the candidate.
- industries: up to 5 industries the candidate has worked in. Default to ["Technology"] if unclear.
- summary: 2-3 sentence third-person overview highlighting seniority, top skills, and industry fit.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_RESUME_CHARS = 50000;
    const trimmed = resumeText.length > MAX_RESUME_CHARS ? resumeText.slice(0, MAX_RESUME_CHARS) : resumeText;

    console.log('Parsing resume via Gemini, text length:', trimmed.length);

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `Parse this resume:\n\n${trimmed}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error(`Gemini request failed [${geminiRes.status}]:`, errBody);
      return new Response(
        JSON.stringify({ error: 'Gemini API request failed', status: geminiRes.status, details: errBody }),
        { status: geminiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error('Empty Gemini response:', JSON.stringify(geminiJson));
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedResume;
    try {
      parsedResume = JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to JSON.parse Gemini output:', rawText);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON returned by Gemini' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Defensive defaults so the UI schema never breaks
    parsedResume.skills = Array.isArray(parsedResume.skills) ? parsedResume.skills : [];
    parsedResume.jobTitles = Array.isArray(parsedResume.jobTitles) ? parsedResume.jobTitles : [];
    parsedResume.industries = Array.isArray(parsedResume.industries) && parsedResume.industries.length > 0
      ? parsedResume.industries
      : ["Technology"];
    parsedResume.experienceLevel = parsedResume.experienceLevel || "Entry Level";
    parsedResume.summary = parsedResume.summary || "";

    if (parsedResume.skills.length === 0) {
      parsedResume.skills.push(
        { name: "Communication", category: "Soft Skills", proficiencyHint: "Intermediate" },
        { name: "Problem Solving", category: "Soft Skills", proficiencyHint: "Intermediate" },
      );
    }

    console.log(`Extracted ${parsedResume.skills.length} skills, level: ${parsedResume.experienceLevel}`);

    return new Response(
      JSON.stringify({ success: true, data: parsedResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-resume:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

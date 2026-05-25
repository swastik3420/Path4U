import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_RESUME_CHARS = 50000;
    if (resumeText.length > MAX_RESUME_CHARS) {
      return new Response(
        JSON.stringify({ error: `Resume text too long (max ${MAX_RESUME_CHARS} characters)` }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing resume, text length:', resumeText.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert resume analyzer and career coach. Your job is to thoroughly extract ALL skills from a resume, even when the resume is poorly formatted, uses abbreviations, or has unconventional structure.

## Instructions

Analyze the resume text carefully and extract:

1. **Skills** — Be comprehensive. Look for:
   - Explicitly listed skills (skills sections, bullet points)
   - Skills implied by job responsibilities (e.g., "managed a team of 5" → Leadership, Team Management)
   - Tools and technologies mentioned in project descriptions
   - Certifications and their associated skills
   - Soft skills from descriptions of achievements
   - Domain knowledge from industry experience
   
   Categorize each skill into one of these categories:
   - "Programming Languages" (e.g., JavaScript, Python, Java, C++, SQL)
   - "Frameworks & Libraries" (e.g., React, Angular, Django, Spring Boot, TensorFlow)
   - "Cloud & DevOps" (e.g., AWS, Docker, Kubernetes, CI/CD, Terraform)
   - "Databases" (e.g., PostgreSQL, MongoDB, Redis, MySQL)
   - "Tools & Platforms" (e.g., Git, Jira, Figma, VS Code, Postman)
   - "Data & Analytics" (e.g., Machine Learning, Data Analysis, Tableau, Excel)
   - "Soft Skills" (e.g., Leadership, Communication, Problem Solving)
   - "Domain Knowledge" (e.g., Finance, Healthcare, E-commerce, Marketing)
   - "Other Technical" (anything else technical)

   For proficiencyHint, infer from context:
   - "Advanced" — years of experience, lead roles, complex projects
   - "Intermediate" — mentioned in multiple contexts, practical experience
   - "Beginner" — mentioned once, certifications, coursework

2. **Experience Level** — Based on total years and role seniority:
   - "Entry Level" (0-2 years or student/intern/junior roles)
   - "Mid Level" (2-5 years or standard IC roles)
   - "Senior Level" (5-8 years or senior/lead roles)
   - "Staff/Principal" (8+ years or staff/principal/architect roles)

3. **Job Titles** — All roles mentioned
4. **Industries** — All industries/domains mentioned
5. **Summary** — 2-3 sentence profile summary

## Output Format

Return ONLY valid JSON (no markdown):
{
  "skills": [
    { "name": "React", "category": "Frameworks & Libraries", "proficiencyHint": "Advanced" }
  ],
  "experienceLevel": "Mid Level",
  "jobTitles": ["Software Engineer"],
  "industries": ["Technology"],
  "summary": "..."
}

IMPORTANT: Extract at least 5-10 skills minimum. If the text is messy or short, still do your best to identify skills from ANY clues in the text. Never return an empty skills array.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the resume text to analyze:\n\n---\n${resumeText}\n---\n\nExtract all skills and information from this resume.` }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze resume' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedResume;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedResume = JSON.parse(jsonStr.trim());
      
      // Ensure skills is always an array
      if (!Array.isArray(parsedResume.skills)) {
        parsedResume.skills = [];
      }
      
      console.log('Successfully parsed resume:', parsedResume.skills.length, 'skills,', parsedResume.experienceLevel);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse resume data. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: parsedResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-resume:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

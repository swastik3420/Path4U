import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    } catch (_) { /* allow anonymous */ }
  }

  try {
    const { skills, targetRole, experienceLevel } = await req.json();

    if (!Array.isArray(skills) || skills.length === 0) {
      return new Response(JSON.stringify({ error: 'skills array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof targetRole !== 'string' || !targetRole.trim()) {
      return new Response(JSON.stringify({ error: 'targetRole required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const boundedSkills = skills.slice(0, 50).map((s: any) => typeof s === 'string' ? s.slice(0, 200) : { name: String(s?.name || '').slice(0, 200), score: Number(s?.score) || 0, level: String(s?.level || '').slice(0, 50) });
    const boundedTarget = targetRole.slice(0, 150);
    const boundedExperience = typeof experienceLevel === 'string' ? experienceLevel.slice(0, 100) : 'Unknown';

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const skillList = boundedSkills.map((s: any) => `${s.name} (${s.score}%, ${s.level})`).join(', ');

    const systemInstruction = `You are a career coach performing a skill gap analysis. Given the candidate's current skills and a target job role, identify the skills they already have, the skills they are missing or weak in, and estimate the realistic time to close the gap. Be specific and actionable.`;

    const userPrompt = `Candidate current skills: ${skillList}
Candidate experience level: ${boundedExperience}
Target role: ${boundedTarget}

Return ONLY a JSON object of this shape:
{
  "readinessScore": 0-100,
  "estimatedMonths": number,
  "summary": "1-2 sentence overview",
  "matchedSkills": [{"name": "Skill", "score": 0-100}],
  "missingSkills": [{"name": "Skill", "priority": "high|medium|low", "estimatedWeeks": number, "reason": "why needed"}],
  "recommendedPath": ["Step 1", "Step 2", "Step 3", "Step 4"]
}
Limit matchedSkills to 6, missingSkills to 6, recommendedPath to 5.`;

    const buildFallback = () => {
      const matched = boundedSkills
        .filter((s: any) => (s.score || 0) >= 60)
        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
        .slice(0, 6)
        .map((s: any) => ({ name: s.name, score: s.score || 0 }));
      const weak = boundedSkills
        .filter((s: any) => (s.score || 0) < 60)
        .sort((a: any, b: any) => (a.score || 0) - (b.score || 0))
        .slice(0, 6)
        .map((s: any, i: number) => ({
          name: s.name,
          priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
          estimatedWeeks: 4 + i * 2,
          reason: `Strengthen ${s.name} to meet ${boundedTarget} expectations.`,
        }));
      const readinessScore = Math.round(
        boundedSkills.reduce((a: number, s: any) => a + (s.score || 0), 0) / Math.max(1, boundedSkills.length)
      );
      const estimatedMonths = Math.max(1, Math.round(weak.reduce((a, s) => a + s.estimatedWeeks, 0) / 4));
      return {
        readinessScore,
        estimatedMonths,
        summary: `Estimated readiness for ${boundedTarget} based on your current skills (AI temporarily unavailable).`,
        matchedSkills: matched,
        missingSkills: weak,
        recommendedPath: [
          `Audit your current ${boundedTarget} knowledge gaps`,
          `Build 1-2 portfolio projects targeting ${boundedTarget}`,
          `Focus on the high-priority skills listed above`,
          `Practice interview problems for ${boundedTarget}`,
          `Apply and iterate based on feedback`,
        ],
      };
    };

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      });
      if (response.status !== 429 && response.status !== 503) break;
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }

    if (!response || !response.ok) {
      console.error('Gemini error:', response?.status, await response?.text().catch(() => ''));
      return new Response(JSON.stringify(buildFallback()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error('Failed to parse gap analysis:', content.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Failed to parse response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

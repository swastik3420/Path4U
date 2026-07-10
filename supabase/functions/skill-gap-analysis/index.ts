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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const skillList = boundedSkills.map((s: any) => `${s.name} (${s.score}%, ${s.level})`).join(', ');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a career coach performing a skill gap analysis. Given the candidate's current skills and a target job role, identify the skills they already have, the skills they are missing or weak in, and estimate the realistic time to close the gap. Be specific and actionable.`
          },
          {
            role: 'user',
            content: `Candidate current skills: ${skillList}
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
Limit matchedSkills to 6, missingSkills to 6, recommendedPath to 5.`
          }
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Failed to analyze gap' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

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

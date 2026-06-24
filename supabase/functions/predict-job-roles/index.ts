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

    const { skills, experienceLevel, industries, jobTitles } = await req.json();

    if (!Array.isArray(skills) || skills.length === 0) {
      return new Response(JSON.stringify({ error: 'skills array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (skills.length > 50 || (Array.isArray(industries) && industries.length > 20) || (Array.isArray(jobTitles) && jobTitles.length > 20)) {
      console.warn('Oversized payload rejected');
      return new Response(JSON.stringify({ error: 'Input arrays exceed allowed limits.' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const trunc = (v: unknown, n: number) => typeof v === 'string' ? v.slice(0, n) : v;
    const boundedSkills = skills.slice(0, 50).map((s: any) => typeof s === 'string' ? s.slice(0, 200) : { ...s, name: trunc(s?.name, 200) });
    const boundedIndustries = Array.isArray(industries) ? industries.slice(0, 20).map((i: any) => trunc(i, 100)) : [];
    const boundedJobTitles = Array.isArray(jobTitles) ? jobTitles.slice(0, 20).map((i: any) => trunc(i, 150)) : [];
    const boundedExperience = typeof experienceLevel === 'string' ? experienceLevel.slice(0, 100) : experienceLevel;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const skillList = boundedSkills.map((s: any) => `${s.name} (score: ${s.score}%, level: ${s.level})`).join(', ');

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
            content: `You predict the most suitable job roles for a candidate based on their skills and assessment scores. Return exactly 7 job roles sorted by probability (highest first). Each probability should be realistic (10-95%).`
          },
          {
            role: 'user',
            content: `Candidate profile:
- Skills: ${skillList}
- Experience: ${boundedExperience}
- Industries: ${boundedIndustries.join(', ') || 'Not specified'}
- Previous titles: ${boundedJobTitles.join(', ') || 'Not specified'}

Return ONLY a JSON object like: {"roles": [{"role": "Frontend Developer", "probability": 87}, ...]}`
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
      return new Response(JSON.stringify({ error: 'Failed to predict roles' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error('Failed to parse roles:', content.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Failed to parse response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ roles: parsed.roles || parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

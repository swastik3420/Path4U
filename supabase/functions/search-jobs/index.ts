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

  try {
    const { skills, experienceLevel, jobTitles, industries } = await req.json();

    if (!Array.isArray(skills)) {
      return new Response(JSON.stringify({ error: 'skills must be an array' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (skills.length > 50 || (Array.isArray(industries) && industries.length > 20) || (Array.isArray(jobTitles) && jobTitles.length > 20)) {
      console.warn('Oversized payload rejected');
      return new Response(JSON.stringify({ error: 'Input arrays exceed allowed limits.' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const trunc = (v: unknown, n: number) => typeof v === 'string' ? v.slice(0, n) : v;
    const boundedSkills = skills.slice(0, 50).map((s: any) => typeof s === 'string' ? s.slice(0, 200) : { ...s, name: trunc(s?.name, 200), skill: trunc(s?.skill, 200) });
    const boundedIndustries = Array.isArray(industries) ? industries.slice(0, 20).map((i: any) => trunc(i, 100)) : [];
    const boundedJobTitles = Array.isArray(jobTitles) ? jobTitles.slice(0, 20).map((i: any) => trunc(i, 150)) : [];
    const boundedExperience = typeof experienceLevel === 'string' ? experienceLevel.slice(0, 100) : experienceLevel;

    // Fetch company-posted jobs from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dbJobs } = await supabase
      .from('job_listings')
      .select('*, companies(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    const userSkills = boundedSkills.map((s: any) => (s.name || s.skill || '').toLowerCase());

    const companyJobs = (dbJobs || []).map((job: any) => {
      const requiredSkills = (job.skills_required || []).map((s: string) => s.toLowerCase());
      const matchingSkills = requiredSkills.filter((s: string) => userSkills.some((us: string) => us.includes(s) || s.includes(us)));
      const match = requiredSkills.length > 0
        ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
        : 50;

      return {
        title: job.title,
        company: job.companies?.name || 'Unknown Company',
        location: job.location || 'Not specified',
        type: job.job_type || 'Full-time',
        match: Math.max(match, 30),
        url: '',
        source: 'Path4U',
        postedDate: job.created_at,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        workMode: job.job_type,
        dbJobId: job.id,
        isCompanyJob: true,
        skillsRequired: job.skills_required || [],
        experienceLevel: job.experience_level,
      };
    });

    // Also get AI-generated jobs
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiJobs: any[] = [];

    if (LOVABLE_API_KEY) {
      const topSkills = boundedSkills
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6)
        .map((s: any) => s.name || s.skill)
        .join(', ');

      try {
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
                content: `You are a job search assistant. Generate realistic, current job listings that match a candidate's profile. Include direct application URLs. Jobs must be currently relevant.`
              },
              {
                role: 'user',
                content: `Find 6 matching jobs for this candidate:
- Top skills: ${topSkills}
- Experience: ${boundedExperience}
- Previous roles: ${boundedJobTitles.join(', ') || 'Not specified'}
- Industries: ${boundedIndustries.join(', ') || 'Not specified'}

Return ONLY a JSON object:
{"jobs": [{"title": "...", "company": "...", "location": "...", "type": "Full-time", "match": 92, "url": "https://...", "source": "LinkedIn", "postedDate": "Recent"}]}`
              }
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : content;
          const parsed = JSON.parse(jsonStr.trim());
          aiJobs = (parsed.jobs || parsed).map((j: any) => ({ ...j, isCompanyJob: false }));
        }
      } catch (e) {
        console.error('AI job search error:', e);
      }
    }

    // Merge: company jobs first, then AI jobs
    const allJobs = [...companyJobs.sort((a: any, b: any) => b.match - a.match), ...aiJobs];

    return new Response(
      JSON.stringify({ jobs: allJobs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Domains known for large volumes of ghost/aggregator/expired listings.
// Direct-employer ATS domains (greenhouse, lever, workday, ashby, smartrecruiters, myworkdayjobs) are kept.
const GHOST_DOMAIN_BLOCKLIST = [
  'ziprecruiter.com',
  'jobs2careers.com',
  'neuvoo.com',
  'talent.com',
  'jooble.org',
  'jobrapido.com',
  'careerjet.com',
  'trabajo.org',
  'learn4good.com',
  'resume-library.com',
  'snagajob.com',
  'startwire.com',
  'salary.com',
  'monster.com', // heavy repost/ghost volume
  'jobcase.com',
];

const MS_14_DAYS = 14 * 24 * 60 * 60 * 1000;

const fallbackHeaders = {
  'User-Agent': 'Path4U Job Matcher/1.0 (+https://path4u.lovable.app)',
  'Accept': 'application/json',
};

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function isBlockedDomain(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  return GHOST_DOMAIN_BLOCKLIST.some(d => host === d || host.endsWith('.' + d));
}

function uniqueTerms(values: unknown[], limit = 6): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const value of values) {
    const term = typeof value === 'string' ? value.trim() : '';
    const key = term.toLowerCase();
    if (term && !seen.has(key)) {
      seen.add(key);
      terms.push(term);
    }
    if (terms.length >= limit) break;
  }
  return terms;
}

function scoreTextMatch(text: string, userSkills: string[]): number {
  const hay = text.toLowerCase();
  if (!userSkills.length) return 60;
  const hits = userSkills.filter((s: string) => s && hay.includes(s)).length;
  return Math.min(98, 55 + Math.round((hits / userSkills.length) * 45));
}

function recentIsoFromSeconds(seconds?: number | null): string {
  return seconds ? new Date(seconds * 1000).toISOString() : 'Recent';
}

async function fetchFallbackLiveJobs(queryTerms: string[], userSkills: string[]): Promise<any[]> {
  const queries = queryTerms.length ? queryTerms : ['Data Analyst', 'Software Engineer'];
  const jobs: any[] = [];

  const fetchJson = async (url: string) => {
    const res = await fetch(url, { headers: fallbackHeaders });
    if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0, 120)).catch(() => '')}`);
    return await res.json();
  };

  for (const query of queries.slice(0, 3)) {
    const encoded = encodeURIComponent(query);

    try {
      const remotive = await fetchJson(`https://remotive.com/api/remote-jobs?search=${encoded}&limit=20`);
      const rows = Array.isArray(remotive?.jobs) ? remotive.jobs : [];
      for (const j of rows) {
        const url = j.url || '';
        jobs.push({
          title: j.title,
          company: j.company_name || 'Unknown',
          location: j.candidate_required_location || 'Remote',
          type: j.job_type || 'Full-time',
          match: scoreTextMatch(`${j.title || ''} ${j.description || ''} ${(j.tags || []).join(' ')}`, userSkills),
          url,
          source: 'Remotive',
          postedDate: j.publication_date || 'Recent',
          postedMs: j.publication_date ? Date.parse(j.publication_date) : null,
          workMode: 'Remote',
          isCompanyJob: false,
          skillsRequired: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
        });
      }
    } catch (e) {
      console.warn(`Remotive fallback failed for "${query}":`, e);
    }

    try {
      const arbeitnow = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?search=${encoded}`);
      const rows = Array.isArray(arbeitnow?.data) ? arbeitnow.data : [];
      for (const j of rows.slice(0, 20)) {
        const url = j.url || '';
        const createdAt = typeof j.created_at === 'number' ? j.created_at : null;
        jobs.push({
          title: j.title,
          company: j.company_name || 'Unknown',
          location: j.location || (j.remote ? 'Remote' : 'Not specified'),
          type: Array.isArray(j.job_types) && j.job_types.length ? j.job_types.join(', ') : 'Full-time',
          match: scoreTextMatch(`${j.title || ''} ${j.description || ''} ${(j.tags || []).join(' ')}`, userSkills),
          url,
          source: 'Arbeitnow',
          postedDate: recentIsoFromSeconds(createdAt),
          postedMs: createdAt ? createdAt * 1000 : null,
          workMode: j.remote ? 'Remote' : 'On-site',
          isCompanyJob: false,
          skillsRequired: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
        });
      }
    } catch (e) {
      console.warn(`Arbeitnow fallback failed for "${query}":`, e);
    }
  }

  return jobs;
}

// HEAD-check (falls back to GET) to drop dead links. Times out fast.
async function isLinkAlive(url: string): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 4000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    // Some ATSs reject HEAD -> retry GET
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    clearTimeout(t);
    if (res.status === 404 || res.status === 410 || res.status >= 500) return false;
    return res.status < 400;
  } catch {
    clearTimeout(t);
    return false;
  }
}

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
    const { skills, experienceLevel, jobTitles, industries } = await req.json();

    if (!Array.isArray(skills)) {
      return new Response(JSON.stringify({ error: 'skills must be an array' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (skills.length > 50 || (Array.isArray(industries) && industries.length > 20) || (Array.isArray(jobTitles) && jobTitles.length > 20)) {
      return new Response(JSON.stringify({ error: 'Input arrays exceed allowed limits.' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const trunc = (v: unknown, n: number) => typeof v === 'string' ? v.slice(0, n) : v;
    const boundedSkills = skills.slice(0, 50).map((s: any) => typeof s === 'string' ? s.slice(0, 200) : { ...s, name: trunc(s?.name, 200), skill: trunc(s?.skill, 200) });
    const boundedJobTitles = Array.isArray(jobTitles) ? jobTitles.slice(0, 20).map((i: any) => trunc(i, 150)) : [];
    const boundedExperience = typeof experienceLevel === 'string' ? experienceLevel.slice(0, 100) : experienceLevel;

    // Fetch company-posted jobs from database (already-authentic, direct-employer)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: dbJobs } = await supabase
      .from('job_listings')
      .select('*, companies(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    const userSkills = boundedSkills.map((s: any) => (s.name || s.skill || '').toLowerCase()).filter(Boolean);

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

    // ---- LIVE JOBS from JSearch (RapidAPI) ----
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_JSEARCH_KEY');
    let liveJobs: any[] = [];

    if (RAPIDAPI_KEY) {
      const topSkills = boundedSkills
        .slice()
        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
        .slice(0, 4)
        .map((s: any) => s.name || s.skill)
        .filter(Boolean);

      const primaryTitle = boundedJobTitles[0] || topSkills[0] || 'Software Engineer';
      const queryStr = [primaryTitle, topSkills.slice(0, 2).join(' ')].filter(Boolean).join(' ');

      const params = new URLSearchParams({
        query: queryStr,
        page: '1',
        num_pages: '2',
        date_posted: 'week', // JSearch: 'all' | 'today' | '3days' | 'week' | 'month' — 'week' keeps freshness tight
      });

      try {
        const jsRes = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
        });

        if (!jsRes.ok) {
          const body = await jsRes.text();
          console.error(`JSearch failed [${jsRes.status}]: ${body.slice(0, 500)}`);
        } else {
          const jsData = await jsRes.json();
          const now = Date.now();
          const raw: any[] = Array.isArray(jsData?.data) ? jsData.data : [];

          // 1. Basic normalize + 14-day filter + ghost-domain filter
          const normalized = raw
            .map((j: any) => {
              const applyLink = j.job_apply_link || j.job_google_link || '';
              const postedMs = j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : null;
              return {
                title: j.job_title,
                company: j.employer_name || 'Unknown',
                location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || 'Remote',
                type: j.job_employment_type || 'Full-time',
                match: scoreTextMatch(`${j.job_title || ''} ${j.job_description || ''} ${(j.job_required_skills || []).join(' ')}`, userSkills),
                url: applyLink,
                source: j.job_publisher || hostOf(applyLink) || 'Web',
                postedDate: j.job_posted_at_datetime_utc || (postedMs ? new Date(postedMs).toISOString() : 'Recent'),
                postedMs,
                salaryMin: j.job_min_salary,
                salaryMax: j.job_max_salary,
                workMode: j.job_is_remote ? 'Remote' : (j.job_employment_type || ''),
                isCompanyJob: false,
                skillsRequired: j.job_required_skills || [],
                experienceLevel: j.job_required_experience?.required_experience_in_months
                  ? `${Math.round(j.job_required_experience.required_experience_in_months / 12)}+ yrs`
                  : undefined,
              };
            })
            .filter(j => j.url && j.title && j.company)
            .filter(j => !j.postedMs || (now - j.postedMs) <= MS_14_DAYS)
            .filter(j => !isBlockedDomain(j.url));

          // 2. Dedupe by title+company (drops reposts)
          const seen = new Set<string>();
          const deduped = normalized.filter(j => {
            const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // 3. HEAD-check apply links in parallel (bounded to 12 to protect quota/time)
          const candidates = deduped.sort((a, b) => b.match - a.match).slice(0, 12);
          const aliveFlags = await Promise.all(candidates.map(j => isLinkAlive(j.url)));
          liveJobs = candidates
            .filter((_, i) => aliveFlags[i])
            .map(({ postedMs, ...rest }) => rest);
        }
      } catch (e) {
        console.error('JSearch fetch error:', e);
      }
    } else {
      console.warn('RAPIDAPI_JSEARCH_KEY not configured — skipping live job fetch');
    }

    if (liveJobs.length === 0) {
      const topSkills = boundedSkills
        .slice()
        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
        .map((s: any) => s.name || s.skill);
      const fallbackQueries = uniqueTerms([
        ...boundedJobTitles,
        topSkills.slice(0, 2).join(' '),
        topSkills[0],
      ]);

      const now = Date.now();
      const fallbackRaw = await fetchFallbackLiveJobs(fallbackQueries, userSkills);
      const fallbackNormalized = fallbackRaw
        .filter(j => j.url && j.title && j.company)
        .filter(j => !j.postedMs || (now - j.postedMs) <= MS_14_DAYS)
        .filter(j => !isBlockedDomain(j.url));

      const seen = new Set<string>();
      const deduped = fallbackNormalized.filter(j => {
        const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const candidates = deduped.sort((a, b) => b.match - a.match).slice(0, 16);
      const aliveFlags = await Promise.all(candidates.map(j => isLinkAlive(j.url)));
      liveJobs = candidates
        .filter((_, i) => aliveFlags[i])
        .map(({ postedMs, ...rest }) => rest);
    }

    const allJobs = [
      ...companyJobs.sort((a: any, b: any) => b.match - a.match),
      ...liveJobs,
    ];

    return new Response(
      JSON.stringify({ jobs: allJobs, liveCount: liveJobs.length, companyCount: companyJobs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('search-jobs error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

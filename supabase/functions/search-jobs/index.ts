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
  if (!userSkills.length) return 55;
  const hits = userSkills.filter((s: string) => s && hay.includes(s)).length;
  return Math.min(98, 45 + Math.round((hits / userSkills.length) * 50));
}

// Return true if text contains any of the role title tokens (>3 chars).
function textMatchesAnyRole(text: string, roleTitles: string[]): boolean {
  if (!roleTitles.length) return true;
  const hay = text.toLowerCase();
  return roleTitles.some(r => {
    const tokens = r.toLowerCase().split(/[^a-z0-9+#.]+/).filter(t => t.length > 3);
    if (!tokens.length) return hay.includes(r.toLowerCase());
    // require at least one meaningful token overlap
    return tokens.some(t => hay.includes(t));
  });
}


function recentIsoFromSeconds(seconds?: number | null): string {
  return seconds ? new Date(seconds * 1000).toISOString() : 'Recent';
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: fallbackHeaders });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0, 120)).catch(() => '')}`);
  return await res.json();
}

async function fetchRemoteOk(userSkills: string[]): Promise<any[]> {
  const jobs: any[] = [];
  try {
    const data = await fetchJson('https://remoteok.com/api');
    const rows = Array.isArray(data) ? data.slice(1) : []; // first item is legal notice
    for (const j of rows) {
      const url = j.url || j.apply_url || '';
      if (!url) continue;
      const postedMs = j.date ? Date.parse(j.date) : null;
      jobs.push({
        title: j.position || j.title,
        company: j.company || 'Unknown',
        location: j.location || 'Remote',
        type: 'Full-time',
        match: scoreTextMatch(`${j.position || ''} ${j.description || ''} ${(j.tags || []).join(' ')}`, userSkills),
        url,
        source: 'RemoteOK',
        postedDate: j.date || 'Recent',
        postedMs,
        workMode: 'Remote',
        isCompanyJob: false,
        skillsRequired: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
      });
    }
  } catch (e) {
    console.warn('RemoteOK fetch failed:', e);
  }
  return jobs;
}

async function fetchFallbackLiveJobs(queryTerms: string[], userSkills: string[]): Promise<any[]> {
  const queries = queryTerms.length ? queryTerms : ['Data Analyst', 'Software Engineer'];
  const jobs: any[] = [];

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

  // RemoteOK once (returns broad set, filter by skill match below)
  jobs.push(...(await fetchRemoteOk(userSkills)));

  return jobs;
}

// Build deep-link searches on external boards for a given role. These are
// guaranteed-live search URLs that let users browse Indeed/LinkedIn/Glassdoor/
// Wellfound/RemoteOK/WeWorkRemotely directly for the roles we predicted.
function buildExternalSearchLinks(roles: { role: string; probability: number }[]) {
  const out: { role: string; probability: number; links: { source: string; url: string }[] }[] = [];
  for (const { role, probability } of roles) {
    const q = encodeURIComponent(role);
    const qDash = encodeURIComponent(role.trim().toLowerCase().replace(/\s+/g, '-'));
    out.push({
      role,
      probability,
      links: [
        { source: 'Indeed',         url: `https://www.indeed.com/jobs?q=${q}` },
        { source: 'LinkedIn',       url: `https://www.linkedin.com/jobs/search/?keywords=${q}` },
        { source: 'Glassdoor',      url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}` },
        { source: 'Wellfound',      url: `https://wellfound.com/role/${qDash}` },
        { source: 'RemoteOK',       url: `https://remoteok.com/remote-${qDash}-jobs` },
        { source: 'WeWorkRemotely', url: `https://weworkremotely.com/remote-jobs/search?term=${q}` },
        { source: 'Naukri',         url: `https://www.naukri.com/${qDash}-jobs` },
      ],
    });
  }
  return out;
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
    const { skills, experienceLevel, jobTitles, industries, predictedRoles } = await req.json();

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
    const boundedPredictedRoles = Array.isArray(predictedRoles)
      ? predictedRoles
          .filter((r: any) => r && typeof r.role === 'string')
          .slice(0, 10)
          .map((r: any) => ({ role: trunc(r.role, 150) as string, probability: Number(r.probability) || 0 }))
          .sort((a: any, b: any) => b.probability - a.probability)
      : [];

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

      // Build one query per likely role (weighted by probability) so we surface
      // openings for every role the user has a real shot at — not just one.
      const roleQueries: { query: string; weight: number }[] = [];
      const seenQ = new Set<string>();
      const pushQuery = (q: string, weight: number) => {
        const key = q.trim().toLowerCase();
        if (!key || seenQ.has(key)) return;
        seenQ.add(key);
        roleQueries.push({ query: q, weight });
      };
      for (const r of boundedPredictedRoles) {
        if (r.probability >= 20) pushQuery(r.role, r.probability);
      }
      for (const t of boundedJobTitles) pushQuery(t as string, 50);
      if (!roleQueries.length) {
        pushQuery([topSkills[0] || 'Software Engineer', topSkills.slice(1, 3).join(' ')].filter(Boolean).join(' '), 40);
      }
      // Cap to keep RapidAPI usage bounded (each query = 1 page).
      const queriesToRun = roleQueries.slice(0, 5);

      const now = Date.now();
      const collected: any[] = [];

      await Promise.all(queriesToRun.map(async ({ query, weight }) => {
        const params = new URLSearchParams({
          query,
          page: '1',
          num_pages: '1',
          date_posted: 'week',
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
            console.error(`JSearch failed for "${query}" [${jsRes.status}]: ${body.slice(0, 300)}`);
            return;
          }
          const jsData = await jsRes.json();
          const raw: any[] = Array.isArray(jsData?.data) ? jsData.data : [];
          for (const j of raw) {
            const applyLink = j.job_apply_link || j.job_google_link || '';
            const postedMs = j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : null;
            const baseMatch = scoreTextMatch(
              `${j.job_title || ''} ${j.job_description || ''} ${(j.job_required_skills || []).join(' ')}`,
              userSkills,
            );
            // Blend skill-match with role probability so higher-probability roles rank higher.
            const match = Math.min(99, Math.round(baseMatch * 0.7 + weight * 0.3));
            collected.push({
              title: j.job_title,
              company: j.employer_name || 'Unknown',
              location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || 'Remote',
              type: j.job_employment_type || 'Full-time',
              match,
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
              _forRole: query,
            });
          }
        } catch (e) {
          console.error(`JSearch fetch error for "${query}":`, e);
        }
      }));

      const normalized = collected
        .filter(j => j.url && j.title && j.company)
        .filter(j => !j.postedMs || (now - j.postedMs) <= MS_14_DAYS)
        .filter(j => !isBlockedDomain(j.url));

      const seen = new Set<string>();
      const deduped = normalized.filter(j => {
        const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Keep more candidates now that we search across many roles.
      const candidates = deduped.sort((a, b) => b.match - a.match).slice(0, 30);
      const aliveFlags = await Promise.all(candidates.map(j => isLinkAlive(j.url)));
      liveJobs = candidates
        .filter((_, i) => aliveFlags[i])
        .map(({ postedMs, _forRole, ...rest }) => rest);
    } else {
      console.warn('RAPIDAPI_JSEARCH_KEY not configured — skipping live job fetch');
    }

    if (liveJobs.length === 0) {
      const topSkills = boundedSkills
        .slice()
        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
        .map((s: any) => s.name || s.skill);
      const fallbackQueries = uniqueTerms([
        ...boundedPredictedRoles.map((r: any) => r.role),
        ...boundedJobTitles,
        topSkills.slice(0, 2).join(' '),
        topSkills[0],
      ], 8);

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
      const candidates = deduped.sort((a, b) => b.match - a.match).slice(0, 30);
      const aliveFlags = await Promise.all(candidates.map(j => isLinkAlive(j.url)));
      liveJobs = candidates
        .filter((_, i) => aliveFlags[i])
        .map(({ postedMs, ...rest }) => rest);
    }

    // Also always attempt RemoteOK enrichment (free, public API) so remote-first
    // users see openings from that board in addition to JSearch aggregators.
    try {
      const now = Date.now();
      const remoteOk = await fetchRemoteOk(userSkills);
      const existing = new Set(liveJobs.map(j => `${j.title?.toLowerCase().trim()}|${j.company?.toLowerCase().trim()}`));
      const extra = remoteOk
        .filter(j => j.url && j.title && j.company)
        .filter(j => !j.postedMs || (now - j.postedMs) <= MS_14_DAYS)
        .filter(j => !existing.has(`${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`))
        .sort((a, b) => b.match - a.match)
        .slice(0, 10)
        .map(({ postedMs, ...rest }) => rest);
      liveJobs = [...liveJobs, ...extra];
    } catch (e) {
      console.warn('RemoteOK enrichment failed:', e);
    }

    // Build browse-on-external-boards links for the top predicted roles so
    // users can jump to Indeed, LinkedIn, Glassdoor, Wellfound, RemoteOK, WWR, Naukri.
    const rolesForLinks = boundedPredictedRoles.length
      ? boundedPredictedRoles.slice(0, 5)
      : (boundedJobTitles as string[]).slice(0, 3).map((r) => ({ role: r, probability: 50 }));
    const externalSearchLinks = buildExternalSearchLinks(rolesForLinks);

    const allJobs = [
      ...companyJobs.sort((a: any, b: any) => b.match - a.match),
      ...liveJobs,
    ];

    return new Response(
      JSON.stringify({ jobs: allJobs, liveCount: liveJobs.length, companyCount: companyJobs.length, externalSearchLinks }),
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

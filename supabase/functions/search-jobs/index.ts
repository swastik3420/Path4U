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

const PREFERRED_JOB_BOARDS = ['Indeed', 'Glassdoor', 'Wellfound', 'RemoteOK', 'WeWorkRemotely', 'Naukri'];

const TWO_LETTER_SKILL_TOKENS = new Set(['ai', 'ml', 'bi', 'ui', 'ux', 'qa', 'js', 'ts']);
const ROLE_STOP_WORDS = new Set(['senior', 'junior', 'jr', 'lead', 'principal', 'entry', 'level', 'remote', 'internship', 'intern']);

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function comparableTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9+#.]+/)
    .map(t => t.trim())
    .filter(t => (t.length > 2 || TWO_LETTER_SKILL_TOKENS.has(t)) && !ROLE_STOP_WORDS.has(t));
}

function tokenInText(token: string, hay: string): boolean {
  if (!token) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, 'i').test(hay);
}

function roleTokens(role: string): string[] {
  return Array.from(new Set(comparableTokens(role)));
}

function rolePhrase(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
}

function bestRoleMatch(text: string, roles: { query?: string; role?: string; weight?: number; probability?: number }[]) {
  if (!roles.length) return { role: '', weight: 45, quality: 0.5 };
  const hay = text.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
  let best: { role: string; weight: number; quality: number } | null = null;

  for (const item of roles) {
    const role = String(item.query || item.role || '').trim();
    if (!role) continue;
    const weight = Number(item.weight ?? item.probability ?? 45) || 45;
    const phrase = rolePhrase(role);
    const tokens = roleTokens(role);
    if (!tokens.length) continue;

    let quality = 0;
    if (phrase && hay.includes(phrase)) {
      quality = 1;
    } else {
      const hits = tokens.filter(t => tokenInText(t, hay)).length;
      const requiredHits = tokens.length === 1 ? 1 : 2;
      if (hits >= requiredHits) quality = hits / tokens.length;
    }

    if (quality > 0) {
      const currentScore = quality * weight;
      const bestScore = best ? best.quality * best.weight : -1;
      if (currentScore > bestScore) best = { role, weight, quality };
    }
  }

  return best;
}

function scoreTextMatch(text: string, userSkills: string[]): number {
  const hay = text.toLowerCase();
  const skillTokens = Array.from(new Set(userSkills.flatMap(s => comparableTokens(s)))).slice(0, 24);
  if (!skillTokens.length) return 50;
  const hits = skillTokens.filter((s: string) => tokenInText(s, hay)).length;
  return Math.min(98, 48 + Math.round((hits / skillTokens.length) * 45));
}

function normalizeSource(publisher: string | undefined, url: string): string {
  const raw = (publisher || '').toLowerCase();
  const host = hostOf(url);
  const joined = `${raw} ${host}`;
  if (joined.includes('indeed')) return 'Indeed';
  if (joined.includes('glassdoor')) return 'Glassdoor';
  if (joined.includes('wellfound') || joined.includes('angel.co')) return 'Wellfound';
  if (joined.includes('remoteok')) return 'RemoteOK';
  if (joined.includes('weworkremotely')) return 'WeWorkRemotely';
  if (joined.includes('naukri')) return 'Naukri';
  if (joined.includes('remotive')) return 'Remotive';
  if (joined.includes('himalayas')) return 'Himalayas';
  if (joined.includes('jobicy')) return 'Jobicy';
  if (joined.includes('arbeitnow')) return 'Arbeitnow';
  return publisher || host || 'Web';
}

function sourceBoost(source: string): number {
  return PREFERRED_JOB_BOARDS.includes(source) ? 6 : 2;
}

function roleSlug(role: string): string {
  return encodeURIComponent(role.trim().toLowerCase().replace(/[^a-z0-9+#.]+/g, '-').replace(/^-|-$/g, ''));
}

function boardSearchUrl(source: string, role: string): string {
  const q = encodeURIComponent(role);
  const dash = roleSlug(role);
  switch (source) {
    case 'Indeed': return `https://www.indeed.com/jobs?q=${q}`;
    case 'Glassdoor': return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}`;
    case 'Wellfound': return `https://wellfound.com/role/${dash}`;
    case 'RemoteOK': return `https://remoteok.com/remote-${dash}-jobs`;
    case 'WeWorkRemotely': return `https://weworkremotely.com/remote-jobs/search?term=${q}`;
    case 'Naukri': return `https://www.naukri.com/${dash}-jobs`;
    default: return `https://www.google.com/search?q=${q}+jobs`;
  }
}

function buildBoardSearchCards(
  roles: { role: string; probability: number }[],
  userSkills: string[],
  existingJobs: any[],
  limit: number,
): any[] {
  const cards: any[] = [];
  const seen = new Set(existingJobs.map(j => `${String(j.title || '').toLowerCase()}|${String(j.company || '').toLowerCase()}`));
  const rankedRoles = roles.length ? roles : [{ role: 'Software Engineer', probability: 45 }];
  const skillsRequired = Array.from(new Set(userSkills.flatMap(s => comparableTokens(s)))).slice(0, 5);

  // Interleave source-then-role so cards represent the whole probability
  // spectrum, not just the top role.
  for (const source of PREFERRED_JOB_BOARDS) {
    for (const role of rankedRoles.slice(0, 6)) {
      const title = `${role.role} jobs`;
      const company = `${source} live listings`;
      const key = `${title.toLowerCase()}|${company.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        title,
        company,
        location: source === 'Naukri' ? 'India / Remote' : 'Worldwide / Remote',
        type: 'Live job board search',
        match: Math.min(98, Math.max(50, Math.round(role.probability))),
        url: boardSearchUrl(source, role.role),
        source,
        postedDate: 'Live search',
        workMode: 'Remote / On-site',
        isCompanyJob: false,
        skillsRequired,
        _forRole: role.role,
      });
      if (cards.length >= limit) return cards;
    }
  }

  return cards;
}

function ensurePreferredBoardCoverage(
  jobs: any[],
  roles: { role: string; probability: number }[],
  userSkills: string[],
): any[] {
  const rankedRoles = roles.length ? roles : [{ role: 'Software Engineer', probability: 45 }];
  const skillsRequired = Array.from(new Set(userSkills.flatMap(s => comparableTokens(s)))).slice(0, 5);
  const covered = new Set(jobs.map(j => normalizeSource(j.source, j.url)));
  const additions = PREFERRED_JOB_BOARDS
    .filter(source => !covered.has(source))
    .map((source, i) => {
      // Rotate roles across uncovered boards so we don't spam the top role.
      const role = rankedRoles[i % rankedRoles.length];
      return {
        title: `${role.role} jobs`,
        company: `${source} live listings`,
        location: source === 'Naukri' ? 'India / Remote' : 'Worldwide / Remote',
        type: 'Live job board search',
        match: Math.min(98, Math.max(50, Math.round(role.probability))),
        url: boardSearchUrl(source, role.role),
        source,
        postedDate: 'Live search',
        workMode: 'Remote / On-site',
        isCompanyJob: false,
        skillsRequired,
        _forRole: role.role,
      };
    });

  const deduped = new Map<string, any>();
  for (const job of [...additions, ...jobs]) {
    const key = `${String(job.title || '').toLowerCase().trim()}|${String(job.company || '').toLowerCase().trim()}`;
    if (!deduped.has(key)) deduped.set(key, job);
  }
  return Array.from(deduped.values());
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
    const rows = Array.isArray(data) ? data.slice(1) : [];
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

// Role-aware fallback: runs a search per predicted role across multiple free
// job APIs (Remotive, Arbeitnow, Jobicy, Himalayas, WeWorkRemotely RSS,
// RemoteOK) and tags each result with the role it was fetched for + a weight
// derived from that role's probability. Only jobs whose title/description
// actually mention the role tokens are kept.
async function fetchFallbackLiveJobs(
  roleQueries: { query: string; weight: number }[],
  userSkills: string[],
): Promise<any[]> {
  const queries = roleQueries.length
    ? roleQueries
    : [{ query: 'Software Engineer', weight: 40 }];
  const jobs: any[] = [];

  for (const { query, weight } of queries.slice(0, 5)) {
    const encoded = encodeURIComponent(query);

    // Remotive
    try {
      const remotive = await fetchJson(`https://remotive.com/api/remote-jobs?search=${encoded}&limit=15`);
      const rows = Array.isArray(remotive?.jobs) ? remotive.jobs : [];
      for (const j of rows) {
        jobs.push({
          title: j.title,
          company: j.company_name || 'Unknown',
          location: j.candidate_required_location || 'Remote',
          type: j.job_type || 'Full-time',
          _base: scoreTextMatch(`${j.title || ''} ${j.description || ''} ${(j.tags || []).join(' ')}`, userSkills),
          _weight: weight,
          _forRole: query,
          url: j.url || '',
          source: 'Remotive',
          postedDate: j.publication_date || 'Recent',
          postedMs: j.publication_date ? Date.parse(j.publication_date) : null,
          workMode: 'Remote',
          isCompanyJob: false,
          skillsRequired: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
        });
      }
    } catch (e) { console.warn(`Remotive "${query}":`, e); }

    // Arbeitnow
    try {
      const arbeitnow = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?search=${encoded}`);
      const rows = Array.isArray(arbeitnow?.data) ? arbeitnow.data : [];
      for (const j of rows.slice(0, 15)) {
        const createdAt = typeof j.created_at === 'number' ? j.created_at : null;
        jobs.push({
          title: j.title,
          company: j.company_name || 'Unknown',
          location: j.location || (j.remote ? 'Remote' : 'Not specified'),
          type: Array.isArray(j.job_types) && j.job_types.length ? j.job_types.join(', ') : 'Full-time',
          _base: scoreTextMatch(`${j.title || ''} ${j.description || ''} ${(j.tags || []).join(' ')}`, userSkills),
          _weight: weight,
          _forRole: query,
          url: j.url || '',
          source: 'Arbeitnow',
          postedDate: recentIsoFromSeconds(createdAt),
          postedMs: createdAt ? createdAt * 1000 : null,
          workMode: j.remote ? 'Remote' : 'On-site',
          isCompanyJob: false,
          skillsRequired: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
        });
      }
    } catch (e) { console.warn(`Arbeitnow "${query}":`, e); }

    // Jobicy
    try {
      const jobicy = await fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=15&tag=${encoded}`);
      const rows = Array.isArray(jobicy?.jobs) ? jobicy.jobs : [];
      for (const j of rows) {
        const postedMs = j.pubDate ? Date.parse(j.pubDate) : null;
        jobs.push({
          title: j.jobTitle,
          company: j.companyName || 'Unknown',
          location: j.jobGeo || 'Remote',
          type: Array.isArray(j.jobType) && j.jobType.length ? j.jobType.join(', ') : 'Full-time',
          _base: scoreTextMatch(`${j.jobTitle || ''} ${j.jobExcerpt || ''} ${j.jobDescription || ''}`, userSkills),
          _weight: weight,
          _forRole: query,
          url: j.url || '',
          source: 'Jobicy',
          postedDate: j.pubDate || 'Recent',
          postedMs,
          workMode: 'Remote',
          isCompanyJob: false,
          skillsRequired: Array.isArray(j.jobIndustry) ? j.jobIndustry.slice(0, 8) : [],
        });
      }
    } catch (e) { console.warn(`Jobicy "${query}":`, e); }

    // Himalayas
    try {
      const hima = await fetchJson(`https://himalayas.app/jobs/api?limit=15&search=${encoded}`);
      const rows = Array.isArray(hima?.jobs) ? hima.jobs : [];
      for (const j of rows) {
        const postedMs = j.pubDate ? Date.parse(j.pubDate) : (j.publishedDate ? Date.parse(j.publishedDate) : null);
        jobs.push({
          title: j.title,
          company: j.companyName || j.company?.name || 'Unknown',
          location: Array.isArray(j.locationRestrictions) && j.locationRestrictions.length ? j.locationRestrictions.join(', ') : 'Remote',
          type: Array.isArray(j.employmentType) && j.employmentType.length ? j.employmentType.join(', ') : 'Full-time',
          _base: scoreTextMatch(`${j.title || ''} ${j.excerpt || ''} ${(j.categories || []).join(' ')}`, userSkills),
          _weight: weight,
          _forRole: query,
          url: j.applicationLink || j.jobUrl || '',
          source: 'Himalayas',
          postedDate: j.pubDate || j.publishedDate || 'Recent',
          postedMs,
          workMode: 'Remote',
          isCompanyJob: false,
          skillsRequired: Array.isArray(j.categories) ? j.categories.slice(0, 8) : [],
        });
      }
    } catch (e) { console.warn(`Himalayas "${query}":`, e); }
  }

    // RemoteOK once — tag each row against the best matching role
  try {
    const rok = await fetchRemoteOk(userSkills);
    for (const j of rok) {
      const best = bestRoleMatch(`${j.title || ''} ${(j.skillsRequired || []).join(' ')}`, queries);
      if (best) jobs.push({ ...j, _base: j.match, _weight: best.weight, _forRole: best.role });
    }
  } catch (e) { console.warn('RemoteOK:', e); }

  // Filter out results that do not strongly match a predicted role. Requiring
  // two role tokens prevents unrelated cards such as "Data Entry" for
  // "Data Analyst" or "Educational Administrator" for "Database Administrator".
  return jobs
    .map(j => {
      const match = bestRoleMatch(`${j.title || ''} ${(j.skillsRequired || []).join(' ')}`, queries);
      return match ? { ...j, _weight: Math.max(j._weight || 0, match.weight), _forRole: match.role } : null;
    })
    .filter(Boolean);
}


// Build deep-link searches on external boards for a given role. These are
// guaranteed-live search URLs that let users browse Indeed/LinkedIn/Glassdoor/
// Wellfound/RemoteOK/WeWorkRemotely directly for the roles we predicted.
function buildExternalSearchLinks(roles: { role: string; probability: number }[]) {
  const out: { role: string; probability: number; links: { source: string; url: string }[] }[] = [];
  for (const { role, probability } of roles) {
    const q = encodeURIComponent(role);
    out.push({
      role,
      probability,
      links: [
        { source: 'Indeed',         url: boardSearchUrl('Indeed', role) },
        { source: 'LinkedIn',       url: `https://www.linkedin.com/jobs/search/?keywords=${q}` },
        { source: 'Glassdoor',      url: boardSearchUrl('Glassdoor', role) },
        { source: 'Wellfound',      url: boardSearchUrl('Wellfound', role) },
        { source: 'RemoteOK',       url: boardSearchUrl('RemoteOK', role) },
        { source: 'WeWorkRemotely', url: boardSearchUrl('WeWorkRemotely', role) },
        { source: 'Naukri',         url: boardSearchUrl('Naukri', role) },
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
    // Major boards often reject bot HEAD/GET checks with 401/403/429 even when
    // the browser URL is valid, so do not discard those links.
    return true;
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
            const source = normalizeSource(j.job_publisher, applyLink);
            const roleMatch = bestRoleMatch(
              `${j.job_title || ''} ${(j.job_required_skills || []).join(' ')} ${j.job_description || ''}`,
              roleQueries,
            );
            if (!roleMatch) continue;
            const baseMatch = scoreTextMatch(
              `${j.job_title || ''} ${j.job_description || ''} ${(j.job_required_skills || []).join(' ')}`,
              userSkills,
            );
            // Blend skill-match with role probability so higher-probability roles rank higher.
            const match = Math.min(99, Math.round(baseMatch * 0.55 + roleMatch.weight * 0.4 + sourceBoost(source)));
            collected.push({
              title: j.job_title,
              company: j.employer_name || 'Unknown',
              location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || 'Remote',
              type: j.job_employment_type || 'Full-time',
              match,
              url: applyLink,
              source,
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
              _forRole: roleMatch.role,
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

      // Build weighted role queries (probability drives ranking).
      const fbQueries: { query: string; weight: number }[] = [];
      const seenQ = new Set<string>();
      const addQ = (q: string, weight: number) => {
        const key = (q || '').trim().toLowerCase();
        if (!key || seenQ.has(key)) return;
        seenQ.add(key);
        fbQueries.push({ query: q, weight });
      };
      for (const r of boundedPredictedRoles) if (r.probability >= 15) addQ(r.role, r.probability);
      for (const t of boundedJobTitles) addQ(t as string, 45);
      if (!fbQueries.length) addQ(topSkills[0] || 'Software Engineer', 40);

      const now = Date.now();
      const fallbackRaw = await fetchFallbackLiveJobs(fbQueries.slice(0, 5), userSkills);
      const fallbackNormalized = fallbackRaw
        .filter(j => j.url && j.title && j.company)
        .filter(j => !j.postedMs || (now - j.postedMs) <= MS_14_DAYS)
        .filter(j => !isBlockedDomain(j.url))
        .map(j => ({
          ...j,
          // Blend text/skill match with role probability so higher-probability
          // roles surface first.
          match: Math.min(99, Math.round((j._base ?? 55) * 0.6 + (j._weight ?? 40) * 0.4)),
        }));

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
        .map(({ postedMs, _base, _weight, _forRole, ...rest }) => rest);
    }

    // Build browse-on-external-boards links for the top predicted roles so
    // users can jump to Indeed, LinkedIn, Glassdoor, Wellfound, RemoteOK, WWR, Naukri.
    const rolesForLinks = boundedPredictedRoles.length
      ? boundedPredictedRoles.slice(0, 5)
      : (boundedJobTitles as string[]).slice(0, 3).map((r) => ({ role: r, probability: 50 }));
    const externalSearchLinks = buildExternalSearchLinks(rolesForLinks);

    liveJobs = ensurePreferredBoardCoverage(liveJobs, rolesForLinks, userSkills);

    // Guarantee 10 visible role-ranked cards. Some requested boards do not
    // expose scrape-safe public listing APIs, so we fill any shortfall with
    // live search cards that open the exact predicted-role searches on those boards.
    if (liveJobs.length < 10) {
      liveJobs = [
        ...liveJobs,
        ...buildBoardSearchCards(rolesForLinks, userSkills, liveJobs, 10 - liveJobs.length),
      ];
    }

    // Final ordering: rank by match desc so the "Probability of Job Role"
    // signal drives which cards the user sees first.
    liveJobs = liveJobs.sort((a: any, b: any) => (b.match || 0) - (a.match || 0)).slice(0, 10);

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

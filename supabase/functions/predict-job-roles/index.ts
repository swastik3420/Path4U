import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Role profiles: keywords that indicate suitability for each role.
const ROLE_PROFILES: { role: string; keywords: string[] }[] = [
  { role: 'Frontend Developer', keywords: ['react', 'typescript', 'javascript', 'html', 'css', 'tailwind', 'next', 'vue', 'angular', 'redux'] },
  { role: 'Backend Developer', keywords: ['node', 'express', 'python', 'java', 'go', 'rust', 'sql', 'postgresql', 'mongodb', 'api', 'rest', 'graphql'] },
  { role: 'Full Stack Developer', keywords: ['react', 'node', 'typescript', 'javascript', 'sql', 'mongodb', 'express', 'next', 'api'] },
  { role: 'Data Analyst', keywords: ['sql', 'excel', 'power bi', 'tableau', 'looker', 'data analysis', 'data analytics', 'pandas', 'numpy', 'python'] },
  { role: 'Data Scientist', keywords: ['python', 'pandas', 'numpy', 'machine learning', 'deep learning', 'scikit', 'tensorflow', 'pytorch', 'statistics', 'sql'] },
  { role: 'Machine Learning Engineer', keywords: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'python', 'mlops', 'scikit', 'nlp', 'computer vision'] },
  { role: 'AI Engineer', keywords: ['artificial intelligence', 'generative ai', 'llm', 'prompt engineering', 'python', 'deep learning', 'machine learning', 'nlp'] },
  { role: 'Business Analyst', keywords: ['excel', 'power bi', 'tableau', 'sql', 'data analysis', 'business', 'analytics', 'looker'] },
  { role: 'DevOps Engineer', keywords: ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci', 'cd', 'terraform', 'jenkins', 'linux'] },
  { role: 'Cloud Engineer', keywords: ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'cloud'] },
  { role: 'Mobile Developer', keywords: ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios'] },
  { role: 'BI Developer', keywords: ['power bi', 'tableau', 'looker', 'sql', 'dax', 'excel', 'data'] },
  { role: 'Database Administrator', keywords: ['sql', 'postgresql', 'mysql', 'mongodb', 'oracle', 'database'] },
  { role: 'Software Engineer', keywords: ['python', 'java', 'javascript', 'typescript', 'c++', 'go', 'git', 'algorithms'] },
  { role: 'QA Engineer', keywords: ['testing', 'selenium', 'cypress', 'jest', 'qa', 'automation'] },
  { role: 'Data Engineer', keywords: ['python', 'sql', 'spark', 'airflow', 'etl', 'kafka', 'hadoop', 'aws'] },
  { role: 'Research Engineer', keywords: ['deep learning', 'machine learning', 'artificial intelligence', 'research', 'python', 'pytorch'] },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skills, experienceLevel, jobTitles } = await req.json();

    if (!Array.isArray(skills) || skills.length === 0) {
      return new Response(JSON.stringify({ error: 'skills array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normalize skills into { name, score }
    const normSkills = skills.slice(0, 50).map((s: any) => {
      if (typeof s === 'string') return { name: s.toLowerCase(), score: 70 };
      return { name: String(s?.name || '').toLowerCase(), score: Number(s?.score ?? 70) };
    }).filter(s => s.name);

    const titlesLower = (Array.isArray(jobTitles) ? jobTitles : []).map((t: any) => String(t).toLowerCase());

    // Score each role
    const scored = ROLE_PROFILES.map(profile => {
      let matchScore = 0;
      let matchCount = 0;
      const totalKeywords = profile.keywords.length;

      for (const kw of profile.keywords) {
        const match = normSkills.find(s => s.name.includes(kw) || kw.includes(s.name));
        if (match) {
          matchCount++;
          // Weighted by candidate's proficiency score (0-100)
          matchScore += Math.max(30, match.score);
        }
      }

      if (matchCount === 0) return { role: profile.role, probability: 0 };

      // Coverage ratio + average proficiency
      const coverage = matchCount / totalKeywords; // 0..1
      const avgProficiency = matchScore / matchCount; // ~30..100
      let probability = Math.round(coverage * 60 + (avgProficiency / 100) * 35);

      // Boost if candidate's previous title contains the role name
      const roleLower = profile.role.toLowerCase();
      if (titlesLower.some(t => t.includes(roleLower.split(' ')[0]) || roleLower.includes(t))) {
        probability += 8;
      }

      // Experience level nudge
      if (typeof experienceLevel === 'string') {
        const el = experienceLevel.toLowerCase();
        if (el.includes('senior') || el.includes('lead')) probability += 3;
      }

      probability = Math.max(10, Math.min(95, probability));
      return { role: profile.role, probability };
    });

    // Sort by probability desc, take top 7, ensure at least a few results
    const roles = scored
      .filter(r => r.probability > 0)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 7);

    // Fallback: if fewer than 3 matched, pad with generalist roles at low probability
    if (roles.length < 3) {
      const fallbacks = ['Software Engineer', 'Business Analyst', 'Data Analyst', 'Full Stack Developer']
        .filter(r => !roles.find(x => x.role === r))
        .map((r, i) => ({ role: r, probability: 25 - i * 3 }));
      roles.push(...fallbacks.slice(0, 3 - roles.length));
    }

    console.log(`Predicted ${roles.length} roles locally`);

    return new Response(
      JSON.stringify({ roles }),
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

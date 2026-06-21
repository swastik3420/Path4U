import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ATSCategory {
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'warning' | 'poor';
  feedback: string;
}

interface ATSResult {
  overallScore: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  categories: ATSCategory[];
  issues: string[];
  recommendations: string[];
  keywordMatches: { found: string[]; missing: string[] };
}

/**
 * Heuristic ATS scoring — runs on every resume regardless of AI availability.
 * Mirrors the rules real ATS systems (Workday, Greenhouse, Lever, Taleo) apply.
 */
function heuristicScore(text: string): {
  categories: ATSCategory[];
  issues: string[];
  recommendations: string[];
} {
  const lower = text.toLowerCase();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const categories: ATSCategory[] = [];
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 1. Contact information (15 pts)
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
  const hasLinkedIn = /linkedin\.com\/in\//i.test(text);
  const hasLocation = /\b([A-Z][a-z]+,\s*[A-Z]{2,}|\b(?:remote|hybrid)\b)/i.test(text);
  let contactScore = 0;
  if (hasEmail) contactScore += 6; else issues.push('Missing email address — ATS parsers require a clear email.');
  if (hasPhone) contactScore += 5; else issues.push('Missing phone number.');
  if (hasLinkedIn) contactScore += 2; else recommendations.push('Add a LinkedIn URL — most ATS systems index it.');
  if (hasLocation) contactScore += 2; else recommendations.push('Add a city/state or "Remote" — recruiters filter by location.');
  categories.push({
    name: 'Contact Information',
    score: contactScore,
    maxScore: 15,
    status: contactScore >= 13 ? 'excellent' : contactScore >= 10 ? 'good' : contactScore >= 6 ? 'warning' : 'poor',
    feedback: contactScore >= 13 ? 'All key contact fields present.' : 'Some contact fields are missing or hard to parse.',
  });

  // 2. Standard sections (15 pts)
  const sectionPatterns = [
    { name: 'experience', re: /\b(experience|employment|work history|professional experience)\b/i },
    { name: 'education', re: /\b(education|academic)\b/i },
    { name: 'skills', re: /\b(skills|technical skills|competencies|technologies)\b/i },
    { name: 'summary', re: /\b(summary|profile|objective|about)\b/i },
  ];
  const sectionsFound = sectionPatterns.filter(s => s.re.test(text));
  const sectionScore = Math.min(15, sectionsFound.length * 4);
  const missingSections = sectionPatterns.filter(s => !s.re.test(text)).map(s => s.name);
  if (missingSections.length) {
    issues.push(`Missing standard sections: ${missingSections.join(', ')}. ATS systems map content by section headers.`);
  }
  categories.push({
    name: 'Section Structure',
    score: sectionScore,
    maxScore: 15,
    status: sectionScore >= 14 ? 'excellent' : sectionScore >= 10 ? 'good' : sectionScore >= 6 ? 'warning' : 'poor',
    feedback: `${sectionsFound.length}/4 standard sections detected.`,
  });

  // 3. Quantified achievements (10 pts)
  const numberMatches = text.match(/\b\d+(\.\d+)?%|\$\s?\d[\d,.]*|\b\d{2,}\b/g) || [];
  const quantScore = Math.min(10, Math.floor(numberMatches.length / 2));
  if (quantScore < 6) {
    issues.push('Few quantified achievements detected. ATS-aligned resumes use numbers (%, $, counts) to prove impact.');
    recommendations.push('Add metrics — e.g. "Increased throughput by 35%", "Led team of 8", "Reduced cost by $20k".');
  }
  categories.push({
    name: 'Quantified Impact',
    score: quantScore,
    maxScore: 10,
    status: quantScore >= 8 ? 'excellent' : quantScore >= 5 ? 'good' : quantScore >= 3 ? 'warning' : 'poor',
    feedback: `${numberMatches.length} numeric values found.`,
  });

  // 4. Action verbs (10 pts)
  const actionVerbs = ['led','built','designed','developed','implemented','managed','launched','optimized','reduced','increased','delivered','created','architected','automated','scaled','improved','spearheaded','drove','owned','shipped','migrated','refactored','mentored','collaborated','analyzed','researched','deployed','integrated'];
  const verbHits = actionVerbs.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(text));
  const verbScore = Math.min(10, verbHits.length);
  if (verbScore < 6) recommendations.push('Start bullet points with strong action verbs (Led, Built, Designed, Optimized).');
  categories.push({
    name: 'Action Verbs',
    score: verbScore,
    maxScore: 10,
    status: verbScore >= 8 ? 'excellent' : verbScore >= 5 ? 'good' : verbScore >= 3 ? 'warning' : 'poor',
    feedback: `${verbHits.length} distinct action verbs detected.`,
  });

  // 5. Length / density (10 pts)
  let lengthScore = 10;
  if (wordCount < 200) { lengthScore = 3; issues.push('Resume is too short (<200 words). ATS scoring favors detailed experience.'); }
  else if (wordCount < 350) lengthScore = 6;
  else if (wordCount > 1200) { lengthScore = 7; recommendations.push('Resume is dense (>1200 words). Trim to 1–2 pages for best ATS ranking.'); }
  categories.push({
    name: 'Length & Density',
    score: lengthScore,
    maxScore: 10,
    status: lengthScore >= 9 ? 'excellent' : lengthScore >= 6 ? 'good' : 'warning',
    feedback: `${wordCount} words.`,
  });

  // 6. Formatting cleanliness (10 pts) — penalize tables, images, weird chars
  let formatScore = 10;
  const oddChars = (text.match(/[│┃┌┐└┘├┤┬┴┼─━╔╗╚╝]/g) || []).length;
  const bulletRatio = (text.match(/^[•●▪▫◦*-]\s/gm) || []).length;
  if (oddChars > 0) { formatScore -= 4; issues.push('Box-drawing/table characters detected — ATS parsers often drop table content.'); }
  if (bulletRatio === 0) { formatScore -= 3; recommendations.push('Use bullet points for accomplishments — ATS systems parse them more reliably than paragraphs.'); }
  if (/\t{2,}/.test(text)) { formatScore -= 2; issues.push('Multiple tab characters detected — likely a column layout that confuses ATS.'); }
  formatScore = Math.max(0, formatScore);
  categories.push({
    name: 'ATS-Friendly Formatting',
    score: formatScore,
    maxScore: 10,
    status: formatScore >= 9 ? 'excellent' : formatScore >= 6 ? 'good' : formatScore >= 3 ? 'warning' : 'poor',
    feedback: formatScore >= 9 ? 'Clean, parseable text layout.' : 'Formatting may not be fully ATS-friendly.',
  });

  // 7. Dates (10 pts)
  const dateMatches = text.match(/\b(19|20)\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(19|20)?\d{2}\b/gi) || [];
  const dateScore = Math.min(10, dateMatches.length * 2);
  if (dateScore < 6) issues.push('Few employment dates detected. ATS uses dates to calculate tenure and seniority.');
  categories.push({
    name: 'Employment Dates',
    score: dateScore,
    maxScore: 10,
    status: dateScore >= 8 ? 'excellent' : dateScore >= 5 ? 'good' : 'warning',
    feedback: `${dateMatches.length} date references found.`,
  });

  // 8. Skill density (10 pts)
  const commonSkills = ['python','javascript','typescript','java','c++','c#','sql','react','node','aws','azure','gcp','docker','kubernetes','git','linux','rest','graphql','mongodb','postgresql','mysql','redis','kafka','spark','tensorflow','pytorch','figma','tableau','excel','agile','scrum'];
  const skillHits = commonSkills.filter(s => lower.includes(s));
  const skillScore = Math.min(10, skillHits.length);
  if (skillScore < 4) recommendations.push('List concrete tools/technologies in a dedicated "Skills" section — ATS keyword matching depends on it.');
  categories.push({
    name: 'Keyword / Skill Density',
    score: skillScore,
    maxScore: 10,
    status: skillScore >= 8 ? 'excellent' : skillScore >= 5 ? 'good' : skillScore >= 2 ? 'warning' : 'poor',
    feedback: `${skillHits.length} common industry keywords detected.`,
  });

  // 9. Education detail (5 pts)
  const eduScore = /\b(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?b\.?a\.?|associate|diploma)\b/i.test(text) ? 5 : 2;
  if (eduScore < 5) recommendations.push('Include a clear degree line (e.g. "B.S. Computer Science, 2022").');
  categories.push({
    name: 'Education',
    score: eduScore,
    maxScore: 5,
    status: eduScore === 5 ? 'excellent' : 'warning',
    feedback: eduScore === 5 ? 'Degree information detected.' : 'Degree information missing or unclear.',
  });

  // 10. Readability (5 pts)
  const avgLineLength = lines.length ? lines.reduce((s, l) => s + l.length, 0) / lines.length : 0;
  const readScore = avgLineLength > 20 && avgLineLength < 140 ? 5 : 3;
  categories.push({
    name: 'Readability',
    score: readScore,
    maxScore: 5,
    status: readScore === 5 ? 'excellent' : 'warning',
    feedback: `Avg line length: ${Math.round(avgLineLength)} chars.`,
  });

  return { categories, issues, recommendations };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText } = await req.json();
    if (!resumeText || typeof resumeText !== 'string' || resumeText.length < 30) {
      return new Response(JSON.stringify({ error: 'Resume text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (resumeText.length > 50000) {
      return new Response(JSON.stringify({ error: 'Resume text too long' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const heuristic = heuristicScore(resumeText);
    const heuristicTotal = heuristic.categories.reduce((s, c) => s + c.score, 0);
    const heuristicMax = heuristic.categories.reduce((s, c) => s + c.maxScore, 0);
    const heuristicPct = Math.round((heuristicTotal / heuristicMax) * 100);

    // AI augmentation: keyword extraction + qualitative feedback
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiAdjustment = 0;
    let aiSummary = '';
    let keywordMatches = { found: [] as string[], missing: [] as string[] };
    let aiIssues: string[] = [];
    let aiRecs: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const systemPrompt = `You are a senior ATS (Applicant Tracking System) compliance expert. You evaluate resumes against the parsing rules used by Workday, Greenhouse, Lever, Taleo, and iCIMS.

Score this resume on ATS compatibility with industry-grade rigor:
- Parseability (clear sections, no tables/images/columns)
- Keyword coverage for the candidate's apparent target role
- Quantified achievements
- Verb strength and clarity
- Standard chronological structure
- Contact completeness

Return ONLY JSON (no markdown):
{
  "adjustment": <integer between -10 and +10, your refinement to the heuristic score>,
  "summary": "<one-sentence overall verdict>",
  "foundKeywords": [<up to 15 strong industry keywords actually present>],
  "missingKeywords": [<up to 10 high-value keywords the candidate's apparent role would expect, that are missing>],
  "issues": [<up to 5 specific things hurting the ATS score>],
  "recommendations": [<up to 5 concrete, prioritized improvements>]
}`;

        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Heuristic ATS score so far: ${heuristicPct}/100.\n\nResume:\n---\n${resumeText}\n---` },
            ],
            temperature: 0.2,
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          const content = data.choices?.[0]?.message?.content ?? '';
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            aiAdjustment = Math.max(-10, Math.min(10, parseInt(parsed.adjustment) || 0));
            aiSummary = String(parsed.summary || '');
            keywordMatches.found = Array.isArray(parsed.foundKeywords) ? parsed.foundKeywords.slice(0, 15) : [];
            keywordMatches.missing = Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.slice(0, 10) : [];
            aiIssues = Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [];
            aiRecs = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [];
          }
        }
      } catch (err) {
        console.error('AI augmentation failed:', err);
      }
    }

    const overallScore = Math.max(0, Math.min(100, heuristicPct + aiAdjustment));
    const rating: ATSResult['rating'] =
      overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Poor';

    const result: ATSResult = {
      overallScore,
      rating,
      summary: aiSummary || (
        rating === 'Excellent' ? 'Your resume is highly ATS-optimized and should parse cleanly through major tracking systems.'
        : rating === 'Good' ? 'Your resume is mostly ATS-friendly with a few areas to improve for stronger keyword matching.'
        : rating === 'Fair' ? 'Your resume will pass basic ATS parsing but is missing structure and keywords needed to rank well.'
        : 'Your resume has significant ATS issues that will likely prevent it from reaching a human reviewer.'
      ),
      categories: heuristic.categories,
      issues: [...heuristic.issues, ...aiIssues].slice(0, 10),
      recommendations: [...heuristic.recommendations, ...aiRecs].slice(0, 10),
      keywordMatches,
    };

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ats-score error:', err);
    return new Response(JSON.stringify({ error: 'Failed to compute ATS score' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

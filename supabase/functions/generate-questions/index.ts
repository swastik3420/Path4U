import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Difficulty = 'Basic' | 'Intermediate' | 'Advanced';

interface GeneratedQuestion {
  id: number;
  skill: string;
  skillTested: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildSystemPrompt(): string {
  return `You are a Senior Principal Engineer and Technical Interviewer designing a high-signal MCQ assessment. Your job is to produce rigorous, scenario-calibrated questions that stay within their assigned difficulty band.

DIFFICULTY CALIBRATION — each question MUST match its assigned tier exactly. Do not leak hard edge cases into Basic slots, and do not waste Advanced slots on trivia.

BASIC (Difficulty 1-2) — BEGINNER / ENTRY-LEVEL ONLY:
- Test fundamental definitions, core concepts, basic terminology, and keyword/syntax recognition ONLY.
- Simple recall and recognition questions are ENCOURAGED at this tier: "What is X?", "Which keyword is used for Y?", "What does Z do?", "Which of these is a valid A?" are all acceptable and expected.
- NO multi-step scenarios. NO edge cases. NO complex or multi-line code snippets (a single short line is OK). NO trade-off analysis. NO debugging scenarios. NO performance discussions.
- Target audience: someone who just finished a beginner tutorial or intro course. If a junior dev with 0-6 months experience would struggle, it does NOT belong in Basic.
- Distractors must be obvious-to-an-expert but plausible-to-a-beginner: wrong keywords, wrong syntax, confused terminology, or mixing up two similar basic concepts.

INTERMEDIATE (Difficulty 3-4) — STANDARD 1-3 YEAR DEVELOPER INTERVIEW:
- Calibrate to what a typical 1-3 year developer is expected to know in a standard industry interview.
- Focus on practical day-to-day usage, common real-world edge cases developers actually hit, standard best practices, and idiomatic patterns.
- Include: correct API/method choice for a common task, standard error handling, common pitfalls (null/undefined, async ordering, off-by-one), typical design patterns, straightforward debugging.
- Should cleanly bridge Basic (definitions) and Advanced (deep internals/scale). Not trivia, not architecture.
- Distractors should be plausible anti-patterns, "sounds right but subtly wrong" answers, or the mistake a dev makes before learning the idiomatic approach.
- Avoid deep internals, framework source-level mechanics, distributed-systems edge cases, or high-concurrency scenarios — those belong in Advanced.

ADVANCED (Difficulty 5):
- Reserved strictly for deep architecture, internal mechanics, high-concurrency/edge cases, complex scale trade-offs, and subtle anti-patterns.
- Questions must require systems thinking: e.g., thread-safety under load, memory/CPU trade-offs at scale, distributed consistency, framework internals, compiler/runtime behavior, or non-obvious security implications.
- Distractors must be sophisticated: common misconceptions that even experienced engineers hold, or solutions that work in small cases but fail at scale or under concurrency.

STRICT RULES — every question MUST comply:
1. For INTERMEDIATE and ADVANCED tiers only: avoid generic definition/recall questions. Ban "What is X?", "Define Y", "What does Z stand for?" at those tiers. BASIC tier is EXEMPT — definition/recall/terminology questions are the required style for Basic.
2. INTERMEDIATE and ADVANCED questions MUST be scenario-driven: a real engineering trade-off, debugging situation, performance/scaling bottleneck, architectural decision, subtle language/tool mechanic, edge case, or "why X over Y under constraint Z" comparison. BASIC questions must stay simple recall/recognition — no scenarios.
3. Distractors MUST be plausible and tier-appropriate. Basic distractors = wrong keywords, wrong terminology, or confused basic concepts; Intermediate distractors = plausible anti-patterns and subtle interaction errors; Advanced distractors = scale/concurrency/misconceptions.
4. Exactly 4 options. Exactly one unambiguously correct answer. correctAnswer is the 0-based index.
5. The explanation MUST justify why the correct answer is right AND briefly say why each notable distractor is wrong / what misconception it targets.
6. Question and options must be self-contained (no "see above", no code that can't fit inline). Short code snippets are welcome.
7. Do NOT reveal the answer inside the question or options text.

Output MUST be valid JSON only.`;
}

function buildUserPrompt(
  skills: string[],
  plan: { skill: string; difficulty: Difficulty }[],
  candidateContext: string,
): string {
  const planLines = plan
    .map((p, i) => `${i + 1}. skill="${p.skill}" difficulty=${p.difficulty}`)
    .join('\n');

  return `Candidate context (from parsed resume): ${candidateContext || 'general software engineer'}
Skills to assess: ${skills.join(', ')}

Generate EXACTLY ${plan.length} MCQs in the order below. For each slot, produce ONE question for the listed skill at the listed difficulty. Tailor wording to a candidate with the experience implied above — go deeper for skills that appear central to their stack.

Slots:
${planLines}

Difficulty calibration reminder:
- Basic slots: fundamentals, syntax, defaults, daily usage. No tricks or deep edge cases.
- Intermediate slots: practical application, error handling, real-world trade-offs, design patterns, moderate performance.
- Advanced slots: deep architecture, internals, high-concurrency/edge cases, scale trade-offs, subtle anti-patterns.

Return JSON in this exact shape (no markdown, no prose, no trailing text):
{
  "questions": [
    {
      "skillTested": "<skill from the slot>",
      "difficulty": "Basic" | "Intermediate" | "Advanced",
      "question": "<scenario-based prompt>",
      "options": ["<opt A>", "<opt B>", "<opt C>", "<opt D>"],
      "correctAnswer": 0,
      "explanation": "<why correct + why each notable distractor is wrong>"
    }
  ]
}`;
}

async function callGemini(system: string, user: string): Promise<any> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Response(
      JSON.stringify({
        error: res.status === 429
          ? 'Gemini rate limited. Please retry shortly.'
          : `Gemini API error (${res.status}): ${body}`,
      }),
      { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Empty Gemini response');
  return safeParseJson(content);
}

function safeParseJson(raw: string): any {
  let s = raw.trim();
  // Strip markdown fences if present
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) s = fence[1].trim();
  // Extract the outermost { ... }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);

  try { return JSON.parse(s); } catch (_) {}

  // Repair pass: fix common LLM JSON issues
  let repaired = s
    // Remove trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1')
    // Escape stray control chars inside strings by replacing raw newlines/tabs
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  try { return JSON.parse(repaired); } catch (_) {}

  // Last resort: try to salvage the questions array by parsing individual objects
  try {
    const questions: any[] = [];
    const objRegex = /\{[^{}]*"question"[\s\S]*?"explanation"[\s\S]*?\}/g;
    const matches = repaired.match(objRegex) || [];
    for (const m of matches) {
      try {
        const fixed = m.replace(/,(\s*[}\]])/g, '$1');
        questions.push(JSON.parse(fixed));
      } catch { /* skip */ }
    }
    if (questions.length > 0) return { questions };
  } catch (_) {}

  throw new Error('Failed to parse Gemini JSON response');
}

function buildPlan(skills: string[], total: number): { skill: string; difficulty: Difficulty }[] {
  const basicTarget = Math.ceil(total / 3);
  const remainder = total - basicTarget;
  const intermediateTarget = Math.ceil(remainder / 2);
  const advancedTarget = total - basicTarget - intermediateTarget;
  const targets: [Difficulty, number][] = [
    ['Basic', basicTarget],
    ['Intermediate', intermediateTarget],
    ['Advanced', advancedTarget],
  ];

  const plan: { skill: string; difficulty: Difficulty }[] = [];
  targets.forEach(([diff, count], di) => {
    const rotated = [...skills.slice(di % skills.length), ...skills.slice(0, di % skills.length)];
    for (let i = 0; i < count; i++) {
      plan.push({ skill: rotated[i % rotated.length], difficulty: diff });
    }
  });
  return plan;
}

function validateQuestions(raw: any, plan: { skill: string; difficulty: Difficulty }[]): GeneratedQuestion[] {
  const arr = Array.isArray(raw?.questions) ? raw.questions : [];
  const out: GeneratedQuestion[] = [];
  for (let i = 0; i < plan.length; i++) {
    const q = arr[i];
    if (!q) continue;
    const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [];
    const correct = Number(q.correctAnswer);
    if (
      typeof q.question !== 'string' ||
      options.length !== 4 ||
      !Number.isInteger(correct) ||
      correct < 0 || correct > 3 ||
      typeof q.explanation !== 'string'
    ) continue;
    const skill = String(q.skillTested || plan[i].skill);
    out.push({
      id: out.length + 1,
      skill,
      skillTested: skill,
      difficulty: (['Basic', 'Intermediate', 'Advanced'].includes(q.difficulty) ? q.difficulty : plan[i].difficulty) as Difficulty,
      question: q.question.trim(),
      options,
      correctAnswer: correct,
      explanation: q.explanation.trim(),
    });
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { skills, count, candidateContext } = await req.json();
    const totalQuestions = Math.max(3, Math.min(30, Number(count) || 30));

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return new Response(JSON.stringify({ error: 'Skills array is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const skillNames = skills
      .map((s: any) => (typeof s === 'string' ? s : s?.name))
      .filter((s: any) => typeof s === 'string' && s.trim())
      .slice(0, 50);

    if (skillNames.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid skill names provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plan = buildPlan(skillNames, totalQuestions);
    const context = typeof candidateContext === 'string' ? candidateContext.slice(0, 800) : '';

    // Generation pass
    const genRaw = await callGemini(buildSystemPrompt(), buildUserPrompt(skillNames, plan, context));
    let questions = validateQuestions(genRaw, plan);

    // Verification pass: Senior Technical Interviewer audits and fixes any weak or incorrect items.
    if (questions.length > 0) {
      const auditSystem = `You are a Senior Technical Interviewer auditing an MCQ set for correctness, rigor, and difficulty calibration.
For each question:
- Verify the marked correctAnswer is factually correct. If wrong, fix correctAnswer OR rewrite options so exactly one is correct.
- Reject and rewrite any generic definition/recall question into a scenario/edge-case question at the same difficulty and skill.
- Enforce the difficulty tier strictly:
  * Basic must test fundamentals, syntax, defaults, and daily usage with no deep edge cases or architectural trade-offs. Distractors must be standard syntax/logic mistakes.
  * Intermediate must test practical application, error handling, real-world trade-offs between two options, design patterns, and moderate performance. Distractors must be plausible anti-patterns or subtle interaction errors.
  * Advanced must test deep architecture, internals, high-concurrency/edge cases, scale trade-offs, and subtle anti-patterns. Distractors must be sophisticated misconceptions that experienced engineers could hold.
- If a question is miscalibrated (too hard or too easy for its labeled difficulty), rewrite it to fit the tier.
- Ensure explanations defend the correct answer and refute distractors clearly.
Return the FULL corrected set as JSON in the same schema.`;
      const auditUser = `Audit and return the corrected set as JSON:
{"questions": ${JSON.stringify(questions.map(q => ({
        skillTested: q.skillTested,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })))}}`;
      try {
        const auditRaw = await callGemini(auditSystem, auditUser);
        const audited = validateQuestions(auditRaw, plan);
        if (audited.length >= questions.length) questions = audited;
      } catch (e) {
        console.warn('Audit pass failed, using generation output:', e);
      }
    }

    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to generate valid questions' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generated ${questions.length}/${totalQuestions} questions across ${skillNames.length} skills`);

    return new Response(JSON.stringify({ success: true, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error in generate-questions:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

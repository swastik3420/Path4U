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
  return `You are a Senior Principal Engineer and Technical Interviewer designing a high-signal MCQ assessment.

STRICT RULES — every question MUST comply:
1. NEVER ask generic definition/recall questions. Ban "What is X?", "Define Y", "What does Z stand for?", "Which of these is X?", or any question answerable by reading a one-line docs blurb.
2. Every question MUST be scenario-driven: a real engineering trade-off, a debugging situation, a performance/scaling bottleneck, an architectural decision, a subtle language/tool mechanic, an edge case, or a "why X over Y under constraint Z" comparison.
3. Distractors MUST be plausible — encode common misconceptions, anti-patterns, off-by-one/ordering mistakes, deprecated advice, or "sounds right but subtly wrong" reasoning. NO obvious throwaway options, NO "All of the above", NO joke answers.
4. Exactly 4 options. Exactly one unambiguously correct answer. correctAnswer is the 0-based index.
5. The explanation MUST justify why the correct answer is right AND briefly say why each notable distractor is wrong / what misconception it targets.
6. Calibrate difficulty:
   - Basic: applied usage a working practitioner hits weekly (not trivia).
   - Intermediate: non-obvious behavior, interactions between features, common pitfalls.
   - Advanced: internals, performance/consistency trade-offs, architectural or concurrency edge cases.
7. Question and options must be self-contained (no "see above", no code that can't fit inline). Short code snippets are welcome.
8. Do NOT reveal the answer inside the question or options text.

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
  return JSON.parse(content);
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
      const auditSystem = `You are a Senior Technical Interviewer auditing an MCQ set for correctness and rigor.
For each question:
- Verify the marked correctAnswer is factually correct. If wrong, fix correctAnswer OR rewrite options so exactly one is correct.
- Reject and rewrite any generic definition/recall question into a scenario/edge-case question at the same difficulty and skill.
- Ensure distractors reflect real misconceptions, not filler.
- Ensure the explanation defends the correct answer and refutes distractors.
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

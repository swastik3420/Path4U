import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skills, experienceLevel, count } = await req.json();
    const totalQuestions = Math.max(3, Math.min(30, Number(count) || 30));
    const basicCount = Math.ceil(totalQuestions / 3);
    const intermediateCount = Math.ceil(totalQuestions / 3);
    const advancedCount = totalQuestions - basicCount - intermediateCount;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Skills array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (skills.length > 50) {
      console.warn('Oversized skills payload rejected:', skills.length);
      return new Response(
        JSON.stringify({ error: 'Too many skills provided (max 50).' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof experienceLevel === 'string' && experienceLevel.length > 100) {
      return new Response(
        JSON.stringify({ error: 'experienceLevel too long.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate string fields on each skill
    const truncStr = (v: unknown, max: number) =>
      typeof v === 'string' ? v.slice(0, max) : v;
    for (let i = 0; i < skills.length; i++) {
      const s = skills[i];
      if (typeof s === 'string') {
        skills[i] = s.slice(0, 200);
      } else if (s && typeof s === 'object') {
        s.name = truncStr(s.name, 200);
        s.category = truncStr(s.category, 100);
        s.proficiencyHint = truncStr(s.proficiencyHint, 50);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select skills for assessment — prioritize diverse categories, max 15 skills for 30 questions
    const skillObjects = skills.map((s: any) => typeof s === 'string' ? { name: s, category: 'Other', proficiencyHint: 'Intermediate' } : s);
    
    // Group by category and pick top from each for diversity
    const byCategory: Record<string, any[]> = {};
    for (const s of skillObjects) {
      const cat = s.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    }
    
    const selectedSkills: any[] = [];
    const categories = Object.keys(byCategory);
    let round = 0;
    while (selectedSkills.length < 15 && round < 10) {
      for (const cat of categories) {
        if (selectedSkills.length >= 15) break;
        if (byCategory[cat][round]) {
          selectedSkills.push(byCategory[cat][round]);
        }
      }
      round++;
    }

    const skillDescriptions = selectedSkills.map(s => 
      `${s.name} (${s.category}, estimated: ${s.proficiencyHint || 'Unknown'})`
    ).join('\n- ');

    console.log('Generating questions for', selectedSkills.length, 'skills, level:', experienceLevel);

    const systemPrompt = `You are an expert technical interviewer creating a comprehensive skill assessment. Your questions should accurately measure the candidate's real proficiency level across all their skills.

## Candidate Profile
- Experience Level: ${experienceLevel || 'Unknown'}
- Skills to assess:
- ${skillDescriptions}

## Requirements

Generate exactly ${totalQuestions} questions total:
- ${basicCount} Basic difficulty questions
- ${intermediateCount} Intermediate difficulty questions
- ${advancedCount} Advanced difficulty questions

Distribute questions across ALL the skills listed above to maximize coverage. Each skill should have at least 1 question. Spread the remaining questions to cover more aspects of each skill.

Question quality rules:
- Questions must be practical and test real-world knowledge, not trivia
- All 4 options must be plausible — no obviously wrong answers
- Only ONE correct answer per question
- Explanations should teach something useful
- Cover different aspects of each skill (don't repeat similar questions)
- Basic questions test fundamental concepts and syntax
- Intermediate questions test practical application and common patterns
- Advanced questions test deep understanding, edge cases, and architectural decisions

## Output Format

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "skill": "React",
    "difficulty": "Intermediate",
    "question": "What is the primary purpose of React's useCallback hook?",
    "options": [
      "To memoize a callback function to prevent unnecessary re-renders",
      "To create a new callback on every render for fresh closure values",
      "To replace the need for useEffect in event handlers",
      "To automatically debounce function calls"
    ],
    "correctAnswer": 0,
    "explanation": "useCallback memoizes a callback function so it maintains the same reference between renders, preventing unnecessary re-renders of child components that receive it as a prop."
  }
]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the assessment questions now for the skills listed above.` }
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let questions;
    try {
      // Strip markdown code fences if present
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      jsonStr = jsonStr.trim();
      
      // Find the outermost JSON array by matching brackets
      const startIdx = jsonStr.indexOf('[');
      if (startIdx === -1) throw new Error('No JSON array found');
      
      let depth = 0;
      let endIdx = -1;
      for (let i = startIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === '[') depth++;
        else if (jsonStr[i] === ']') {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        }
      }
      
      if (endIdx === -1) {
        // Array wasn't closed - try to fix by finding last complete object and closing
        const lastObjEnd = jsonStr.lastIndexOf('}');
        if (lastObjEnd > startIdx) {
          jsonStr = jsonStr.substring(startIdx, lastObjEnd + 1) + ']';
        } else {
          throw new Error('Cannot find valid JSON array');
        }
      } else {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
      
      questions = JSON.parse(jsonStr);
      
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }
      
      // Add IDs and validate structure
      questions = questions
        .filter((q: any) => q.question && q.options && Array.isArray(q.options) && q.options.length === 4)
        .map((q: any, index: number) => ({
          id: index + 1,
          skill: q.skill || 'General',
          difficulty: q.difficulty || 'Intermediate',
          question: q.question,
          options: q.options,
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || '',
        }));
      
      console.log('Generated', questions.length, 'valid questions');
      
      if (questions.length === 0) {
        throw new Error('No valid questions generated');
      }
    } catch (parseError) {
      console.error('Failed to parse questions:', parseError, 'Content:', content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse questions. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

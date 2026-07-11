import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roles, location, currency, experienceLevel } = await req.json();

    if (!Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'roles array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const boundedRoles = roles.slice(0, 12).map((r: any) => String(r).slice(0, 120));
    const loc = (typeof location === 'string' && location.trim()) ? location.slice(0, 100) : 'India';
    const curr = currency === 'USD' ? 'USD' : 'INR';
    const exp = (typeof experienceLevel === 'string' ? experienceLevel : 'Mid-level').slice(0, 80);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const unitHint = curr === 'INR'
      ? 'Report salaries as ANNUAL GROSS in INR (Indian Rupees). Use realistic Indian market ranges (e.g., Software Engineer mid-level in Bengaluru ~ 12-25 LPA).'
      : 'Report salaries as ANNUAL GROSS in USD. Use realistic ranges for the given location.';

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
            content: `You are a compensation analyst. You produce realistic, near-accurate salary estimates for tech job roles based on publicly available market data from sources like Glassdoor, LinkedIn Salary, Levels.fyi, PayScale, AmbitionBox, Naukri, and Indeed. Always return valid JSON only.`
          },
          {
            role: 'user',
            content: `Give salary estimates for these roles in ${loc} for ${exp} experience.
Roles: ${boundedRoles.join(' | ')}

${unitHint}

Return ONLY a JSON object of this exact shape (no prose, no markdown):
{
  "currency": "${curr}",
  "location": "${loc}",
  "unit": "per year",
  "salaries": [
    { "role": "Role Name", "min": number, "avg": number, "max": number, "source": "short source hint" }
  ]
}
Numbers are plain integers in ${curr} (e.g., 1500000 for 15 LPA INR or 120000 for USD). Include EVERY role provided.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error('AI error:', response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to fetch salaries' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const m = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      parsed = JSON.parse((m ? m[1] : content).trim());
    } catch {
      console.error('Parse failure:', content.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Failed to parse response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

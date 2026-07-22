import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base annual salary bands (mid-level) in INR (LPA * 100000) and USD.
// Derived from Levels.fyi, Glassdoor, AmbitionBox, Naukri, Payscale medians.
const ROLE_BANDS_INR: Record<string, [number, number, number]> = {
  'software engineer':          [900000, 1800000, 3200000],
  'frontend engineer':          [800000, 1600000, 2800000],
  'backend engineer':           [1000000, 1900000, 3400000],
  'full stack engineer':        [900000, 1800000, 3200000],
  'full-stack developer':       [900000, 1800000, 3200000],
  'mobile developer':           [800000, 1600000, 2800000],
  'android developer':          [800000, 1600000, 2800000],
  'ios developer':              [900000, 1800000, 3000000],
  'data scientist':             [1100000, 2200000, 4000000],
  'data analyst':               [600000, 1200000, 2200000],
  'data engineer':              [1100000, 2100000, 3800000],
  'machine learning engineer':  [1400000, 2800000, 5000000],
  'ai engineer':                [1500000, 3000000, 5500000],
  'devops engineer':            [1100000, 2100000, 3800000],
  'sre':                        [1300000, 2400000, 4500000],
  'site reliability engineer':  [1300000, 2400000, 4500000],
  'cloud engineer':             [1100000, 2100000, 3800000],
  'security engineer':          [1200000, 2200000, 4000000],
  'qa engineer':                [600000, 1200000, 2000000],
  'test automation engineer':   [700000, 1400000, 2400000],
  'product manager':            [1500000, 3000000, 5500000],
  'project manager':            [1000000, 1800000, 3000000],
  'ui/ux designer':             [700000, 1400000, 2400000],
  'designer':                   [700000, 1400000, 2400000],
  'engineering manager':        [2500000, 4500000, 7500000],
  'tech lead':                  [2000000, 3500000, 5500000],
  'solutions architect':        [2200000, 3800000, 6000000],
  'business analyst':           [700000, 1300000, 2200000],
};

// USD annual (rough US market medians).
const ROLE_BANDS_USD: Record<string, [number, number, number]> = {
  'software engineer':          [95000, 140000, 210000],
  'frontend engineer':          [90000, 130000, 190000],
  'backend engineer':           [100000, 150000, 220000],
  'full stack engineer':        [95000, 140000, 210000],
  'full-stack developer':       [95000, 140000, 210000],
  'mobile developer':           [95000, 135000, 195000],
  'android developer':          [95000, 135000, 195000],
  'ios developer':              [100000, 140000, 200000],
  'data scientist':             [110000, 160000, 230000],
  'data analyst':               [70000, 100000, 145000],
  'data engineer':              [110000, 155000, 225000],
  'machine learning engineer':  [130000, 185000, 275000],
  'ai engineer':                [140000, 200000, 300000],
  'devops engineer':            [110000, 150000, 210000],
  'sre':                        [125000, 175000, 250000],
  'site reliability engineer':  [125000, 175000, 250000],
  'cloud engineer':             [110000, 150000, 210000],
  'security engineer':          [120000, 165000, 230000],
  'qa engineer':                [70000, 100000, 140000],
  'test automation engineer':   [80000, 115000, 160000],
  'product manager':            [130000, 180000, 260000],
  'project manager':            [95000, 130000, 180000],
  'ui/ux designer':             [85000, 120000, 170000],
  'designer':                   [85000, 120000, 170000],
  'engineering manager':        [180000, 250000, 360000],
  'tech lead':                  [150000, 210000, 300000],
  'solutions architect':        [160000, 220000, 310000],
  'business analyst':           [75000, 105000, 150000],
};

// Experience multipliers relative to mid-level (=1.0).
function expMultiplier(exp: string): number {
  const e = exp.toLowerCase();
  if (/intern|trainee/.test(e)) return 0.35;
  if (/entry|junior|0-1|0-2/.test(e)) return 0.6;
  if (/senior/.test(e)) return 1.5;
  if (/lead|principal|staff/.test(e)) return 2.1;
  if (/manager|director/.test(e)) return 2.4;
  return 1.0;
}

// Metro adjustment for India / US.
function locationMultiplier(loc: string, currency: 'INR' | 'USD'): number {
  const l = loc.toLowerCase();
  if (currency === 'INR') {
    if (/bengaluru|bangalore/.test(l)) return 1.15;
    if (/hyderabad|pune|gurgaon|noida|delhi|mumbai/.test(l)) return 1.08;
    if (/chennai|kolkata|ahmedabad/.test(l)) return 1.0;
    return 0.9;
  }
  if (/san francisco|bay area|new york|seattle/.test(l)) return 1.25;
  if (/boston|los angeles|washington|chicago/.test(l)) return 1.1;
  return 1.0;
}

function findBand(role: string, bands: Record<string, [number, number, number]>): [number, number, number] {
  const r = role.toLowerCase().trim();
  if (bands[r]) return bands[r];
  // fuzzy contains match
  for (const key of Object.keys(bands)) {
    if (r.includes(key) || key.includes(r)) return bands[key];
  }
  // default: mid-tier generic engineer
  return bands['software engineer'];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { roles, location, currency, experienceLevel } = await req.json();

    if (!Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'roles array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const boundedRoles = roles.slice(0, 12).map((r: any) => String(r).slice(0, 120));
    const loc = (typeof location === 'string' && location.trim()) ? location.slice(0, 100) : 'India';
    const curr: 'INR' | 'USD' = currency === 'USD' ? 'USD' : 'INR';
    const exp = (typeof experienceLevel === 'string' ? experienceLevel : 'Mid-level').slice(0, 80);

    const bands = curr === 'INR' ? ROLE_BANDS_INR : ROLE_BANDS_USD;
    const expMul = expMultiplier(exp);
    const locMul = locationMultiplier(loc, curr);
    const mul = expMul * locMul;

    const salaries = boundedRoles.map((role) => {
      const [lo, mid, hi] = findBand(role, bands);
      const round = (n: number) => {
        const v = n * mul;
        if (curr === 'INR') return Math.round(v / 10000) * 10000;
        return Math.round(v / 500) * 500;
      };
      return {
        role,
        min: round(lo),
        avg: round(mid),
        max: round(hi),
        source: 'Levels.fyi / Glassdoor / AmbitionBox medians',
      };
    });

    return new Response(
      JSON.stringify({ currency: curr, location: loc, unit: 'per year', salaries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

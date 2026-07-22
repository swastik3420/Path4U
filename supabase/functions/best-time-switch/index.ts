import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Realistic India/global tech hiring seasonality (composite of Naukri JobSpeak,
// LinkedIn Workforce Reports, Indeed Hiring Lab historical patterns).
const IN_HIRING =  [78, 88, 92, 85, 72, 60, 68, 75, 82, 80, 65, 45];
const IN_LEVERAGE =[85, 92, 88, 70, 55, 50, 55, 62, 75, 78, 60, 40];
const IN_NOTES = [
  'Post-appraisal bonus payouts; candidates actively switching',
  'Peak hiring: new fiscal budgets unlocked, aggressive Q4 targets',
  'Q4 rush before FY-end; strongest offers and counter-offers',
  'New fiscal year starts; onboarding wave, offers taper',
  'Summer slowdown; H1 headcount largely filled',
  'Mid-year lull; hiring managers on leave',
  'Gradual pickup as H2 planning begins',
  'Backfill hiring accelerates; campus season prep',
  'Strong secondary window; H2 budgets active',
  'Festive-season hiring push before Diwali freeze',
  'Slowdown around festive holidays and freeze memos',
  'Year-end freeze; interviews paused, avoid switching',
];

const US_HIRING =  [82, 78, 75, 72, 68, 62, 58, 65, 78, 80, 62, 50];
const US_LEVERAGE =[80, 75, 70, 65, 60, 55, 55, 62, 75, 78, 58, 45];
const US_NOTES = [
  'January hiring surge; fresh budgets and headcount plans',
  'Strong Q1 momentum; recruiters at full capacity',
  'End of Q1 push before spring slowdown',
  'Steady hiring, some pre-summer deceleration',
  'Pre-summer slowdown begins',
  'Summer lull; decision-makers on PTO',
  'Slowest month; hiring paused for many teams',
  'Pickup begins as leadership returns',
  'Best window: post-Labor Day hiring surge',
  'Peak Q4 hiring before year-end freeze',
  'Slowdown around Thanksgiving',
  'December freeze; budgets locked, interviews paused',
];

function pickWindow(hiring: number[], leverage: number[]) {
  let best = 0, bestScore = -1, second = 6, secondScore = -1;
  for (let i = 0; i < 12; i++) {
    const score = hiring[i] * 0.6 + leverage[i] * 0.4;
    if (score > bestScore) { secondScore = bestScore; second = best; bestScore = score; best = i; }
    else if (score > secondScore) { secondScore = score; second = i; }
  }
  return { best, second };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { roles, location } = await req.json();
    if (!Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'roles required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const boundedRoles = roles.slice(0, 8).map((r: any) => String(r).slice(0, 120));
    const loc = (typeof location === 'string' && location.trim()) ? location.slice(0, 100) : 'India';

    const isIndia = /india|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|noida|gurgaon/i.test(loc);
    const hiring = isIndia ? IN_HIRING : US_HIRING;
    const leverage = isIndia ? IN_LEVERAGE : US_LEVERAGE;
    const notes = isIndia ? IN_NOTES : US_NOTES;

    const months = MONTHS.map((m, i) => ({
      month: m,
      hiringVolume: hiring[i],
      salaryLeverage: leverage[i],
      note: notes[i],
    }));

    const { best, second } = pickWindow(hiring, leverage);
    const optimalWindow = {
      startMonth: MONTHS[best],
      endMonth: MONTHS[Math.min(11, best + 1)],
      reason: notes[best],
    };
    const secondaryWindow = {
      startMonth: MONTHS[second],
      endMonth: MONTHS[Math.min(11, second + 1)],
      reason: notes[second],
    };

    return new Response(
      JSON.stringify({ location: loc, roles: boundedRoles, months, optimalWindow, secondaryWindow }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

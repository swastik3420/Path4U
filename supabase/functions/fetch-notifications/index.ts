import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const today = new Date().toISOString().split("T")[0];

    const prompt = `You are a career and technology news aggregator. Generate exactly 12 realistic notifications split into two categories.

Return a JSON array of objects with these fields:
- id: unique string
- type: "job" or "news"
- title: concise title
- description: 1-2 sentence summary
- source: the company or news outlet name
- url: a realistic URL to the source (use real company career pages or tech news sites)
- timestamp: relative time like "2h ago", "5h ago", "1d ago"

For "job" type (6 items): Generate REAL-sounding current job openings from major companies (Google, Microsoft, Amazon, Meta, Apple, Netflix, Stripe, Spotify, etc). Include the role title, company, and location. Make them diverse across roles: software engineering, data science, cybersecurity, product management, design, DevOps. Use real career page URL patterns like https://careers.google.com/jobs/... 

For "news" type (6 items): Generate realistic current technology news about AI, ML, Cybersecurity, Hardware, Software, Cloud Computing. Use real tech news sources like TechCrunch, The Verge, Ars Technica, Wired, etc. Use realistic URL patterns.

Today's date is ${today}. Make timestamps relative to today.

Return ONLY the JSON array, no markdown.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You output valid JSON arrays only. No markdown fences." },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";

    // Clean markdown fences
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let notifications;
    try {
      notifications = JSON.parse(content);
    } catch {
      // Try to extract array
      const start = content.indexOf("[");
      const end = content.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        notifications = JSON.parse(content.slice(start, end + 1));
      } else {
        notifications = [];
      }
    }

    return new Response(JSON.stringify({ notifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.', notifications: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

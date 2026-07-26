const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationItem {
  id: string;
  type: "job" | "news";
  title: string;
  description: string;
  source: string;
  url: string;
  timestamp: string;
}

const JOB_POOL = [
  { title: "Senior Software Engineer, Search", source: "Google", url: "https://careers.google.com/jobs/results/" },
  { title: "Machine Learning Engineer II", source: "Google DeepMind", url: "https://deepmind.google/careers/" },
  { title: "Frontend Engineer, Ads", source: "Meta", url: "https://www.metacareers.com/jobs" },
  { title: "Data Scientist, Growth", source: "Meta", url: "https://www.metacareers.com/jobs" },
  { title: "Software Development Engineer II", source: "Amazon", url: "https://www.amazon.jobs/en/" },
  { title: "Applied Scientist, AWS Bedrock", source: "Amazon", url: "https://www.amazon.jobs/en/teams/aws" },
  { title: "Backend Engineer, Payments", source: "Stripe", url: "https://stripe.com/jobs/search" },
  { title: "Product Manager, Platform", source: "Stripe", url: "https://stripe.com/jobs/search" },
  { title: "iOS Engineer, Health", source: "Apple", url: "https://jobs.apple.com/en-us/search" },
  { title: "Silicon Design Verification Engineer", source: "Apple", url: "https://jobs.apple.com/en-us/search" },
  { title: "Senior DevOps Engineer", source: "Netflix", url: "https://jobs.netflix.com/jobs" },
  { title: "Security Engineer, Detection", source: "Netflix", url: "https://jobs.netflix.com/jobs" },
  { title: "Cloud Solutions Architect", source: "Microsoft", url: "https://careers.microsoft.com/us/en/search-results" },
  { title: "AI Research Engineer", source: "Microsoft", url: "https://careers.microsoft.com/us/en/search-results" },
  { title: "Full-stack Engineer, Personalization", source: "Spotify", url: "https://www.lifeatspotify.com/jobs" },
  { title: "Staff Data Engineer", source: "Airbnb", url: "https://careers.airbnb.com/positions/" },
  { title: "Design Systems Engineer", source: "Figma", url: "https://www.figma.com/careers/" },
  { title: "Site Reliability Engineer", source: "Cloudflare", url: "https://www.cloudflare.com/careers/jobs/" },
  { title: "LLM Infrastructure Engineer", source: "OpenAI", url: "https://openai.com/careers/search" },
  { title: "Product Designer, Enterprise", source: "Notion", url: "https://www.notion.so/careers" },
];

const NEWS_POOL = [
  { title: "New open-source LLM tops coding benchmarks", source: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/", desc: "A newly released open-weight model is outperforming several commercial peers on standard coding evaluations." },
  { title: "Cloud providers push custom AI silicon", source: "The Verge", url: "https://www.theverge.com/tech", desc: "Hyperscalers accelerate roadmap for in-house accelerators aimed at cutting inference costs at scale." },
  { title: "Zero-day exploit targets popular auth library", source: "Ars Technica", url: "https://arstechnica.com/security/", desc: "Security researchers disclose a critical vulnerability affecting session handling in a widely used package." },
  { title: "Rust adoption climbs in systems teams", source: "Wired", url: "https://www.wired.com/tag/software/", desc: "Large engineering orgs increasingly migrate performance-critical services from C++ to Rust." },
  { title: "Kubernetes 1.x introduces sidecar containers GA", source: "InfoQ", url: "https://www.infoq.com/cloud-computing/", desc: "The latest release stabilizes long-awaited sidecar lifecycle semantics for production workloads." },
  { title: "Serverless databases expand vector search", source: "TechCrunch", url: "https://techcrunch.com/category/enterprise/", desc: "Managed database vendors ship native vector indexes to court GenAI workloads." },
  { title: "AI coding assistants reshape hiring signals", source: "The Verge", url: "https://www.theverge.com/tech", desc: "Recruiters report a shift toward system design and code review skills as AI handles boilerplate." },
  { title: "New GPU architecture doubles inference throughput", source: "AnandTech", url: "https://www.anandtech.com/tag/gpus", desc: "Vendor claims major perf-per-watt gains driven by improved tensor core scheduling." },
  { title: "WebAssembly gains ground on the server", source: "Ars Technica", url: "https://arstechnica.com/gadgets/", desc: "Runtime vendors report meaningful production adoption for edge and plugin workloads." },
  { title: "Post-quantum crypto standards enter enterprise pilots", source: "Wired", url: "https://www.wired.com/tag/cryptography/", desc: "Large enterprises begin production trials of NIST-approved PQC algorithms across TLS stacks." },
  { title: "Data engineering shifts toward lakehouse-only stacks", source: "InfoQ", url: "https://www.infoq.com/data-engineering/", desc: "Teams consolidate warehouses and lakes to reduce pipeline duplication and cost." },
  { title: "Browser vendors ship new privacy sandbox APIs", source: "The Verge", url: "https://www.theverge.com/tech", desc: "Updated APIs aim to replace third-party cookies with attribution-preserving primitives." },
];

const LOCATIONS = ["Remote", "San Francisco, CA", "New York, NY", "Seattle, WA", "London, UK", "Bengaluru, India", "Dublin, IE", "Austin, TX"];
const TIMESTAMPS = ["1h ago", "2h ago", "4h ago", "6h ago", "9h ago", "12h ago", "18h ago", "1d ago", "2d ago"];

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jobs: NotificationItem[] = pickN(JOB_POOL, 6).map((j, i) => ({
      id: `job-${Date.now()}-${i}`,
      type: "job",
      title: `${j.title} — ${pick(LOCATIONS)}`,
      description: `${j.source} is hiring for ${j.title}. Competitive compensation and hybrid options available.`,
      source: j.source,
      url: j.url,
      timestamp: pick(TIMESTAMPS),
    }));

    const news: NotificationItem[] = pickN(NEWS_POOL, 6).map((n, i) => ({
      id: `news-${Date.now()}-${i}`,
      type: "news",
      title: n.title,
      description: n.desc,
      source: n.source,
      url: n.url,
      timestamp: pick(TIMESTAMPS),
    }));

    const notifications = [...jobs, ...news].sort(() => Math.random() - 0.5);

    return new Response(JSON.stringify({ notifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred.", notifications: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Predefined skill dictionary — keyword -> { name, category }
const SKILL_DICTIONARY: Record<string, { name: string; category: string }> = {
  // Programming Languages
  "javascript": { name: "JavaScript", category: "Programming Languages" },
  "typescript": { name: "TypeScript", category: "Programming Languages" },
  "python": { name: "Python", category: "Programming Languages" },
  "java": { name: "Java", category: "Programming Languages" },
  "c++": { name: "C++", category: "Programming Languages" },
  "c#": { name: "C#", category: "Programming Languages" },
  "\\bc\\b": { name: "C", category: "Programming Languages" },
  "go": { name: "Go", category: "Programming Languages" },
  "golang": { name: "Go", category: "Programming Languages" },
  "rust": { name: "Rust", category: "Programming Languages" },
  "ruby": { name: "Ruby", category: "Programming Languages" },
  "php": { name: "PHP", category: "Programming Languages" },
  "swift": { name: "Swift", category: "Programming Languages" },
  "kotlin": { name: "Kotlin", category: "Programming Languages" },
  "scala": { name: "Scala", category: "Programming Languages" },
  "r": { name: "R", category: "Programming Languages" },
  "matlab": { name: "MATLAB", category: "Programming Languages" },
  "perl": { name: "Perl", category: "Programming Languages" },
  "dart": { name: "Dart", category: "Programming Languages" },
  "objective-c": { name: "Objective-C", category: "Programming Languages" },
  "sql": { name: "SQL", category: "Programming Languages" },
  "bash": { name: "Bash", category: "Programming Languages" },
  "shell": { name: "Shell Scripting", category: "Programming Languages" },
  "html": { name: "HTML", category: "Programming Languages" },
  "html5": { name: "HTML5", category: "Programming Languages" },
  "css": { name: "CSS", category: "Programming Languages" },
  "css3": { name: "CSS3", category: "Programming Languages" },
  "sass": { name: "Sass", category: "Programming Languages" },
  "less": { name: "Less", category: "Programming Languages" },

  // Frameworks & Libraries
  "react": { name: "React", category: "Frameworks & Libraries" },
  "react.js": { name: "React", category: "Frameworks & Libraries" },
  "next.js": { name: "Next.js", category: "Frameworks & Libraries" },
  "nextjs": { name: "Next.js", category: "Frameworks & Libraries" },
  "angular": { name: "Angular", category: "Frameworks & Libraries" },
  "vue": { name: "Vue.js", category: "Frameworks & Libraries" },
  "vue.js": { name: "Vue.js", category: "Frameworks & Libraries" },
  "svelte": { name: "Svelte", category: "Frameworks & Libraries" },
  "node.js": { name: "Node.js", category: "Frameworks & Libraries" },
  "nodejs": { name: "Node.js", category: "Frameworks & Libraries" },
  "express": { name: "Express.js", category: "Frameworks & Libraries" },
  "nestjs": { name: "NestJS", category: "Frameworks & Libraries" },
  "django": { name: "Django", category: "Frameworks & Libraries" },
  "flask": { name: "Flask", category: "Frameworks & Libraries" },
  "fastapi": { name: "FastAPI", category: "Frameworks & Libraries" },
  "spring": { name: "Spring", category: "Frameworks & Libraries" },
  "spring boot": { name: "Spring Boot", category: "Frameworks & Libraries" },
  "rails": { name: "Ruby on Rails", category: "Frameworks & Libraries" },
  "laravel": { name: "Laravel", category: "Frameworks & Libraries" },
  ".net": { name: ".NET", category: "Frameworks & Libraries" },
  "asp.net": { name: "ASP.NET", category: "Frameworks & Libraries" },
  "flutter": { name: "Flutter", category: "Frameworks & Libraries" },
  "react native": { name: "React Native", category: "Frameworks & Libraries" },
  "tensorflow": { name: "TensorFlow", category: "Frameworks & Libraries" },
  "pytorch": { name: "PyTorch", category: "Frameworks & Libraries" },
  "keras": { name: "Keras", category: "Frameworks & Libraries" },
  "scikit-learn": { name: "Scikit-learn", category: "Frameworks & Libraries" },
  "sklearn": { name: "Scikit-learn", category: "Frameworks & Libraries" },
  "pandas": { name: "Pandas", category: "Frameworks & Libraries" },
  "numpy": { name: "NumPy", category: "Frameworks & Libraries" },
  "opencv": { name: "OpenCV", category: "Frameworks & Libraries" },
  "jquery": { name: "jQuery", category: "Frameworks & Libraries" },
  "bootstrap": { name: "Bootstrap", category: "Frameworks & Libraries" },
  "tailwind": { name: "Tailwind CSS", category: "Frameworks & Libraries" },
  "tailwindcss": { name: "Tailwind CSS", category: "Frameworks & Libraries" },
  "material-ui": { name: "Material UI", category: "Frameworks & Libraries" },
  "redux": { name: "Redux", category: "Frameworks & Libraries" },
  "graphql": { name: "GraphQL", category: "Frameworks & Libraries" },

  // Cloud & DevOps
  "aws": { name: "AWS", category: "Cloud & DevOps" },
  "amazon web services": { name: "AWS", category: "Cloud & DevOps" },
  "azure": { name: "Azure", category: "Cloud & DevOps" },
  "gcp": { name: "Google Cloud Platform", category: "Cloud & DevOps" },
  "google cloud": { name: "Google Cloud Platform", category: "Cloud & DevOps" },
  "docker": { name: "Docker", category: "Cloud & DevOps" },
  "kubernetes": { name: "Kubernetes", category: "Cloud & DevOps" },
  "k8s": { name: "Kubernetes", category: "Cloud & DevOps" },
  "terraform": { name: "Terraform", category: "Cloud & DevOps" },
  "ansible": { name: "Ansible", category: "Cloud & DevOps" },
  "jenkins": { name: "Jenkins", category: "Cloud & DevOps" },
  "ci/cd": { name: "CI/CD", category: "Cloud & DevOps" },
  "github actions": { name: "GitHub Actions", category: "Cloud & DevOps" },
  "gitlab ci": { name: "GitLab CI", category: "Cloud & DevOps" },
  "circleci": { name: "CircleCI", category: "Cloud & DevOps" },
  "nginx": { name: "Nginx", category: "Cloud & DevOps" },
  "apache": { name: "Apache", category: "Cloud & DevOps" },
  "linux": { name: "Linux", category: "Cloud & DevOps" },
  "ubuntu": { name: "Ubuntu", category: "Cloud & DevOps" },
  "heroku": { name: "Heroku", category: "Cloud & DevOps" },
  "vercel": { name: "Vercel", category: "Cloud & DevOps" },
  "netlify": { name: "Netlify", category: "Cloud & DevOps" },
  "serverless": { name: "Serverless", category: "Cloud & DevOps" },
  "lambda": { name: "AWS Lambda", category: "Cloud & DevOps" },

  // Databases
  "postgresql": { name: "PostgreSQL", category: "Databases" },
  "postgres": { name: "PostgreSQL", category: "Databases" },
  "mysql": { name: "MySQL", category: "Databases" },
  "mongodb": { name: "MongoDB", category: "Databases" },
  "redis": { name: "Redis", category: "Databases" },
  "sqlite": { name: "SQLite", category: "Databases" },
  "oracle": { name: "Oracle DB", category: "Databases" },
  "sql server": { name: "SQL Server", category: "Databases" },
  "dynamodb": { name: "DynamoDB", category: "Databases" },
  "cassandra": { name: "Cassandra", category: "Databases" },
  "elasticsearch": { name: "Elasticsearch", category: "Databases" },
  "firebase": { name: "Firebase", category: "Databases" },
  "supabase": { name: "Supabase", category: "Databases" },
  "neo4j": { name: "Neo4j", category: "Databases" },

  // Tools & Platforms
  "git": { name: "Git", category: "Tools & Platforms" },
  "github": { name: "GitHub", category: "Tools & Platforms" },
  "gitlab": { name: "GitLab", category: "Tools & Platforms" },
  "bitbucket": { name: "Bitbucket", category: "Tools & Platforms" },
  "jira": { name: "Jira", category: "Tools & Platforms" },
  "confluence": { name: "Confluence", category: "Tools & Platforms" },
  "figma": { name: "Figma", category: "Tools & Platforms" },
  "sketch": { name: "Sketch", category: "Tools & Platforms" },
  "adobe xd": { name: "Adobe XD", category: "Tools & Platforms" },
  "photoshop": { name: "Photoshop", category: "Tools & Platforms" },
  "illustrator": { name: "Illustrator", category: "Tools & Platforms" },
  "postman": { name: "Postman", category: "Tools & Platforms" },
  "vs code": { name: "VS Code", category: "Tools & Platforms" },
  "visual studio": { name: "Visual Studio", category: "Tools & Platforms" },
  "intellij": { name: "IntelliJ IDEA", category: "Tools & Platforms" },
  "eclipse": { name: "Eclipse", category: "Tools & Platforms" },
  "slack": { name: "Slack", category: "Tools & Platforms" },
  "trello": { name: "Trello", category: "Tools & Platforms" },
  "notion": { name: "Notion", category: "Tools & Platforms" },

  // Data & Analytics
  "machine learning": { name: "Machine Learning", category: "Data & Analytics" },
  "deep learning": { name: "Deep Learning", category: "Data & Analytics" },
  "data science": { name: "Data Science", category: "Data & Analytics" },
  "data analysis": { name: "Data Analysis", category: "Data & Analytics" },
  "data analytics": { name: "Data Analytics", category: "Data & Analytics" },
  "nlp": { name: "Natural Language Processing", category: "Data & Analytics" },
  "natural language processing": { name: "Natural Language Processing", category: "Data & Analytics" },
  "computer vision": { name: "Computer Vision", category: "Data & Analytics" },
  "tableau": { name: "Tableau", category: "Data & Analytics" },
  "power bi": { name: "Power BI", category: "Data & Analytics" },
  "excel": { name: "Excel", category: "Data & Analytics" },
  "spark": { name: "Apache Spark", category: "Data & Analytics" },
  "hadoop": { name: "Hadoop", category: "Data & Analytics" },
  "kafka": { name: "Kafka", category: "Data & Analytics" },
  "airflow": { name: "Apache Airflow", category: "Data & Analytics" },
  "etl": { name: "ETL", category: "Data & Analytics" },
  "data mining": { name: "Data Mining", category: "Data & Analytics" },
  "statistics": { name: "Statistics", category: "Data & Analytics" },
  "ai": { name: "Artificial Intelligence", category: "Data & Analytics" },
  "artificial intelligence": { name: "Artificial Intelligence", category: "Data & Analytics" },

  // Soft Skills
  "leadership": { name: "Leadership", category: "Soft Skills" },
  "communication": { name: "Communication", category: "Soft Skills" },
  "teamwork": { name: "Teamwork", category: "Soft Skills" },
  "problem solving": { name: "Problem Solving", category: "Soft Skills" },
  "problem-solving": { name: "Problem Solving", category: "Soft Skills" },
  "critical thinking": { name: "Critical Thinking", category: "Soft Skills" },
  "time management": { name: "Time Management", category: "Soft Skills" },
  "project management": { name: "Project Management", category: "Soft Skills" },
  "agile": { name: "Agile", category: "Soft Skills" },
  "scrum": { name: "Scrum", category: "Soft Skills" },
  "kanban": { name: "Kanban", category: "Soft Skills" },
  "collaboration": { name: "Collaboration", category: "Soft Skills" },
  "mentoring": { name: "Mentoring", category: "Soft Skills" },
  "presentation": { name: "Presentation", category: "Soft Skills" },
  "negotiation": { name: "Negotiation", category: "Soft Skills" },

  // Domain Knowledge
  "finance": { name: "Finance", category: "Domain Knowledge" },
  "healthcare": { name: "Healthcare", category: "Domain Knowledge" },
  "e-commerce": { name: "E-commerce", category: "Domain Knowledge" },
  "ecommerce": { name: "E-commerce", category: "Domain Knowledge" },
  "marketing": { name: "Marketing", category: "Domain Knowledge" },
  "seo": { name: "SEO", category: "Domain Knowledge" },
  "fintech": { name: "FinTech", category: "Domain Knowledge" },
  "saas": { name: "SaaS", category: "Domain Knowledge" },
  "blockchain": { name: "Blockchain", category: "Domain Knowledge" },
  "cybersecurity": { name: "Cybersecurity", category: "Domain Knowledge" },
  "security": { name: "Security", category: "Domain Knowledge" },
  "devops": { name: "DevOps", category: "Domain Knowledge" },

  // Testing
  "jest": { name: "Jest", category: "Other Technical" },
  "mocha": { name: "Mocha", category: "Other Technical" },
  "cypress": { name: "Cypress", category: "Other Technical" },
  "selenium": { name: "Selenium", category: "Other Technical" },
  "playwright": { name: "Playwright", category: "Other Technical" },
  "junit": { name: "JUnit", category: "Other Technical" },
  "pytest": { name: "Pytest", category: "Other Technical" },
  "tdd": { name: "TDD", category: "Other Technical" },
  "rest api": { name: "REST API", category: "Other Technical" },
  "restful": { name: "RESTful APIs", category: "Other Technical" },
  "microservices": { name: "Microservices", category: "Other Technical" },
  "websockets": { name: "WebSockets", category: "Other Technical" },
  "oauth": { name: "OAuth", category: "Other Technical" },
  "jwt": { name: "JWT", category: "Other Technical" },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSkills(text: string): Array<{ name: string; category: string; proficiencyHint: string }> {
  const lower = text.toLowerCase();
  const found = new Map<string, { name: string; category: string; count: number }>();

  for (const [keyword, meta] of Object.entries(SKILL_DICTIONARY)) {
    // If keyword already looks like regex (contains \b), use as-is; else build word-boundary pattern
    let pattern: RegExp;
    if (keyword.startsWith("\\b")) {
      pattern = new RegExp(keyword, "gi");
    } else {
      const escaped = escapeRegex(keyword);
      // Use lookaround-ish boundaries for tokens containing symbols like +, #, .
      pattern = new RegExp(`(^|[^a-z0-9+#.])${escaped}(?![a-z0-9+#])`, "gi");
    }
    const matches = lower.match(pattern);
    if (matches && matches.length > 0) {
      const existing = found.get(meta.name);
      if (existing) {
        existing.count += matches.length;
      } else {
        found.set(meta.name, { name: meta.name, category: meta.category, count: matches.length });
      }
    }
  }

  return Array.from(found.values()).map((s) => ({
    name: s.name,
    category: s.category,
    proficiencyHint: s.count >= 3 ? "Advanced" : s.count === 2 ? "Intermediate" : "Beginner",
  }));
}

function detectExperienceLevel(text: string): string {
  const lower = text.toLowerCase();

  // Look for years of experience
  const yearMatches = [...lower.matchAll(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi)];
  let maxYears = 0;
  for (const m of yearMatches) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > maxYears) maxYears = n;
  }

  if (maxYears >= 8) return "Staff/Principal";
  if (maxYears >= 5) return "Senior Level";
  if (maxYears >= 2) return "Mid Level";
  if (maxYears > 0) return "Entry Level";

  // Fallback: keyword hints
  if (/\b(principal|staff engineer|architect|distinguished)\b/i.test(text)) return "Staff/Principal";
  if (/\b(senior|sr\.|lead|manager)\b/i.test(text)) return "Senior Level";
  if (/\b(intern|internship|junior|jr\.|trainee|student|fresher|graduate)\b/i.test(text)) return "Entry Level";
  if (/\b(mid[- ]level|software engineer|developer|analyst)\b/i.test(text)) return "Mid Level";

  return "Entry Level";
}

function extractJobTitles(text: string): string[] {
  const titles = new Set<string>();
  const patterns = [
    /\b(Software Engineer|Software Developer|Full[- ]Stack Developer|Frontend Developer|Front[- ]End Developer|Backend Developer|Back[- ]End Developer|Web Developer|Mobile Developer|iOS Developer|Android Developer|Data Scientist|Data Analyst|Data Engineer|Machine Learning Engineer|ML Engineer|AI Engineer|DevOps Engineer|Site Reliability Engineer|SRE|Cloud Engineer|Security Engineer|QA Engineer|Test Engineer|Product Manager|Project Manager|Program Manager|Engineering Manager|Technical Lead|Tech Lead|Team Lead|Solutions Architect|Software Architect|Systems Analyst|Business Analyst|UX Designer|UI Designer|Product Designer|Graphic Designer|Intern|Consultant|Research Scientist|Research Engineer|Database Administrator|DBA|Network Engineer|Systems Engineer)\b/gi,
  ];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) {
      for (const m of matches) {
        // Normalize casing
        titles.add(m.replace(/\s+/g, " ").trim());
      }
    }
  }
  return Array.from(titles).slice(0, 10);
}

function extractIndustries(text: string): string[] {
  const industries = new Set<string>();
  const map: Record<string, string> = {
    "fintech": "FinTech",
    "finance": "Finance",
    "banking": "Banking",
    "healthcare": "Healthcare",
    "health tech": "HealthTech",
    "e-commerce": "E-commerce",
    "ecommerce": "E-commerce",
    "retail": "Retail",
    "education": "Education",
    "edtech": "EdTech",
    "gaming": "Gaming",
    "media": "Media",
    "entertainment": "Entertainment",
    "telecommunications": "Telecommunications",
    "logistics": "Logistics",
    "manufacturing": "Manufacturing",
    "automotive": "Automotive",
    "aerospace": "Aerospace",
    "energy": "Energy",
    "insurance": "Insurance",
    "real estate": "Real Estate",
    "consulting": "Consulting",
    "government": "Government",
    "non-profit": "Non-profit",
    "saas": "SaaS",
    "technology": "Technology",
  };
  const lower = text.toLowerCase();
  for (const [kw, name] of Object.entries(map)) {
    if (lower.includes(kw)) industries.add(name);
  }
  if (industries.size === 0) industries.add("Technology");
  return Array.from(industries);
}

function buildSummary(
  skills: Array<{ name: string }>,
  experienceLevel: string,
  jobTitles: string[],
  industries: string[],
): string {
  const topSkills = skills.slice(0, 5).map((s) => s.name).join(", ");
  const roleText = jobTitles.length > 0 ? jobTitles.slice(0, 2).join(" / ") : "professional";
  const industryText = industries.length > 0 ? industries.slice(0, 2).join(" and ") : "technology";
  return `${experienceLevel} ${roleText} with experience across ${industryText}. Core strengths include ${topSkills || "various technical skills"}. Well-suited for roles that leverage this technical background.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_RESUME_CHARS = 50000;
    if (resumeText.length > MAX_RESUME_CHARS) {
      return new Response(
        JSON.stringify({ error: `Resume text too long (max ${MAX_RESUME_CHARS} characters)` }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing resume locally, text length:', resumeText.length);

    const skills = extractSkills(resumeText);
    const experienceLevel = detectExperienceLevel(resumeText);
    const jobTitles = extractJobTitles(resumeText);
    const industries = extractIndustries(resumeText);
    const summary = buildSummary(skills, experienceLevel, jobTitles, industries);

    if (skills.length === 0) {
      // Provide a small fallback so downstream flows still work
      skills.push(
        { name: "Communication", category: "Soft Skills", proficiencyHint: "Intermediate" },
        { name: "Problem Solving", category: "Soft Skills", proficiencyHint: "Intermediate" },
      );
    }

    const parsedResume = {
      skills,
      experienceLevel,
      jobTitles,
      industries,
      summary,
    };

    console.log(`Extracted ${skills.length} skills, level: ${experienceLevel}`);

    return new Response(
      JSON.stringify({ success: true, data: parsedResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-resume:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

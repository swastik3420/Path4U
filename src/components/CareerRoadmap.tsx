import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Map, Loader2, CheckCircle2, Circle, ArrowRight, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedResume } from "@/lib/api/career";

interface SkillResult {
  skill: string;
  score: number;
  level: string;
}

interface RoadmapStep {
  title: string;
  description: string;
  timeframe: string;
  skills: string[];
  completed: boolean;
}

interface RoleRoadmap {
  role: string;
  steps: RoadmapStep[];
}

interface CareerRoadmapProps {
  results: SkillResult[];
  parsedResume?: ParsedResume | null;
}

const CareerRoadmap = ({ results, parsedResume }: CareerRoadmapProps) => {
  const [roadmaps, setRoadmaps] = useState<RoleRoadmap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(0);

  useEffect(() => {
    generateRoadmap();
  }, [results, parsedResume]);

  const generateRoadmap = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-job-roles', {
        body: {
          skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
          experienceLevel: parsedResume?.experienceLevel || 'Unknown',
          industries: parsedResume?.industries || [],
          jobTitles: parsedResume?.jobTitles || [],
          includeRoadmap: true,
        }
      });

      if (error) throw error;

      const topRoles = (data?.roles || []).slice(0, 3);
      const userSkills = results.map(r => r.skill.toLowerCase());

      // Generate roadmaps from top roles
      const generated: RoleRoadmap[] = topRoles.map((role: { role: string; probability: number }) => ({
        role: role.role,
        steps: generateStepsForRole(role.role, role.probability, userSkills),
      }));

      setRoadmaps(generated);
    } catch (err) {
      console.error('Error generating roadmap:', err);
      setRoadmaps([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateStepsForRole = (role: string, probability: number, userSkills: string[]): RoadmapStep[] => {
    type StepTemplate = { title: string; desc: string; time: string; skills: string[] };

    const templates: { match: RegExp; steps: StepTemplate[] }[] = [
      {
        match: /front[\s-]?end|react|vue|angular|ui\s?developer/i,
        steps: [
          { title: "Master Modern JavaScript", desc: "Deepen ES6+, TypeScript, and browser APIs fluency", time: "1-2 months", skills: ["TypeScript", "ES6+", "DOM APIs"] },
          { title: "Component Architecture", desc: "Build scalable UIs with React and state management", time: "2 months", skills: ["React", "Redux/Zustand", "Hooks"] },
          { title: "Performance & Testing", desc: "Optimize rendering, bundle size, and add tests", time: "1-2 months", skills: ["Vite", "Jest", "Lighthouse"] },
          { title: "Ship Production UIs", desc: "Deploy polished apps with accessibility and design systems", time: "1 month", skills: ["Tailwind", "A11y", "Storybook"] },
        ],
      },
      {
        match: /back[\s-]?end|api|server|node|django|rails|spring/i,
        steps: [
          { title: "Server Fundamentals", desc: "Design REST/GraphQL APIs and handle auth", time: "1-2 months", skills: ["Node.js", "REST", "JWT"] },
          { title: "Databases & Modeling", desc: "Master SQL/NoSQL schema design and query tuning", time: "2 months", skills: ["PostgreSQL", "Indexing", "ORMs"] },
          { title: "Scale & Reliability", desc: "Add caching, queues, observability, and CI/CD", time: "2 months", skills: ["Redis", "Docker", "Logging"] },
          { title: "System Design Prep", desc: "Practice distributed systems and interview scenarios", time: "1 month", skills: ["System Design", "Kafka", "Microservices"] },
        ],
      },
      {
        match: /full[\s-]?stack/i,
        steps: [
          { title: "End-to-End Basics", desc: "Wire a frontend to a backend with auth and DB", time: "1-2 months", skills: ["React", "Node.js", "SQL"] },
          { title: "Production Patterns", desc: "Add validation, error handling, and testing across the stack", time: "2 months", skills: ["Zod", "Testing", "TypeScript"] },
          { title: "DevOps Foundations", desc: "Containerize, deploy, and monitor a real product", time: "1-2 months", skills: ["Docker", "CI/CD", "Monitoring"] },
          { title: "Portfolio Product", desc: "Ship a polished full-stack SaaS-style project", time: "1-2 months", skills: ["Payments", "Auth", "Deployment"] },
        ],
      },
      {
        match: /data\s?scien|machine\s?learning|ml\s?engineer|ai\s?engineer/i,
        steps: [
          { title: "Math & Python Toolkit", desc: "Strengthen linear algebra, stats, and pandas/NumPy", time: "1-2 months", skills: ["Python", "Statistics", "Pandas"] },
          { title: "Classical ML", desc: "Build regression, classification, and clustering models", time: "2 months", skills: ["scikit-learn", "Feature Eng", "Model Eval"] },
          { title: "Deep Learning", desc: "Train neural nets for vision or NLP tasks", time: "2-3 months", skills: ["PyTorch", "Transformers", "GPU Training"] },
          { title: "MLOps & Deployment", desc: "Serve models with APIs and monitor drift", time: "1-2 months", skills: ["MLflow", "FastAPI", "Docker"] },
        ],
      },
      {
        match: /data\s?analy|business\s?intel|bi\s?analyst/i,
        steps: [
          { title: "SQL & Spreadsheets", desc: "Master analytical SQL and advanced Excel/Sheets", time: "1 month", skills: ["SQL", "Excel", "Joins"] },
          { title: "Visualization", desc: "Tell stories with dashboards in BI tools", time: "1-2 months", skills: ["Tableau", "Power BI", "Charts"] },
          { title: "Python for Analytics", desc: "Automate reports and run statistical analyses", time: "2 months", skills: ["Python", "Pandas", "Statistics"] },
          { title: "Business Case Studies", desc: "Deliver insight portfolios with real datasets", time: "1 month", skills: ["A/B Testing", "KPIs", "Storytelling"] },
        ],
      },
      {
        match: /devops|sre|platform|cloud\s?engineer/i,
        steps: [
          { title: "Linux & Networking", desc: "Command line, shell scripting, and networking basics", time: "1-2 months", skills: ["Bash", "Linux", "Networking"] },
          { title: "Cloud Foundations", desc: "Deploy infra on AWS/GCP with IaC", time: "2 months", skills: ["AWS", "Terraform", "IAM"] },
          { title: "Containers & K8s", desc: "Run production workloads on Kubernetes", time: "2 months", skills: ["Docker", "Kubernetes", "Helm"] },
          { title: "Observability & CI/CD", desc: "Build pipelines, monitoring, and on-call readiness", time: "1-2 months", skills: ["Prometheus", "GitHub Actions", "Grafana"] },
        ],
      },
      {
        match: /mobile|android|ios|flutter|react\s?native/i,
        steps: [
          { title: "Platform Basics", desc: "Learn the target platform's UI and lifecycle", time: "1-2 months", skills: ["Kotlin/Swift", "UI Kit", "Navigation"] },
          { title: "State & Networking", desc: "Handle async data, storage, and offline UX", time: "2 months", skills: ["REST", "Local DB", "State Mgmt"] },
          { title: "Native Integrations", desc: "Push notifications, camera, and device APIs", time: "1-2 months", skills: ["Push", "Camera", "Permissions"] },
          { title: "Ship to Stores", desc: "Publish, monitor crashes, and iterate", time: "1 month", skills: ["Play Store", "App Store", "Crashlytics"] },
        ],
      },
      {
        match: /security|cyber|pentest|infosec/i,
        steps: [
          { title: "Security Foundations", desc: "Networking, OS internals, and threat modeling", time: "1-2 months", skills: ["Networking", "Linux", "OWASP"] },
          { title: "Offensive Basics", desc: "Web, network, and cloud pentesting fundamentals", time: "2 months", skills: ["Burp Suite", "Nmap", "Metasploit"] },
          { title: "Defense & Detection", desc: "SIEM, IR, and secure architecture patterns", time: "2 months", skills: ["SIEM", "IR", "Zero Trust"] },
          { title: "Certifications & CTFs", desc: "Prep for OSCP/Security+ and practice CTFs", time: "2-3 months", skills: ["OSCP", "CTFs", "Reporting"] },
        ],
      },
      {
        match: /product\s?manager|pm\b/i,
        steps: [
          { title: "Discovery Skills", desc: "User research, interviews, and problem framing", time: "1-2 months", skills: ["User Research", "Jobs-to-be-Done", "Interviews"] },
          { title: "Roadmapping & Metrics", desc: "Prioritization frameworks and product analytics", time: "1-2 months", skills: ["RICE", "OKRs", "Analytics"] },
          { title: "Delivery & Design", desc: "Work with design/eng, write specs, ship iteratively", time: "2 months", skills: ["Specs", "Figma Literacy", "Agile"] },
          { title: "Case Studies", desc: "Build a PM portfolio and prep interviews", time: "1 month", skills: ["Case Studies", "Metrics", "Storytelling"] },
        ],
      },
      {
        match: /designer|ux|ui\s?design/i,
        steps: [
          { title: "Design Fundamentals", desc: "Typography, color, layout, and visual hierarchy", time: "1-2 months", skills: ["Typography", "Color", "Layout"] },
          { title: "UX Research", desc: "Interviews, usability testing, and journey mapping", time: "1-2 months", skills: ["Research", "Journey Maps", "Usability"] },
          { title: "Design Systems", desc: "Build reusable components and tokens in Figma", time: "2 months", skills: ["Figma", "Tokens", "Components"] },
          { title: "Portfolio Case Studies", desc: "Publish 3 case studies showing process and impact", time: "1-2 months", skills: ["Case Studies", "Prototyping", "Storytelling"] },
        ],
      },
    ];

    const defaultSteps: StepTemplate[] = [
      { title: "Foundation", desc: `Strengthen the core skills required for a ${role}`, time: "1-2 months", skills: ["Fundamentals", "Problem Solving", "Git"] },
      { title: "Specialization", desc: `Deep-dive into technologies most used by a ${role}`, time: "2-3 months", skills: ["Domain Tools", "Best Practices", "APIs"] },
      { title: "Portfolio Projects", desc: `Ship real projects that demonstrate ${role} capabilities`, time: "1-2 months", skills: ["Projects", "Documentation", "Deployment"] },
      { title: "Interview Prep", desc: `Practice ${role}-focused interviews and case studies`, time: "1 month", skills: ["System Design", "Mock Interviews", "Behavioral"] },
    ];

    const chosen = templates.find(t => t.match.test(role))?.steps ?? defaultSteps;

    const steps = chosen.map(step => ({
      title: step.title,
      description: step.desc,
      timeframe: step.time,
      skills: step.skills,
      completed: step.skills.some(s => userSkills.includes(s.toLowerCase())),
    }));

    if (probability >= 70 && steps.length > 0) steps[0].completed = true;
    if (probability >= 85 && steps.length > 1) steps[1].completed = true;

    return steps;
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Map className="w-6 h-6 text-secondary" />
          <h3 className="text-xl font-semibold text-foreground">Career Roadmap</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Building your roadmap...</span>
        </div>
      </motion.div>
    );
  }

  if (roadmaps.length === 0) return null;

  const current = roadmaps[activeRole];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Map className="w-6 h-6 text-secondary" />
        <h3 className="text-xl font-semibold text-foreground">Career Roadmap</h3>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {roadmaps.map((rm, i) => (
          <button
            key={rm.role}
            onClick={() => setActiveRole(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              i === activeRole
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Target className="w-3.5 h-3.5 inline mr-1.5" />
            {rm.role}
          </button>
        ))}
      </div>

      {/* Roadmap timeline */}
      <div className="relative">
        {current.steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className="flex gap-4 mb-6 last:mb-0"
          >
            {/* Timeline line & dot */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.completed ? "bg-success/20" : "bg-muted"
              }`}>
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              {index < current.steps.length - 1 && (
                <div className={`w-0.5 flex-1 mt-1 ${step.completed ? "bg-success/40" : "bg-border"}`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-2 ${step.completed ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
                  {step.timeframe}
                </span>
                {step.completed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                    Done
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {step.skills.map(skill => (
                  <span
                    key={skill}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted text-foreground font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
        <p className="text-xs text-muted-foreground text-center">
          <ArrowRight className="w-3 h-3 inline mr-1" />
          This roadmap is personalized based on your current skills and the top 3 roles best suited for you.
        </p>
      </div>
    </motion.div>
  );
};

export default CareerRoadmap;

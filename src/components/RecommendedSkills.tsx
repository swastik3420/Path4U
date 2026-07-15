import { motion } from "framer-motion";
import { BookOpen, Star, ExternalLink, BadgeCheck, Lock } from "lucide-react";

interface SkillResult {
  skill: string;
  score: number;
  level: string;
}

interface CourseLink {
  skill: string;
  reason: string;
  courseName: string;
  platform: string;
  url: string;
  isFree: boolean;
}

interface RecommendedSkillsProps {
  results: SkillResult[];
}

const skillCourseMap: Record<string, Omit<CourseLink, 'skill' | 'reason'>> = {
  "GraphQL": { courseName: "GraphQL Full Course", platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=ed8SzALpx1Q", isFree: true },
  "Docker": { courseName: "Docker for Beginners", platform: "KodeKloud", url: "https://kodekloud.com/courses/docker-for-the-absolute-beginner/", isFree: true },
  "Testing (Jest/Vitest)": { courseName: "Testing JavaScript", platform: "Testing Library Docs", url: "https://testing-library.com/docs/", isFree: true },
  "System Design": { courseName: "System Design Primer", platform: "GitHub", url: "https://github.com/donnemartin/system-design-primer", isFree: true },
  "React": { courseName: "React – The Complete Guide", platform: "Udemy", url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/", isFree: false },
  "TypeScript": { courseName: "TypeScript Handbook", platform: "TypeScript Docs", url: "https://www.typescriptlang.org/docs/handbook/", isFree: true },
  "Python": { courseName: "Python for Everybody", platform: "Coursera", url: "https://www.coursera.org/specializations/python", isFree: true },
  "Machine Learning": { courseName: "ML Crash Course", platform: "Google", url: "https://developers.google.com/machine-learning/crash-course", isFree: true },
  "AWS": { courseName: "AWS Cloud Practitioner", platform: "AWS Training", url: "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/", isFree: true },
  "Kubernetes": { courseName: "Kubernetes Basics", platform: "Kubernetes.io", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/", isFree: true },
  "CI/CD": { courseName: "GitHub Actions Tutorial", platform: "GitHub Docs", url: "https://docs.github.com/en/actions/quickstart", isFree: true },
  "Node.js": { courseName: "The Complete Node.js Course", platform: "Udemy", url: "https://www.udemy.com/course/the-complete-nodejs-developer-course-2/", isFree: false },
  "SQL": { courseName: "SQL Tutorial", platform: "W3Schools", url: "https://www.w3schools.com/sql/", isFree: true },
  "Cybersecurity": { courseName: "Introduction to Cybersecurity", platform: "Cisco Networking Academy", url: "https://www.netacad.com/courses/cybersecurity/introduction-cybersecurity", isFree: true },
  "Data Structures": { courseName: "DSA Full Course", platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=8hly31xKli0", isFree: true },
  "System Architecture": { courseName: "Software Architecture Course", platform: "Coursera", url: "https://www.coursera.org/learn/software-architecture", isFree: true },
  "Redis": { courseName: "Redis University", platform: "Redis", url: "https://university.redis.com/", isFree: true },
  "MongoDB": { courseName: "MongoDB University", platform: "MongoDB", url: "https://learn.mongodb.com/", isFree: true },
  "PostgreSQL": { courseName: "PostgreSQL Tutorial", platform: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/", isFree: true },
  "Next.js": { courseName: "Learn Next.js", platform: "Vercel", url: "https://nextjs.org/learn", isFree: true },
  "Rust": { courseName: "The Rust Book", platform: "Rust Docs", url: "https://doc.rust-lang.org/book/", isFree: true },
  "Go": { courseName: "Tour of Go", platform: "Go", url: "https://go.dev/tour/", isFree: true },
  "Terraform": { courseName: "Terraform Tutorial", platform: "HashiCorp Learn", url: "https://developer.hashicorp.com/terraform/tutorials", isFree: true },
  "Microservices": { courseName: "Microservices Patterns", platform: "Microservices.io", url: "https://microservices.io/patterns/index.html", isFree: true },
  "Data Engineering": { courseName: "Data Engineering Zoomcamp", platform: "DataTalks.Club", url: "https://github.com/DataTalksClub/data-engineering-zoomcamp", isFree: true },
  "LLM / GenAI": { courseName: "Generative AI for Everyone", platform: "DeepLearning.AI", url: "https://www.deeplearning.ai/courses/generative-ai-for-everyone/", isFree: true },
  "Prompt Engineering": { courseName: "ChatGPT Prompt Engineering for Developers", platform: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/", isFree: true },
  "Communication": { courseName: "Improving Communication Skills", platform: "Coursera (Wharton)", url: "https://www.coursera.org/learn/wharton-communication-skills", isFree: true },
  "Leadership": { courseName: "Leadership Principles", platform: "HarvardX", url: "https://www.edx.org/learn/leadership", isFree: true },
  "Product Management": { courseName: "Digital Product Management", platform: "Coursera", url: "https://www.coursera.org/specializations/uva-darden-digital-product-management", isFree: true },
  "UX Design": { courseName: "Google UX Design Certificate", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-ux-design", isFree: false },
};

const defaultCourse = { courseName: "Explore Courses", platform: "Coursera", url: "https://www.coursera.org/search", isFree: true };

const baseSuggestions: { skill: string; reason: string }[] = [
  { skill: "GraphQL", reason: "High demand in modern web development" },
  { skill: "Docker", reason: "Essential for deployment and DevOps" },
  { skill: "Testing (Jest/Vitest)", reason: "Improves code quality and employability" },
  { skill: "System Design", reason: "Required for senior roles" },
  { skill: "LLM / GenAI", reason: "Fastest growing skill in tech hiring" },
  { skill: "Kubernetes", reason: "Standard for cloud-native infrastructure" },
  { skill: "TypeScript", reason: "Now default for most JS codebases" },
  { skill: "AWS", reason: "Most in-demand cloud platform globally" },
  { skill: "CI/CD", reason: "Core DevOps skill for modern teams" },
  { skill: "Microservices", reason: "Common architecture in enterprise systems" },
  { skill: "Prompt Engineering", reason: "Multiplies productivity across roles" },
  { skill: "Communication", reason: "High-leverage soft skill for promotions" },
];

const RecommendedSkills = ({ results }: RecommendedSkillsProps) => {
  const existingSkills = new Set(results.map(r => r.skill.toLowerCase()));

  // Weak skills the user already has (score < 60)
  const weakSkills = results
    .filter(r => r.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(r => ({ skill: r.skill, reason: `Boost your ${r.level.toLowerCase()} level (${r.score}%) to be more competitive` }));

  // Mid-tier skills (60-79) to sharpen
  const midSkills = results
    .filter(r => r.score >= 60 && r.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map(r => ({ skill: r.skill, reason: `Level up from ${r.score}% to expert tier` }));

  // Curated suggestions not already in the user's skill set
  const freshSuggestions = baseSuggestions.filter(s => !existingSkills.has(s.skill.toLowerCase()));

  const allSkills = [...weakSkills, ...midSkills, ...freshSuggestions].slice(0, 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-card rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-secondary" />
        <h3 className="text-xl font-semibold text-foreground">Recommended Skills to Learn</h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allSkills.map((item, index) => {
          const course = skillCourseMap[item.skill] || defaultCourse;
          return (
            <motion.div
              key={item.skill}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.05 }}
              className="p-4 bg-muted rounded-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span className="font-medium text-foreground text-sm">{item.skill}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{item.reason}</p>
              </div>

              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-card rounded-lg hover:bg-card/80 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate group-hover:text-secondary transition-colors">
                    {course.courseName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{course.platform}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    course.isFree
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}>
                    {course.isFree ? (
                      <><BadgeCheck className="w-2.5 h-2.5 inline mr-0.5" />Free</>
                    ) : (
                      <><Lock className="w-2.5 h-2.5 inline mr-0.5" />Paid</>
                    )}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-secondary transition-colors" />
                </div>
              </a>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecommendedSkills;

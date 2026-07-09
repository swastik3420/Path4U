import { FileText, Brain, Target, Briefcase, TrendingUp, Shield } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: FileText,
    title: "Smart Resume Scanning",
    description: "Our AI analyzes your resume to extract skills, experience, and qualifications automatically.",
    accent: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Brain,
    title: "Adaptive Questions",
    description: "Questions adapt from basic to advanced based on your performance, accurately measuring skill depth.",
    accent: "from-accent/20 to-accent/5",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
  {
    icon: Target,
    title: "Skill Gap Analysis",
    description: "Identify exactly where you need to improve with personalized learning recommendations.",
    accent: "from-secondary/20 to-secondary/5",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
  {
    icon: Briefcase,
    title: "Job Matching",
    description: "Get matched with jobs that fit your actual skill level, not just keywords on your resume.",
    accent: "from-warning/20 to-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    icon: TrendingUp,
    title: "Career Roadmap",
    description: "See the skills needed for your dream role and track your progress over time.",
    accent: "from-info/20 to-info/5",
    iconBg: "bg-info/10",
    iconColor: "text-info",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your resume data is encrypted and never shared with third parties without consent.",
    accent: "from-success/20 to-success/5",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-semibold text-primary tracking-wider uppercase mb-4"
          >
            Features
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 font-display tracking-tight">
            Everything You Need to{" "}
            <span className="gradient-text-vivid">Level Up</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Path4U bridges the gap between potential and market reality. Experience real-time resume intelligence coupled with interactive skill diagnostics to accelerate your career growth."
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="group relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative glass-strong rounded-lg p-7 h-full transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2">
                <div className={`w-12 h-12 ${feature.iconBg} rounded-lg flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>

                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 font-display">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

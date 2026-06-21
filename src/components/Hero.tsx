import { ArrowRight, Sparkles, Upload, Target, Briefcase, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import ATSScoreDialog from "@/components/ATSScoreDialog";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  const [atsOpen, setAtsOpen] = useState(false);
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Animated mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large morphing orb - primary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-primary/15 animate-morph animate-float"
        />
        {/* Accent orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-accent/12 animate-morph animate-float-delayed"
        />
        {/* Secondary orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.6 }}
          className="absolute -bottom-20 right-1/4 w-[350px] h-[350px] bg-secondary/12 animate-morph animate-float-slow"
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 text-sm font-medium mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="text-muted-foreground">AI-Powered Career Intelligence</span>
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-8 font-display"
          >
            <span className="text-foreground">Unlock Uncharted Horizons Of Your Career Path</span>
            <br />
            <span className="gradient-text-vivid">With AI-Powered Skill&nbsp;Diagnostics&nbsp;</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed"
          >
            Stop navigating the job market blindly. Scan your profile, benchmark your skills with interactive diagnostics, and step directly into your true career potential.
          </motion.p>

          {/* ATS suggestion line */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.38 }}
            className="text-sm md:text-base mb-10 max-w-2xl mx-auto"
          >
            <span className="text-muted-foreground">Before going further with your assessment, </span>
            <span className="gradient-text font-semibold">let AI first check your Resume ATS score</span>
            <span className="text-muted-foreground"> — see exactly what may be holding it back.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-col items-center justify-center gap-3 mb-12"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                size="xl"
                onClick={() => setAtsOpen(true)}
                className="group border-2"
              >
                <FileSearch className="w-5 h-5 mr-2 text-primary" />
                Check Your Resume ATS Score
              </Button>
              <Button variant="hero" size="xl" onClick={onGetStarted} className="group relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Analyze My Resume
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sign up to save your progress, or{" "}
              <span className="text-primary font-medium cursor-pointer hover:underline" onClick={onGetStarted}>
                start for free
              </span>
              {" "}— no account needed.
            </p>
          </motion.div>

          {/* Stats / Social proof row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-3 max-w-lg mx-auto gap-8 mb-16"
          >
            {[
              { value: "100+", label: "Resumes Analyzed" },
              { value: "95%", label: "Accuracy Rate" },
              { value: "100+", label: "Jobs Matched" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text font-display">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { icon: Upload, label: "AI Based Resume Scanning", color: "text-primary" },
              { icon: Target, label: "Skill Assessment", color: "text-accent" },
              { icon: Briefcase, label: "AI Powered Job Matching", color: "text-secondary" },
            ].map((pill) => (
              <div
                key={pill.label}
                className="flex items-center gap-2.5 glass-strong px-5 py-3 rounded-2xl hover:scale-105 transition-transform cursor-default"
              >
                <pill.icon className={`w-4 h-4 ${pill.color}`} />
                <span className="text-sm font-medium text-foreground">{pill.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      <ATSScoreDialog open={atsOpen} onOpenChange={setAtsOpen} />
    </section>
  );
};

export default Hero;

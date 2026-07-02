import { ArrowRight, Sparkles, Upload, Target, Briefcase, FileSearch, BarChart3, BrainCircuit, Users, Shield, Cloud, Pencil, TrendingUp, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import ATSScoreDialog from "@/components/ATSScoreDialog";
import heroBrainBg from "@/assets/hero-brain-bg.jpg";
import heroBrainLight from "@/assets/hero-brain-light.jpg";

interface HeroProps {
  onGetStarted: () => void;
}

const roleChips = [
  { icon: BarChart3, label: "Data Scientist", left: "2%", top: "14%" },
  { icon: BrainCircuit, label: "AI Engineer", left: "20%", top: "2%" },
  { icon: Users, label: "Product Manager", left: "44%", top: "-4%" },
  { icon: Shield, label: "Cybersecurity", left: "70%", top: "2%" },
  { icon: Cloud, label: "Cloud Architect", left: "88%", top: "14%" },
];

const trustedLogos = ["Google", "Microsoft", "Amazon", "Netflix", "Meta", "Adobe"];

const stats = [
  { icon: Users, value: "100+", label: "Resume Analyzed" },
  { icon: TrendingUp, value: "95%", label: "Accuracy Rate" },
  { icon: Crosshair, value: "10M+", label: "Data Points" },
  { icon: BrainCircuit, value: "24/7", label: "AI Guidance" },
];

const Hero = ({ onGetStarted }: HeroProps) => {
  const [atsOpen, setAtsOpen] = useState(false);
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden">
      {/* Background ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-primary/10 animate-morph animate-float-delayed"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.6 }}
          className="absolute -bottom-20 -left-10 w-[350px] h-[350px] bg-accent/10 animate-morph animate-float-slow"
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* LEFT: copy */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
              <span className="text-muted-foreground">AI-Powered Career Intelligence</span>
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 font-display"
            >
              <span className="text-foreground">Unlock Uncharted Horizons Of Your Career Path</span>
              <br />
              <span className="gradient-text-vivid">With AI-Powered Skill Diagnostics</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-base md:text-lg text-muted-foreground mb-4 max-w-xl leading-relaxed"
            >
              Stop navigating the job market blindly. Scan your profile, benchmark your skills with interactive diagnostics, and step directly into your true career potential.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.38 }}
              className="text-sm md:text-base mb-8 max-w-xl"
            >
              <span className="text-muted-foreground">Before going further with your assessment, </span>
              <span className="gradient-text font-semibold">let AI first check your Resume ATS score</span>
              <span className="text-muted-foreground"> — see exactly what may be holding it back.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="flex flex-col gap-3 mb-10"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => setAtsOpen(true)}
                  className="group border-2 w-full h-14 px-4 justify-center whitespace-nowrap text-sm sm:text-[15px]"
                >
                  <FileSearch className="w-5 h-5 mr-2 text-primary shrink-0" />
                  Check Your Resume ATS Score
                </Button>
                <Button variant="hero" size="xl" onClick={onGetStarted} className="group relative overflow-hidden w-full h-14 px-4 justify-center whitespace-nowrap text-sm sm:text-[15px]">
                  <span className="relative z-10 flex items-center gap-2">
                    Analyze My Resume
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 shrink-0" />
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

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
            >
              {stats.map((s) => (
                <div key={s.label} className="glass rounded-2xl p-4">
                  <s.icon className="w-5 h-5 text-primary mb-2" />
                  <div className="text-xl md:text-2xl font-bold gradient-text font-display">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Trusted by */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.75 }}
              className="text-center lg:text-left"
            >
              <p className="text-xs text-muted-foreground mb-3">Trusted by professionals at</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 opacity-70">
                {trustedLogos.map((logo) => (
                  <span key={logo} className="text-sm md:text-base font-semibold text-muted-foreground tracking-wide">
                    {logo}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT: brain visual + role chips */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="relative w-full aspect-square max-w-[420px] sm:max-w-[500px] lg:max-w-[640px] mx-auto mt-4 sm:mt-2 lg:-mt-24"
          >
            {/* Ambient glow halo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.14),hsl(var(--accent)/0.10)_40%,transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.25),transparent_60%)] pointer-events-none transition-all duration-700" />

            {/* Light-mode brain — bright, vibrant, no dark halo */}
            <img
              src={heroBrainLight}
              alt="AI-powered neural brain visualization"
              width={1024}
              height={1024}
              className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none transition-opacity duration-700
                opacity-100 mix-blend-multiply dark:opacity-0
                [mask-image:radial-gradient(ellipse_at_50%_50%,black_60%,transparent_92%)]
                [-webkit-mask-image:radial-gradient(ellipse_at_50%_50%,black_60%,transparent_92%)]"
            />

            {/* Dark-mode brain — hologram */}
            <img
              src={heroBrainBg}
              alt=""
              aria-hidden="true"
              width={1024}
              height={1024}
              className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none transition-opacity duration-700
                opacity-0 dark:opacity-95 mix-blend-screen saturate-125
                [mask-image:radial-gradient(ellipse_at_50%_50%,black_35%,transparent_72%)]
                [-webkit-mask-image:radial-gradient(ellipse_at_50%_50%,black_35%,transparent_72%)]"
            />


            {/* Role chips */}
            {roleChips.map((chip, i) => (
              <motion.div
                key={chip.label}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + i * 0.08 }}
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.95 }}
                tabIndex={0}
                role="button"
                className="group absolute glass rounded-full px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.25)] -translate-x-1/2 cursor-pointer transition-colors duration-300 hover:border-primary/70 hover:bg-primary/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.55)] active:bg-primary/20 active:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                style={{ top: chip.top, left: chip.left }}
              >
                <chip.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary transition-transform duration-300 group-hover:scale-110 group-active:scale-95" />
                <span className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap transition-colors duration-300 group-hover:text-primary">{chip.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      <ATSScoreDialog open={atsOpen} onOpenChange={setAtsOpen} />
    </section>
  );
};

export default Hero;

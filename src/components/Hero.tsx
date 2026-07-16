import { ArrowRight, Sparkles, Upload, Target, Briefcase, FileSearch, BarChart3, BrainCircuit, Users, Shield, Cloud, Pencil, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import ATSScoreDialog from "@/components/ATSScoreDialog";

interface HeroProps {
  onGetStarted: () => void;
}

const roleChips = [
  { icon: BarChart3, label: "Data Scientist", position: "left-[25%] md:left-[15%] top-[18%]" },
  { icon: BrainCircuit, label: "AI Engineer", position: "left-[37%] md:left-[29%] top-[4%]" },
  { icon: Users, label: "Product Manager", position: "left-[53%] md:left-[51%] top-[2%]" },
  { icon: Shield, label: "Cybersecurity", position: "left-[69%] md:left-[75%] top-[4%]" },
  { icon: Cloud, label: "Cloud Architect", position: "left-[83%] md:left-[87%] top-[18%]" },
];

const trustedLogos = ["Google", "Microsoft", "Amazon", "Netflix", "Meta", "Adobe"];

// Positions match the reference brain layout. `tone` picks the neon color.
const painLabels = [
  { label: "Manual Applying",     top: "32%", left: "7%",  tone: "pink" },
  { label: "No Feedback",         top: "38%", left: "28%", tone: "pink" },
  { label: "frustration",         top: "41%", left: "14%", tone: "pink" },
  { label: "online rejections",   top: "51%", left: "10%", tone: "pink" },
  { label: "No Direction",        top: "51%", left: "33%", tone: "pink" },
  { label: "cold calling",        top: "59%", left: "17%", tone: "pink" },
  { label: "Missing Opportunities", top: "65%", left: "22%", tone: "pink" },
  { label: "constant rejections", top: "68%", left: "9%",  tone: "pink" },
  { label: "Irrelevant Listings", top: "76%", left: "18%", tone: "pink" },
  { label: "Trial & Error",       top: "82%", left: "25%", tone: "pink" },
] as const;

const benefitLabels = [
  { label: "Smart Matching",       top: "26%", right: "16%" },
  { label: "Real-Time Insights",   top: "35%", right: "4%"  },
  { label: "Data-Driven Decisions",top: "46%", right: "0%"  },
  { label: "Clear Direction",      top: "55%", right: "6%"  },
  { label: "Time Efficient",       top: "61%", right: "10%" },
  { label: "AI Resume Scoring",    top: "73%", right: "2%"  },
  { label: "Better Opportunities", top: "79%", right: "8%"  },
];

const stats = [
  { icon: Users, value: "100+", label: "Resume Analyzed" },
  { icon: TrendingUp, value: "95%", label: "Accuracy Rate" },
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
                  variant="success-outline"
                  size="xl"
                  onClick={() => setAtsOpen(true)}
                  className="group w-full h-14 px-4 justify-center whitespace-nowrap rounded-none text-sm sm:text-[15px]"
                >
                  <FileSearch className="w-5 h-5 mr-2 text-success shrink-0" />
                  Check Your Resume ATS Score
                </Button>

                <Button variant="hero" size="xl" onClick={onGetStarted} className="group relative overflow-hidden w-full h-14 px-4 justify-center whitespace-nowrap rounded-none text-sm sm:text-[15px]">
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

          </div>

          {/* RIGHT: brain visual + role chips */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="relative w-full aspect-square max-w-[420px] sm:max-w-[500px] lg:max-w-[640px] mx-auto mt-4 sm:mt-2 lg:-mt-24"
          >
            {/* Ambient glow halo (very soft in light so it doesn't reveal the square edges) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.08),hsl(var(--accent)/0.04)_40%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.25),transparent_60%)] pointer-events-none transition-all duration-700" />

            {/* Brain image — watermark in light, screen-blended hologram in dark */}
            <img
              src="/hero-brain-bg.webp"
              alt="AI-powered neural brain visualization"
              width={1024}
              height={1024}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none transition-all duration-700
                opacity-45 blur-[0.5px] mix-blend-screen saturate-125 contrast-95 [filter:hue-rotate(155deg)_brightness(1.35)_saturate(1.4)]
                dark:[filter:none] dark:opacity-95 dark:blur-0 dark:mix-blend-screen dark:saturate-125 dark:contrast-100
                [mask-image:radial-gradient(circle_at_50%_50%,black_45%,rgba(0,0,0,0.82)_50%,rgba(0,0,0,0.6)_57%,rgba(0,0,0,0.38)_66%,rgba(0,0,0,0.2)_76%,rgba(0,0,0,0.08)_87%,rgba(0,0,0,0.02)_95%,transparent_100%)]
                [-webkit-mask-image:radial-gradient(circle_at_50%_50%,black_45%,rgba(0,0,0,0.82)_50%,rgba(0,0,0,0.6)_57%,rgba(0,0,0,0.38)_66%,rgba(0,0,0,0.2)_76%,rgba(0,0,0,0.08)_87%,rgba(0,0,0,0.02)_95%,transparent_100%)]
                dark:[mask-image:radial-gradient(ellipse_at_50%_50%,black_35%,transparent_72%)]
                dark:[-webkit-mask-image:radial-gradient(ellipse_at_50%_50%,black_35%,transparent_72%)]"
            />

            {/* Holographic tint overlay (light mode only) */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-100 dark:opacity-0 mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle at 35% 40%, hsl(var(--primary) / 0.22), transparent 55%), radial-gradient(circle at 70% 60%, hsl(var(--accent) / 0.18), transparent 60%), radial-gradient(circle at 50% 80%, hsl(var(--gradient-teal) / 0.15), transparent 65%)",
              }}
            />

            {/* Edge fade into page background (circular mask to show both brain sides evenly in day mode) */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-100 dark:opacity-0 bg-[radial-gradient(circle_at_50%_50%,transparent_45%,hsl(var(--background)_/_0.22)_50%,hsl(var(--background)_/_0.42)_57%,hsl(var(--background)_/_0.65)_66%,hsl(var(--background)_/_0.85)_76%,hsl(var(--background)_/_0.96)_87%,hsl(var(--background)_/_0.99)_95%,hsl(var(--background))_100%)]" />

            {/* Edge blur to fully hide the square boundary in day mode (inner brain stays untouched) */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-100 dark:opacity-0 backdrop-blur-sm [mask-image:radial-gradient(circle_at_50%_50%,transparent_45%,black_100%)] [-webkit-mask-image:radial-gradient(circle_at_50%_50%,transparent_45%,black_100%)]" />





            {/* Role chips */}
            {roleChips.map((chip, i) => (
              <motion.div
                key={chip.label}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + i * 0.08 }}
                className={`absolute ${chip.position}`}
              >
                <div
                  tabIndex={0}
                  role="button"
                  className="group glass rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1.5 flex items-center gap-1 sm:gap-1.5 border border-primary/30 shadow-[0_0_14px_hsl(var(--primary)/0.25)] -translate-x-1/2 cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:border-primary/70 hover:bg-primary/10 hover:shadow-[0_0_24px_hsl(var(--primary)/0.55)] active:scale-95 active:bg-primary/20 active:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <chip.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-primary transition-transform duration-300 group-hover:scale-110 group-active:scale-95" />
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-foreground whitespace-nowrap transition-colors duration-300 group-hover:text-primary">{chip.label}</span>
                </div>
              </motion.div>
            ))}

            {/* Pain-point labels (left hemisphere) */}
            {painLabels.map((p, i) => (
              <motion.span
                key={p.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.05 }}
                className={`absolute text-[10px] sm:text-xs md:text-sm font-bold whitespace-nowrap pointer-events-none select-none italic ${
                  p.tone === "pink"
                    ? "text-pink-500 dark:text-pink-400 [text-shadow:0_0_12px_hsl(325_95%_60%/0.85)]"
                    : "text-cyan-500 dark:text-cyan-300 [text-shadow:0_0_12px_hsl(190_95%_60%/0.85)]"
                }`}
                style={{ top: p.top, left: p.left }}
              >
                {p.label}
              </motion.span>
            ))}

            {/* Benefit labels (right hemisphere) */}
            {benefitLabels.map((b, i) => (
              <motion.span
                key={b.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 + i * 0.05 }}
                className="absolute text-[10px] sm:text-xs md:text-sm font-semibold whitespace-nowrap text-cyan-500 dark:text-cyan-300 [text-shadow:0_0_10px_hsl(190_95%_60%/0.7)] pointer-events-none select-none flex items-center gap-1"
                style={{ top: b.top, right: b.right }}
              >
                {b.label}
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-emerald-500/90 text-white text-[9px] font-bold">✓</span>
              </motion.span>
            ))}

            {/* Center Path4U wordmark over the brain */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="absolute top-1/2 left-[52%] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
            >
              <span className="font-display font-extrabold text-base sm:text-lg md:text-xl lg:text-2xl gradient-text-vivid brain-junction-text [text-shadow:0_0_20px_hsl(var(--primary)/0.6)] dark:[text-shadow:0_0_18px_hsl(340_90%_65%/0.55),0_0_36px_hsl(0_0%_100%/0.6),0_0_60px_hsl(220_90%_65%/0.45)]">
                Path4U
              </span>
            </motion.div>

          </motion.div>
        </div>

        {/* Tagline centered below brain, page-wide */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mx-auto mt-10 lg:mt-6 max-w-3xl lg:max-w-4xl px-4 text-center text-xs sm:text-sm md:text-base font-semibold italic leading-snug select-none text-black/90 [text-shadow:0_0_8px_hsl(0_0%_0%/0.55),0_0_18px_hsl(var(--primary)/0.45)] dark:font-medium dark:text-white/90 dark:[text-shadow:0_0_10px_hsl(0_0%_100%/0.7),0_0_20px_hsl(var(--primary)/0.35)]"
        >
          Unload your career worries from your organic neural engine into Path4U's Enhanced Neural Engine. Let AI chart the path from uncertainty to opportunity.
        </motion.p>

      </div>

      <ATSScoreDialog open={atsOpen} onOpenChange={setAtsOpen} />
    </section>
  );
};

export default Hero;

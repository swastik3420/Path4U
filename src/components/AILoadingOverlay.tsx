import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Sparkles } from "lucide-react";

interface Props {
  isLoading: boolean;
  /** Optional rotating loading messages; falls back to a generic pool */
  messages?: string[];
  /** Headline that appears at the very top of the overlay */
  title?: string;
}

const DEFAULT_MESSAGES = [
  "Path4U Career Intelligence is thinking...",
  "Cross-referencing skills with industry signals...",
  "Calibrating answers to proficiency tiers...",
  "Searching real-time data for the best matches...",
  "Finalizing your personalized insights...",
];

const AILoadingOverlay = ({ isLoading, messages, title }: Props) => {
  const pool = messages && messages.length > 0 ? messages : DEFAULT_MESSAGES;
  const [text, setText] = useState(title || pool[0]);
  const [progress, setProgress] = useState(0);

  // rotating text
  useEffect(() => {
    if (!isLoading) return;
    setText(title || pool[0]);
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % pool.length;
      setText(pool[i]);
    }, 2500);
    return () => clearInterval(id);
  }, [isLoading, pool, title]);

  // simulated progress
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(t);
    }
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        const remaining = 98 - p;
        return Math.min(p + Math.random() * (remaining * 0.1), 98);
      });
    }, 800);
    return () => clearInterval(id);
  }, [isLoading]);

  const phase = Math.min(Math.floor(progress / 20) + 1, 5);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md"
        >
          <div className="relative mb-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="h-48 w-48 rounded-full border-2 border-primary/20 border-t-primary"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute top-4 left-4 h-40 w-40 rounded-full border-2 border-muted border-t-secondary"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <BrainCircuit className="h-12 w-12 text-primary" />
              </motion.div>
            </div>
            <svg className="absolute inset-0 h-48 w-48 -rotate-90 pointer-events-none">
              <circle cx="96" cy="96" r="90" fill="transparent" stroke="hsl(var(--muted))" strokeWidth="4" />
              <motion.circle
                cx="96"
                cy="96"
                r="90"
                fill="transparent"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeDasharray="565.48"
                animate={{ strokeDashoffset: 565.48 - (565.48 * progress) / 100 }}
                style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }}
              />
            </svg>
          </div>

          <div className="text-center max-w-md px-6">
            <motion.div
              key={text}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="mb-4"
            >
              <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tight font-display">
                {text}
              </h3>
            </motion.div>

            <div className="relative h-2 w-72 bg-muted rounded-full overflow-hidden mx-auto mb-6 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary to-secondary"
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 w-8 rounded-full transition-all duration-500 ${
                      Math.floor(progress / 20) >= step
                        ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-[0.2em] mt-2">
                Neural Pipeline &bull; Phase {phase} of 5 &bull; {Math.round(progress)}%
              </p>
            </div>
          </div>

          <div className="absolute bottom-12 left-0 right-0 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2 font-medium">
              <Sparkles className="h-3 w-3" /> Powered by Path4U Career Intelligence Engine
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AILoadingOverlay;

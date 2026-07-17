import { useEffect, useState } from "react";
import { Rocket, Target, Loader2 } from "lucide-react";

const SESSION_KEY = "path4u_splash_seen";

const SplashScreen = () => {
  const [phase, setPhase] = useState(0);
  const [done, setDone] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  useEffect(() => {
    if (done) return;
    const t1 = setTimeout(() => setPhase(1), 2500);
    const t2 = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setDone(true);
    }, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done]);

  if (done) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-colors duration-700"
    >
      <div key={phase} className="flex flex-col items-center animate-in fade-in zoom-in duration-700 px-4 text-center">
        {phase === 0 ? (
          <>
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-primary blur-3xl opacity-30 rounded-full animate-pulse" />
              <Rocket className="h-24 w-24 md:h-32 md:w-32 text-primary relative z-10 animate-bounce" />
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground mb-8 font-display">
              Path4U
            </h1>
          </>
        ) : (
          <>
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-secondary blur-3xl opacity-30 rounded-full animate-pulse" />
              <Target className="h-24 w-24 md:h-32 md:w-32 text-secondary relative z-10 animate-bounce" />
            </div>
            <h1 className="text-3xl md:text-6xl font-black tracking-tight text-foreground mb-8 leading-tight max-w-4xl font-display">
              Your Pitstop for <br className="hidden md:block" />
              <span className="text-primary">Jobs</span> and{" "}
              <span className="text-secondary">your Destiny</span>
            </h1>
          </>
        )}
        <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-muted-foreground mt-4" />
        <p className="text-xs text-muted-foreground mt-6 opacity-60">click anywhere to skip</p>
      </div>
    </div>
  );
};

export default SplashScreen;

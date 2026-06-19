import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  const { reduceMotion } = useReduceMotion();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    const root = document.documentElement;

    const applyTheme = () => {
      setIsDark(next);
      root.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
    };

    if (reduceMotion) {
      applyTheme();
      return;
    }

    // Enable a temporary global transition for backgrounds, text, borders, etc.
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 450);

    if ("startViewTransition" in document) {
      (document as any).startViewTransition(applyTheme);
    } else {
      applyTheme();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
    >
      {isDark ? <Sun className="w-[22px] h-[22px]" /> : <Moon className="w-[22px] h-[22px]" />}
    </button>
  );
};

export default ThemeToggle;

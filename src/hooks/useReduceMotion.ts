import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "reduce-motion";

function getInitialValue(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    return stored === "true";
  }
  // Default to OS preference
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState<boolean>(getInitialValue);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(reduceMotion));
  }, [reduceMotion]);

  const toggleReduceMotion = useCallback(() => {
    setReduceMotion((prev) => !prev);
  }, []);

  return { reduceMotion, toggleReduceMotion };
}

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "reduce-motion";
const EVENT_NAME = "reduce-motion-change";

function readStoredValue(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Apply (or remove) the global `reduce-motion` class on <html>. */
export function applyReduceMotionClass(value: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", value);
}

/** Call once at app startup (before React renders) to avoid a flash of motion. */
export function initReduceMotion() {
  applyReduceMotionClass(readStoredValue());
}

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState<boolean>(readStoredValue);

  // Sync class + storage whenever the value changes, and broadcast to other hook instances.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(reduceMotion));
    applyReduceMotionClass(reduceMotion);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: reduceMotion }));
  }, [reduceMotion]);

  // Listen for changes from other components / tabs.
  useEffect(() => {
    const onCustom = (e: Event) => {
      const v = (e as CustomEvent<boolean>).detail;
      setReduceMotion((prev) => (prev === v ? prev : v));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setReduceMotion(e.newValue === "true");
      }
    };
    window.addEventListener(EVENT_NAME, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setReduceMotion((prev) => !prev);
  }, []);

  return { reduceMotion, toggleReduceMotion, setReduceMotion };
}

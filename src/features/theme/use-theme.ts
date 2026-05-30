"use client";

import { useCallback, useSyncExternalStore } from "react";
import { themes, defaultMode, type Mode } from "./config";

const STORAGE_KEY = "roomche.landing.mode";

function read(): Mode {
  if (typeof window === "undefined") return defaultMode;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : defaultMode;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(mode: Mode) {
  window.localStorage.setItem(STORAGE_KEY, mode);
  listeners.forEach((cb) => cb());
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, read, () => defaultMode);

  const toggle = useCallback(() => {
    write(mode === "dark" ? "light" : "dark");
  }, [mode]);

  return {
    mode,
    theme: themes[mode],
    toggle,
  };
}

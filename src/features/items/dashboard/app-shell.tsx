"use client";

import { useEffect } from "react";
import { useTheme } from "@/features/theme/use-theme";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = mode;
    root.style.scrollbarColor = `${theme.accent} ${theme.bg}`;
    root.style.setProperty("--sb-track", theme.bg);
    root.style.setProperty("--sb-thumb", theme.accent);
  }, [mode, theme.accent, theme.bg]);

  return (
    <div
      data-landing
      className="relative flex min-h-screen w-full flex-col transition-colors duration-500"
      style={
        {
          background: theme.bg,
          color: theme.ink,
          "--lv-bg": theme.bg,
          "--lv-ink": theme.ink,
          "--lv-ink-2": theme.ink2,
          "--lv-accent": theme.accent,
          "--lv-rule": theme.rule,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

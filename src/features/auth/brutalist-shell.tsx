"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { font } from "@/features/theme/config";
import { useTheme } from "@/features/theme/use-theme";
import { ThemeSwitcher } from "@/features/theme/theme-switcher";
import { SiteFooter } from "@/components/site-footer";
import { useEffect } from "react";

export function BrutalistShell({
  eyebrow,
  index,
  children,
}: {
  eyebrow: string;
  index: string;
  children: React.ReactNode;
}) {
  const { mode, theme, toggle } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = mode;
    root.style.scrollbarColor = `${theme.accent} ${theme.bg}`;
    root.style.setProperty("--sb-track", theme.bg);
    root.style.setProperty("--sb-thumb", theme.accent);
  }, [mode, theme.accent, theme.bg]);

  return (
    <div
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
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 1] }}
        className="relative border-b-[6px] px-6 py-3 sm:px-10"
        style={{ borderColor: "var(--lv-ink)" }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 leading-none tracking-[-0.03em]"
            style={{
              fontFamily: font.family,
              fontWeight: font.weight,
              fontSize: "clamp(1.4rem, 2.6vw, 2.1rem)",
            }}
          >
            <motion.span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--lv-accent)" }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            RoomChe
          </Link>
          <ThemeSwitcher mode={mode} onToggle={toggle} />
        </div>
      </motion.div>

      <main className="relative flex flex-1 items-center px-6 py-16 sm:px-10">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mb-8 flex items-baseline gap-4 font-mono text-[10px] uppercase tracking-[0.22em]">
            <span style={{ color: "var(--lv-accent)" }}>■</span>
            <span>{eyebrow}</span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
              className="block h-px flex-1 origin-left"
              style={{ background: "var(--lv-ink)" }}
            />
            <span>{index}</span>
          </div>
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function DisplayLine({
  children,
  size = "clamp(2.6rem, 8vw, 6rem)",
}: {
  children: React.ReactNode;
  size?: string;
}) {
  return (
    <span
      className="block uppercase leading-[0.86] tracking-[-0.04em]"
      style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: size }}
    >
      {children}
    </span>
  );
}

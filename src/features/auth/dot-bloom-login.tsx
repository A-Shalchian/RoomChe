"use client";

import { motion } from "motion/react";
import { signInWithGoogle } from "@/features/auth/actions";
import { font } from "@/features/theme/config";

export function DotBloomLogin({ error }: { error?: string }) {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
      <div className="relative flex w-full max-w-md flex-col items-center gap-6 text-center sm:gap-7">
        <motion.h1
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.65, 0.3, 1] }}
          className="uppercase leading-[0.95] tracking-[-0.02em]"
          style={{
            fontFamily: font.family,
            fontWeight: font.weight,
            fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
          }}
        >
          sign <span style={{ color: "var(--lv-accent)" }}>in</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-[14px] leading-relaxed text-[color:var(--lv-ink-2)]"
        >
          Your room. Your record. One account holds the whole catalogue.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.5, ease: [0.2, 0.65, 0.3, 1] }}
          className="w-full"
        >
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden border-[3px] px-6 py-4 font-mono text-[12px] uppercase tracking-[0.22em]"
              style={{
                borderColor: "var(--lv-ink)",
                background: "var(--lv-ink)",
                color: "var(--lv-bg)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                style={{ background: "var(--lv-accent)" }}
              />
              <span className="relative">continue with google</span>
              <span
                aria-hidden
                className="relative inline-block transition-transform duration-300 ease-out group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          </form>
        </motion.div>

        {error && (
          <p
            className="border-l-[3px] pl-3 font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{
              borderColor: "var(--lv-accent)",
              color: "var(--lv-accent)",
            }}
          >
            {error === "closed" ? "this app is private. signups are closed." : error}
          </p>
        )}
      </div>
    </div>
  );
}

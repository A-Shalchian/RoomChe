"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "roomche.cookies.ack";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!window.localStorage.getItem(STORAGE_KEY)) setShow(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 1] }}
          role="dialog"
          aria-label="cookie notice"
          className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-2xl border-[3px]"
          style={{
            borderColor: "var(--lv-ink, #1a1410)",
            background: "var(--lv-bg, #f6efe1)",
            color: "var(--lv-ink, #1a1410)",
          }}
        >
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[11px] leading-relaxed tracking-[0.04em]">
              <span
                className="uppercase tracking-[0.22em]"
                style={{ color: "var(--lv-accent, #b6201f)" }}
              >
                Cookies.{" "}
              </span>
              RoomChe keeps one cookie to remember you are signed in. Nothing is
              sold, tracked, or shared.
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="group relative shrink-0 overflow-hidden border-[3px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{
                borderColor: "var(--lv-ink, #1a1410)",
                background: "var(--lv-ink, #1a1410)",
                color: "var(--lv-bg, #f6efe1)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                style={{ background: "var(--lv-accent, #b6201f)" }}
              />
              <span className="relative">understood</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

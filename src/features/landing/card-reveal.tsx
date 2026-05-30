"use client";

import { AnimatePresence, motion, type Transition, type TargetAndTransition } from "motion/react";
import { useEffect } from "react";
import type { Specimen } from "./items";

const CARD = "#0c2d36";
const INK = "#e6f7f4";
const INK_2 = "rgba(230,247,244,0.55)";
const ORANGE = "#ff8a5c";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export type SourceRect = { x: number; y: number; w: number; h: number };

const FOCUS_W = 360;

export function hoverFor(hovered: boolean): TargetAndTransition {
  return hovered ? { rotateX: 360 } : { rotateX: 0 };
}

export const hoverTransition: Transition = { duration: 1.4, ease: [0.16, 1, 0.3, 1] };

function flight(
  dx: number,
  dy: number,
  scale: number,
  reduced: boolean
): { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition } {
  if (reduced) {
    return {
      initial: { opacity: 0, x: 0, y: 0, scale: 1 },
      animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0.15 } },
    };
  }

  const archUp = Math.min(dy, -120);

  return {
    initial: { opacity: 0, x: dx, y: dy, scale, rotateX: 90 },
    animate: {
      opacity: 1,
      x: 0,
      y: [dy, archUp * 0.5, 0],
      scale: 1,
      rotateX: [90, 0],
      transition: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
    },
    exit: { opacity: 0, x: dx, y: dy, scale, rotateX: 90, transition: { duration: 0.4, ease: [0.4, 0, 1, 1] } },
  };
}

export function CardReveal({
  item,
  index,
  verdict,
  source,
  onClose,
  reduced,
}: {
  item: Specimen | null;
  index: number;
  verdict: string;
  source: SourceRect | null;
  onClose: () => void;
  reduced: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const centerX = vw / 2;
  const centerY = vh / 2;

  const src = source ?? { x: centerX, y: centerY, w: FOCUS_W, h: FOCUS_W };
  const srcCx = src.x + src.w / 2;
  const srcCy = src.y + src.h / 2;
  const dx = srcCx - centerX;
  const dy = srcCy - centerY;
  const scale = src.w / FOCUS_W;

  const motionProps = flight(dx, dy, scale, reduced);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: reduced ? "blur(0px)" : "blur(4px)", transition: { duration: 0.4 } }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.3 } }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(2,12,15,0.66)", perspective: 1400 }}
        >
          <motion.article
            key="card"
            onClick={(e) => e.stopPropagation()}
            initial={motionProps.initial}
            animate={motionProps.animate}
            exit={motionProps.exit}
            style={{
              position: "fixed",
              left: "50%",
              top: "8vh",
              width: FOCUS_W,
              marginLeft: -FOCUS_W / 2,
              maxHeight: "84vh",
              transformStyle: "preserve-3d",
              transformOrigin: "center center",
              background: CARD,
              border: `3px solid ${verdict === "To Part With" ? ORANGE : INK}`,
              borderRadius: 4,
              boxShadow: "0 50px 120px rgba(0,0,0,0.7)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${INK_2}` }}>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: INK_2 }}>
                № {String(index + 1).padStart(3, "0")}
              </span>
              <span style={{ border: `2px solid ${verdict === "To Part With" ? ORANGE : INK}`, padding: "2px 7px", fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: verdict === "To Part With" ? ORANGE : INK_2 }}>
                {verdict}
              </span>
            </div>

            <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, aspectRatio: "16 / 11", background: item.cutout ? `radial-gradient(120% 120% at 50% 35%, #0a3540, ${CARD})` : CARD, display: "flex", alignItems: "center", justifyContent: "center", padding: item.cutout ? 28 : 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                style={{ width: "100%", height: "100%", objectFit: item.cutout ? "contain" : "cover", filter: item.cutout ? "drop-shadow(0 10px 16px rgba(0,0,0,0.5))" : undefined }}
              />
            </div>

            <div style={{ padding: "18px 18px 22px", color: INK }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{item.name}</h2>
                <span style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: ORANGE }}>{item.category}</span>
              </div>
              <p style={{ margin: "12px 0 16px", fontSize: 15, lineHeight: 1.55, color: "rgba(230,247,244,0.78)" }}>{item.why}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: INK_2, borderTop: `1px solid ${INK_2}`, paddingTop: 12 }}>
                <span>{item.location}</span>
                <span>{item.acquired}</span>
              </div>
              <p style={{ margin: "16px 0 0", fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", color: "rgba(230,247,244,0.35)", textAlign: "center" }}>
                Click anywhere to put it back
              </p>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

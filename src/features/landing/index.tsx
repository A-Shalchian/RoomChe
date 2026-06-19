"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { specimens } from "./items";
import { usePrefersReducedMotion } from "./use-reduced-motion";
import { CardReveal, type SourceRect } from "./card-reveal";

const TEAL = "#06222a";
const TEAL_2 = "#0a3540";
const CARD = "#0c2d36";
const PAPER = "#f4efe6";
const INK = "#e6f7f4";
const INK_2 = "rgba(230,247,244,0.55)";
const ORANGE = "#ff8a5c";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const FLOOR_Z = -46;

type Verdict = "never" | "maybe" | "soon";
const VERDICTS: Verdict[] = ["never", "never", "maybe", "never", "never", "soon", "never", "maybe", "never", "never", "soon", "never"];
const SEAL: Record<Verdict, string> = { never: "Kept", maybe: "Uncertain", soon: "To Part With" };

const entranceVariants = {
  hidden: { opacity: 0, y: 72, scale: 0.92 },
  show: (depth: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.12 + (3 - depth) * 0.11,
      type: "spring" as const,
      stiffness: 180,
      damping: 20,
      mass: 0.9,
    },
  }),
};

type Slot = { col: number; row: number; depth: number };

const slots: Slot[] = [
  { col: 0, row: 0, depth: 3 }, { col: 2, row: 0, depth: 2.6 }, { col: 4, row: 0, depth: 2.2 },
  { col: 1, row: 1, depth: 2.4 }, { col: 3, row: 1, depth: 2 }, { col: 5, row: 1, depth: 1.6 },
  { col: 0, row: 2, depth: 1.7 }, { col: 2, row: 2, depth: 1.3 }, { col: 4, row: 2, depth: 1 },
  { col: 1, row: 3, depth: 0.9 }, { col: 3, row: 3, depth: 0.6 }, { col: 5, row: 3, depth: 0.4 },
];

type TileProps = {
  index: number;
  slot: Slot;
  counter: MotionValue<number>;
  reduced: boolean;
  selected: boolean;
  onSelect: (index: number, rect: DOMRect) => void;
};

function Tile({ index, slot, counter, reduced, selected, onSelect }: TileProps) {
  const item = specimens[index];
  const pad = String(index + 1).padStart(3, "0");
  const verdict = VERDICTS[index] ?? "never";
  const seal = SEAL[verdict];
  const [hover, setHover] = useState(false);
  const down = useRef({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const baseX = (slot.col - 2.5) * 112;
  const baseY = (slot.row - 1.5) * 112;
  const liftZ = slot.depth * 26;

  const liftSpring = { type: "spring" as const, stiffness: 260, damping: 22, mass: 0.8 };

  useEffect(() => {
    if (!hover) return;
    function onMove(e: PointerEvent) {
      const r = frameRef.current?.getBoundingClientRect();
      if (!r) return;
      const m = 10;
      const inside = e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
      if (!inside) setHover(false);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [hover]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 150,
        marginLeft: -75,
        marginTop: -96,
        x: baseX,
        y: baseY,
        opacity: 1,
        zIndex: Math.round(slot.depth * 10) + (hover ? 100 : 0),
        transformStyle: "preserve-3d",
        cursor: "pointer",
      }}
    >
      <motion.div
        aria-hidden
        initial={false}
        animate={
          reduced || !hover
            ? { translateZ: FLOOR_Z - liftZ, scale: 1, opacity: 0.42 }
            : { translateZ: FLOOR_Z - (liftZ + 30), scale: 1.2, opacity: 0.24 }
        }
        transition={reduced ? { duration: 0 } : liftSpring}
        style={{
          position: "absolute",
          left: "50%",
          bottom: -10,
          width: 124,
          height: 30,
          marginLeft: -62,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(0,0,0,0.55), transparent)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        initial={false}
        animate={reduced || !hover ? { translateZ: liftZ, scale: 1 } : { translateZ: liftZ + 30, scale: 1.04 }}
        transition={reduced ? { duration: 0 } : liftSpring}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          custom={slot.depth}
          variants={entranceVariants}
          initial={reduced ? false : "hidden"}
          animate={reduced ? undefined : "show"}
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div style={{ rotateZ: reduced ? 0 : counter, transformStyle: "preserve-3d" }}>
            <div
              ref={frameRef}
              onPointerEnter={() => setHover(true)}
              onPointerDownCapture={(e) => {
                down.current = { x: e.clientX, y: e.clientY };
              }}
              onClickCapture={(e) => {
                const moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y);
                if (moved < 6 && frameRef.current) {
                  e.stopPropagation();
                  onSelect(index, frameRef.current.getBoundingClientRect());
                }
              }}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
                border: `3px solid ${verdict === "soon" ? ORANGE : INK}`,
                background: item.cutout ? `radial-gradient(120% 120% at 50% 35%, ${TEAL_2}, ${CARD})` : CARD,
                filter: `drop-shadow(0 ${22 + slot.depth * 12}px ${28 + slot.depth * 14}px rgba(0,0,0,${0.4 + slot.depth * 0.06}))`,
                opacity: selected ? 0 : 1,
                transition: "opacity 0.15s",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  top: 7,
                  zIndex: 2,
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: INK_2,
                }}
              >
                № {pad}
              </span>
              <span
                style={{
                  position: "absolute",
                  right: 8,
                  top: 7,
                  zIndex: 2,
                  border: `2px solid ${verdict === "soon" ? ORANGE : INK}`,
                  padding: "1px 4px",
                  fontFamily: MONO,
                  fontSize: 7,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: verdict === "soon" ? ORANGE : INK_2,
                  background: CARD,
                }}
              >
                {seal}
              </span>
              <div style={{ position: "absolute", inset: "28px 16px 40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: item.cutout ? "contain" : "cover", display: "block", filter: item.cutout ? "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" : undefined }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 6,
                  padding: "7px 10px",
                  borderTop: `1px solid ${INK_2}`,
                  background: CARD,
                }}
              >
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "-0.01em", color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.name}
                </span>
                <span style={{ flexShrink: 0, fontFamily: MONO, fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.16em", color: INK_2 }}>
                  {item.location}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function IsoScene({ reduced, selected, onSelect }: { reduced: boolean; selected: number | null; onSelect: (i: number, rect: DOMRect) => void }) {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dx = useSpring(dragX, { stiffness: 150, damping: 22 });
  const dy = useSpring(dragY, { stiffness: 150, damping: 22 });

  const tilt = useTransform(dy, (d) => 58 - d * 0.18);
  const spin = useTransform(dx, (d) => -42 + d * 0.22);
  const counter = useTransform(spin, (v) => -v);

  const [dragging, setDragging] = useState(false);

  function onDrag(_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    dragX.set(dragX.get() + info.delta.x);
    dragY.set(dragY.get() + info.delta.y);
  }

  return (
    <div style={{ perspective: 1500, perspectiveOrigin: "50% 40%", width: "100%", maxWidth: 760, margin: "0 auto", height: 620, touchAction: "pan-y" }}>
      <motion.div
        drag={reduced ? false : true}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        onDragStart={() => setDragging(true)}
        onDrag={onDrag}
        onDragEnd={() => setDragging(false)}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          rotateX: reduced ? 56 : tilt,
          rotateZ: reduced ? -42 : spin,
          cursor: reduced ? "default" : dragging ? "grabbing" : "grab",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "4% 2%",
            transform: `translateZ(${FLOOR_Z}px)`,
            borderRadius: 30,
            background: `radial-gradient(120% 120% at 50% 38%, ${TEAL_2}, ${TEAL})`,
            backgroundImage: `repeating-linear-gradient(0deg, rgba(255,138,92,0.1) 0 1px, transparent 1px 54px), repeating-linear-gradient(90deg, rgba(255,138,92,0.1) 0 1px, transparent 1px 54px)`,
            boxShadow: "0 80px 130px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,138,92,0.16) inset",
          }}
        />
        {slots.map((slot, i) => (
          <Tile key={specimens[i].slug} index={i} slot={slot} counter={counter} reduced={reduced} selected={selected === i} onSelect={onSelect} />
        ))}
      </motion.div>
    </div>
  );
}

function NotchButton({
  href,
  arrow,
  ariaLabel,
  children,
}: {
  href?: string;
  arrow?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const inner = (
    <>
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: hover ? 1 : 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.65, 0.3, 1] }}
        style={{ position: "absolute", inset: 0, transformOrigin: "left", background: ORANGE }}
      />
      <span
        style={{
          position: "relative",
          color: hover ? TEAL : INK,
          transition: "color 0.3s ease",
        }}
      >
        {children}
      </span>
      {arrow && (
        <span
          aria-hidden
          style={{
            position: "relative",
            color: hover ? TEAL : INK,
            transform: hover ? "translateX(4px)" : "translateX(0)",
            transition: "transform 0.3s ease, color 0.3s ease",
          }}
        >
          →
        </span>
      )}
    </>
  );
  const style: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.55rem",
    overflow: "hidden",
    border: `2px solid ${INK}`,
    background: TEAL,
    color: INK,
    padding: "0.5rem 1rem",
    fontFamily: MONO,
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    cursor: "pointer",
    borderRadius: 999,
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  };
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} style={style} {...handlers}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={ariaLabel} style={style} {...handlers}>
      {inner}
    </button>
  );
}

function Thesis() {
  const points = [
    { k: "01", h: "Every Thing Becomes a Row", b: "Photographed, named, located. The clutter resolves into clean records." },
    { k: "02", h: "A Private Queryable Catalogue", b: "Yours alone. Filter by room, by category, by the year it arrived." },
    { k: "03", h: "Keep, Maybe, Let Go", b: "Every object gets a verdict. The room learns what it is for." },
  ];
  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", maxWidth: 980, margin: "0 auto", padding: "0 6vw" }}>
      {points.map((p) => (
        <div key={p.k} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(244,239,230,0.1)", borderRadius: 16, padding: "1.6rem 1.4rem" }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.2em", color: ORANGE }}>{p.k}</span>
          <h3 style={{ margin: "0.6rem 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{p.h}</h3>
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5, color: "#aeb9bb" }}>{p.b}</p>
        </div>
      ))}
    </div>
  );
}

export default function IsometricLanding() {
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const [source, setSource] = useState<SourceRect | null>(null);
  const item = selected === null ? null : specimens[selected];
  const verdict = selected === null ? "Kept" : SEAL[VERDICTS[selected] ?? "never"];

  function select(i: number, rect: DOMRect) {
    setSource({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
    setSelected(i);
  }

  function close() {
    setSelected(null);
  }

  return (
    <main style={{ background: TEAL, color: PAPER, fontFamily: "var(--font-geist-sans), system-ui, sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.775rem 1.8rem",
          borderBottom: `1px solid ${INK_2}`,
          background: "rgba(6,34,42,0.72)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span style={{ fontWeight: 900, letterSpacing: "-0.03em", fontSize: "2.5rem" }}>RoomChe</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <NotchButton ariaLabel="Toggle dark mode">
            <span aria-hidden style={{ marginRight: "0.4rem" }}>☾</span>
            Dark
          </NotchButton>
          <NotchButton href="/login" arrow>
            Try it out
          </NotchButton>
        </div>
      </nav>

      <section style={{ textAlign: "center", padding: "13vh 6vw 0" }}>
        <h1 style={{ fontSize: "clamp(2.6rem, 8vw, 6rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, margin: "5px auto 0", maxWidth: "16ch" }}>
          A Room is a <span style={{ color: ORANGE }}>Database</span>
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.4vw, 1.3rem)", color: "#aeb9bb", maxWidth: "44ch", margin: "1.4rem auto 0", lineHeight: 1.5 }}>
          Stack every object you own into one queryable room. Drag to orbit it, lift a card to see it rise.
        </p>
      </section>

      <section style={{ marginTop: "-9vh" }}>
        <IsoScene reduced={reduced} selected={selected} onSelect={select} />
      </section>

      <section style={{ padding: "16vh 0 10vh" }}>
        <Thesis />
      </section>

      <footer
        style={{
          borderTop: `1px solid ${INK_2}`,
          padding: "3rem 1.8rem 2.4rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1.4rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 900, letterSpacing: "-0.03em", fontSize: "1.4rem" }}>RoomChe</span>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "1.4rem", fontFamily: MONO, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.14em", color: INK_2 }}>
          <Link href="/login" style={{ color: INK_2 }}>Login or Join</Link>
          <a href="https://github.com/a-shalchian" target="_blank" rel="noopener noreferrer" style={{ color: INK_2 }}>
            GitHub ↗
          </a>
        </nav>
        <span style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.12em", color: INK_2 }}>
          Built by Arash Shalchian
        </span>
      </footer>

      <CardReveal
        item={item}
        index={selected ?? 0}
        verdict={verdict}
        source={source}
        reduced={reduced}
        onClose={close}
      />
    </main>
  );
}

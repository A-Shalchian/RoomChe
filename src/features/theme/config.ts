export type Mode = "dark" | "light";

export type Theme = {
  mode: Mode;
  bg: string;
  ink: string;
  ink2: string;
  accent: string;
  rule: string;
};

export type Font = {
  family: string;
  weight: number;
};

export const themes: Record<Mode, Theme> = {
  dark: {
    mode: "dark",
    bg: "#06222a",
    ink: "#e6f7f4",
    ink2: "rgba(230,247,244,0.5)",
    accent: "#ff8a5c",
    rule: "rgba(230,247,244,0.18)",
  },
  light: {
    mode: "light",
    bg: "#eef4f2",
    ink: "#06222a",
    ink2: "rgba(6,34,42,0.55)",
    accent: "#d2562b",
    rule: "rgba(6,34,42,0.18)",
  },
};

export const defaultMode: Mode = "dark";

export const font: Font = {
  family: "var(--font-space-grotesk)",
  weight: 700,
};

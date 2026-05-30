export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t-[6px] px-6 py-5 sm:px-10"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span
          className="leading-none tracking-[-0.02em]"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 700,
            fontSize: "1.05rem",
          }}
        >
          RoomChe
        </span>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
          <a
            href="https://github.com/a-shalchian"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 transition-colors hover:[color:var(--lv-accent)]"
          >
            built by arash shalchian
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </a>
          <a
            href="https://shalchian.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:[color:var(--lv-accent)]"
          >
            shalchian.dev
          </a>
          <span>© {new Date().getFullYear()} arash shalchian</span>
        </nav>
      </div>
    </footer>
  );
}

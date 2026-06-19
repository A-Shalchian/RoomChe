"use client";

import { useState } from "react";

export function TagInput({
  tags,
  onChange,
  suggestions,
  disabled,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const name = raw.trim().toLowerCase().slice(0, 24);
    if (!name || tags.includes(name) || tags.length >= 12) {
      setDraft("");
      return;
    }
    onChange([...tags, name]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(tags.filter((t) => t !== name));
  }

  const open = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
        tags
      </span>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => remove(tag)}
              disabled={disabled}
              className="inline-flex items-center gap-1 border-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:[background:var(--lv-accent)] hover:[color:var(--lv-bg)] disabled:opacity-50"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              {tag}
              <span aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length > 0) {
            remove(tags[tags.length - 1]);
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder="add a tag, press enter"
        disabled={disabled || tags.length >= 12}
        list="tag-suggestions"
        className="border-[2px] bg-transparent px-3 py-2 text-[14px] outline-none focus:[border-color:var(--lv-accent)] disabled:opacity-50"
        style={{ borderColor: "var(--lv-ink)" }}
      />
      <datalist id="tag-suggestions">
        {open.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

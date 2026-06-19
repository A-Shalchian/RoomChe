"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useTransition } from "react";
import { deleteItem, updateItem } from "@/features/items/edit-action";
import type { DashboardItem } from "./types";

type Verdict = "never" | "maybe" | "soon" | null;

export type ContainerOption = { id: string; name: string };

export function EditModal({
  item,
  locations,
  containers,
  onClose,
}: {
  item: DashboardItem | null;
  locations: string[];
  containers: ContainerOption[];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {item && (
        <Body
          key={item.id}
          item={item}
          locations={locations}
          containers={containers}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

function Body({
  item,
  locations,
  containers,
  onClose,
}: {
  item: DashboardItem;
  locations: string[];
  containers: ContainerOption[];
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category ?? "");
  const [location, setLocation] = useState(item.locations?.name ?? "");
  const [verdict, setVerdict] = useState<Verdict>(item.would_discard);
  const [whyKept, setWhyKept] = useState(item.why_kept ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [isContainer, setIsContainer] = useState(item.is_container);
  const [containerId, setContainerId] = useState<string | null>(item.container_id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const containerChoices = containers.filter((c) => c.id !== item.id);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving && !deleting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving, deleting]);

  function save() {
    if (!name.trim()) {
      setError("name required");
      return;
    }
    setError(null);
    startSave(async () => {
      try {
        await updateItem({
          id: item.id,
          name,
          category,
          location: location.trim() || null,
          would_discard: verdict,
          why_kept: whyKept || null,
          notes: notes || null,
          is_container: isContainer,
          container_id: isContainer ? null : containerId,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function remove() {
    startDelete(async () => {
      try {
        await deleteItem(item.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        background: "color-mix(in srgb, var(--lv-ink) 60%, transparent)",
      }}
      onClick={() => !saving && !deleting && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.2, 0.65, 0.3, 1] }}
        className="relative grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto border-[3px] md:grid-cols-[1fr_1.2fr]"
        style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-center border-b-[3px] p-6 md:border-b-0 md:border-r-[3px]"
          style={{ borderColor: "var(--lv-ink)" }}
        >
          <div
            className="flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden border-[2px]"
            style={{ borderColor: "var(--lv-rule)" }}
          >
            {item.image_display_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_display_url}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
                no image
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--lv-accent)]">
              ● edit item
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              aria-label="close"
              className="font-mono text-[10px] uppercase tracking-[0.18em] hover:[color:var(--lv-accent)] disabled:opacity-40"
            >
              close ✕
            </button>
          </div>

          <Field
            label="name"
            value={name}
            onChange={setName}
            disabled={saving || deleting}
          />
          <Field
            label="category"
            value={category}
            onChange={setCategory}
            disabled={saving || deleting}
          />
          <Field
            label="location"
            value={location}
            onChange={setLocation}
            disabled={saving || deleting}
            listId="locations-datalist"
          />
          <datalist id="locations-datalist">
            {locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
              verdict
            </span>
            <div className="flex gap-2">
              {([
                ["never", "keep"],
                ["maybe", "maybe"],
                ["soon", "let go"],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(verdict === v ? null : v)}
                  disabled={saving || deleting}
                  className="flex-1 border-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
                  style={{
                    borderColor: "var(--lv-ink)",
                    background: verdict === v ? "var(--lv-ink)" : "transparent",
                    color: verdict === v ? "var(--lv-bg)" : "var(--lv-ink)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
              containment
            </span>
            <button
              type="button"
              onClick={() => setIsContainer((v) => !v)}
              disabled={saving || deleting}
              data-on={isContainer || undefined}
              className="flex items-center justify-between border-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50 data-[on]:[background:var(--lv-ink)] data-[on]:[color:var(--lv-bg)]"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              <span>this item holds other items</span>
              <span aria-hidden>{isContainer ? "▣" : "▢"}</span>
            </button>
            {!isContainer && containerChoices.length > 0 && (
              <label className="mt-1 flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
                  inside
                </span>
                <select
                  value={containerId ?? ""}
                  onChange={(e) => setContainerId(e.target.value || null)}
                  disabled={saving || deleting}
                  className="border-[2px] bg-transparent px-3 py-2 text-[14px] outline-none focus:[border-color:var(--lv-accent)] disabled:opacity-50"
                  style={{ borderColor: "var(--lv-ink)" }}
                >
                  <option value="">nowhere</option>
                  {containerChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <Field
            label="why kept"
            value={whyKept}
            onChange={setWhyKept}
            disabled={saving || deleting}
            placeholder="optional"
          />
          <TextArea
            label="notes"
            value={notes}
            onChange={setNotes}
            disabled={saving || deleting}
            placeholder="optional"
          />

          {error && (
            <p
              className="border-l-[3px] pl-3 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                borderColor: "var(--lv-accent)",
                color: "var(--lv-accent)",
              }}
            >
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            {confirmDelete ? (
              <DangerButton
                onClick={remove}
                disabled={deleting}
                label={deleting ? "deleting…" : "confirm delete"}
              />
            ) : (
              <GhostButton
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
                label="delete"
                accent
              />
            )}
            <SolidButton
              onClick={save}
              disabled={saving || deleting}
              label={saving ? "saving…" : "save"}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  listId?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        list={listId}
        className="border-[2px] bg-transparent px-3 py-2 text-[14px] outline-none focus:[border-color:var(--lv-accent)] disabled:opacity-50"
        style={{ borderColor: "var(--lv-ink)" }}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="resize-none border-[2px] bg-transparent px-3 py-2 text-[14px] outline-none focus:[border-color:var(--lv-accent)] disabled:opacity-50"
        style={{ borderColor: "var(--lv-ink)" }}
      />
    </label>
  );
}

function SolidButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden border-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-50"
      style={{
        borderColor: "var(--lv-ink)",
        background: "var(--lv-ink)",
        color: "var(--lv-bg)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 group-disabled:scale-x-0"
        style={{ background: "var(--lv-accent)" }}
      />
      <span className="relative">{label}</span>
    </button>
  );
}

function GhostButton({
  onClick,
  disabled,
  label,
  accent,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-1 items-center justify-center border-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-50"
      style={{
        borderColor: accent ? "var(--lv-accent)" : "var(--lv-ink)",
        color: accent ? "var(--lv-accent)" : "var(--lv-ink)",
      }}
    >
      {label}
    </button>
  );
}

function DangerButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-1 items-center justify-center border-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-50"
      style={{
        borderColor: "var(--lv-accent)",
        background: "var(--lv-accent)",
        color: "var(--lv-bg)",
      }}
    >
      {label}
    </button>
  );
}

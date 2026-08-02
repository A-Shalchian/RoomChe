"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  closeRetouch,
  openRetouch,
  sendRetouch,
  undoRetouch,
} from "./retouch-action";
import { setItemPhoto } from "./set-photo-action";

export type ChatTurn = { id: string; role: "you" | "claude"; text: string };

export function useRetouch(itemId: string) {
  const session = useRef(crypto.randomUUID());
  const opened = useRef(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const say = useCallback((role: ChatTurn["role"], text: string) => {
    setTurns((all) => [...all, { id: crypto.randomUUID(), role, text }]);
  }, []);

  const open = useCallback(async (sourceUrl: string) => {
    if (opened.current) return;
    opened.current = true;
    setError(null);
    try {
      const blob = await (await fetch(sourceUrl)).blob();
      const dataUrl = await toDataUrl(blob);
      const result = await openRetouch(session.current, dataUrl);
      if (!result.ok) throw new Error(result.error ?? "could not open the photo");
      setPreview(dataUrl);
    } catch (err) {
      opened.current = false;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const send = useCallback(
    async (instruction: string) => {
      const asked = instruction.trim();
      if (!asked || busy) return;
      say("you", asked);
      setBusy(true);
      setError(null);
      const result = await sendRetouch(session.current, asked);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      say("claude", result.reply);
      setPreview(result.dataUrl);
      setCanUndo(result.canUndo);
    },
    [busy, say],
  );

  const undo = useCallback(async () => {
    setBusy(true);
    const result = await undoRetouch(session.current);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPreview(result.dataUrl);
    setCanUndo(result.canUndo);
    say("claude", "stepped back one edit");
  }, [say]);

  const save = useCallback(async () => {
    if (!preview) return false;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");

      const blob = await (await fetch(preview)).blob();
      const key = `${user.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(key, blob, { contentType: "image/png", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const result = await setItemPhoto(itemId, key);
      if (!result.ok) {
        await supabase.storage.from("item-images").remove([key]);
        throw new Error(result.error ?? "could not save the photo");
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setSaving(false);
    }
  }, [itemId, preview]);

  const dispose = useCallback(() => {
    void closeRetouch(session.current);
    session.current = crypto.randomUUID();
    opened.current = false;
    setTurns([]);
    setPreview(null);
    setCanUndo(false);
    setError(null);
  }, []);

  return { turns, preview, busy, saving, canUndo, error, open, send, undo, save, dispose };
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

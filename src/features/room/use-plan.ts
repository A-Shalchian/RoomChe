"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_WALL_COLOUR,
  MIN_WALL,
  fitOpening,
  newOpening,
  segments,
  snap,
  type Opening,
  type Point,
  type RoomPlan,
} from "./plan";
import { savePlan } from "./plan-action";

export type Selection =
  | { kind: "wall"; index: number }
  | { kind: "point"; index: number }
  | { kind: "opening"; id: string }
  | null;

export type Mode = "edit" | "draw";

function normalise(plan: RoomPlan): RoomPlan {
  const walls = plan.points.map(
    (_, i) => plan.walls[i] ?? { colour: DEFAULT_WALL_COLOUR },
  );
  const lengths = segments(plan.points).map((s) => s.length);
  const openings = plan.openings
    .filter((o) => o.wall < plan.points.length)
    .map((o) => fitOpening(o, lengths[o.wall] ?? 0));
  return { ...plan, walls, openings };
}

export function usePlan(initial: RoomPlan) {
  const [plan, setPlan] = useState<RoomPlan>(() => normalise(initial));
  const [mode, setMode] = useState<Mode>(
    initial.points.length >= 3 ? "edit" : "draw",
  );
  const [selection, setSelection] = useState<Selection>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const segs = useMemo(() => segments(plan.points), [plan.points]);

  const patch = useCallback((next: Partial<RoomPlan>) => {
    setPlan((current) => normalise({ ...current, ...next }));
    setSavedAt(null);
  }, []);

  const addPoint = useCallback(
    (x: number, z: number) => {
      setPlan((current) => {
        const point = { x: snap(x), z: snap(z) };
        const last = current.points.at(-1);
        if (last && last.x === point.x && last.z === point.z) return current;
        return normalise({ ...current, points: [...current.points, point] });
      });
      setSavedAt(null);
    },
    [],
  );

  const movePoint = useCallback((index: number, x: number, z: number) => {
    setPlan((current) => {
      const points = current.points.map((p, i) =>
        i === index ? { x: snap(x), z: snap(z) } : p,
      );
      return normalise({ ...current, points });
    });
    setSavedAt(null);
  }, []);

  const deletePoint = useCallback((index: number) => {
    setPlan((current) => {
      if (current.points.length <= 3) return current;
      const points = current.points.filter((_, i) => i !== index);
      const walls = current.walls.filter((_, i) => i !== index);
      const openings = current.openings
        .filter((o) => o.wall !== index)
        .map((o) => (o.wall > index ? { ...o, wall: o.wall - 1 } : o));
      return normalise({ ...current, points, walls, openings });
    });
    setSelection(null);
    setSavedAt(null);
  }, []);

  const splitWall = useCallback((index: number) => {
    setPlan((current) => {
      const list = segments(current.points);
      const seg = list[index];
      if (!seg) return current;
      const mid: Point = { x: snap(seg.mid.x), z: snap(seg.mid.z) };
      const points = [
        ...current.points.slice(0, index + 1),
        mid,
        ...current.points.slice(index + 1),
      ];
      const walls = [
        ...current.walls.slice(0, index + 1),
        { colour: current.walls[index]?.colour ?? DEFAULT_WALL_COLOUR },
        ...current.walls.slice(index + 1),
      ];
      const openings = current.openings
        .filter((o) => o.wall !== index)
        .map((o) => (o.wall > index ? { ...o, wall: o.wall + 1 } : o));
      return normalise({ ...current, points, walls, openings });
    });
    setSavedAt(null);
  }, []);

  const setWallLength = useCallback((index: number, metres: number) => {
    setPlan((current) => {
      const seg = segments(current.points)[index];
      if (!seg || seg.length < 1e-6) return current;
      const target = Math.max(MIN_WALL, metres);
      const dx = (seg.b.x - seg.a.x) / seg.length;
      const dz = (seg.b.z - seg.a.z) / seg.length;
      const end = (index + 1) % current.points.length;
      const points = current.points.map((p, i) =>
        i === end
          ? { x: snap(seg.a.x + dx * target), z: snap(seg.a.z + dz * target) }
          : p,
      );
      return normalise({ ...current, points });
    });
    setSavedAt(null);
  }, []);

  const setWallColour = useCallback((index: number, colour: string) => {
    setPlan((current) =>
      normalise({
        ...current,
        walls: current.walls.map((w, i) => (i === index ? { colour } : w)),
      }),
    );
    setSavedAt(null);
  }, []);

  const paintAllWalls = useCallback((colour: string) => {
    setPlan((current) =>
      normalise({ ...current, walls: current.walls.map(() => ({ colour })) }),
    );
    setSavedAt(null);
  }, []);

  const addOpening = useCallback(
    (wall: number, kind: Opening["kind"]) => {
      setPlan((current) => {
        const length = segments(current.points)[wall]?.length ?? 0;
        if (length < 0.6) return current;
        const opening = newOpening(kind, wall, length);
        setSelection({ kind: "opening", id: opening.id });
        return normalise({
          ...current,
          openings: [...current.openings, opening],
        });
      });
      setSavedAt(null);
    },
    [],
  );

  const updateOpening = useCallback((id: string, next: Partial<Opening>) => {
    setPlan((current) =>
      normalise({
        ...current,
        openings: current.openings.map((o) =>
          o.id === id ? { ...o, ...next } : o,
        ),
      }),
    );
    setSavedAt(null);
  }, []);

  const removeOpening = useCallback((id: string) => {
    setPlan((current) =>
      normalise({
        ...current,
        openings: current.openings.filter((o) => o.id !== id),
      }),
    );
    setSelection(null);
    setSavedAt(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await savePlan(plan);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPlan((current) => ({ ...current, id: result.id }));
    setSavedAt(Date.now());
  }, [plan]);

  const closed = plan.points.length >= 3;

  return {
    plan,
    segs,
    closed,
    mode,
    setMode,
    selection,
    setSelection,
    saving,
    savedAt,
    error,
    patch,
    addPoint,
    movePoint,
    deletePoint,
    splitWall,
    setWallLength,
    setWallColour,
    paintAllWalls,
    addOpening,
    updateOpening,
    removeOpening,
    save,
  };
}

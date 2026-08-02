"use client";

import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Grid,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";

export function ModelViewer({ setId }: { setId: string }) {
  const url = `/api/scan/${setId}/model`;
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(url, { method: "GET", headers: { range: "bytes=0-0" } })
      .then((res) => alive && setAvailable(res.ok))
      .catch(() => alive && setAvailable(false));
    return () => {
      alive = false;
    };
  }, [url]);

  if (available === false) {
    return (
      <Placeholder>no model on disk for this scan yet</Placeholder>
    );
  }

  return (
    <div
      className="h-[70vh] w-full border-[3px]"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-ink)" }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [1.6, 1.2, 1.6], fov: 45 }}
      >
        <hemisphereLight args={["#f4f4ef", "#2b2b33", 2.2]} />
        <directionalLight position={[3, 5, 2]} intensity={2.4} castShadow />
        <directionalLight position={[-4, 2, -3]} intensity={0.8} />

        <Grid
          args={[10, 10]}
          cellSize={0.1}
          sectionSize={0.5}
          fadeDistance={8}
          infiniteGrid
          sectionColor="#5a5a5a"
          cellColor="#333333"
        />

        <Suspense fallback={null}>
          <Bounds fit observe margin={1.3}>
            <Model url={url} />
          </Bounds>
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.55}
            scale={6}
            blur={2.4}
            far={4}
          />
        </Suspense>
        <OrbitControls makeDefault enableDamping target={[0, 0.25, 0]} />
      </Canvas>
    </div>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-[70vh] w-full items-center justify-center border-[3px] px-8 text-center"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
        {children}
      </p>
    </div>
  );
}

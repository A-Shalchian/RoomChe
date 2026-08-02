"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { openingsOn, segments, type RoomPlan } from "./plan";

export function RoomScene({ plan }: { plan: RoomPlan }) {
  const segs = useMemo(() => segments(plan.points), [plan.points]);
  const centre = useMemo(() => {
    if (plan.points.length === 0) return new THREE.Vector3();
    const sum = plan.points.reduce(
      (acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }),
      { x: 0, z: 0 },
    );
    return new THREE.Vector3(
      sum.x / plan.points.length,
      0,
      sum.z / plan.points.length,
    );
  }, [plan.points]);

  const reach = useMemo(() => {
    if (plan.points.length === 0) return 6;
    const far = plan.points.reduce(
      (max, p) => Math.max(max, Math.hypot(p.x - centre.x, p.z - centre.z)),
      1,
    );
    return far * 2.4 + 2;
  }, [plan.points, centre]);

  const floor = useMemo(() => {
    if (plan.points.length < 3) return null;
    const shape = new THREE.Shape(
      plan.points.map((p) => new THREE.Vector2(p.x, -p.z)),
    );
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, [plan.points]);

  if (plan.points.length < 3) {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-[3px]"
        style={{ borderColor: "var(--lv-ink)", background: "var(--lv-ink)" }}
      >
        <p
          className="font-mono text-[11px] uppercase tracking-[0.18em]"
          style={{ color: "var(--lv-bg)" }}
        >
          draw at least three corners
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full border-[3px]"
      style={{ borderColor: "var(--lv-ink)", background: "#0a2029" }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [centre.x + reach * 0.6, reach * 0.7, centre.z + reach * 0.6], fov: 50 }}
      >
        <hemisphereLight args={["#f6f4ee", "#20242c", 2.0]} />
        <directionalLight
          position={[centre.x + 6, 9, centre.z + 4]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.05}
        />
        <directionalLight position={[centre.x - 5, 4, centre.z - 6]} intensity={0.7} />

        {floor && (
          <mesh geometry={floor} receiveShadow>
            <meshStandardMaterial
              color={plan.floorColour}
              roughness={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {segs.map((seg) => (
          <WallMesh
            key={seg.index}
            plan={plan}
            index={seg.index}
            ax={seg.a.x}
            az={seg.a.z}
            length={seg.length}
            angle={seg.angle}
          />
        ))}

        {plan.openings
          .filter((o) => o.kind === "window")
          .map((o) => {
            const seg = segs[o.wall];
            if (!seg || seg.length === 0) return null;
            const dx = (seg.b.x - seg.a.x) / seg.length;
            const dz = (seg.b.z - seg.a.z) / seg.length;
            const along = o.offset + o.width / 2;
            const top = Math.min(plan.wallHeight, o.sill + o.height);
            return (
              <mesh
                key={o.id}
                position={[
                  seg.a.x + dx * along,
                  (o.sill + top) / 2,
                  seg.a.z + dz * along,
                ]}
                rotation={[0, seg.angle, 0]}
              >
                <planeGeometry args={[o.width, Math.max(0.05, top - o.sill)]} />
                <meshPhysicalMaterial
                  color="#cfe6f2"
                  transparent
                  opacity={0.28}
                  roughness={0.08}
                  metalness={0}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}

        <Grid
          args={[40, 40]}
          position={[centre.x, -0.002, centre.z]}
          cellSize={0.5}
          sectionSize={2}
          fadeDistance={reach * 2.2}
          infiniteGrid
          sectionColor="#4c5560"
          cellColor="#2b333c"
        />

        <OrbitControls
          makeDefault
          enableDamping
          target={[centre.x, plan.wallHeight * 0.35, centre.z]}
          maxPolarAngle={Math.PI / 2.02}
        />
      </Canvas>
    </div>
  );
}

function WallMesh({
  plan,
  index,
  ax,
  az,
  length,
  angle,
}: {
  plan: RoomPlan;
  index: number;
  ax: number;
  az: number;
  length: number;
  angle: number;
}) {
  const geometry = useMemo(() => {
    if (length < 0.01) return null;
    const height = plan.wallHeight;
    const shape = new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(length, 0),
      new THREE.Vector2(length, height),
      new THREE.Vector2(0, height),
    ]);

    for (const o of openingsOn(plan, index)) {
      const left = Math.max(0.01, Math.min(o.offset, length - 0.02));
      const right = Math.min(length - 0.01, o.offset + o.width);
      const bottom = Math.max(0.001, o.sill);
      const top = Math.min(height - 0.001, o.sill + o.height);
      if (right - left < 0.05 || top - bottom < 0.05) continue;
      shape.holes.push(
        new THREE.Path([
          new THREE.Vector2(left, bottom),
          new THREE.Vector2(right, bottom),
          new THREE.Vector2(right, top),
          new THREE.Vector2(left, top),
        ]),
      );
    }

    return new THREE.ShapeGeometry(shape);
  }, [plan, index, length]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={[ax, 0, az]}
      rotation={[0, angle, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={plan.walls[index]?.colour ?? "#e8e4dc"}
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

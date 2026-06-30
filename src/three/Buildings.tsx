import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { useCity } from "../store";
import type { BuildingDef, GameEvent } from "../types";

/**
 * Buildings rendered as instanced meshes for performance.
 * Each building = one box instance. Lit windows are a second instanced set
 * shown only when the building has power and it's night.
 */
export function Buildings() {
  const layout = useCity((s) => s.layout);
  const buildings = layout.buildings;
  const select = useCity((s) => s.select);
  const selectedId = useCity((s) => s.selectedBuildingId);

  const boxRef = useRef<THREE.InstancedMesh>(null!);
  const winRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // store per-building geometry so we can compute window positions
  const data = useMemo(() => {
    return buildings.map((b) => {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(b.x, b.h / 2, b.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (b.rot * Math.PI) / 2, 0)),
        new THREE.Vector3(b.w, b.h, b.d),
      );
      return { b, matrix: m };
    });
  }, [buildings]);

  useEffect(() => {
    if (!boxRef.current) return;
    data.forEach(({ b, matrix }, i) => {
      boxRef.current.setMatrixAt(i, matrix);
      color.set(b.color);
      // highlight selected
      boxRef.current.setColorAt(i, color);
    });
    boxRef.current.instanceMatrix.needsUpdate = true;
    if (boxRef.current.instanceColor) boxRef.current.instanceColor.needsUpdate = true;
  }, [data, color]);

  // window instances: for each building, a few small emissive quads on the face
  const windows = useMemo(() => {
    const arr: { x: number; y: number; z: number; w: number; h: number; id: string; ry: number }[] = [];
    for (const b of buildings) {
      if (b.h < 3) continue;
      const floors = Math.max(1, Math.floor(b.h / 2.2));
      const cols = Math.max(2, Math.floor(b.w / 1.6));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const y = 1.2 + f * 2.2;
          const offset = (c - (cols - 1) / 2) * 1.6;
          // front face
          arr.push({
            x: b.x + offset,
            y,
            z: b.z + b.d / 2 + 0.02,
            w: 0.9,
            h: 1.2,
            id: b.id,
            ry: 0,
          });
        }
      }
    }
    return arr;
  }, [buildings]);

  const winDummy = useMemo(() => new THREE.Object3D(), []);
  const winColor = useMemo(() => new THREE.Color(), []);

  // animate windows on/off at night
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = useCity.subscribe((s, prev) => {
      if (s.timeMinutes !== prev.timeMinutes) {
        // re-render once per second-ish via state is wasteful; we handle in frame instead
      }
    });
    return unsub;
  }, []);

  useFrame((state) => {
    const store = useCity.getState();
    const time = store.timeMinutes / 60;
    const isNight = time < 6.3 || time > 18.2;
    const win = winRef.current;
    if (!win) return;
    const flicker = Math.sin(state.clock.elapsedTime * 4) * 0.05 + 0.95;

    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const b = store.buildings[w.id];
      const on = b?.hasPower && isNight && Math.random() > 0.35;
      winDummy.position.set(w.x, w.y, w.z);
      winDummy.rotation.set(0, w.ry, 0);
      winDummy.scale.set(w.w, w.h, 1);
      winDummy.updateMatrix();
      win.setMatrixAt(i, winDummy.matrix);
      if (on) {
        winColor.setRGB(1.0 * flicker, 0.85 * flicker, 0.4 * flicker);
      } else {
        winColor.setRGB(0.02, 0.03, 0.05);
      }
      win.setColorAt(i, winColor);
    }
    win.instanceMatrix.needsUpdate = true;
    if (win.instanceColor) win.instanceColor.needsUpdate = true;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id == null) return;
    const def = buildings[id];
    if (def) select(def.id);
  };

  return (
    <group>
      <instancedMesh
        ref={boxRef}
        args={[undefined, undefined, data.length]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <meshStandardMaterial vertexColors={false} roughness={0.7} metalness={0.25} />
      </instancedMesh>

      <instancedMesh
        ref={winRef}
        args={[undefined, undefined, Math.max(1, windows.length)]}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <BuildingEventEffects />

      {/* Special marker for selected building */}
      {selectedId &&
        (() => {
          const b = buildings.find((x) => x.id === selectedId);
          if (!b) return null;
          return (
            <mesh position={[b.x, b.h + 1.2, b.z]}>
              <coneGeometry args={[Math.max(b.w, b.d) * 0.5, 1.5, 4]} />
              <meshBasicMaterial color="#38e1ff" toneMapped={false} />
            </mesh>
          );
        })()}
    </group>
  );
}

function BuildingEventEffects() {
  const events = useCity((s) => s.events);
  const layout = useCity((s) => s.layout);
  const buildings = layout.buildings;

  const activeEffects = useMemo(() => {
    return events
      .filter((e) => e.buildingId)
      .map((e) => {
        const b = buildings.find((x) => x.id === e.buildingId);
        return b ? { ...e, b } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [events, buildings]);

  return (
    <group>
      {activeEffects.map((ev) => (
        <BuildingEffect key={ev.id} ev={ev} />
      ))}
    </group>
  );
}

function BuildingEffect({ ev }: { ev: GameEvent & { b: BuildingDef } }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const { b, type } = ev;
  const count = 30;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = b.x + (Math.random() - 0.5) * b.w * 0.8;
      pos[i * 3 + 1] = b.h + Math.random() * 4;
      pos[i * 3 + 2] = b.z + (Math.random() - 0.5) * b.d * 0.8;

      vel[i * 3] = (Math.random() - 0.5) * 0.5; // dx
      vel[i * 3 + 1] = 1.0 + Math.random() * 1.5; // dy
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // dz
    }
    return [pos, vel];
  }, [b, count]);

  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      // update y
      array[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      // drift x and z
      array[i * 3] += velocities[i * 3] * dt;
      array[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      // reset particle if too high
      if (array[i * 3 + 1] > b.h + 5) {
        array[i * 3] = b.x + (Math.random() - 0.5) * b.w * 0.8;
        array[i * 3 + 1] = b.h;
        array[i * 3 + 2] = b.z + (Math.random() - 0.5) * b.d * 0.8;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const particleColor = type === "fire" ? "#ff4d00" : type === "pollution" ? "#5a5a5a" : "#38e1ff";
  const particleSize = type === "fire" ? 0.7 : type === "pollution" ? 0.9 : 0.5;

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={particleColor}
          size={particleSize}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </points>

      {/* Pulse warning sphere */}
      <mesh position={[b.x, b.h + 0.8, b.z]}>
        <sphereGeometry args={[Math.min(b.w, b.d) * 0.4, 8, 8]} />
        <meshBasicMaterial
          color={type === "fire" ? "#ff3300" : type === "blackout" ? "#fbbf24" : "#f87171"}
          transparent
          opacity={0.35}
        />
      </mesh>
    </group>
  );
}

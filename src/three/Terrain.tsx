import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCity, CITY_LAYOUT } from "../store";

/** Ground plane + roads + river. */
export function Terrain() {
  const layout = useCity((s) => s.layout);
  const bounds = layout.bounds;

  // Build road network as one merged geometry-ish approach: thin boxes
  const roads = useMemo(() => {
    const items: { x: number; z: number; w: number; d: number }[] = [];
    const width = bounds + 6;
    for (const x of layout.roadsX) items.push({ x, z: 0, w: 4.5, d: width });
    for (const z of layout.roadsZ) items.push({ x: 0, z, w: width, d: 4.5 });
    return items;
  }, [layout, bounds]);

  // lane markings (dashes) — light set
  const dashes = useMemo(() => {
    const arr: [number, number, number, number][] = []; // x,y,z,rot
    for (const x of layout.roadsX) {
      const count = Math.floor(bounds / 4);
      for (let i = 0; i < count; i++) {
        const z = -bounds / 2 + i * 4 + 2;
        arr.push([x, 0.02, z, 0]);
      }
    }
    return arr;
  }, [layout, bounds]);

  // instanced dashes
  const dashRef = useRef<THREE.InstancedMesh>(null!);
  useMemo(() => {
    // set after mount via effect using ref in frame not needed; do once with layout effect
    queueMicrotask(() => {
      if (!dashRef.current) return;
      const d = new THREE.Object3D();
      dashes.forEach((dsh, i) => {
        d.position.set(dsh[0], dsh[1], dsh[2]);
        d.rotation.set(0, dsh[3], 0);
        d.scale.set(0.25, 1, 0.9);
        d.updateMatrix();
        dashRef.current.setMatrixAt(i, d.matrix);
      });
      dashRef.current.instanceMatrix.needsUpdate = true;
    });
  }, [dashes]);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[bounds + 60, bounds + 60]} />
        <meshStandardMaterial color="#13203a" roughness={0.95} />
      </mesh>

      {/* River */}
      {layout.river && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, layout.river.z]}
        >
          <planeGeometry args={[bounds + 30, layout.river.w]} />
          <meshStandardMaterial
            color="#1d4f74"
            transparent
            opacity={0.9}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
      )}

      {/* Roads */}
      {roads.map((r, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[r.x, 0.011, r.z]}
          receiveShadow
        >
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial color="#1a1f2c" roughness={0.9} />
        </mesh>
      ))}

      <instancedMesh
        ref={dashRef}
        args={[undefined, undefined, Math.max(1, dashes.length)]}
      >
        <meshBasicMaterial color="#f2d24a" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Decorative props: wind turbines, solar panels, park trees, factory chimneys. */
export function Props() {
  const layout = useCity((s) => s.layout);

  const wind = layout.buildings.filter((b) => b.category === "wind");
  const solar = layout.buildings.filter((b) => b.category === "solar");
  const parks = layout.buildings.filter((b) => b.category === "park");
  const factories = layout.buildings.filter((b) => b.category === "factory");

  return (
    <group>
      {wind.map((w) => (
        <WindTurbine key={w.id} x={w.x} z={w.z} />
      ))}
      {solar.map((s) => (
        <group key={s.id} position={[s.x, 0.1, s.z]}>
          {Array.from({ length: 9 }).map((_, i) => {
            const ix = (i % 3) - 1;
            const iz = Math.floor(i / 3) - 1;
            return (
              <mesh
                key={i}
                position={[ix * 2.2, 0.6, iz * 2.2]}
                rotation={[-0.5, 0, 0]}
                castShadow
              >
                <boxGeometry args={[1.8, 0.1, 1.2]} />
                <meshStandardMaterial color="#16284d" metalness={0.6} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ))}
      {parks.map((p) => (
        <ParkTrees key={p.id} x={p.x} z={p.z} w={p.w} d={p.d} />
      ))}
      {factories.map((f) => (
        <Chimneys key={f.id} x={f.x} z={f.z} w={f.w} d={f.d} h={f.h} />
      ))}
    </group>
  );
}

function WindTurbine({ x, z }: { x: number; z: number }) {
  const blade = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    const weather = useCity.getState().weather;
    if (blade.current) blade.current.rotation.z += dt * (0.4 + weather.wind * 1.6);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 12, 8]} />
        <meshStandardMaterial color="#e8edf2" />
      </mesh>
      <group ref={blade} position={[0, 12, 0.3]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <boxGeometry args={[0.3, 5, 0.08]} />
            <meshStandardMaterial color="#f5f8fc" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ParkTrees({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const trees = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = [];
    const n = Math.max(3, Math.floor((w * d) / 6));
    for (let i = 0; i < n; i++) {
      arr.push({
        x: x + (Math.random() - 0.5) * w * 0.8,
        z: z + (Math.random() - 0.5) * d * 0.8,
        s: 0.7 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [x, z, w, d]);
  return (
    <group>
      {/* park ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#2f6b3a" roughness={1} />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
            <meshStandardMaterial color="#5a3a22" />
          </mesh>
          <mesh position={[0, 1.6, 0]} castShadow>
            <icosahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color="#3a8a45" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Chimneys({
  x,
  z,
  w,
  d,
  h,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}) {
  const smoke = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const n = 40;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.6;
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (!smoke.current) return;
    const arr = smoke.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += dt * 1.2;
      if (arr[i + 1] > 6) arr[i + 1] = 0;
    }
    smoke.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <group position={[x, h, z]}>
      <mesh position={[w * 0.3, 0.5, d * 0.3]}>
        <cylinderGeometry args={[0.4, 0.5, 1.5, 8]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <points ref={smoke} position={[w * 0.3, 1, d * 0.3]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#888" size={0.5} transparent opacity={0.4} depthWrite={false} />
      </points>
    </group>
  );
}

/** Street lamps along roads — glow at night. */
export function StreetLamps() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    const layout = CITY_LAYOUT;
    const arr: { x: number; z: number }[] = [];
    for (const x of layout.roadsX) {
      for (let i = -3; i <= 3; i++) {
        arr.push({ x: x + 2.6, z: i * (layout.bounds / 6) });
      }
    }
    return arr;
  }, []);

  useMemo(() => {
    queueMicrotask(() => {
      if (!ref.current) return;
      positions.forEach((p, i) => {
        dummy.position.set(p.x, 2.5, p.z);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [positions, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, positions.length)]}>
      <sphereGeometry args={[0.18, 8, 8]} />
      <meshBasicMaterial color="#ffd98a" toneMapped={false} />
    </instancedMesh>
  );
}

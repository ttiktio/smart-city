import { useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCity, CITY_LAYOUT } from "../store";

export interface TrafficHandle {
  /** returns world position of the followed vehicle or null */
  getFollowPos: () => THREE.Vector3 | null;
}

interface Vehicle {
  // progress 0..1 along current axis
  t: number;
  axis: "x" | "z";
  // which road line we are on (index into roadsX or roadsZ)
  line: number;
  dir: 1 | -1;
  lane: number; // offset perpendicular
  color: string;
  kind: "car" | "truck" | "bus";
  speed: number;
}

const CAR_COLORS = ["#e85d5d", "#5d8de8", "#e8c14d", "#56c19a", "#b07be8", "#dde6f0", "#3a4252"];

/**
 * Vehicles travel along the road grid. Each picks an axis and a road line,
 * runs to the edge, then picks a new route. Positions are exposed for the
 * follow-camera via a ref handle.
 */
export const Traffic = forwardRef<TrafficHandle>(function Traffic(_, ref) {
  const layout = CITY_LAYOUT;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const followIdx = useRef<number | null>(null);

  const followTargetId = useCity((s) => s.followTargetId);

  const vehicles = useMemo<Vehicle[]>(() => {
    const N = 90;
    const arr: Vehicle[] = [];
    for (let i = 0; i < N; i++) {
      const axis: "x" | "z" = Math.random() < 0.5 ? "x" : "z";
      const lines = axis === "x" ? layout.roadsX : layout.roadsZ;
      const kind: Vehicle["kind"] =
        Math.random() < 0.15 ? "truck" : Math.random() < 0.1 ? "bus" : "car";
      arr.push({
        t: Math.random(),
        axis,
        line: Math.floor(Math.random() * lines.length),
        dir: Math.random() < 0.5 ? 1 : -1,
        lane: (Math.random() < 0.5 ? 1 : -1) * 1.1,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        kind,
        speed: (kind === "truck" ? 5 : kind === "bus" ? 6 : 9) + Math.random() * 3,
      });
    }
    return arr;
  }, [layout]);

  const sizes = useMemo(() => {
    // per-vehicle box size
    return vehicles.map((v) => {
      if (v.kind === "truck") return [1.0, 1.4, 3.0] as [number, number, number];
      if (v.kind === "bus") return [1.1, 1.5, 4.0] as [number, number, number];
      return [0.9, 0.8, 1.9] as [number, number, number];
    });
  }, [vehicles]);

  // set static colors once
  useImperativeHandle(
    ref,
    () => ({
      getFollowPos: () => {
        const i = followIdx.current;
        if (i == null || !meshRef.current) return null;
        meshRef.current.getMatrixAt(i, dummy.matrix);
        return dummy.position.clone();
      },
    }),
    [dummy],
  );

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const store = useCity.getState();
    const trafficLevel = store.stats.trafficLevel;
    const weather = store.weather;
    const speedMul =
      (1 - (trafficLevel - 30) / 120) * (weather.type === "storm" ? 0.45 : weather.type === "rain" ? 0.75 : 1);

    const range = layout.bounds / 2 + 6;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      v.t += (dt * v.speed * speedMul * 0.02) * v.dir;
      const lines = v.axis === "x" ? layout.roadsX : layout.roadsZ;
      const onLine = lines[v.line] ?? 0;

      if (v.t > 1.05 || v.t < -0.05) {
        // re-route
        v.t = Math.random();
        v.axis = Math.random() < 0.5 ? "x" : "z";
        const newLines = v.axis === "x" ? layout.roadsX : layout.roadsZ;
        v.line = Math.floor(Math.random() * newLines.length);
        v.dir = Math.random() < 0.5 ? 1 : -1;
        v.lane = (Math.random() < 0.5 ? 1 : -1) * 1.1;
      }

      const travel = (v.t - 0.5) * 2 * range;
      let px: number, pz: number, ry: number;
      if (v.axis === "x") {
        px = travel;
        pz = onLine + v.lane;
        ry = v.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        px = (lines[v.line] ?? 0) + v.lane;
        pz = travel;
        ry = v.dir > 0 ? 0 : Math.PI;
      }

      dummy.position.set(px, sizes[i][1] / 2 + 0.05, pz);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.set(sizes[i][0], sizes[i][1], sizes[i][2]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      color.set(v.color);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // pick follow vehicle
    if (followTargetId === "follow-any") {
      followIdx.current = Math.floor((Math.random() * 0 + vehicles.length) ) || 0;
    }
    followIdx.current = 0; // follow the first vehicle by default
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, vehicles.length]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.45} metalness={0.35} />
    </instancedMesh>
  );
});

/** An electric train running on an elevated ring track around the city. */
export function Train() {
  const groupRef = useRef<THREE.Group>(null!);
  const layout = CITY_LAYOUT;
  const radius = layout.bounds / 2 + 4;
  const t = useRef(0);

  // pillars
  const pillars = useMemo(() => {
    const arr: [number, number][] = [];
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      arr.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
    return arr;
  }, [radius]);

  useFrame((_, dt) => {
    t.current += dt * 0.08;
    if (groupRef.current) {
      const a = t.current;
      groupRef.current.position.set(Math.cos(a) * radius, 7, Math.sin(a) * radius);
      groupRef.current.rotation.y = -a + Math.PI / 2;
    }
  });

  return (
    <group>
      {/* elevated track ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 6.4, 0]}>
        <ringGeometry args={[radius - 0.4, radius + 0.4, 80]} />
        <meshStandardMaterial color="#2a3140" side={THREE.DoubleSide} />
      </mesh>
      {pillars.map((p, i) => (
        <mesh key={i} position={[p[0], 3.2, p[1]]}>
          <cylinderGeometry args={[0.3, 0.3, 6.4, 6]} />
          <meshStandardMaterial color="#3a4150" />
        </mesh>
      ))}
      <group ref={groupRef}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 1.4, 6]} />
          <meshStandardMaterial color="#4aa3e8" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[1.4, 0.5, 5.6]} />
          <meshStandardMaterial color="#bfe0ff" emissive="#3a78c0" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** Simple pedestrians wandering near sidewalks. */
export function Pedestrians() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const layout = CITY_LAYOUT;

  const peds = useMemo(() => {
    const N = 60;
    const arr: {
      x: number;
      z: number;
      roadX: number;
      roadZ: number;
      axis: "x" | "z";
      dir: 1 | -1;
      t: number;
      speed: number;
    }[] = [];
    for (let i = 0; i < N; i++) {
      const axis: "x" | "z" = Math.random() < 0.5 ? "x" : "z";
      arr.push({
        x: 0,
        z: 0,
        roadX: layout.roadsX[Math.floor(Math.random() * layout.roadsX.length)],
        roadZ: layout.roadsZ[Math.floor(Math.random() * layout.roadsZ.length)],
        axis,
        dir: Math.random() < 0.5 ? 1 : -1,
        t: Math.random(),
        speed: 0.8 + Math.random() * 0.8,
      });
    }
    return arr;
  }, [layout]);

  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const store = useCity.getState();
    const hour = store.timeMinutes / 60;
    const weather = store.weather;
    const events = store.events;

    // Fewer people walking at night, or when it rains/storms (they stay indoors)
    const isBadWeather = weather.type === "rain" || weather.type === "storm";
    const baseActiveMul = hour < 6 || hour > 20 ? 0.15 : hour > 8 && hour < 18 ? 1.0 : 0.5;
    const activeMul = isBadWeather ? baseActiveMul * 0.25 : baseActiveMul;

    // Speed multiplier: 2.2x faster when it rains/storms (running to seek shelter)
    // or when there is an active disaster/accident in the city
    const hasEmergency = events.some((e) => e.severity === "danger");
    const speedMultiplier = isBadWeather ? 2.2 : hasEmergency ? 1.6 : 1.0;

    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (i / peds.length > activeMul) {
        dummy.position.set(0, -10, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      // Check if pedestrian is close to an emergency building to panic run
      let panicSpeed = 1.0;
      let isPanicking = false;
      for (const ev of events) {
        if (ev.buildingId) {
          const eb = layout.buildings.find((b) => b.id === ev.buildingId);
          if (eb) {
            const currentX = p.axis === "x" ? (p.t - 0.5) * 2 * (layout.bounds / 2) : p.roadX;
            const currentZ = p.axis === "z" ? (p.t - 0.5) * 2 * (layout.bounds / 2) : p.roadZ;
            const dist = Math.hypot(currentX - eb.x, currentZ - eb.z);
            if (dist < 22) {
              panicSpeed = 2.5;
              isPanicking = true;
            }
          }
        }
      }

      p.t += dt * p.speed * 0.05 * p.dir * speedMultiplier * panicSpeed;
      if (p.t > 1 || p.t < 0) p.dir = (-p.dir) as 1 | -1;
      const range = layout.bounds / 2;
      const pos = (p.t - 0.5) * 2 * range;
      if (p.axis === "x") {
        dummy.position.set(pos, 0.35, p.roadZ + 2.8);
      } else {
        dummy.position.set(p.roadX + 2.8, 0.35, pos);
      }

      // bob faster if walking faster (higher speedMultiplier * panicSpeed)
      const bobFreq = 8 * speedMultiplier * panicSpeed;
      const bobAmp = isPanicking ? 0.08 : 0.04;
      const bob = Math.sin(state.clock.elapsedTime * bobFreq + i) * bobAmp;
      dummy.position.y = 0.35 + bob;
      
      dummy.scale.set(0.3, 0.7, 0.3);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);

      // set color: red/orange if panicking, default blue-gray otherwise
      if (isPanicking) {
        color.set("#ff5533");
      } else if (isBadWeather) {
        color.set("#a0b0ff"); // cold/wet blue
      } else {
        color.set("#cfd8e8"); // normal
      }
      ref.current.setColorAt(i, color);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, peds.length]} castShadow>
      <capsuleGeometry args={[0.18, 0.4, 3, 6]} />
      <meshStandardMaterial roughness={0.5} metalness={0.1} />
    </instancedMesh>
  );
}

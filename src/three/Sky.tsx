import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars, Cloud, Clouds } from "@react-three/drei";
import { useCity } from "../store";
import { getDayInfo, skyColors, sunPosition } from "./env";

/** Dynamic sky dome, sun, stars, moon — all driven by sim time. */
export function SkyDome() {
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  const moonRef = useRef<THREE.DirectionalLight>(null!);
  const ambientRef = useRef<THREE.AmbientLight>(null!);
  const hemiRef = useRef<THREE.HemisphereLight>(null!);
  const sunMeshRef = useRef<THREE.Mesh>(null!);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null!);
  const { scene } = useThree();

  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color("#2f6bd8") },
      bottomColor: { value: new THREE.Color("#bfe0ff") },
      offset: { value: 33 },
      exponent: { value: 0.6 },
    }),
    [],
  );

  // fog attached to scene
  useMemo(() => {
    scene.fog = new THREE.FogExp2("#bfe0ff", 0.0015);
    return null;
  }, [scene]);

  useFrame(() => {
    const s = useCity.getState();
    const day = getDayInfo(s.timeMinutes);
    const sky = skyColors(day);
    const sunPos = sunPosition(day);

    if (skyMatRef.current) {
      (skyMatRef.current.uniforms.topColor.value as THREE.Color).copy(sky.top);
      (skyMatRef.current.uniforms.bottomColor.value as THREE.Color).copy(sky.bottom);
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position.copy(sunPos).multiplyScalar(0.55);
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.copy(sky.sunColor);
      sunMeshRef.current.visible = day.dayFactor > 0.02;
    }
    if (sunRef.current) {
      sunRef.current.position.copy(sunPos);
      sunRef.current.intensity = day.dayFactor * 2.2 * (1 - s.weather.cloudCover * 0.5);
      (sunRef.current.color as THREE.Color).copy(sky.sunColor);
    }
    if (moonRef.current) {
      moonRef.current.position.copy(sunPos).multiplyScalar(-1);
      moonRef.current.intensity = day.isNight ? 0.35 : 0;
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = day.isNight ? 0.25 : 0.55;
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = day.isNight ? 0.2 : 0.5;
    }

    // fog
    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      const density =
        0.0012 +
        s.weather.fogDensity * 0.05 +
        (s.weather.precipitation > 0.6 ? 0.012 : 0) +
        (s.weather.type === "storm" ? 0.006 : 0);
      scene.fog.density = density;
      const fogCol = day.isNight ? "#0a1228" : s.weather.type === "fog" ? "#9aa6b8" : "#bfe0ff";
      scene.fog.color.set(fogCol);
      scene.background = sky.bottom.clone();
    }
  });

  return (
    <group>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[450, 32, 15]} />
        <shaderMaterial
          ref={skyMatRef}
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
              float h = normalize(vWorldPosition + offset).y;
              gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
          `}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshBasicMaterial color="#fff4e0" toneMapped={false} />
      </mesh>

      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} intensity={0.5} color="#bcd8ff" groundColor="#2a2030" />
      <directionalLight ref={sunRef} castShadow intensity={1.6} color="#fff4e0" shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-80, 80, 80, -80, 0.1, 400]} />
      </directionalLight>
      <directionalLight ref={moonRef} intensity={0.2} color="#9fb8ff" />
    </group>
  );
}

/** Clouds driven by cloud cover. */
export function CloudLayer() {
  const cloudsRef = useRef<any>(null!);
  useFrame(() => {
    const s = useCity.getState();
    const day = getDayInfo(s.timeMinutes);
    const cover = s.weather.cloudCover;
    if (cloudsRef.current) {
      cloudsRef.current.visible = cover > 0.05;
      cloudsRef.current.children.forEach((c: any, i: number) => {
        c.position.x += 0.02 + s.weather.wind * 0.15;
        if (c.position.x > 120) c.position.x = -120;
      });
      const col = s.weather.type === "storm" ? "#2a2f3a" : day.isNight ? "#222a3a" : "#ffffff";
      cloudsRef.current.traverse((o: any) => {
        if (o.material) o.material.color.set(col);
      });
    }
  });

  const cloudCount = 10;
  return (
    <group ref={cloudsRef}>
      <Clouds material={THREE.MeshBasicMaterial} limit={cloudCount}>
        {Array.from({ length: cloudCount }).map((_, i) => (
          <Cloud
            key={i}
            seed={i}
            segments={20}
            bounds={[24, 6, 24]}
            volume={9}
            position={[
              (Math.random() - 0.5) * 180,
              45 + Math.random() * 20,
              (Math.random() - 0.5) * 180,
            ]}
            opacity={0.55}
            color="#ffffff"
          />
        ))}
      </Clouds>
    </group>
  );
}

/** Rain / snow particle field. */
export function Precipitation() {
  const ref = useRef<THREE.Points>(null!);
  const N = 1200;
  const positions = useMemo(() => {
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 160;
      arr[i * 3 + 1] = Math.random() * 60;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    return arr;
  }, []);

  const velocities = useMemo(() => {
    const arr = new Float32Array(N);
    for (let i = 0; i < N; i++) arr[i] = 20 + Math.random() * 30;
    return arr;
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useCity.getState();
    const isSnow = s.weather.type === "snow";
    const active = s.weather.precipitation > 0;
    if (!ref.current) return;
    ref.current.visible = active;
    if (!active) return;

    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const windX = s.weather.wind * 6;
    for (let i = 0; i < N; i++) {
      if (isSnow) {
        arr[i * 3] += windX * dt * 0.2 + Math.sin(i + arr[i * 3 + 1]) * dt * 0.4;
        arr[i * 3 + 1] -= velocities[i] * dt * 0.18;
      } else {
        arr[i * 3] += windX * dt;
        arr[i * 3 + 1] -= velocities[i] * dt;
      }
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3] = (Math.random() - 0.5) * 160;
        arr[i * 3 + 1] = 60;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.color.set(isSnow ? "#ffffff" : "#9fc0e8");
    mat.size = isSnow ? 0.45 : 0.28;
  });

  return (
    <points ref={ref} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9fc0e8" size={0.28} transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

/** Stars only at night. */
export function NightStars() {
  const ref = useRef<any>(null!);
  useFrame(() => {
    const day = getDayInfo(useCity.getState().timeMinutes);
    if (ref.current) ref.current.visible = day.isNight;
  });
  return <Stars ref={ref} radius={120} depth={50} count={1500} factor={3} fade speed={0.5} />;
}

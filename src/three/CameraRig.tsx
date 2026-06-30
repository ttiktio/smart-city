import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useCity, CITY_LAYOUT } from "../store";

/**
 * Camera rig handling multiple modes:
 * - free: OrbitControls
 * - top: orthogonal-ish top-down
 * - follow: follow a vehicle
 * - focus: smooth-track the selected building
 */
export function CameraRig({
  trafficRef,
}: {
  trafficRef: React.MutableRefObject<{ getFollowPos: () => THREE.Vector3 | null } | null>;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null!);
  const { camera } = useThree();
  const mode = useCity((s) => s.cameraMode);
  const selectedId = useCity((s) => s.selectedBuildingId);
  const focusTarget = useRef<THREE.Vector3>(new THREE.Vector3());
  const camTarget = useRef<THREE.Vector3>(new THREE.Vector3(40, 40, 40));
  const lookTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // initial position
  useEffect(() => {
    camera.position.set(60, 55, 60);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.2);

    if (mode === "top") {
      camTarget.current.set(0, 130, 0.01);
      lookTarget.current.set(0, 0, 0);
      camera.position.lerp(camTarget.current, k);
      camera.lookAt(lookTarget.current);
      if (controlsRef.current) controlsRef.current.enabled = false;
    } else if (mode === "follow") {
      const pos = trafficRef.current?.getFollowPos();
      if (pos) {
        camTarget.current.set(pos.x + 8, pos.y + 5, pos.z + 8);
        lookTarget.current.copy(pos);
        camera.position.lerp(camTarget.current, k);
        camera.lookAt(lookTarget.current);
      }
      if (controlsRef.current) controlsRef.current.enabled = false;
    } else if (mode === "focus" && selectedId) {
      const b = CITY_LAYOUT.buildings.find((x) => x.id === selectedId);
      if (b) {
        focusTarget.current.set(b.x, b.h / 2, b.z);
        camTarget.current.set(b.x + b.h * 0.9, b.h * 0.7, b.z + b.h * 0.9);
        camera.position.lerp(camTarget.current, k);
        camera.lookAt(focusTarget.current);
      }
      if (controlsRef.current) controlsRef.current.enabled = false;
    } else {
      // free
      if (controlsRef.current) controlsRef.current.enabled = true;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={15}
      maxDistance={220}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, 0, 0]}
    />
  );
}

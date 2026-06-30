import { useRef } from "react";
import { Buildings } from "./Buildings";
import { Terrain, Props, StreetLamps } from "./Terrain";
import { Traffic, Train, Pedestrians } from "./Traffic";
import type { TrafficHandle } from "./Traffic";
import { SkyDome, CloudLayer, Precipitation, NightStars } from "./Sky";
import { CameraRig } from "./CameraRig";

export function Scene() {
  const trafficRef = useRef<TrafficHandle | null>(null);

  return (
    <>
      <CameraRig trafficRef={trafficRef} />
      <SkyDome />
      <NightStars />
      <CloudLayer />
      <Precipitation />

      <Terrain />
      <Buildings />
      <Props />
      <StreetLamps />
      <Traffic ref={trafficRef} />
      <Train />
      <Pedestrians />
    </>
  );
}

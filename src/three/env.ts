import * as THREE from "three";
import type { WeatherState } from "../types";

/** Convert 24h time (minutes) to a sun elevation/azimuth model. */
export interface DayInfo {
  hour: number;
  /** -1..1, 1 = noon sun height, <0 means night */
  sunHeight: number;
  /** angle in radians around Y */
  sunAzimuth: number;
  isNight: boolean;
  /** 0..1 daylight factor */
  dayFactor: number;
}

export function getDayInfo(timeMinutes: number): DayInfo {
  const hour = timeMinutes / 60;
  // sun peaks at 12, sets ~18:30, rises ~5:30
  const dayFactor = Math.max(
    0,
    Math.sin(((hour - 5.5) / (19 - 5.5)) * Math.PI),
  );
  const sunHeight = Math.sin(((hour - 6) / 24) * Math.PI * 2 - Math.PI / 2);
  const sunAzimuth = ((hour - 6) / 24) * Math.PI * 2;
  return {
    hour,
    sunHeight,
    sunAzimuth,
    isNight: sunHeight < -0.05,
    dayFactor,
  };
}

const SUN_DAY = new THREE.Color("#fff4e0");
const SUN_GOLDEN = new THREE.Color("#ff9a52");
const MOON = new THREE.Color("#9fb8ff");

/** Sky gradient + sun color depending on time. */
export function skyColors(day: DayInfo) {
  const f = THREE.MathUtils.clamp(day.dayFactor, 0, 1);
  const top = new THREE.Color();
  const bottom = new THREE.Color();
  if (day.isNight) {
    top.set("#050816");
    bottom.set("#0d1633");
  } else if (f < 0.35) {
    // sunrise / sunset
    const t = f / 0.35;
    top.lerpColors(new THREE.Color("#1a2b5c"), new THREE.Color("#3a6cb0"), t);
    bottom.lerpColors(new THREE.Color("#ff7a3a"), new THREE.Color("#ffae5e"), t);
  } else {
    top.set("#2f6bd8");
    bottom.set("#bfe0ff");
  }
  const sunColor = new THREE.Color().lerpColors(SUN_GOLDEN, SUN_DAY, f);
  const moonColor = MOON;
  return { top, bottom, sunColor, moonColor, dayFactor: f };
}

export function sunPosition(day: DayInfo, distance = 200) {
  const y = Math.max(-30, day.sunHeight) * distance * 0.6;
  const x = Math.cos(day.sunAzimuth) * distance;
  const z = Math.sin(day.sunAzimuth) * distance;
  return new THREE.Vector3(x, Math.max(y, -distance * 0.4), z);
}

/** Fog color and density derived from weather. */
export function fogParams(weather: WeatherState, day: DayInfo) {
  const base = day.isNight ? 0.004 : 0.0015;
  const density =
    base +
    weather.fogDensity * 0.06 +
    (weather.precipitation > 0.6 ? 0.012 : 0);
  const color = new THREE.Color();
  if (weather.type === "fog") color.set("#9aa6b8");
  else if (weather.type === "storm") color.set("#3a4150");
  else if (day.isNight) color.set("#0a1228");
  else color.set("#bfe0ff");
  return { density, color };
}

/** Ambient + sun intensities. */
export function lightIntensities(day: DayInfo, weather: WeatherState) {
  const cloudDim = 1 - weather.cloudCover * 0.5;
  const sun = THREE.MathUtils.clamp(day.dayFactor, 0.04, 1) * 1.6 * cloudDim;
  const ambient = (day.isNight ? 0.18 : 0.45) * cloudDim;
  return { sun, ambient };
}

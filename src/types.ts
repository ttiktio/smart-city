export type BuildingCategory =
  | "residential"
  | "office"
  | "commercial"
  | "factory"
  | "school"
  | "hospital"
  | "park"
  | "power"
  | "solar"
  | "wind"
  | "water";

export interface BuildingDef {
  id: string;
  name: string;
  category: BuildingCategory;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  /** rotation index 0..3 -> angle = i * 90deg */
  rot: number;
  district: string;
}

export interface BuildingRuntimeState {
  hasPower: boolean;
  occupants: number;
  /** 0..1 — how efficient the building is. Higher = less power/carbon. */
  efficiency: number;
  fireRisk: number;
  hasSolar: boolean;
  hasBattery: boolean;
  locked: boolean;
  /** derived consumption per hour, computed in the sim */
  powerKW: number;
  waterKL: number;
  co2kg: number;
}

export type WeatherType =
  | "clear"
  | "cloudy"
  | "rain"
  | "storm"
  | "fog"
  | "snow";

export interface WeatherState {
  type: WeatherType;
  /** 0..1 general cloud cover */
  cloudCover: number;
  /** 0..1 rain/snow intensity */
  precipitation: number;
  wind: number;
  fogDensity: number;
}

export interface CityStats {
  population: number;
  powerSupplyKW: number;
  powerDemandKW: number;
  airQuality: number; // 0..100, higher better
  temperatureC: number;
  waterLevelPct: number; // reservoir
  solarOutputKW: number;
  co2Pct: number; // share of non-renewable carbon contribution
  trafficLevel: number; // 0..100 congestion
  happiness: number; // 0..100
  renewableShare: number; // 0..1
}

export interface StatPoint {
  t: number;
  power: number;
  co2: number;
  air: number;
  traffic: number;
  happiness: number;
}

export type CameraMode =
  | "free"
  | "top"
  | "follow"
  | "focus";

export type EventType =
  | "blackout"
  | "traffic"
  | "rain"
  | "pollution"
  | "accident"
  | "flood"
  | "powershort"
  | "fire";

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  message: string;
  severity: "info" | "warn" | "danger";
  buildingId?: string;
  startSimMin: number;
  /** minutes until auto-resolve if player ignores */
  duration: number;
  resolved: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: string;
  progress: number; // 0..1
  done: boolean;
  reward: string;
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  ts: number;
}

export type NotificationKind = "info" | "success" | "warn" | "danger";

export interface SavedCity {
  version: 1;
  savedAt: number;
  buildings: Record<string, Partial<BuildingRuntimeState>>;
  timeMinutes: number;
  daySpeed: number;
  stats: CityStats;
  missions: Mission[];
}

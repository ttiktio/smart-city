import { create } from "zustand";
import type {
  BuildingDef,
  BuildingRuntimeState,
  CameraMode,
  CityStats,
  GameEvent,
  Mission,
  AppNotification,
  NotificationKind,
  SavedCity,
  StatPoint,
  WeatherState,
  WeatherType,
} from "./types";
import { generateCity } from "./lib/cityGen";

const SAVE_KEY = "nexus-city.save.v1";

const CITY = generateCity();

/* ---------- helpers ---------- */

function makeBuildings(): Record<string, BuildingRuntimeState> {
  const map: Record<string, BuildingRuntimeState> = {};
  for (const b of CITY.buildings) {
    const baseOccupants =
      b.category === "office"
        ? 80 + Math.floor(Math.random() * 200)
        : b.category === "residential"
        ? 30 + Math.floor(Math.random() * 220)
        : b.category === "commercial"
        ? 40 + Math.floor(Math.random() * 120)
        : b.category === "hospital"
        ? 120 + Math.floor(Math.random() * 200)
        : b.category === "school"
        ? 200 + Math.floor(Math.random() * 400)
        : b.category === "factory"
        ? 50 + Math.floor(Math.random() * 150)
        : 0;
    map[b.id] = {
      hasPower: true,
      occupants: baseOccupants,
      efficiency: 0.5 + Math.random() * 0.35,
      fireRisk: Math.random() * (b.category === "factory" ? 0.4 : 0.12),
      hasSolar: b.category === "solar",
      hasBattery: Math.random() < 0.1,
      locked: false,
      powerKW: 0,
      waterKL: 0,
      co2kg: 0,
    };
  }
  return map;
}

const INITIAL_MISSIONS: Mission[] = [
  {
    id: "m-co2",
    title: "นโยบายคาร์บอนต่ำ",
    description: "ลด CO₂ ของเมืองให้ต่ำกว่า 40%",
    target: "CO₂ < 40%",
    progress: 0,
    done: false,
    reward: "+10 ความพึงพอใจ",
  },
  {
    id: "m-renew",
    title: "เมืองพลังงานสะอาด",
    description: "เพิ่มสัดส่วนพลังงานหมุนเวียนให้ถึง 70%",
    target: "Renewable ≥ 70%",
    progress: 0,
    done: false,
    reward: "ปลดล็อก Solar Grid",
  },
  {
    id: "m-traffic",
    title: "คลี่คลายจราจร",
    description: "ลดการจราจรต่ำกว่า 40%",
    target: "Traffic < 40%",
    progress: 0,
    done: false,
    reward: "+5 ความพึงพอใจ",
  },
  {
    id: "m-happy",
    title: "ประชาชนพอใจ",
    description: "รักษาความสุขประชากรเกิน 80%",
    target: "Happiness ≥ 80%",
    progress: 0,
    done: false,
    reward: "Golden City Badge",
  },
  {
    id: "m-water",
    title: "ควบคุมน้ำท่วม",
    description: "เกิดพายุโดยไม่มีน้ำท่วม",
    target: "Survive a storm with 0 floods",
    progress: 0,
    done: false,
    reward: "Flood Defense A",
  },
];

interface State {
  /* city */
  layout: ReturnType<typeof generateCity>;
  buildings: Record<string, BuildingRuntimeState>;

  /* time & weather */
  timeMinutes: number; // 0..1440
  daySpeed: number; // sim minutes per real second
  paused: boolean;
  weather: WeatherState;

  /* stats */
  stats: CityStats;
  history: StatPoint[];
  lastHistoryT: number;

  /* events & missions */
  events: GameEvent[];
  missions: Mission[];
  notifications: AppNotification[];

  /* UI */
  selectedBuildingId: string | null;
  cameraMode: CameraMode;
  followTargetId: string | null;
  showDashboard: boolean;
  showMissions: boolean;
  darkMode: boolean;
  hudHelp: boolean;
  toastTick: number;

  /* actions */
  select: (id: string | null) => void;
  toggleBuildingPower: (id: string) => void;
  upgradeBuilding: (id: string) => void;
  installSolar: (id: string) => void;
  installBattery: (id: string) => void;
  toggleLock: (id: string) => void;
  setCameraMode: (m: CameraMode) => void;
  followVehicle: (id: string | null) => void;
  togglePause: () => void;
  setDaySpeed: (n: number) => void;
  setWeather: (w: WeatherType) => void;
  toggleDashboard: () => void;
  toggleMissions: () => void;
  toggleDark: () => void;
  pushNotification: (n: { kind: NotificationKind; title: string; message: string }) => void;
  dismissNotification: (id: string) => void;
  resolveEvent: (id: string) => void;
  tick: (dt: number) => void;
  save: () => void;
  load: () => boolean;
  reset: () => void;
}

let notifCounter = 0;
function nid() {
  return `n-${++notifCounter}`;
}

/** Build a properly-typed notification object so literal kinds don't widen. */
function mkNotif(
  kind: NotificationKind,
  title: string,
  message: string,
): AppNotification {
  return { id: nid(), kind, title, message, ts: Date.now() };
}

/** Prepend a notification, capping the list length. */
function withNotif(
  list: AppNotification[],
  n: AppNotification,
): AppNotification[] {
  return [n, ...list].slice(0, 24);
}

export const useCity = create<State>((set, get) => ({
  layout: CITY,
  buildings: makeBuildings(),

  timeMinutes: 8 * 60, // 08:00
  daySpeed: 2,
  paused: false,
  weather: { type: "clear", cloudCover: 0.15, precipitation: 0, wind: 0.2, fogDensity: 0 },

  stats: {
    population: 0,
    powerSupplyKW: 0,
    powerDemandKW: 0,
    airQuality: 82,
    temperatureC: 24,
    waterLevelPct: 68,
    solarOutputKW: 0,
    co2Pct: 60,
    trafficLevel: 35,
    happiness: 74,
    renewableShare: 0.18,
  },
  history: [],
  lastHistoryT: 0,

  events: [],
  missions: INITIAL_MISSIONS,
  notifications: [],

  selectedBuildingId: null,
  cameraMode: "free",
  followTargetId: null,
  showDashboard: true,
  showMissions: false,
  darkMode: true,
  hudHelp: false,
  toastTick: 0,

  select: (id) =>
    set({ selectedBuildingId: id, cameraMode: id ? "focus" : get().cameraMode }),

  toggleBuildingPower: (id) => {
    set((s) => {
      const b = s.buildings[id];
      if (!b) return {};
      const next = { ...b, hasPower: !b.hasPower };
      return {
        buildings: { ...s.buildings, [id]: next },
        notifications: withNotif(
          s.notifications,
          mkNotif(
            next.hasPower ? "success" : "warn",
            next.hasPower ? "เปิดไฟแล้ว" : "ตัดไฟแล้ว",
            `${s.layout.buildings.find((x) => x.id === id)?.name ?? ""}`,
          ),
        ),
      };
    });
  },

  upgradeBuilding: (id) => {
    set((s) => {
      const b = s.buildings[id];
      if (!b) return {};
      const efficiency = Math.min(0.98, b.efficiency + 0.18);
      return {
        buildings: { ...s.buildings, [id]: { ...b, efficiency } },
        notifications: withNotif(
          s.notifications,
          mkNotif(
            "success",
            "อัปเกรดสำเร็จ",
            `${s.layout.buildings.find((x) => x.id === id)?.name ?? ""}: ประสิทธิภาพ ${(efficiency * 100) | 0}%`,
          ),
        ),
      };
    });
  },

  installSolar: (id) =>
    set((s) => {
      const b = s.buildings[id];
      if (!b || b.hasSolar) return {};
      return {
        buildings: { ...s.buildings, [id]: { ...b, hasSolar: true } },
        notifications: withNotif(
          s.notifications,
          mkNotif(
            "success",
            "ติดตั้ง Solar Panel",
            `${s.layout.buildings.find((x) => x.id === id)?.name ?? ""}`,
          ),
        ),
      };
    }),

  installBattery: (id) =>
    set((s) => {
      const b = s.buildings[id];
      if (!b || b.hasBattery) return {};
      return {
        buildings: { ...s.buildings, [id]: { ...b, hasBattery: true } },
        notifications: withNotif(
          s.notifications,
          mkNotif(
            "success",
            "ติดตั้งแบตเตอรี่",
            `${s.layout.buildings.find((x) => x.id === id)?.name ?? ""}`,
          ),
        ),
      };
    }),

  toggleLock: (id) =>
    set((s) => {
      const b = s.buildings[id];
      if (!b) return {};
      return {
        buildings: { ...s.buildings, [id]: { ...b, locked: !b.locked } },
      };
    }),

  setCameraMode: (m) => set({ cameraMode: m }),
  followVehicle: (id) =>
    set({ followTargetId: id, cameraMode: id ? "follow" : "free" }),

  togglePause: () => set((s) => ({ paused: !s.paused })),
  setDaySpeed: (n) => set({ daySpeed: n }),

  setWeather: (w) =>
    set(() => {
      const map: Record<WeatherType, Partial<WeatherState>> = {
        clear: { type: "clear", cloudCover: 0.1, precipitation: 0, wind: 0.2, fogDensity: 0 },
        cloudy: { type: "cloudy", cloudCover: 0.75, precipitation: 0, wind: 0.3, fogDensity: 0.02 },
        rain: { type: "rain", cloudCover: 0.9, precipitation: 0.5, wind: 0.45, fogDensity: 0.05 },
        storm: { type: "storm", cloudCover: 1, precipitation: 0.95, wind: 0.9, fogDensity: 0.1 },
        fog: { type: "fog", cloudCover: 0.4, precipitation: 0, wind: 0.1, fogDensity: 0.32 },
        snow: { type: "snow", cloudCover: 0.85, precipitation: 0.6, wind: 0.35, fogDensity: 0.04 },
      };
      return { weather: { ...map[w], type: w } as WeatherState };
    }),

  toggleDashboard: () => set((s) => ({ showDashboard: !s.showDashboard })),
  toggleMissions: () => set((s) => ({ showMissions: !s.showMissions })),
  toggleDark: () => set((s) => ({ darkMode: !s.darkMode })),

  pushNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: nid(), ts: Date.now() },
        ...s.notifications,
      ].slice(0, 24),
    })),

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  resolveEvent: (id) =>
    set((s) => {
      const ev = s.events.find((e) => e.id === id);
      if (!ev) return {};
      return {
        events: s.events.filter((e) => e.id !== id),
        notifications: withNotif(s.notifications, mkNotif("success", "แก้ไขเหตุการณ์แล้ว", ev.title)),
        stats: { ...s.stats, happiness: Math.min(100, s.stats.happiness + 1.5) },
      };
    }),

  /* ---------------- main simulation tick ---------------- */
  tick: (dt) => {
    const s = get();
    if (s.paused) return;

    const newTime = (s.timeMinutes + s.daySpeed * dt) % 1440;
    const hour = newTime / 60;

    /* ---- recompute per-building power/water/co2 ---- */
    let demand = 0;
    let population = 0;
    let co2Total = 0;
    let co2Cap = 0;
    const newBuildings: Record<string, BuildingRuntimeState> = {};
    for (const def of s.layout.buildings) {
      const b = s.buildings[def.id];
      if (!b) continue;
      population += b.occupants;

      // base consumption by category (kW)
      const base =
        def.category === "factory"
          ? 120
          : def.category === "office"
          ? 60
          : def.category === "hospital"
          ? 90
          : def.category === "commercial"
          ? 45
          : def.category === "school"
          ? 50
          : def.category === "power"
          ? 0
          : def.category === "water"
          ? 25
          : 18;

      const nightMul = hour < 6 || hour > 19 ? (def.category === "residential" ? 1.25 : 0.45) : 1;
      const eff = b.hasPower ? b.efficiency : 0;
      const solarReduce = b.hasSolar && hour > 6 && hour < 19 && s.weather.cloudCover < 0.8 ? 0.35 : 0;
      const powerKW = b.hasPower ? base * (0.6 + 0.4 * (1 - eff)) * nightMul * (1 - solarReduce) : 0;
      const waterKL = b.hasPower ? base * 0.04 * nightMul : 0;
      // CO2 emissions: factories & non-renewable power emit more
      const carbonFactor =
        def.category === "factory" ? 1 : def.category === "power" ? 1.2 : 0.15;
      const co2kg = powerKW * carbonFactor * (1 - eff * 0.4);
      co2Total += co2kg;
      co2Cap += base * 1.4;

      demand += powerKW;
      newBuildings[def.id] = { ...b, powerKW, waterKL, co2kg };
    }

    /* ---- power supply: renewable + grid ---- */
    const solarOutput =
      hour > 6 && hour < 19
        ? (1 - s.weather.cloudCover) *
          s.layout.buildings
            .filter((b) => b.category === "solar" || s.buildings[b.id]?.hasSolar)
            .reduce((acc, b) => acc + (b.category === "solar" ? 220 : 18), 0)
        : 0;
    const windOutput =
      s.layout.buildings
        .filter((b) => b.category === "wind")
        .reduce((acc) => acc + 180 * (0.4 + s.weather.wind), 0) *
      (s.weather.type === "storm" ? 1.2 : 1);
    const hydroOutput = 260;
    const renewable = solarOutput + windOutput + hydroOutput;
    const gridOutput = Math.max(0, demand - renewable) * 1.15; // grid fills the gap
    const supply = renewable + gridOutput;
    const renewableShare = supply > 0 ? Math.min(1, renewable / supply) : 0;

    /* ---- air quality & co2 share ---- */
    const co2Pct = Math.max(8, Math.min(100, (co2Total / co2Cap) * 100));
    let air = 100 - co2Pct * 0.5;
    if (s.weather.type === "rain" || s.weather.type === "storm") air += 6;
    if (s.events.some((e) => e.type === "pollution")) air -= 18;
    air = Math.max(5, Math.min(100, air));

    /* ---- traffic based on time-of-day ---- */
    const rush =
      (hour > 7 && hour < 9.5) || (hour > 16.5 && hour < 19) ? 1 : 0.55;
    let traffic = 30 + 35 * rush + (s.weather.type === "rain" ? 12 : 0) + (s.weather.type === "storm" ? 22 : 0);
    if (s.events.some((e) => e.type === "traffic")) traffic += 25;
    if (s.events.some((e) => e.type === "accident")) traffic += 18;
    traffic = Math.min(100, traffic);

    /* ---- temperature ---- */
    const tBase = 18 + 9 * Math.sin(((hour - 6) / 24) * Math.PI * 2);
    let temp = tBase - (s.weather.cloudCover - 0.2) * 4;
    if (s.weather.type === "snow") temp = Math.min(temp, 1);
    if (s.weather.type === "storm") temp -= 3;

    /* ---- happiness ---- */
    let happy = s.stats.happiness;
    const powerRatio = demand > 0 ? Math.min(1, supply / Math.max(1, demand)) : 1;
    const targetHappy =
      55 +
      (air - 50) * 0.25 +
      (powerRatio - 0.8) * 30 -
      (traffic - 40) * 0.18 -
      s.events.length * 4;
    happy += (targetHappy - happy) * Math.min(1, dt * 0.4);
    happy = Math.max(0, Math.min(100, happy));

    /* ---- water reservoir ---- */
    let water = s.stats.waterLevelPct - 0.004 * dt;
    if (s.weather.type === "rain") water += 0.05 * dt;
    if (s.weather.type === "storm") water += 0.16 * dt;
    if (s.events.some((e) => e.type === "flood")) water += 0.05 * dt;
    water = Math.max(0, Math.min(100, water));

    const newStats: CityStats = {
      population,
      powerSupplyKW: supply,
      powerDemandKW: demand,
      airQuality: air,
      temperatureC: temp,
      waterLevelPct: water,
      solarOutputKW: solarOutput,
      co2Pct,
      trafficLevel: traffic,
      happiness: happy,
      renewableShare,
    };

    /* ---- history sampling (every ~10 sim minutes) ---- */
    let history = s.history;
    let lastT = s.lastHistoryT;
    if (newTime - s.lastHistoryT > 10 || newTime < s.lastHistoryT) {
      const point: StatPoint = {
        t: Math.floor(newTime),
        power: Math.round(demand),
        co2: Math.round(co2Pct),
        air: Math.round(air),
        traffic: Math.round(traffic),
        happiness: Math.round(happy),
      };
      history = [...s.history, point].slice(-60);
      lastT = newTime;
    }

    /* ---- auto-resolve old events ---- */
    let events = s.events;
    const expired = s.events.filter((e) => newTime - e.startSimMin > e.duration);
    if (expired.length) {
      events = s.events.filter((e) => newTime - e.startSimMin <= e.duration);
    }

    /* ---- mission progress ---- */
    const missions = s.missions.map((m) => {
      let progress = m.progress;
      let done = m.done;
      switch (m.id) {
        case "m-co2":
          progress = 1 - Math.min(1, co2Pct / 40);
          done = co2Pct < 40;
          break;
        case "m-renew":
          progress = Math.min(1, renewableShare / 0.7);
          done = renewableShare >= 0.7;
          break;
        case "m-traffic":
          progress = 1 - Math.min(1, traffic / 40);
          done = traffic < 40;
          break;
        case "m-happy":
          progress = Math.min(1, happy / 80);
          done = happy >= 80;
          break;
        case "m-water":
          progress = s.events.some((e) => e.type === "flood") ? 0 : Math.max(progress, 0.5);
          done = false;
          break;
      }
      // mark a one-time completion toast
      if (done && !m.done) {
        queueMicrotask(() =>
          get().pushNotification({
            kind: "success",
            title: "ภารกิจสำเร็จ!",
            message: `${m.title} — ${m.reward}`,
          }),
        );
      }
      return { ...m, progress, done };
    });

    set({
      timeMinutes: newTime,
      buildings: newBuildings,
      stats: newStats,
      history,
      lastHistoryT: lastT,
      events,
      missions,
    });
  },

  /* ---------------- persistence ---------------- */
  save: () => {
    const s = get();
    const data: SavedCity = {
      version: 1,
      savedAt: Date.now(),
      buildings: Object.fromEntries(
        Object.entries(s.buildings).map(([k, v]) => [
          k,
          {
            hasPower: v.hasPower,
            efficiency: v.efficiency,
            fireRisk: v.fireRisk,
            hasSolar: v.hasSolar,
            hasBattery: v.hasBattery,
            locked: v.locked,
            occupants: v.occupants,
          },
        ]),
      ),
      timeMinutes: s.timeMinutes,
      daySpeed: s.daySpeed,
      stats: s.stats,
      missions: s.missions,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    s.pushNotification({
      kind: "success",
      title: "บันทึกเมืองแล้ว",
      message: new Date().toLocaleTimeString(),
    });
  },

  load: () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw) as SavedCity;
      const s = get();
      const restored: Record<string, BuildingRuntimeState> = {};
      for (const def of s.layout.buildings) {
        const saved = data.buildings[def.id];
        const cur = s.buildings[def.id];
        restored[def.id] = saved ? { ...cur, ...saved } : cur;
      }
      set({
        buildings: restored,
        timeMinutes: data.timeMinutes,
        daySpeed: data.daySpeed,
        stats: data.stats,
        missions: data.missions,
      });
      s.pushNotification({
        kind: "info",
        title: "โหลดเมืองแล้ว",
        message: new Date(data.savedAt).toLocaleTimeString(),
      });
      return true;
    } catch {
      return false;
    }
  },

  reset: () => {
    localStorage.removeItem(SAVE_KEY);
    set({
      buildings: makeBuildings(),
      timeMinutes: 8 * 60,
      daySpeed: 2,
      paused: false,
      weather: { type: "clear", cloudCover: 0.15, precipitation: 0, wind: 0.2, fogDensity: 0 },
      stats: {
        population: 0,
        powerSupplyKW: 0,
        powerDemandKW: 0,
        airQuality: 82,
        temperatureC: 24,
        waterLevelPct: 68,
        solarOutputKW: 0,
        co2Pct: 60,
        trafficLevel: 35,
        happiness: 74,
        renewableShare: 0.18,
      },
      history: [],
      events: [],
      missions: INITIAL_MISSIONS,
      notifications: [],
      selectedBuildingId: null,
    });
  },
}));

export const CITY_LAYOUT = CITY;

/* ---- event spawner, called from a React effect in App ---- */
export function maybeSpawnEvent() {
  const s = useCity.getState();
  if (s.paused) return;
  if (s.events.length >= 3) return;
  if (Math.random() > 0.012) return; // ~throttled

  const types: GameEvent["type"][] = [
    "blackout",
    "traffic",
    "rain",
    "pollution",
    "accident",
    "flood",
    "powershort",
    "fire",
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  const meta: Record<GameEvent["type"], { title: string; message: string; severity: GameEvent["severity"]; dur: number }> = {
    blackout: { title: "ไฟดับบางเขต", message: "กำลังไฟฟ้าในบางพื้นที่ขัดข้อง", severity: "danger", dur: 25 },
    traffic: { title: "รถติดหนัก", message: "จราจรบนถนนหลักคับคั่ง", severity: "warn", dur: 20 },
    rain: { title: "ฝนตกหนัก", message: "สภาพอากาศแปรปรวน", severity: "info", dur: 18 },
    pollution: { title: "โรงงานปล่อยมลพิษ", message: "คุณภาพอากาศแย่ลง", severity: "danger", dur: 22 },
    accident: { title: "อุบัติเหตุบนถนน", message: "เกิดอุบัติเหตุ ชะลอการจราจร", severity: "warn", dur: 15 },
    flood: { title: "น้ำท่วมบางพื้นที่", message: "ระดับน้ำเพิ่มสูง", severity: "danger", dur: 20 },
    powershort: { title: "พลังงานไม่พอ", message: "ความต้องการไฟฟ้าสูงเกิน", severity: "warn", dur: 18 },
    fire: { title: "เสี่ยงเกิดไฟไหม้", message: "ตรวจพบความร้อนผิดปกติ", severity: "danger", dur: 16 },
  };
  const m = meta[type];
  const building = s.layout.buildings.find((b) => {
    if (type === "pollution" || type === "fire") return b.category === "factory";
    if (type === "blackout" || type === "powershort") return b.category === "power";
    return Math.random() < 0.4;
  });

  const ev: GameEvent = {
    id: `e-${Date.now()}`,
    type,
    title: m.title,
    message: m.message,
    severity: m.severity,
    buildingId: building?.id,
    startSimMin: s.timeMinutes,
    duration: m.dur,
    resolved: false,
  };

  // Side effects
  const newWeather = { ...s.weather };
  if (type === "rain" || type === "flood") {
    newWeather.type = type === "flood" ? "storm" : "rain";
    newWeather.precipitation = 0.7;
    newWeather.cloudCover = 0.95;
  }
  if (type === "blackout" && building) {
    s.toggleBuildingPower(building.id);
  }

  useCity.setState({
    events: [...s.events, ev],
    weather: newWeather,
    notifications: withNotif(
      s.notifications,
      {
        id: nid(),
        kind: (m.severity === "danger" ? "danger" : m.severity === "warn" ? "warn" : "info") as NotificationKind,
        title: m.title,
        message: m.message,
        ts: Date.now(),
      },
    ),
  });
}

export function getInitialPopulation() {
  const s = useCity.getState();
  return Object.values(s.buildings).reduce((a, b) => a + b.occupants, 0);
}

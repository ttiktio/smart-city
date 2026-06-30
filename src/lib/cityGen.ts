import type { BuildingDef, BuildingCategory } from "../types";

/**
 * Deterministic pseudo-random generator so the city layout is stable
 * between reloads unless the seed changes.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAME_PARTS = {
  residential: ["Parkview", "Riverside", "Oak Heights", "Sunset", "Maple Court", "Harbor"],
  office: ["Nexus Tower", "Helix", "Meridian", "Zenith Plaza", "Apex", "Obelisk"],
  commercial: ["Grand Mall", "Marketplace", "Atrium", "Galleria", "Plaza"],
  factory: ["Atlas Works", "Foundry", "Forge Plant", "Refinery 7", "Polyfab"],
  school: ["Riverside Academy", "Lincoln High", "Newton School", "Beacon College"],
  hospital: ["St. Mary", "City General", "Mercy Hospital", "Vita Clinic"],
  park: ["Central Green", "Memorial Park", "Botanical Garden"],
  power: ["Grid Station", "Reactor Core", "Turbine Hall"],
  solar: ["Solar Array", "Helios Farm", "Sunfield"],
  wind: ["Wind Ridge", "Aeolus Farm"],
  water: ["Aqueduct", "Hydro Plant", "Treatment Works"],
} as const;

function pickName(cat: BuildingCategory, r: () => number, idx: number) {
  const pool = NAME_PARTS[cat];
  return `${pool[Math.floor(r() * pool.length)]} ${cat === "residential" || cat === "office" ? "·" : "#"}${idx}`;
}

const PALETTES: Record<BuildingCategory, string[]> = {
  residential: ["#5b6b8c", "#6d7a92", "#7d6e74", "#5e7a78", "#85766f"],
  office: ["#2c3550", "#3a4675", "#414a63", "#2f3e57", "#27405f"],
  commercial: ["#7a5c8c", "#9a5e7a", "#6f5a93", "#825a72"],
  factory: ["#4a4f57", "#525247", "#3f4548", "#5a5048"],
  school: ["#8a6f4a", "#7a6248", "#9a7a52"],
  hospital: ["#dfe9f2", "#e8eef5", "#cdd9e8"],
  park: ["#2f6b3a", "#3a7a3f", "#4a8a4a"],
  power: ["#3a3f45", "#42454a", "#363a40"],
  solar: ["#1b2a4a", "#10203a"],
  wind: ["#dfe6ee", "#e8edf2"],
  water: ["#2c5a7a", "#3a6b8c"],
};

const DISTRICTS = [
  "Downtown Core",
  "Riverside",
  "Industrial East",
  "Greenfield",
  "Tech Park",
] as const;

/** A grid city block layout. Returns building defs plus road metadata. */
export interface CityLayout {
  buildings: BuildingDef[];
  /** X centers of N-S roads */
  roadsX: number[];
  /** Z centers of E-W roads */
  roadsZ: number[];
  blockSize: number;
  /** river as a wide stripe crossing the city */
  river: { x: number; z: number; w: number } | null;
  bounds: number;
}

export function generateCity(seed = 20260701): CityLayout {
  const r = mulberry32(seed);
  const blockSize = 22;
  const blocksPerSide = 6; // 6x6 grid -> up to ~144 lots
  const bounds = blockSize * blocksPerSide;

  const buildings: BuildingDef[] = [];
  const roadsX: number[] = [];
  const roadsZ: number[] = [];

  // Roads run between blocks.
  for (let i = 0; i <= blocksPerSide; i++) {
    roadsX.push(-bounds / 2 + i * blockSize);
    roadsZ.push(-bounds / 2 + i * blockSize);
  }

  // River runs horizontally, splitting the city in two near the bottom third.
  const riverZ = -bounds / 6;
  const river = { x: 0, z: riverZ, w: 8 };

  let id = 0;

  for (let bx = 0; bx < blocksPerSide; bx++) {
    for (let bz = 0; bz < blocksPerSide; bz++) {
      const blockCenterX =
        -bounds / 2 + bx * blockSize + blockSize / 2;
      const blockCenterZ =
        -bounds / 2 + bz * blockSize + blockSize / 2;

      // Skip the river band
      if (Math.abs(blockCenterZ - riverZ) < blockSize * 0.35) continue;

      // Each block gets 1-4 buildings
      const subdiv = 1 + Math.floor(r() * 3); // 1..3
      const lots = subdiv * subdiv;
      const lotSize = (blockSize - 5) / subdiv;

      for (let ly = 0; ly < subdiv; ly++) {
        for (let lx = 0; lx < subdiv; lx++) {
          // small chance to leave a plaza/empty lot
          if (r() < 0.08) continue;

          const offX = (lx - (subdiv - 1) / 2) * lotSize;
          const offZ = (ly - (subdiv - 1) / 2) * lotSize;
          const px = blockCenterX + offX;
          const pz = blockCenterZ + offZ;

          const districtIdx = Math.min(
            DISTRICTS.length - 1,
            Math.floor(((bx + bz) / (blocksPerSide * 2)) * DISTRICTS.length),
          );
          const district = DISTRICTS[districtIdx];

          // Choose category influenced by district & block position
          let category: BuildingCategory = "residential";
          const rr = r();
          if (district === "Downtown Core") {
            category =
              rr < 0.45 ? "office" : rr < 0.7 ? "commercial" : "residential";
          } else if (district === "Industrial East") {
            category =
              rr < 0.55 ? "factory" : rr < 0.75 ? "power" : "residential";
          } else if (district === "Greenfield") {
            category =
              rr < 0.35 ? "park" : rr < 0.7 ? "residential" : "school";
          } else if (district === "Tech Park") {
            category =
              rr < 0.3 ? "office" : rr < 0.5 ? "solar" : rr < 0.65 ? "wind" : "residential";
          } else {
            category =
              rr < 0.5 ? "residential" : rr < 0.7 ? "commercial" : rr < 0.85 ? "school" : "hospital";
          }

          // Parks are flat green lots
          let w = lotSize * (0.72 + r() * 0.18);
          let d = lotSize * (0.72 + r() * 0.18);
          let h: number;
          if (category === "park") {
            h = 0.4;
          } else if (category === "solar" || category === "wind") {
            h = category === "wind" ? 0.6 : 0.3;
            w = lotSize * 0.9;
            d = lotSize * 0.9;
          } else if (category === "factory") {
            h = 3 + r() * 4;
          } else if (category === "power" || (category as string) === "water") {
            h = 4 + r() * 5;
          } else if (category === "office") {
            // Taller near downtown core
            const tallBonus = district === "Downtown Core" ? 1.7 : 1;
            h = (8 + r() * 14) * tallBonus;
          } else if (category === "commercial") {
            h = 5 + r() * 6;
          } else if (category === "hospital" || category === "school") {
            h = 5 + r() * 5;
          } else {
            h = 4 + r() * 9;
          }

          // keep within bounds
          h = Math.min(h, 42);

          const palette = PALETTES[category];
          const color = palette[Math.floor(r() * palette.length)];
          const rot = Math.floor(r() * 4);

          buildings.push({
            id: `b-${id++}`,
            name: pickName(category, r, id),
            category,
            x: px,
            z: pz,
            w,
            d,
            h,
            color,
            rot,
            district,
          });
        }
      }
    }
  }

  // Guarantee a few utility plants even if RNG skipped them
  const hasSolar = buildings.some((b) => b.category === "solar");
  const hasWind = buildings.some((b) => b.category === "wind");
  const hasPower = buildings.some((b) => b.category === "power");
  const hasWater = buildings.some((b) => b.category === "water");
  const force = (cat: BuildingCategory) => {
    buildings.push({
      id: `b-${id++}`,
      name: pickName(cat, r, id),
      category: cat,
      x: (r() - 0.5) * bounds * 0.7,
      z: (r() - 0.5) * bounds * 0.7,
      w: 10,
      d: 10,
      h: cat === "wind" ? 0.6 : cat === "solar" ? 0.3 : 6,
      color: PALETTES[cat][0],
      rot: 0,
      district: "Industrial East",
    });
  };
  if (!hasSolar) force("solar");
  if (!hasWind) force("wind");
  if (!hasPower) force("power");
  if (!hasWater) force("water");

  return { buildings, roadsX, roadsZ, blockSize, river, bounds };
}

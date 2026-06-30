import { useEffect, useRef } from "react";
import { useCity, CITY_LAYOUT } from "../store";
import type { BuildingCategory } from "../types";

const CAT_COLOR: Record<BuildingCategory, string> = {
  residential: "#5d8de8",
  office: "#7c5cff",
  commercial: "#b07be8",
  factory: "#f87171",
  school: "#e8c14d",
  hospital: "#e8eef5",
  park: "#34d399",
  power: "#fbbf24",
  solar: "#38e1ff",
  wind: "#bfe0ff",
  water: "#3aa9e8",
};

/** 2D top-down minimap drawn on a canvas. */
export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const selected = useCity((s) => s.selectedBuildingId);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const layout = CITY_LAYOUT;
      const scale = (W - 6) / (layout.bounds + 6);
      const off = 3;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8,12,24,0.6)";
      ctx.fillRect(0, 0, W, H);

      const cx = (x: number) => off + (x + layout.bounds / 2) * scale;
      const cz = (z: number) => off + (z + layout.bounds / 2) * scale;

      // roads
      ctx.strokeStyle = "rgba(120,150,200,0.18)";
      ctx.lineWidth = 1;
      for (const x of layout.roadsX) {
        ctx.beginPath();
        ctx.moveTo(cx(x), 0);
        ctx.lineTo(cx(x), H);
        ctx.stroke();
      }
      for (const z of layout.roadsZ) {
        ctx.beginPath();
        ctx.moveTo(0, cz(z));
        ctx.lineTo(W, cz(z));
        ctx.stroke();
      }

      // river
      if (layout.river) {
        ctx.fillStyle = "rgba(60,120,170,0.4)";
        ctx.fillRect(0, cz(layout.river.z - layout.river.w / 2), W, layout.river.w * scale);
      }

      // buildings
      const s = useCity.getState();
      for (const b of layout.buildings) {
        ctx.fillStyle = CAT_COLOR[b.category];
        if (s.selectedBuildingId === b.id) {
          ctx.fillStyle = "#ffffff";
        } else if (!s.buildings[b.id]?.hasPower) {
          ctx.fillStyle = "#444";
        }
        ctx.fillRect(cx(b.x - b.w / 2), cz(b.z - b.d / 2), Math.max(1.5, b.w * scale), Math.max(1.5, b.d * scale));
      }

      // selection ring
      if (s.selectedBuildingId) {
        const b = layout.buildings.find((x) => x.id === s.selectedBuildingId);
        if (b) {
          ctx.strokeStyle = "#38e1ff";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx(b.x - b.w / 2) - 2, cz(b.z - b.d / 2) - 2, b.w * scale + 4, b.d * scale + 4);
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const select = useCity((s) => s.select);
  const onClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const layout = CITY_LAYOUT;
    const scale = (canvas.width - 6) / (layout.bounds + 6);
    const off = 3;
    const wx = (mx - off) / scale - layout.bounds / 2;
    const wz = (my - off) / scale - layout.bounds / 2;
    // find nearest building
    let best: { id: string; d: number } | null = null;
    for (const b of layout.buildings) {
      const d = Math.hypot(b.x - wx, b.z - wz);
      if (!best || d < best.d) best = { id: b.id, d };
    }
    if (best && best.d < 5) select(best.id);
  };

  return (
    <div className="absolute bottom-3 right-3 z-30 glass rounded-2xl p-2">
      <div className="text-[10px] text-white/50 mb-1 flex justify-between items-center px-1">
        <span>MINI MAP</span>
        <span className="text-cyan-300/70">NEXUS</span>
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        onClick={onClick}
        className="rounded-lg cursor-pointer"
        style={{ width: 180, height: 180 }}
      />
      <Legend />
    </div>
  );
}

function Legend() {
  const items: [BuildingCategory, string][] = [
    ["residential", "พักอาศัย"],
    ["office", "สำนักงาน"],
    ["factory", "โรงงาน"],
    ["park", "สวน"],
    ["solar", "โซลาร์"],
  ];
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 px-1 max-w-[180px]">
      {items.map(([c, l]) => (
        <div key={c} className="flex items-center gap-1 text-[9px] text-white/55">
          <span className="w-2 h-2 rounded-sm" style={{ background: CAT_COLOR[c] }} />
          {l}
        </div>
      ))}
    </div>
  );
}

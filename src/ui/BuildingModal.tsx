import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "../store";
import type { BuildingCategory } from "../types";

const CAT_LABEL: Record<BuildingCategory, string> = {
  residential: "ที่พักอาศัย",
  office: "สำนักงาน",
  commercial: "พาณิชย์",
  factory: "โรงงาน",
  school: "โรงเรียน",
  hospital: "โรงพยาบาล",
  park: "สวนสาธารณะ",
  power: "โรงไฟฟ้า",
  solar: "พลังงานแสงอาทิตย์",
  wind: "กังหันลม",
  water: "โรงน้ำ",
};

const CAT_ICON: Record<BuildingCategory, string> = {
  residential: "🏠",
  office: "🏢",
  commercial: "🏬",
  factory: "🏭",
  school: "🏫",
  hospital: "🏥",
  park: "🌳",
  power: "⚡",
  solar: "🔆",
  wind: "🌬️",
  water: "💧",
};

export function BuildingModal() {
  const id = useCity((s) => s.selectedBuildingId);
  const def = useCity((s) => (id ? s.layout.buildings.find((b) => b.id === id) : null));
  const state = useCity((s) => (id ? s.buildings[id] : null));

  const select = useCity((s) => s.select);
  const togglePower = useCity((s) => s.toggleBuildingPower);
  const upgrade = useCity((s) => s.upgradeBuilding);
  const installSolar = useCity((s) => s.installSolar);
  const installBattery = useCity((s) => s.installBattery);
  const toggleLock = useCity((s) => s.toggleLock);

  return (
    <AnimatePresence>
      {def && state && (
        <motion.div
          key="modal"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="absolute right-3 top-20 bottom-20 w-[300px] md:w-[330px] z-30 glass-strong rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto scroll-thin"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] tracking-widest text-cyan-300/70">{def.district.toUpperCase()}</div>
              <h2 className="text-lg font-medium leading-tight">{def.name}</h2>
              <div className="text-xs text-white/50 mt-0.5">
                {CAT_ICON[def.category]} {CAT_LABEL[def.category]}
              </div>
            </div>
            <button
              onClick={() => select(null)}
              className="w-7 h-7 rounded-lg glass-light hover:bg-white/10 text-white/70 grid place-items-center"
            >
              ✕
            </button>
          </div>

          {/* status pills */}
          <div className="flex flex-wrap gap-1.5">
            <Pill on={state.hasPower} onText="ไฟเปิด" offText="ไฟดับ" />
            <Pill on={state.locked} onText="ล็อก" offText="ปลดล็อก" invert />
            <Pill on={state.hasSolar} onText="Solar" offText="—" />
            <Pill on={state.hasBattery} onText="Battery" offText="—" />
          </div>

          {/* metrics */}
          <div className="grid grid-cols-2 gap-2">
            <Metric label="ผู้อยู่อาศัย" value={`${state.occupants}`} />
            <Metric label="กำลังไฟฟ้า" value={`${state.powerKW.toFixed(1)} kW`} />
            <Metric label="น้ำที่ใช้" value={`${state.waterKL.toFixed(2)} kL/h`} />
            <Metric label="CO₂" value={`${state.co2kg.toFixed(1)} kg/h`} />
            <Metric label="ประสิทธิภาพ" value={`${(state.efficiency * 100).toFixed(0)}%`} />
            <Metric
              label="ความเสี่ยงไฟไหม้"
              value={`${(state.fireRisk * 100).toFixed(0)}%`}
              danger={state.fireRisk > 0.3}
            />
          </div>

          {/* efficiency bar */}
          <div>
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
              <span>ประสิทธิภาพพลังงาน</span>
              <span>{(state.efficiency * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#f87171,#fbbf24,#34d399)" }}
                animate={{ width: `${state.efficiency * 100}%` }}
              />
            </div>
          </div>

          {/* controls */}
          <div className="text-[10px] tracking-widest text-white/40 mt-1">ระบบควบคุม</div>
          <div className="grid grid-cols-2 gap-2">
            <Btn
              onClick={() => togglePower(def.id)}
              active={state.hasPower}
              activeText="ปิดไฟ"
              inactiveText="เปิดไฟ"
            />
            <Btn
              onClick={() => toggleLock(def.id)}
              active={state.locked}
              activeText="ปลดล็อก"
              inactiveText="ล็อกอาคาร"
              invert
            />
            <Btn
              onClick={() => upgrade(def.id)}
              active={false}
              activeText=""
              inactiveText="⬆ อัปเกรด"
              full
            />
            <Btn
              onClick={() => installSolar(def.id)}
              active={state.hasSolar}
              activeText="✓ ติด Solar"
              inactiveText="🔆 ติด Solar"
              disabled={state.hasSolar}
            />
            <Btn
              onClick={() => installBattery(def.id)}
              active={state.hasBattery}
              activeText="✓ Battery"
              inactiveText="🔋 ติดแบต"
              disabled={state.hasBattery}
            />
          </div>

          <div className="text-[10px] text-white/35 leading-relaxed pt-1">
            พิกัด X {(def.x).toFixed(0)} · Z {(def.z).toFixed(0)} · ความสูง {def.h.toFixed(1)}m
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Pill({ on, onText, offText, invert }: { on: boolean; onText: string; offText: string; invert?: boolean }) {
  const good = invert ? !on : on;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full"
      style={{
        background: good ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)",
        color: good ? "#6ee7b7" : "#fca5a5",
        border: `1px solid ${good ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
      }}
    >
      {on ? onText : offText}
    </span>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="glass-light rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] text-white/45">{label}</div>
      <div className="text-sm font-mono-tight" style={{ color: danger ? "#fca5a5" : undefined }}>
        {value}
      </div>
    </div>
  );
}

function Btn({
  onClick,
  active,
  activeText,
  inactiveText,
  invert,
  full,
  disabled,
}: {
  onClick: () => void;
  active: boolean;
  activeText: string;
  inactiveText: string;
  invert?: boolean;
  full?: boolean;
  disabled?: boolean;
}) {
  const on = invert ? !active : active;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs py-2 rounded-lg transition-colors ${full ? "col-span-2" : ""} ${
        disabled
          ? "opacity-40 cursor-not-allowed glass-light"
          : on
          ? "bg-cyan-400/15 border border-cyan-300/30 text-cyan-200 hover:bg-cyan-400/25"
          : "glass-light hover:bg-white/10 text-white/80"
      }`}
    >
      {active ? activeText : inactiveText}
    </button>
  );
}

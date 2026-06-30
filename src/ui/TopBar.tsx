import { useEffect, useState } from "react";
import { useCity } from "../store";
import type { WeatherType } from "../types";

const WEATHER_ICON: Record<WeatherType, string> = {
  clear: "☀️",
  cloudy: "⛅",
  rain: "🌧️",
  storm: "⛈️",
  fog: "🌫️",
  snow: "❄️",
};

const WEATHER_LABEL: Record<WeatherType, string> = {
  clear: "แดดออก",
  cloudy: "เมฆมาก",
  rain: "ฝนตก",
  storm: "พายุ",
  fog: "หมอก",
  snow: "หิมะตก",
};

export function TopBar() {
  const timeMinutes = useCity((s) => s.timeMinutes);
  const weather = useCity((s) => s.weather);
  const stats = useCity((s) => s.stats);
  const toggleDashboard = useCity((s) => s.toggleDashboard);
  const toggleMissions = useCity((s) => s.toggleMissions);
  const save = useCity((s) => s.save);
  const load = useCity((s) => s.load);
  const toggleDark = useCity((s) => s.toggleDark);
  const darkMode = useCity((s) => s.darkMode);

  const hh = Math.floor(timeMinutes / 60);
  const mm = Math.floor(timeMinutes % 60);
  const time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

  // local clock of day/night icon
  const isNight = hh < 6 || hh > 18;

  return (
    <header className="absolute top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 py-2 pointer-events-none">
      {/* brand */}
      <div className="glass rounded-2xl px-4 py-2 flex items-center gap-3 pointer-events-auto">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center font-mono-tight text-sm"
          style={{ background: "linear-gradient(135deg,#38e1ff,#7c5cff)", color: "#05070d" }}
        >
          N
        </div>
        <div className="leading-tight">
          <div className="text-sm font-medium tracking-wide">NEXUS CITY</div>
          <div className="text-[9px] text-white/45 tracking-widest">DIGITAL TWIN</div>
        </div>
      </div>

      {/* center: time + weather */}
      <div className="glass rounded-2xl px-4 py-2 flex items-center gap-4 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isNight ? "🌙" : "☀️"}</span>
          <div className="leading-tight">
            <div className="text-base font-mono-tight tabular-nums">{time}</div>
            <div className="text-[9px] text-white/45">SIM TIME</div>
          </div>
        </div>
        <div className="w-px h-7 bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-lg">{WEATHER_ICON[weather.type]}</span>
          <div className="leading-tight">
            <div className="text-sm">{WEATHER_LABEL[weather.type]}</div>
            <div className="text-[9px] text-white/45">{stats.temperatureC.toFixed(0)}°C</div>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* quick stats */}
      <div className="hidden md:flex glass rounded-2xl px-3 py-2 gap-4 pointer-events-auto">
        <MiniStat label="HAPPY" value={`${stats.happiness.toFixed(0)}`} color="#7c5cff" />
        <MiniStat label="CO₂" value={`${stats.co2Pct.toFixed(0)}%`} color="#f87171" />
        <MiniStat label="AIR" value={`${stats.airQuality.toFixed(0)}`} color="#34d399" />
      </div>

      {/* action buttons */}
      <div className="glass rounded-2xl px-2 py-1.5 flex items-center gap-1 pointer-events-auto">
        <IconBtn title="Dashboard" onClick={toggleDashboard}>📊</IconBtn>
        <IconBtn title="Missions" onClick={toggleMissions}>🎯</IconBtn>
        <IconBtn title="Save" onClick={save}>💾</IconBtn>
        <IconBtn title="Load" onClick={load}>📂</IconBtn>
        <IconBtn title="Theme" onClick={toggleDark}>{darkMode ? "🌙" : "☀️"}</IconBtn>
      </div>
    </header>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="leading-tight text-center">
      <div className="text-sm font-mono-tight" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] text-white/40 tracking-wider">{label}</div>
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-8 h-8 rounded-lg hover:bg-white/10 grid place-items-center text-sm transition-colors"
    >
      {children}
    </button>
  );
}

/** Controls dock: time speed, weather picker, camera modes, follow. */
export function ControlDock() {
  const daySpeed = useCity((s) => s.daySpeed);
  const setDaySpeed = useCity((s) => s.setDaySpeed);
  const paused = useCity((s) => s.paused);
  const togglePause = useCity((s) => s.togglePause);
  const setWeather = useCity((s) => s.setWeather);
  const weather = useCity((s) => s.weather);
  const cameraMode = useCity((s) => s.cameraMode);
  const setCameraMode = useCity((s) => s.setCameraMode);
  const followVehicle = useCity((s) => s.followVehicle);

  const [tip, setTip] = useState<string | null>(null);

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 glass-strong rounded-2xl px-3 py-2 flex items-center gap-3 pointer-events-auto max-w-[94vw] overflow-x-auto scroll-thin">
      {/* time */}
      <Group label="TIME">
        <PillBtn active={paused} onClick={togglePause}>{paused ? "▶" : "⏸"}</PillBtn>
        {[1, 2, 5, 15].map((sp) => (
          <PillBtn key={sp} active={daySpeed === sp && !paused} onClick={() => setDaySpeed(sp)}>
            {sp}×
          </PillBtn>
        ))}
      </Group>

      <Divider />

      {/* weather */}
      <Group label="WEATHER">
        {(["clear", "cloudy", "rain", "storm", "fog", "snow"] as WeatherType[]).map((w) => (
          <PillBtn key={w} active={weather.type === w} onClick={() => setWeather(w)}>
            {WEATHER_ICON[w]}
          </PillBtn>
        ))}
      </Group>

      <Divider />

      {/* camera */}
      <Group label="CAMERA">
        <PillBtn
          active={cameraMode === "free"}
          onClick={() => {
            setCameraMode("free");
            followVehicle(null);
          }}
          onMouseEnter={() => setTip("free orbit")}
        >
          🎥
        </PillBtn>
        <PillBtn active={cameraMode === "top"} onClick={() => setCameraMode("top")}>
          🛰️
        </PillBtn>
        <PillBtn
          active={cameraMode === "follow"}
          onClick={() => {
            followVehicle("follow-any");
          }}
        >
          🚗
        </PillBtn>
        <PillBtn active={cameraMode === "focus"} onClick={() => setCameraMode("free")}>
          🏢
        </PillBtn>
      </Group>

      {tip && <span className="text-[10px] text-white/50">{tip}</span>}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[8px] tracking-widest text-white/40">{label}</div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-9 bg-white/10 mx-0.5" />;
}

function PillBtn({
  children,
  active,
  onClick,
  onMouseEnter,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`min-w-8 h-8 px-2 rounded-lg text-xs grid place-items-center transition-colors ${
        active
          ? "bg-cyan-400/20 border border-cyan-300/40 text-cyan-100"
          : "glass-light hover:bg-white/10 text-white/70 border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

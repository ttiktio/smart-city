import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { Scene } from "./three/Scene";
import { LoadingScreen } from "./ui/LoadingScreen";
import { Dashboard } from "./ui/Dashboard";
import { BuildingModal } from "./ui/BuildingModal";
import { MiniMap } from "./ui/MiniMap";
import { TopBar, ControlDock } from "./ui/TopBar";
import { Toasts, EventsPanel } from "./ui/Notifications";
import { MissionsPanel } from "./ui/Missions";
import { useCity, maybeSpawnEvent } from "./store";
import { cityAudio } from "./lib/audio";

function App() {
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState({ fps: 60 });
  const [audioOn, setAudioOn] = useState(false);

  // simulation loop — drives store.tick and event spawning
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let eventAcc = 0;
    let fpsAcc = 0;
    let fpsFrames = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      useCity.getState().tick(dt);

      // audio ambience update (cheap)
      cityAudio.update(useCity.getState().weather);

      eventAcc += dt;
      if (eventAcc > 2.5) {
        eventAcc = 0;
        maybeSpawnEvent();
      }

      // fps measure
      fpsAcc += dt;
      fpsFrames++;
      if (fpsAcc >= 0.5) {
        setPerf({ fps: Math.round(fpsFrames / fpsAcc) });
        fpsAcc = 0;
        fpsFrames = 0;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useCity.getState();
      if (e.key === " ") {
        e.preventDefault();
        s.togglePause();
      } else if (e.key === "1") s.setCameraMode("free");
      else if (e.key === "2") s.setCameraMode("top");
      else if (e.key === "3") {
        s.followVehicle("follow-any");
      } else if (e.key === "Escape") s.select(null);
      else if (e.key === "d" || e.key === "D") s.toggleDashboard();
      else if (e.key === "m" || e.key === "M") s.toggleMissions();
      else if (e.key === "a" || e.key === "A") {
        const on = cityAudio.toggle();
        setAudioOn(on);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleAudio = () => {
    const on = cityAudio.toggle();
    setAudioOn(on);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#05070d" }}>
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: [60, 55, 60], fov: 50, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Scene />
        <EffectComposer>
          <Bloom luminanceThreshold={0.65} intensity={0.7} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      </Canvas>

      {/* dark/light theme overlay tint */}
      <ThemeLayer />

      {/* UI overlay */}
      <TopBar />
      <Dashboard />
      <BuildingModal />
      <MissionsPanel />
      <MiniMap />
      <EventsPanel />
      <Toasts />
      <ControlDock />

      {/* audio + help */}
      <div className="absolute top-16 left-3 z-30 flex flex-col gap-2">
        <button
          onClick={toggleAudio}
          title="Toggle sound (A)"
          className={`glass rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 ${
            audioOn ? "text-cyan-300" : "text-white/50"
          }`}
        >
          {audioOn ? "🔊" : "🔇"} เสียงเมือง
        </button>
        <HelpButton />
      </div>

      {/* perf badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 mb-[64px] pointer-events-none">
        <div className="text-[9px] text-white/30 font-mono-tight">{perf.fps} FPS</div>
      </div>

      {loading && <LoadingScreen onDone={() => setLoading(false)} />}
    </div>
  );
}

function ThemeLayer() {
  const dark = useCity((s) => s.darkMode);
  if (dark) return null;
  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ background: "rgba(255,255,255,0.05)", mixBlendMode: "overlay" }}
    />
  );
}

function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass rounded-xl px-3 py-1.5 text-xs text-white/60"
      >
        ⌨ คีย์ลัด
      </button>
      {open && (
        <div className="glass-strong rounded-xl p-3 text-[11px] text-white/70 w-[210px] space-y-1">
          <Row k="Space" v="หยุด/เล่น" />
          <Row k="1 / 2 / 3" v="กล้อง Free / Top / Follow" />
          <Row k="Esc" v="ยกเลิกเลือก" />
          <Row k="D" v="เปิด/ปิด Dashboard" />
          <Row k="M" v="ภารกิจ" />
          <Row k="A" v="เสียง" />
          <Row k="คลิกอาคาร" v="ดูรายละเอียด" />
          <Row k="ลาว / สกอล" v="หมุน / ซูม" />
        </div>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-mono-tight text-cyan-300/80">{k}</span>
      <span className="text-white/55 text-right">{v}</span>
    </div>
  );
}

export default App;

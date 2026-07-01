import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  "เริ่มต้นระบบจำลองเมือง…",
  "กำลังสร้างตึกและถนน…",
  "เชื่อมต่อโครงข่ายไฟฟ้า…",
  "โหลดจราจรและประชากร…",
  "ปรับแสงและสภาพอากาศ…",
  "พร้อมใช้งาน!",
];

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const onDoneRef = useRef(onDone);

  // Sync ref with latest callback
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 8 + 3;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setTimeout(() => {
          onDoneRef.current();
        }, 600);
      }
      setProgress(p);
      setStage(Math.min(STAGES.length - 1, Math.floor((p / 100) * STAGES.length)));
    }, 130);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="loader"
        exit={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #0d1a3a 0%, #05070d 70%)",
        }}
      >
        {/* animated grid floor */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,225,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(56,225,255,0.18) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "linear-gradient(to top, black 0%, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 60%)",
            animation: "gridmove 1.4s linear infinite",
          }}
        />
        <div className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-3 text-xs tracking-[0.5em] text-cyan-300/80"
          >
            DIGITAL TWIN PLATFORM
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.08em" }}
            transition={{ duration: 1 }}
            className="text-5xl md:text-7xl font-light neon-text"
            style={{ background: "linear-gradient(90deg,#38e1ff,#7c5cff)", WebkitBackgroundClip: "text", color: "transparent" }}
          >
            NEXUS CITY
          </motion.h1>
          <div className="mt-10 w-[min(420px,80vw)] mx-auto">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#38e1ff,#7c5cff)" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-white/60 font-mono-tight">
              <span>{STAGES[stage]}</span>
              <span>{Math.floor(progress)}%</span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-3 text-[10px] text-white/40 max-w-md mx-auto">
            {["3D · R3F", "Realtime Sim", "Interactive"].map((t) => (
              <div key={t} className="border border-white/10 rounded-md py-1.5 glass-light">
                {t}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

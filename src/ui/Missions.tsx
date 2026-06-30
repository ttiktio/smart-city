import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "../store";

export function MissionsPanel() {
  const show = useCity((s) => s.showMissions);
  const missions = useCity((s) => s.missions);
  const toggle = useCity((s) => s.toggleMissions);
  const doneCount = missions.filter((m) => m.done).length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="missions"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-16 right-3 z-40 w-[300px] glass-strong rounded-2xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">🎯 ภารกิจเมือง</div>
            <div className="text-[10px] text-white/50">
              {doneCount}/{missions.length} สำเร็จ
            </div>
          </div>
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
            {missions.map((m) => (
              <div
                key={m.id}
                className="glass-light rounded-xl p-2.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    {m.done ? "✅" : "⏳"} {m.title}
                  </div>
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">{m.description}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: m.done ? "#34d399" : "linear-gradient(90deg,#38e1ff,#7c5cff)",
                      }}
                      animate={{ width: `${Math.round(m.progress * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono-tight text-white/60 w-9 text-right">
                    {Math.round(m.progress * 100)}%
                  </div>
                </div>
                <div className="text-[9px] text-cyan-300/60 mt-1">รางวัล: {m.reward}</div>
              </div>
            ))}
          </div>
          <button
            onClick={toggle}
            className="mt-2 w-full text-[10px] py-1.5 rounded-md glass-light hover:bg-white/10 text-white/70"
          >
            ปิด
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

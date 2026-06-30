import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "../store";
import type { AppNotification, GameEvent } from "../types";

const KIND_STYLE: Record<AppNotification["kind"], { color: string; bg: string; icon: string }> = {
  info: { color: "#9fc4ff", bg: "rgba(56,150,255,0.18)", icon: "ℹ️" },
  success: { color: "#6ee7b7", bg: "rgba(52,211,153,0.18)", icon: "✓" },
  warn: { color: "#fcd34d", bg: "rgba(251,191,36,0.18)", icon: "⚠" },
  danger: { color: "#fca5a5", bg: "rgba(248,113,113,0.2)", icon: "✖" },
};

const EV_ICON: Record<GameEvent["type"], string> = {
  blackout: "🔌",
  traffic: "🚦",
  rain: "🌧️",
  pollution: "🌫️",
  accident: "🚨",
  flood: "🌊",
  powershort: "⚡",
  fire: "🔥",
};

/** Toasts — newest few notifications float in top-center. */
export function Toasts() {
  const notifications = useCity((s) => s.notifications);
  const dismiss = useCity((s) => s.dismissNotification);
  const toasts = notifications.slice(0, 4);

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map((n) => {
          const style = KIND_STYLE[n.kind];
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={() => dismiss(n.id)}
              className="glass-strong rounded-xl px-3 py-2 flex items-center gap-2 max-w-sm cursor-pointer pointer-events-auto"
              style={{ borderLeft: `3px solid ${style.color}` }}
            >
              <span className="text-sm">{style.icon}</span>
              <div className="leading-tight">
                <div className="text-xs font-medium" style={{ color: style.color }}>
                  {n.title}
                </div>
                <div className="text-[10px] text-white/55">{n.message}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Active emergency events panel — bottom-left. */
export function EventsPanel() {
  const events = useCity((s) => s.events);
  const resolveEvent = useCity((s) => s.resolveEvent);
  const timeMinutes = useCity((s) => s.timeMinutes);

  return (
    <div className="absolute bottom-3 left-3 z-30 flex flex-col gap-2 w-[230px]">
      <AnimatePresence>
        {events.map((e) => {
          const elapsed = timeMinutes - e.startSimMin;
          const ratio = Math.min(1, elapsed / e.duration);
          return (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-xl p-2.5"
              style={{
                borderLeft: `3px solid ${
                  e.severity === "danger" ? "#f87171" : e.severity === "warn" ? "#fbbf24" : "#38e1ff"
                }`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{EV_ICON[e.type]}</span>
                <div className="flex-1 leading-tight">
                  <div className="text-xs font-medium">{e.title}</div>
                  <div className="text-[10px] text-white/50">{e.message}</div>
                </div>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${ratio * 100}%`,
                    background:
                      e.severity === "danger"
                        ? "#f87171"
                        : e.severity === "warn"
                        ? "#fbbf24"
                        : "#38e1ff",
                  }}
                />
              </div>
              <button
                onClick={() => resolveEvent(e.id)}
                className="mt-1.5 w-full text-[10px] py-1 rounded-md glass-light hover:bg-white/10 text-white/80"
              >
                จัดการเหตุการณ์
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

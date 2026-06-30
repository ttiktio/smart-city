import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { useCity } from "../store";

function fmt(n: number) {
  if (n > 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n > 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.round(n).toString();
}

const CAT_LABEL: Record<string, string> = {
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

export function Dashboard() {
  const show = useCity((s) => s.showDashboard);
  const stats = useCity((s) => s.stats);
  const history = useCity((s) => s.history);

  const [tab, setTab] = useState<"metrics" | "ai">("metrics");
  const [inputValue, setInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    {
      sender: "ai",
      text: "สวัสดีท่านนายกเทศมนตรี! 🏙️ ผมคือ AI ผู้ช่วยวิเคราะห์เมืองอัจฉริยะ ยินดีให้คำปรึกษาเพื่อยกระดับประชากรและเมือง Nexus City ของคุณให้สะอาด ปลอดภัย และมีความสุขสูงสุดครับ!\n\nคุณสามารถคลิกเลือกหัวข้อการประเมินด่วนหรือพิมพ์ถามคำถามด้านล่างได้เลยครับ",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, tab]);

  const powerRatio = stats.powerDemandKW > 0 ? Math.min(1, stats.powerSupplyKW / stats.powerDemandKW) : 1;
  const radial = [{ name: "energy", value: Math.round(powerRatio * 100), fill: "#38e1ff" }];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg = { sender: "user" as const, text };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    setTimeout(() => {
      let aiText = "";
      const query = text.toLowerCase();

      if (query.includes("มลพิษ") || query.includes("co2") || query.includes("อากาศ") || query.includes("คาร์บอน")) {
        if (stats.co2Pct > 45) {
          aiText = `🚨 [รายงานมลพิษ & CO₂]\nดัชนีคาร์บอน (CO₂) สูงถึง **${stats.co2Pct.toFixed(0)}%** และคุณภาพอากาศอยู่ที่ **${stats.airQuality.toFixed(0)}/100** (ค่อนข้างวิกฤต)\n\n💡 คำแนะนำ:\n1. คลิกที่โรงงานอุตสาหกรรมในย่าน Industrial East แล้วกดอัปเกรดประสิทธิภาพเพื่อลดมลพิษ\n2. ติดตั้งแผงโซลาร์เซลล์บนตึกออฟฟิศ/ตึกอาศัย เพื่อลดการดึงพลังงานจากกริดไฟหลักถ่านหิน\n3. สร้างสถานีกังหันลมเพิ่มขึ้นในย่านพลังงานสะอาด`;
        } else {
          aiText = `🌿 [รายงานมลพิษ & CO₂]\nคุณภาพอากาศสดชื่นดีมากครับ! ค่า CO₂ ต่ำเพียง **${stats.co2Pct.toFixed(0)}%** และดัชนีคุณภาพอากาศสูงถึง **${stats.airQuality.toFixed(0)}/100** สภาพแวดล้อมน่าอยู่มาก`;
        }
      } else if (query.includes("จราจร") || query.includes("รถติด") || query.includes("ถนน") || query.includes("รถชน") || query.includes("อุบัติเหตุ")) {
        if (stats.trafficLevel > 55) {
          aiText = `🚗 [วิเคราะห์การจราจรสะสม]\nการจราจรติดขัดสูงถึง **${stats.trafficLevel.toFixed(0)}%**\n\n💡 คำแนะนำ:\n1. เช็กแถบการแจ้งเตือนด้านขวาว่ามีอุบัติเหตุหรือน้ำท่วมขวางถนนอยู่หรือไม่ และกด 'แก้ไข' ทันทีเพื่อให้ถนนเคลียร์\n2. ปรับเปลี่ยนสภาพอากาศ (ลดพายุ/ฝน) เพื่อให้รถสามารถทำความเร็วได้ปกติครับ`;
        } else {
          aiText = `🟢 [วิเคราะห์การจราจร]\nการจราจรคล่องตัวดีมากครับ ความหนาแน่นอยู่ที่ **${stats.trafficLevel.toFixed(0)}%** ถนนทุกสายผ่านได้สะดวก ปลอดภัยครับ`;
        }
      } else if (query.includes("สุข") || query.includes("ความสุข") || query.includes("พอใจ") || query.includes("แฮปปี้")) {
        aiText = `❤️ [ดัชนีความสุขประชากร]\nขณะนี้ประชากรมีความพึงพอใจโดยรวมอยู่ที่ **${stats.happiness.toFixed(0)}%**\n\n💡 แผนพัฒนาความสุขประชากร:\n- รักษาอัตราจ่ายพลังงานไฟฟ้าให้เต็ม 100%\n- กดเคลียร์อุบัติเหตุ/น้ำท่วมบนหน้าจอแจ้งเตือนให้เร็วที่สุด\n- อัปเกรดประสิทธิภาพการกรองมลพิษของโรงไฟฟ้าและโรงงานเพื่อกู้คุณภาพอากาศที่ดีกลับมาครับ`;
      } else if (query.includes("พลังงาน") || query.includes("ไฟ") || query.includes("ไฟฟ้า") || query.includes("โซลาร์") || query.includes("แบต")) {
        const diff = stats.powerSupplyKW - stats.powerDemandKW;
        aiText = `⚡ [รายงานพลังงานเมือง]\n- ผลิตได้ทั้งหมด: **${fmt(stats.powerSupplyKW)} kW**\n- ความต้องการรวม: **${fmt(stats.powerDemandKW)} kW**\n- อัตราผลิตพลังงานสะอาด: **${(stats.renewableShare * 100).toFixed(0)}%**\n\n💡 สรุป: ${
          diff < 0
            ? `⚠️ ขณะนี้พลังงานไฟขาดแคลนอยู่ **${fmt(Math.abs(diff))} kW**! แนะนำให้ท่านติดตั้ง Solar Panel เพิ่มตามตึกต่างๆ หรือสร้างโรงไฟฟ้าเพิ่มเติมด่วนครับ`
            : `✅ พลังงานไฟฟ้าสำรองสมบูรณ์ดี (เหลือเฟือ **${fmt(diff)} kW**)`
        }`;
      } else {
        aiText = `🤖 [AI Mayor Assistant]\nยินดีต้อนรับท่านนายกเทศมนตรี! ผมสามารถตรวจสอบวิเคราะห์เมืองสดๆ ได้ โดยท่านสามารถพิมพ์หรือคลิกหัวข้อด้านล่างนี้ได้เลยครับ:\n\n1. "วิเคราะห์มลพิษ & CO₂"\n2. "วิเคราะห์การจราจร"\n3. "ความสุขประชากร"\n4. "วิเคราะห์พลังงาน"`;
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: aiText }]);
    }, 450);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          key="dash"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="absolute left-3 top-20 bottom-20 w-[300px] md:w-[330px] z-30 glass rounded-2xl p-3 flex flex-col gap-2.5 overflow-hidden"
        >
          {/* Tab Navigation header */}
          <div className="flex border-b border-white/10 pb-1.5 justify-between items-center mb-1">
            <div className="flex gap-3">
              <button
                onClick={() => setTab("metrics")}
                className={`text-[10px] tracking-widest pb-1 font-semibold transition-colors ${
                  tab === "metrics" ? "text-cyan-300 border-b border-cyan-300" : "text-white/40 hover:text-white/70"
                }`}
              >
                METRICS
              </button>
              <button
                onClick={() => setTab("ai")}
                className={`text-[10px] tracking-widest pb-1 font-semibold transition-colors ${
                  tab === "ai" ? "text-cyan-300 border-b border-cyan-300" : "text-white/40 hover:text-white/70"
                }`}
              >
                💡 AI ASSISTANT
              </button>
            </div>
            <div className="text-[9px] text-emerald-400 font-mono-tight flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
            </div>
          </div>

          {tab === "metrics" ? (
            <>
              {/* top grid of stats */}
              <div className="grid grid-cols-2 gap-2">
                <Stat label="ประชากร" value={fmt(stats.population)} accent="#7c5cff" />
                <Stat label="อุณหภูมิ" value={`${stats.temperatureC.toFixed(1)}°C`} accent="#fbbf24" />
                <Stat
                  label="คุณภาพอากาศ"
                  value={`${Math.round(stats.airQuality)}`}
                  accent={stats.airQuality > 60 ? "#34d399" : stats.airQuality > 35 ? "#fbbf24" : "#f87171"}
                />
                <Stat
                  label="น้ำในเขื่อน"
                  value={`${Math.round(stats.waterLevelPct)}%`}
                  accent={stats.waterLevelPct > 80 ? "#f87171" : "#38e1ff"}
                />
              </div>

              {/* energy supply vs demand radial */}
              <div className="glass-light rounded-xl p-2 flex items-center gap-3">
                <div className="h-[78px] w-[78px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="68%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar background dataKey="value" cornerRadius={20} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="text-white/50">พลังงาน</div>
                  <div className="text-sm font-mono-tight">{fmt(stats.powerSupplyKW)} kW</div>
                  <div className="text-[10px] text-white/40">ความต้องการ {fmt(stats.powerDemandKW)} kW</div>
                  <div className="text-[10px] text-emerald-300">
                    หมุนเวียน {(stats.renewableShare * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* charts */}
              <div className="glass-light rounded-xl p-2 flex-1 min-h-0 flex flex-col">
                <div className="text-[10px] text-white/50 px-1 mb-1">พลังงานที่ใช้ (kW)</div>
                <div className="flex-1 min-h-[60px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38e1ff" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#38e1ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="t" hide />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,16,30,0.9)",
                          border: "1px solid #ffffff20",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelFormatter={(v) => `t=${v}`}
                      />
                      <Area type="monotone" dataKey="power" stroke="#38e1ff" strokeWidth={2} fill="url(#gP)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MiniChart title="CO₂ %" data={history} k="co2" color="#f87171" />
                <MiniChart title="จราจร" data={history} k="traffic" color="#fbbf24" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MiniChart title="อากาศ" data={history} k="air" color="#34d399" />
                <MiniChart title="ความพอใจ" data={history} k="happiness" color="#7c5cff" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat history list */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs min-h-0 flex flex-col">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                      msg.sender === "ai"
                        ? "glass-light text-cyan-200 self-start"
                        : "bg-cyan-500/20 text-white border border-cyan-400/30 self-end ml-auto"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions shortcuts */}
              <div className="my-2 space-y-1">
                <div className="text-[9px] text-white/40 px-1">ดัชนีวิเคราะห์ด่วน:</div>
                <div className="flex flex-wrap gap-1">
                  {[
                    "วิเคราะห์มลพิษ & CO₂",
                    "วิเคราะห์การจราจร",
                    "ความสุขประชากร",
                    "วิเคราะห์พลังงาน",
                  ].map((suggest) => (
                    <button
                      key={suggest}
                      onClick={() => handleSend(suggest)}
                      className="glass-light hover:bg-white/10 text-[9px] text-cyan-300 px-2 py-1 rounded-lg transition-colors border border-white/5"
                    >
                      {suggest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputValue);
                }}
                className="flex gap-1 border-t border-white/10 pt-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="พิมพ์ถามคำถามวิเคราะห์เมือง..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-white rounded-xl px-3 py-1 text-xs transition-colors"
                >
                  ส่ง
                </button>
              </form>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass-light rounded-xl px-2.5 py-2 relative overflow-hidden">
      <div className="text-[10px] text-white/45">{label}</div>
      <div className="text-lg font-mono-tight mt-0.5" style={{ color: accent }}>
        {value}
      </div>
      <div className="absolute right-0 top-0 h-full w-1" style={{ background: accent }} />
    </div>
  );
}

function MiniChart({
  title,
  data,
  k,
  color,
}: {
  title: string;
  data: any[];
  k: string;
  color: string;
}) {
  return (
    <div className="glass-light rounded-xl p-2 h-[78px] flex flex-col">
      <div className="text-[10px] text-white/45 mb-0.5">{title}</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["auto", "auto"]} />
            <Area type="monotone" dataKey={k} stroke={color} strokeWidth={1.5} fill={`url(#g-${k})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

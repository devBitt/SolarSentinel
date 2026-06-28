import { useEffect, useState, useRef } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Wind, Zap, AlertTriangle, Wifi, WifiOff } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface PlasmaRow {
  time_tag: string; density: string; speed: string; temperature: string;
}
interface ProtonRow {
  time_tag: string; flux: number; energy: string;
}
interface ChartPoint {
  t: number;
  label: string;
  speed: number | null;
  density: number | null;
  proton10: number | null;
}
interface FlareEvent {
  id: string; goes_class: string; start_time: string;
  peak_solexs_flux: number; detection_confidence: number;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const PLASMA_URL  = "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json";
const PROTON_URL  = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json";
const SEP_THRESH  = 10; // pfu: ≥10 MeV flux threshold for SEP event
const POLL_MS     = 5 * 60 * 1000;

/* Class colours matching goesClass.ts */
const CLASS_CLR: Record<string, string> = {
  X: "#9333EA", M: "#EF4444", C: "#F5A623", B: "#6B8FA8",
};
const cls = (c: string) => CLASS_CLR[c?.[0]] ?? "#6B8FA8";

/* ─── Data helpers ───────────────────────────────────────────────────────── */

/** Downsample to at most `n` evenly-spaced points */
function downsample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

function fmtLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function fetchPlasma(): Promise<PlasmaRow[]> {
  const raw: string[][] = await fetch(PLASMA_URL).then(r => r.json());
  return raw.slice(1).map(([time_tag, density, speed, temperature]) =>
    ({ time_tag, density, speed, temperature })
  );
}

async function fetchProton(): Promise<ProtonRow[]> {
  const raw: ProtonRow[] = await fetch(PROTON_URL).then(r => r.json());
  return raw;
}

function merge(plasma: PlasmaRow[], protons: ProtonRow[]): ChartPoint[] {
  /* Build proton lookup: keep ≥10 MeV only, keyed by minute timestamp */
  const protonMap = new Map<number, number>();
  protons
    .filter(p => p.energy === ">=10 MeV")
    .forEach(p => {
      const t = Math.round(new Date(p.time_tag).getTime() / 60000) * 60000;
      protonMap.set(t, p.flux);
    });

  const pts: ChartPoint[] = plasma.map(row => {
    const t  = new Date(row.time_tag.replace(" ", "T") + "Z").getTime();
    const tk = Math.round(t / 60000) * 60000;
    return {
      t,
      label: fmtLabel(t),
      speed:   parseFloat(row.speed)   || null,
      density: parseFloat(row.density) || null,
      proton10: protonMap.get(tk) ?? null,
    };
  });

  return downsample(pts, 180);
}

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */

function SWTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  return (
    <div className="bg-[#0D1B2A]/95 border border-border rounded px-3 py-2 text-[11px] font-mono backdrop-blur-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      {d.speed   != null && <p>Speed: <span className="text-[#00D4FF]">{d.speed.toFixed(0)} km/s</span></p>}
      {d.density != null && <p>Density: <span className="text-[#F5A623]">{d.density.toFixed(2)} p/cm³</span></p>}
      {d.proton10 != null && <p>≥10 MeV: <span className="text-[#9333EA]">{d.proton10.toFixed(3)} pfu</span></p>}
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */

function StatCard({ label, value, unit, color, sub }: {
  label: string; value: string; unit: string; color: string; sub?: string;
}) {
  return (
    <div className="flex-1 bg-background/60 border border-border rounded p-3 min-w-0">
      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-lg font-bold leading-none" style={{ color }}>
        {value}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
      </p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

interface SolarWindPanelProps {
  flareEvents: FlareEvent[];
}

export function SolarWindPanel({ flareEvents }: SolarWindPanelProps) {
  const [data,     setData]     = useState<ChartPoint[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setError(false);
    try {
      const [plasma, protons] = await Promise.all([fetchPlasma(), fetchProton()]);
      setData(merge(plasma, protons));
      setLastFetch(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  /* ── Derived current values ── */
  const latest      = data[data.length - 1] ?? null;
  const speed       = latest?.speed   ?? null;
  const density     = latest?.density ?? null;
  const proton10    = latest?.proton10 ?? null;
  const isSepEvent  = (proton10 ?? 0) >= SEP_THRESH;

  /* Speed classification */
  const speedClass = speed == null ? "—"
    : speed > 700 ? "Extreme"
    : speed > 550 ? "Fast"
    : speed > 400 ? "Moderate"
    : "Slow";

  /* ── Flare reference lines ── */
  /* Map each flare to the nearest chart point t for vertical overlay */
  const flareLines = flareEvents.map(evt => {
    const evtMs = new Date(evt.start_time).getTime();
    /* Find closest data point */
    let closest = data[0];
    let minDiff = Infinity;
    data.forEach(d => {
      const diff = Math.abs(d.t - evtMs);
      if (diff < minDiff) { minDiff = diff; closest = d; }
    });
    return { ...evt, chartT: closest?.t ?? evtMs };
  });

  /* ── Y-axis domains ── */
  const speeds   = data.map(d => d.speed).filter(Boolean) as number[];
  const sDomain: [number, number] = speeds.length
    ? [Math.max(0, Math.min(...speeds) - 50), Math.max(...speeds) + 50]
    : [300, 800];

  const densities = data.map(d => d.density).filter(Boolean) as number[];
  const dMax      = densities.length ? Math.max(...densities) * 1.3 : 30;

  /* SEP event spans */
  const sepSpans: Array<{ x1: number; x2: number }> = [];
  let inSep = false;
  let spanStart = 0;
  data.forEach((d, i) => {
    const isSep = (d.proton10 ?? 0) >= SEP_THRESH;
    if (isSep && !inSep) { inSep = true; spanStart = d.t; }
    if (!isSep && inSep) { inSep = false; sepSpans.push({ x1: spanStart, x2: data[i - 1]?.t ?? d.t }); }
  });
  if (inSep && data.length) sepSpans.push({ x1: spanStart, x2: data[data.length - 1].t });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card border border-border rounded overflow-hidden"
      style={{ boxShadow: "0 0 40px rgba(0,212,255,0.04)" }}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-[#00D4FF]" />
          <h3 className="font-display font-semibold text-sm">Solar Wind &amp; Particle Flux</h3>
          <span className="text-muted-foreground text-xs font-mono">— NOAA DSCOVR / GOES-18</span>
        </div>

        {isSepEvent && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-500 rounded px-2 py-0.5"
          >
            <AlertTriangle className="w-3 h-3 text-purple-400" />
            <span className="text-[11px] font-mono font-bold text-purple-300">SEP EVENT ACTIVE</span>
          </motion.div>
        )}

        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          {error ? (
            <span className="flex items-center gap-1 text-red-400"><WifiOff className="w-3 h-3" /> Offline</span>
          ) : lastFetch ? (
            <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-green-500" /> {lastFetch.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          ) : null}
          <span className="uppercase tracking-widest">24h</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 p-3 border-b border-border flex-wrap">
        <StatCard
          label="Solar Wind Speed"
          value={speed != null ? speed.toFixed(0) : "—"}
          unit="km/s"
          color="#00D4FF"
          sub={speedClass}
        />
        <StatCard
          label="Proton Density"
          value={density != null ? density.toFixed(1) : "—"}
          unit="p/cm³"
          color="#F5A623"
          sub={density != null ? (density > 10 ? "Elevated" : "Nominal") : ""}
        />
        <StatCard
          label="≥10 MeV Proton Flux"
          value={proton10 != null ? proton10.toFixed(2) : "—"}
          unit="pfu"
          color={isSepEvent ? "#9333EA" : "#6B8FA8"}
          sub={isSepEvent ? "⚠ SEP EVENT" : proton10 != null ? `Thresh: ${SEP_THRESH} pfu` : ""}
        />
        <StatCard
          label="Flares Correlated"
          value={String(flareEvents.length)}
          unit="detected"
          color="#F5A623"
          sub={flareEvents.map(e => e.goes_class).join(" · ") || "None"}
        />
      </div>

      {/* Chart */}
      <div className="p-3 pt-2">
        {loading && (
          <div className="flex items-center justify-center h-52 text-muted-foreground font-mono text-xs gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
            Fetching DSCOVR real-time data…
          </div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center h-52 text-muted-foreground font-mono text-xs gap-2">
            <WifiOff className="w-4 h-4 text-red-400" />
            NOAA API unavailable — check network
          </div>
        )}
        {!loading && !error && (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.0}  />
                  </linearGradient>
                  <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F5A623" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#F5A623" stopOpacity={0.0}  />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,46,69,0.8)" vertical={false} />

                <XAxis
                  dataKey="label"
                  tick={{ fill: "#4A6480", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={{ stroke: "#1A2E45" }}
                  interval={Math.floor(data.length / 6)}
                />

                {/* Left: speed */}
                <YAxis
                  yAxisId="speed"
                  domain={sDomain}
                  tick={{ fill: "#00D4FF", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={false} width={42}
                  tickFormatter={v => `${v}`}
                />

                {/* Right: density */}
                <YAxis
                  yAxisId="density"
                  orientation="right"
                  domain={[0, dMax]}
                  tick={{ fill: "#F5A623", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={false} width={40}
                  tickFormatter={v => v.toFixed(0)}
                />

                <Tooltip content={<SWTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: "#6B8FA8" }}>{value}</span>}
                />

                {/* SEP event spans */}
                {sepSpans.map((sp, i) => (
                  <ReferenceLine
                    key={`sep-${i}`}
                    x={fmtLabel(sp.x1)}
                    yAxisId="speed"
                    stroke="#9333EA"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    label={{ value: "SEP", fill: "#9333EA", fontSize: 9, fontFamily: "monospace" }}
                  />
                ))}

                {/* Flare event markers */}
                {flareLines.map((fl) => (
                  <ReferenceLine
                    key={fl.id}
                    x={fmtLabel(fl.chartT)}
                    yAxisId="speed"
                    stroke={cls(fl.goes_class)}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    label={{ value: fl.goes_class, fill: cls(fl.goes_class), fontSize: 9, fontFamily: "monospace", position: "insideTopRight" }}
                  />
                ))}

                <Area
                  yAxisId="speed"
                  type="monotone"
                  dataKey="speed"
                  name="Wind Speed (km/s)"
                  stroke="#00D4FF"
                  strokeWidth={1.5}
                  fill="url(#speedGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#00D4FF" }}
                  connectNulls
                />
                <Area
                  yAxisId="density"
                  type="monotone"
                  dataKey="density"
                  name="Density (p/cm³)"
                  stroke="#F5A623"
                  strokeWidth={1.2}
                  fill="url(#densityGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#F5A623" }}
                  connectNulls
                />
                <Line
                  yAxisId="speed"
                  type="monotone"
                  dataKey="proton10"
                  name="≥10 MeV Flux (pfu)"
                  stroke="#9333EA"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: "#9333EA" }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Correlation legend */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-muted-foreground/70 border-t border-border/50 pt-2">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-[#00D4FF]" /> Solar wind speed (km/s)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-[#F5A623]" /> Proton density (p/cm³)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-[#9333EA]" /> ≥10 MeV integral flux (pfu)
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#F5A623]" /> Dashed = SoLEXS flare detection time
              </span>
              <span className="ml-auto">Source: NOAA SWPC · Real-time · Refreshes every 5 min</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

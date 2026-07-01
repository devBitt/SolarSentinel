import { Navbar } from "@/components/layout/Navbar";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DualFluxChart } from "@/components/dashboard/DualFluxChart";
import { ForecastGauge } from "@/components/dashboard/ForecastGauge";
import { FeaturesStrip } from "@/components/dashboard/FeaturesStrip";
import { MissionContextPanel } from "@/components/dashboard/MissionContextPanel";
import { GOESReferenceCard } from "@/components/dashboard/GOESReferenceCard";
import { ReplayControls } from "@/components/dashboard/ReplayControls";
import { SolarGlobePanel } from "@/components/dashboard/SolarGlobe";
import { SolarWindPanel } from "@/components/dashboard/SolarWindPanel";
import { useGetDataStream, useGetForecast, useGetLatestFeatures, getGetDataStreamQueryKey, useGetFlareEvents } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { formatSI } from "@/utils/formatFlux";
import { getGoesColor } from "@/utils/goesClass";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, FlaskConical, RefreshCw, CheckCircle } from "lucide-react";

/* ── GOES-18 live data type ─────────────────────────────────────────────── */
interface GoesLivePayload {
  source: string;
  satellite: number;
  bands: { soft: string; hard: string };
  data: any[];
  events: any[];
  forecast: { probability_15min: number; predicted_class: string; timestamp: string };
  features: any;
  last_updated: string;
}

export default function Dashboard() {
  const queryClient = useQueryClient();

  /* ── Demo mode data ──────────────────────────────────────────────────── */
  const { data: streamData } = useGetDataStream({
    query: { refetchInterval: 2000, queryKey: getGetDataStreamQueryKey() }
  });
  useEffect(() => {
    if (streamData) queryClient.invalidateQueries({ queryKey: ["/api/data/full"] });
  }, [streamData, queryClient]);

  const { data: forecast } = useGetForecast({
    query: { refetchInterval: 5000, queryKey: ["/api/forecast"] }
  });
  const { data: features } = useGetLatestFeatures({
    query: { refetchInterval: 3000, queryKey: ["/api/features/latest"] }
  });
  const { data: eventsData } = useGetFlareEvents({
    query: { refetchInterval: 5000, queryKey: ["/api/events"] }
  });

  /* ── GOES-18 live mode ───────────────────────────────────────────────── */
  const [goesMode, setGoesMode] = useState(() => {
    return localStorage.getItem("solar_sentinel_source_mode") === "live";
  });
  const [goesData, setGoesData] = useState<GoesLivePayload | null>(null);
  const [goesLoading, setGoesLoading] = useState(false);
  const [goesError, setGoesError] = useState(false);
  const [goesLastFetch, setGoesLastFetch] = useState<Date | null>(null);
  const [goesCountdown, setGoesCountdown] = useState(90);

  const fetchGoes = useCallback(async () => {
    setGoesLoading(true);
    setGoesError(false);
    try {
      const res = await fetch("/api/data/goes-live");
      if (!res.ok) throw new Error("Non-200");
      const payload: GoesLivePayload = await res.json();
      setGoesData(payload);
      setGoesLastFetch(new Date());
    } catch {
      setGoesError(true);
    } finally {
      setGoesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!goesMode) return;
    fetchGoes();
    const id = setInterval(fetchGoes, 90_000);
    return () => clearInterval(id);
  }, [goesMode, fetchGoes]);

  /* ── Countdown ticker ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!goesMode || !goesLastFetch) return;
    setGoesCountdown(90);
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - goesLastFetch.getTime()) / 1000);
      setGoesCountdown(Math.max(0, 90 - elapsed));
    }, 1000);
    return () => clearInterval(tick);
  }, [goesMode, goesLastFetch]);

  /* ── Active data: GOES or demo ───────────────────────────────────────── */
  const activeEvents = goesMode && goesData ? goesData.events : (eventsData?.events ?? []);
  const activeForecast = goesMode && goesData ? goesData.forecast : forecast;
  const activeFeatures = goesMode && goesData ? goesData.features : features;

  // ✅ FIX (live-mode "Recent Detections" panel):
  // Previously this just took the first 5 events from `activeEvents` in
  // whatever order the API returned them — for GOES-18 live data this is
  // NOT guaranteed to be most-recent-first, since the NOAA feed returns
  // chronological (oldest-first) order. That's why a single stale-looking
  // "C9.5 / 56%" event kept appearing at the top across different real-time
  // screenshots: it was the OLDEST event in the live window, not the most
  // recent. We now explicitly sort by peak_time descending before slicing.
  const sortedEvents = [...activeEvents].sort(
    (a: any, b: any) => new Date(b.peak_time).getTime() - new Date(a.peak_time).getTime()
  );
  const recentEvents = sortedEvents.slice(0, 5);

  /* GOES data window range */
  const goesWindow = goesMode && goesData?.data?.length
    ? { start: goesData.data[0].timestamp, end: goesData.data[goesData.data.length - 1].timestamp }
    : null;

  return (
    <div className="min-h-screen bg-[#02050e] text-[#e2e8f0] pt-16 relative overflow-hidden scanline-overlay">
      <Navbar />

      <AlertBanner
        probability={activeForecast?.probability_15min ?? null}
        predictedClass={activeForecast?.predicted_class ?? null}
        timestamp={activeForecast?.timestamp ? new Date(activeForecast.timestamp).toLocaleTimeString() : null}
      />

      <main className="max-w-[1600px] mx-auto p-6 relative z-20">

        {/* ── Data source toggle ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6 p-2 rounded border border-[#00D4FF]/20 bg-[#050B1A]/60 backdrop-blur-sm shadow-[0_0_15px_rgba(0,212,255,0.02)]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#00D4FF]/70 pl-2">
            [SRC.SELECT] X-RAY FEED:
          </span>

          {/* Demo button */}
          <button
            onClick={() => {
              setGoesMode(false);
              localStorage.setItem("solar_sentinel_source_mode", "demo");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: !goesMode ? "rgba(245,166,35,0.15)" : "transparent",
              borderColor: !goesMode ? "#F5A623" : "rgba(26,46,69,0.8)",
              color: !goesMode ? "#F5A623" : "#6B8FA8",
            }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            DEMO (Synthetic)
          </button>

          {/* GOES-18 live button */}
          <button
            onClick={() => {
              setGoesMode(true);
              localStorage.setItem("solar_sentinel_source_mode", "live");
            }}
            disabled={goesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all duration-200 disabled:opacity-60 cursor-pointer"
            style={{
              backgroundColor: goesMode ? "rgba(0,212,255,0.12)" : "transparent",
              borderColor: goesMode ? "#00D4FF" : "rgba(26,46,69,0.8)",
              color: goesMode ? "#00D4FF" : "#6B8FA8",
            }}
          >
            <Satellite className="w-3.5 h-3.5" />
            GOES-18 LIVE (Real)
            {goesMode && goesLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {goesMode && !goesLoading && goesData && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
          </button>

          {/* Live mode info strip */}
          <AnimatePresence>
            {goesMode && goesData && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground ml-auto pr-2"
              >
                <span className="text-green-400 font-bold glow-text-green">✓ GOES-{goesData.satellite} DIRECT</span>
                <span>·</span>
                <span>Soft: {goesData.bands.soft}</span>
                <span>·</span>
                <span>Hard: {goesData.bands.hard}</span>
                {goesLastFetch && (
                  <>
                    <span>·</span>
                    <span>Updated {goesLastFetch.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span className={goesCountdown < 15 ? "text-amber-400 font-bold" : "text-muted-foreground"}>
                        {goesCountdown > 0 ? `refresh in ${goesCountdown}s` : "refreshing…"}
                      </span>
                      {goesCountdown > 0 && (
                        <span className="inline-block w-10 h-1 bg-[#1a2e45] rounded overflow-hidden">
                          <span
                            className="block h-full bg-[#00D4FF] transition-all duration-1000"
                            style={{ width: `${(goesCountdown / 90) * 100}%` }}
                          />
                        </span>
                      )}
                    </span>
                  </>
                )}
              </motion.div>
            )}
            {goesMode && goesError && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-mono text-red-400 ml-auto pr-2">
                ⚠ NOAA FEED UNAVAILABLE
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          <div className="md:col-span-3 flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <MissionContextPanel />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GOESReferenceCard />
            </motion.div>
          </div>

          <div className="md:col-span-6 flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <DualFluxChart
                overrideData={goesMode && goesData ? goesData.data : undefined}
                sourceLabel={goesMode ? "GOES-18" : undefined}
              />
            </motion.div>
            {!goesMode && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <ReplayControls />
              </motion.div>
            )}
            {goesMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="border border-[#00D4FF]/30 rounded px-4 py-2.5 flex items-center gap-3 text-xs font-mono bg-[#050B1A]/70 shadow-[0_0_15px_rgba(0,212,255,0.05)]"
              >
                <Satellite className="w-4 h-4 text-[#00D4FF] flex-shrink-0" />
                <span className="text-muted-foreground">
                  Real GOES-18 X-ray flux · 0.1–0.8 nm (soft) ≈ SoLEXS · 0.05–0.4 nm (hard) ≈ HEL1OS ·
                  {goesWindow && (
                    <>
                      Data window: <span className="text-foreground font-bold">{format(parseISO(goesWindow.start), "MMM d")} – {format(parseISO(goesWindow.end), "MMM d")} (UTC)</span> ·
                    </>
                  )}
                  Refreshes every 90 s · All times shown in your local timezone
                </span>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="cyber-card cyber-corner overflow-hidden">
                <div className="p-3 border-b border-[#00D4FF]/20 flex items-center justify-between bg-[#00D4FF]/5">
                  <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-[#00D4FF] glow-text-cyan flex items-center gap-1.5">
                    <span className="opacity-50 font-mono">[DET.03]</span> Recent Detections
                  </h3>
                  {goesMode && (
                    <span className="text-[10px] font-mono text-[#00D4FF] flex items-center gap-1 px-1.5 py-0.5 border border-[#00D4FF]/30 rounded bg-[#00D4FF]/10">
                      <Satellite className="w-3 h-3 animate-pulse" /> GOES-18 REAL-TIME
                    </span>
                  )}
                </div>
                {recentEvents.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#00D4FF]/5 border-b border-[#00D4FF]/10 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                        <th className="px-3 py-2">Peak Time</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Peak Soft</th>
                        <th className="px-3 py-2">Conf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((evt: any, i: number) => (
                        <tr key={evt.id} className={`${i % 2 === 0 ? "bg-[#050b1a]/40" : "bg-[#081020]/40"} border-b border-[#00D4FF]/10 text-xs font-mono hover:bg-[#00D4FF]/10 transition-colors`}>
                          <td className="px-3 py-2 text-foreground font-medium">{format(parseISO(evt.peak_time), "MMM d, HH:mm")}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded text-[10px] text-black font-bold" style={{ backgroundColor: getGoesColor(evt.goes_class) }}>
                              {evt.goes_class}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-secondary font-bold">{formatSI(evt.peak_solexs_flux)}</td>
                          <td className="px-3 py-2 font-bold text-[#00D4FF]">{(evt.detection_confidence * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                    {goesMode ? "No flares detected in real GOES-18 data (last 24h)." : "No recent events detected."}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="md:col-span-3 flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ForecastGauge
                probability={activeForecast?.probability_15min ?? 0}
                predictedClass={activeForecast?.predicted_class ?? "—"}
              />
            </motion.div>
            <FeaturesStrip features={activeFeatures} />
          </div>

        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
          <SolarGlobePanel events={activeEvents} sourceLabel={goesMode ? "GOES-18 LIVE" : "DEMO"} />
        </motion.div>

        <div className="mt-6">
          <SolarWindPanel flareEvents={activeEvents} />
        </div>
      </main>
    </div>
  );
}
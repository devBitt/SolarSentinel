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
  const [goesMode, setGoesMode]           = useState(false);
  const [goesData, setGoesData]           = useState<GoesLivePayload | null>(null);
  const [goesLoading, setGoesLoading]     = useState(false);
  const [goesError, setGoesError]         = useState(false);
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
  const activeEvents   = goesMode && goesData ? goesData.events   : (eventsData?.events ?? []);
  const activeForecast = goesMode && goesData ? goesData.forecast  : forecast;
  const activeFeatures = goesMode && goesData ? goesData.features  : features;

  const recentEvents = activeEvents.slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />

      <AlertBanner
        probability={activeForecast?.probability_15min ?? null}
        predictedClass={activeForecast?.predicted_class ?? null}
        timestamp={activeForecast?.timestamp ? new Date(activeForecast.timestamp).toLocaleTimeString() : null}
      />

      <main className="max-w-[1600px] mx-auto p-6">

        {/* ── Data source toggle ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">X-Ray Source:</span>

          {/* Demo button */}
          <button
            onClick={() => setGoesMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all duration-200"
            style={{
              backgroundColor: !goesMode ? "rgba(245,166,35,0.15)" : "transparent",
              borderColor:     !goesMode ? "#F5A623" : "rgba(26,46,69,0.8)",
              color:           !goesMode ? "#F5A623" : "#6B8FA8",
            }}
          >
            <FlaskConical className="w-3 h-3" />
            DEMO (Synthetic)
          </button>

          {/* GOES-18 live button */}
          <button
            onClick={() => setGoesMode(true)}
            disabled={goesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all duration-200 disabled:opacity-60"
            style={{
              backgroundColor: goesMode ? "rgba(0,212,255,0.12)" : "transparent",
              borderColor:     goesMode ? "#00D4FF" : "rgba(26,46,69,0.8)",
              color:           goesMode ? "#00D4FF" : "#6B8FA8",
            }}
          >
            <Satellite className="w-3 h-3" />
            GOES-18 LIVE (Real)
            {goesMode && goesLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
            {goesMode && !goesLoading && goesData && <CheckCircle className="w-3 h-3 text-green-400" />}
          </button>

          {/* Live mode info strip */}
          <AnimatePresence>
            {goesMode && goesData && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground"
              >
                <span className="text-green-400">✓ Real NOAA GOES-{goesData.satellite} data</span>
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
                      <span className={goesCountdown < 15 ? "text-amber-400" : "text-muted-foreground"}>
                        {goesCountdown > 0 ? `next refresh in ${goesCountdown}s` : "refreshing…"}
                      </span>
                      {goesCountdown > 0 && (
                        <span className="inline-block w-10 h-0.5 bg-border rounded overflow-hidden">
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
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-mono text-red-400">
                ⚠ NOAA fetch failed — check network
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
                className="bg-card border border-[#00D4FF]/30 rounded px-4 py-2.5 flex items-center gap-3 text-xs font-mono"
              >
                <Satellite className="w-4 h-4 text-[#00D4FF] flex-shrink-0" />
                <span className="text-muted-foreground">
                  Showing real GOES-18 X-ray flux · 0.1–0.8 nm (soft) ≈ SoLEXS · 0.05–0.4 nm (hard) ≈ HEL1OS ·
                  Same wavelength bands as Aditya-L1 instruments · Refreshes every 90 s
                </span>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-card border border-border shadow-[0_0_20px_rgba(0,212,255,0.02)] rounded overflow-hidden">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-semibold text-sm">Recent Detections</h3>
                  {goesMode && (
                    <span className="text-[10px] font-mono text-[#00D4FF] flex items-center gap-1">
                      <Satellite className="w-3 h-3" /> GOES-18 Real
                    </span>
                  )}
                </div>
                {recentEvents.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted text-muted-foreground font-mono text-[10px] uppercase">
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Peak Soft</th>
                        <th className="px-3 py-2">Conf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((evt: any, i: number) => (
                        <tr key={evt.id} className={`${i % 2 === 0 ? "bg-[#0D1B2A]" : "bg-[#101F30]"} border-b border-border/50 text-sm font-mono`}>
                          <td className="px-3 py-2">{format(parseISO(evt.start_time), "HH:mm")}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] text-black font-bold" style={{ backgroundColor: getGoesColor(evt.goes_class) }}>
                              {evt.goes_class}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-secondary">{formatSI(evt.peak_solexs_flux)}</td>
                          <td className="px-3 py-2">{(evt.detection_confidence * 100).toFixed(0)}%</td>
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

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useGetFlareEvents } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { formatSI } from "@/utils/formatFlux";
import { getGoesColor } from "@/utils/goesClass";
import { Download, ChevronDown, ChevronRight, BarChart2, Satellite, FlaskConical, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

/* ── Class distribution summary ─────────────────────────────────────── */
const CLASS_META = [
  { letter: "X", color: "#9333EA", threshold: 1e-4 },
  { letter: "M", color: "#EF4444", threshold: 1e-5 },
  { letter: "C", color: "#F59E0B", threshold: 1e-6 },
  { letter: "B", color: "#22C55E", threshold:    0 },
];

function ClassDistribution({ events }: { events: any[] }) {
  const dist = useMemo(() => {
    const counts: Record<string, number> = { X: 0, M: 0, C: 0, B: 0 };
    events.forEach(e => {
      const letter = (e.goes_class?.[0] ?? "B").toUpperCase();
      if (letter in counts) counts[letter]++;
    });
    return CLASS_META.map(m => ({ name: m.letter, value: counts[m.letter], color: m.color }));
  }, [events]);

  const total = events.length;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-4 mb-5 bg-card border border-border rounded px-5 py-3">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest shrink-0">Class Distribution</span>
      <div className="flex gap-3 flex-1">
        {dist.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-black"
              style={{ backgroundColor: d.color }}>{d.name}</span>
            <span className="font-mono text-sm text-foreground">{d.value}</span>
            <span className="font-mono text-[10px] text-muted-foreground">({total > 0 ? Math.round(d.value / total * 100) : 0}%)</span>
          </div>
        ))}
      </div>
      <div className="flex h-2 rounded overflow-hidden w-32 shrink-0">
        {dist.filter(d => d.value > 0).map(d => (
          <div key={d.name} style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }} />
        ))}
      </div>
      <span className="font-mono text-xs text-muted-foreground shrink-0">{total} total</span>
    </div>
  );
}

/* ── NOAA archive event type ─────────────────────────────────────── */
interface NoaaEvent {
  id: string;
  start_time: string;
  peak_time: string;
  end_time: string;
  goes_class: string;
  peak_solexs_flux: number | null;
  peak_hel1os_flux: number | null;
  duration_minutes: number | null;
  noaa_active_region: number | null;
  source: string;
}

type Tab = "detected" | "noaa";

export default function Events() {
  const { data, isLoading } = useGetFlareEvents();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("detected");
  const [noaaEvents, setNoaaEvents] = useState<NoaaEvent[]>([]);
  const [noaaLoading, setNoaaLoading] = useState(false);
  const [noaaError, setNoaaError] = useState(false);
  const [noaaFetched, setNoaaFetched] = useState(false);

  const events = data?.events || [];

  /* ── Fetch NOAA archive on tab switch ─────────────────────────── */
  useEffect(() => {
    if (tab !== "noaa" || noaaFetched) return;
    setNoaaLoading(true);
    setNoaaError(false);
    fetch("/api/events/noaa-archive")
      .then(r => r.json())
      .then(d => {
        setNoaaEvents(d.events ?? []);
        setNoaaFetched(true);
      })
      .catch(() => setNoaaError(true))
      .finally(() => setNoaaLoading(false));
  }, [tab, noaaFetched]);

  const handleExport = () => {
    const source = tab === "detected" ? events : noaaEvents;
    const headers = ["ID", "Start", "Peak", "End", "Class", "Peak Soft (W/m²)", "Duration (min)", "Source"];
    const csvContent = [
      headers.join(","),
      ...source.map((e: any) => [
        e.id, e.start_time, e.peak_time, e.end_time,
        e.goes_class, e.peak_solexs_flux ?? "",
        e.duration_minutes ?? "", e.source ?? "SolarSentinel"
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `flares_${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const TabButton = ({ id, label, icon: Icon, count }: { id: Tab; label: string; icon: any; count?: number }) => (
    <button
      onClick={() => setTab(id)}
      className="flex items-center gap-2 px-4 py-2 rounded text-sm font-mono transition-all duration-150"
      style={{
        backgroundColor: tab === id ? (id === "noaa" ? "rgba(0,212,255,0.12)" : "rgba(245,166,35,0.12)") : "transparent",
        color: tab === id ? (id === "noaa" ? "#00D4FF" : "#F5A623") : "#6B8FA8",
        border: `1px solid ${tab === id ? (id === "noaa" ? "#00D4FF" : "#F5A623") : "transparent"}`,
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && (
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/30">{count}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />

      <main className="max-w-[1200px] mx-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Event Log</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">Flare detection catalog</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2 border-border">
            <Download className="w-4 h-4" />
            <span className="font-mono text-sm">Export CSV</span>
          </Button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <TabButton id="detected" label="Detected (Algorithm)" icon={FlaskConical} count={events.length} />
          <TabButton id="noaa" label="NOAA SWPC Archive (Real)" icon={Satellite} count={noaaFetched ? noaaEvents.length : undefined} />
          {tab === "noaa" && (
            <span className="ml-auto text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Source: services.swpc.noaa.gov · 7-day window · GOES Primary satellite
            </span>
          )}
        </div>

        {/* ── Detected tab ─────────────────────────────────────────── */}
        {tab === "detected" && (
          <>
          <ClassDistribution events={events} />
          <div className="bg-card border border-border shadow-[0_0_20px_rgba(0,212,255,0.05)] rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium"></th>
                    <th className="p-4 font-medium">Timestamp</th>
                    <th className="p-4 font-medium">Peak Soft Flux</th>
                    <th className="p-4 font-medium">Peak Hard Flux</th>
                    <th className="p-4 font-medium">Class</th>
                    <th className="p-4 font-medium">Duration</th>
                    <th className="p-4 font-medium">Confidence</th>
                    <th className="p-4 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground font-mono">Loading…</td></tr>
                  ) : events.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground font-mono">No flare events detected yet.</td></tr>
                  ) : events.map((event: any, i: number) => {
                    const isExpanded = expandedId === event.id;
                    const color = getGoesColor(event.goes_class);
                    const rowClass = i % 2 === 0 ? "bg-[#0D1B2A]" : "bg-[#101F30]";
                    const contribData = event.feature_contributions ? [
                      { name: "Flux Deriv", value: event.feature_contributions.flux_derivative || 0 },
                      { name: "Ratio", value: event.feature_contributions.flux_ratio || 0 },
                      { name: "Hardness", value: event.feature_contributions.spectral_hardness || 0 },
                      { name: "Variance", value: event.feature_contributions.rolling_variance || 0 },
                    ] : [];
                    return (
                      <React.Fragment key={event.id}>
                        <tr className={`${rowClass} border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer`}
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}>
                          <td className="p-4 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="p-4 font-mono text-sm whitespace-nowrap">{format(parseISO(event.start_time), "yyyy-MM-dd HH:mm")}</td>
                          <td className="p-4 font-mono text-sm text-secondary">{formatSI(event.peak_solexs_flux)}</td>
                          <td className="p-4 font-mono text-sm text-primary">{formatSI(event.peak_hel1os_flux)}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest text-black" style={{ backgroundColor: color }}>
                              {event.goes_class}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-sm">{event.duration_minutes}m</td>
                          <td className="p-4 font-mono text-sm">{(event.detection_confidence * 100).toFixed(1)}%</td>
                          <td className="p-4 font-mono text-sm text-muted-foreground">{event.detection_method}</td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-black/40 border-b border-border">
                            <td colSpan={8} className="p-6">
                              <div className="flex gap-8 items-start">
                                <div className="flex-1">
                                  <h4 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-primary" /> Feature Contributions
                                  </h4>
                                  {contribData.length > 0 ? (
                                    <div className="h-48 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={contribData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                                          <XAxis type="number" hide />
                                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                                            tick={{ fill: "#6B8FA8", fontSize: 12, fontFamily: "JetBrains Mono" }} />
                                          <RechartsTooltip cursor={{ fill: "transparent" }}
                                            contentStyle={{ backgroundColor: "#0D1B2A", borderColor: "#1A2E45", borderRadius: "4px", fontFamily: "JetBrains Mono", fontSize: "12px" }} />
                                          <Bar dataKey="value" fill="#00D4FF" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : <p className="text-muted-foreground font-mono text-sm py-4">No contribution data.</p>}
                                </div>
                                <div className="w-64 bg-card border border-border p-4 rounded">
                                  <h4 className="font-display font-semibold text-sm mb-2">Event Details</h4>
                                  <div className="space-y-2 text-sm font-mono">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Start:</span><span>{format(parseISO(event.start_time), "HH:mm:ss")}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Peak:</span><span>{format(parseISO(event.peak_time), "HH:mm:ss")}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">End:</span><span>{format(parseISO(event.end_time), "HH:mm:ss")}</span></div>
                                    {event.forecast_probability_at_onset !== null && (
                                      <div className="flex justify-between mt-4 pt-2 border-t border-border">
                                        <span className="text-muted-foreground">Forecast Prob:</span>
                                        <span className="text-primary">{(event.forecast_probability_at_onset * 100).toFixed(1)}%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {/* ── NOAA Archive tab ──────────────────────────────────────── */}
        {tab === "noaa" && (
          <AnimatePresence mode="wait">
            <motion.div key="noaa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {noaaLoading ? (
                <div className="bg-card border border-border rounded p-12 flex flex-col items-center gap-3 text-muted-foreground font-mono text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  Fetching NOAA SWPC flare archive…
                </div>
              ) : noaaError ? (
                <div className="bg-card border border-red-800/40 rounded p-8 text-center font-mono text-sm text-red-400">
                  Failed to reach NOAA SWPC API. Check your network connection.
                </div>
              ) : (
                <div className="bg-card border border-[#00D4FF]/20 shadow-[0_0_20px_rgba(0,212,255,0.05)] rounded overflow-hidden">
                  <div className="px-4 py-3 bg-[#00D4FF]/5 border-b border-[#00D4FF]/20 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Satellite className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-[#00D4FF] font-semibold">Real verified flares</span>
                    <span>from NOAA GOES Primary satellite · Last 7 days ·</span>
                    <span className="text-foreground">{noaaEvents.length} events</span>
                    <span className="ml-auto">
                      <button onClick={() => setNoaaFetched(false)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </span>
                  </div>
                  {noaaEvents.length === 0 ? (
                    <div className="p-12 text-center font-mono text-sm text-muted-foreground">
                      No flares detected by NOAA in the last 7 days. The Sun is quiet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-muted border-b border-border text-muted-foreground font-mono text-xs uppercase tracking-wider">
                            <th className="p-4 font-medium">Start (UTC)</th>
                            <th className="p-4 font-medium">Peak (UTC)</th>
                            <th className="p-4 font-medium">End (UTC)</th>
                            <th className="p-4 font-medium">Class</th>
                            <th className="p-4 font-medium">Peak Soft (W/m²)</th>
                            <th className="p-4 font-medium">Duration</th>
                            <th className="p-4 font-medium">Active Region</th>
                          </tr>
                        </thead>
                        <tbody>
                          {noaaEvents.map((evt, i) => (
                            <tr key={evt.id} className={`${i % 2 === 0 ? "bg-[#0D1B2A]" : "bg-[#101F30]"} border-b border-border/50 font-mono text-sm`}>
                              <td className="p-4 whitespace-nowrap">{format(parseISO(evt.start_time), "MM-dd HH:mm")}</td>
                              <td className="p-4 whitespace-nowrap">{format(parseISO(evt.peak_time), "HH:mm:ss")}</td>
                              <td className="p-4 whitespace-nowrap">{format(parseISO(evt.end_time), "HH:mm:ss")}</td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-widest text-black" style={{ backgroundColor: getGoesColor(evt.goes_class) }}>
                                  {evt.goes_class}
                                </span>
                              </td>
                              <td className="p-4 text-secondary">{evt.peak_solexs_flux != null ? formatSI(evt.peak_solexs_flux) : "—"}</td>
                              <td className="p-4">{evt.duration_minutes != null ? `${evt.duration_minutes}m` : "—"}</td>
                              <td className="p-4 text-muted-foreground">{evt.noaa_active_region ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

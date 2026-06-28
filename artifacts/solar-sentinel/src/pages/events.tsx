import { Navbar } from "@/components/layout/Navbar";
import { useGetFlareEvents } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { formatSI } from "@/utils/formatFlux";
import { getGoesColor } from "@/utils/goesClass";
import { Download, ChevronDown, ChevronRight, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function Events() {
  const { data, isLoading } = useGetFlareEvents();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const events = data?.events || [];

  const handleExport = () => {
    const headers = ["Timestamp", "Peak Soft Flux", "Peak Hard Flux", "Class", "Duration(m)", "Confidence"];
    const csvContent = [
      headers.join(","),
      ...events.map(e => [
        e.start_time,
        e.peak_solexs_flux,
        e.peak_hel1os_flux,
        e.goes_class,
        e.duration_minutes,
        e.detection_confidence
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flares.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />
      
      <main className="max-w-[1200px] mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Event Log</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">Confirmed detection catalog</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2 border-border">
            <Download className="w-4 h-4" />
            <span className="font-mono text-sm">Export CSV</span>
          </Button>
        </div>

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
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground font-mono">
                      Loading event log...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground font-mono">
                      No flare events detected yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event, i) => {
                    const isExpanded = expandedId === event.id;
                    const color = getGoesColor(event.goes_class);
                    const rowClass = i % 2 === 0 ? "bg-[#0D1B2A]" : "bg-[#101F30]";
                    
                    const contribData = event.feature_contributions ? [
                      { name: 'Flux Deriv', value: event.feature_contributions.flux_derivative || 0 },
                      { name: 'Ratio', value: event.feature_contributions.flux_ratio || 0 },
                      { name: 'Hardness', value: event.feature_contributions.spectral_hardness || 0 },
                      { name: 'Variance', value: event.feature_contributions.rolling_variance || 0 },
                    ] : [];

                    return (
                      <React.Fragment key={event.id}>
                        <tr className={`${rowClass} border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer group`} onClick={() => setExpandedId(isExpanded ? null : event.id)}>
                          <td className="p-4 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="p-4 font-mono text-sm whitespace-nowrap">
                            {format(parseISO(event.start_time), "yyyy-MM-dd HH:mm")}
                          </td>
                          <td className="p-4 font-mono text-sm text-secondary">
                            {formatSI(event.peak_solexs_flux)}
                          </td>
                          <td className="p-4 font-mono text-sm text-primary">
                            {formatSI(event.peak_hel1os_flux)}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest text-black bg-white" style={{ backgroundColor: color }}>
                              {event.goes_class}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-sm">
                            {event.duration_minutes}m
                          </td>
                          <td className="p-4 font-mono text-sm">
                            {(event.detection_confidence * 100).toFixed(1)}%
                          </td>
                          <td className="p-4 font-mono text-sm text-muted-foreground">
                            {event.detection_method}
                          </td>
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
                                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6B8FA8', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                                          <RechartsTooltip 
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ backgroundColor: '#0D1B2A', borderColor: '#1A2E45', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                                          />
                                          <Bar dataKey="value" fill="#00D4FF" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground font-mono text-sm py-4">No contribution data available.</div>
                                  )}
                                </div>
                                <div className="w-64 bg-card border border-border p-4 rounded">
                                  <h4 className="font-display font-semibold text-sm mb-2">Event Details</h4>
                                  <div className="space-y-2 text-sm font-mono">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Start:</span> <span>{format(parseISO(event.start_time), "HH:mm:ss")}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Peak:</span> <span>{format(parseISO(event.peak_time), "HH:mm:ss")}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">End:</span> <span>{format(parseISO(event.end_time), "HH:mm:ss")}</span></div>
                                    {event.forecast_probability_at_onset !== null && (
                                      <div className="flex justify-between mt-4 pt-2 border-t border-border"><span className="text-muted-foreground">Forecast Prob:</span> <span className="text-primary">{(event.forecast_probability_at_onset * 100).toFixed(1)}%</span></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// Ensure React is imported for React.Fragment
import React from 'react';

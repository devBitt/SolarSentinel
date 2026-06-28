import { Navbar } from "@/components/layout/Navbar";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DualFluxChart } from "@/components/dashboard/DualFluxChart";
import { ForecastGauge } from "@/components/dashboard/ForecastGauge";
import { FeaturesStrip } from "@/components/dashboard/FeaturesStrip";
import { MissionContextPanel } from "@/components/dashboard/MissionContextPanel";
import { GOESReferenceCard } from "@/components/dashboard/GOESReferenceCard";
import { ReplayControls } from "@/components/dashboard/ReplayControls";
import { SolarGlobePanel } from "@/components/dashboard/SolarGlobe";
import { useGetDataStream, useGetForecast, useGetLatestFeatures, getGetDataStreamQueryKey, useGetFlareEvents } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { formatSI } from "@/utils/formatFlux";
import { getGoesColor } from "@/utils/goesClass";
import { motion } from "framer-motion";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const { data: streamData } = useGetDataStream({ 
    query: { 
      refetchInterval: 2000, 
      queryKey: getGetDataStreamQueryKey() 
    } 
  });
  
  useEffect(() => {
    if (streamData) {
      queryClient.invalidateQueries({ queryKey: ["/api/data/full"] });
    }
  }, [streamData, queryClient]);

  const { data: forecast } = useGetForecast({
    query: {
      refetchInterval: 5000,
      queryKey: ["/api/forecast"]
    }
  });

  const { data: features } = useGetLatestFeatures({
    query: {
      refetchInterval: 3000,
      queryKey: ["/api/features/latest"]
    }
  });

  const { data: eventsData } = useGetFlareEvents({
    query: {
      refetchInterval: 5000,
      queryKey: ["/api/events"]
    }
  });

  const recentEvents = eventsData?.events?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />
      
      <AlertBanner 
        probability={forecast?.probability_15min ?? null} 
        predictedClass={forecast?.predicted_class ?? null} 
        timestamp={forecast?.timestamp ? new Date(forecast.timestamp).toLocaleTimeString() : null} 
      />

      <main className="max-w-[1600px] mx-auto p-6">
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
              <DualFluxChart />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ReplayControls />
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-card border border-border shadow-[0_0_20px_rgba(0,212,255,0.02)] rounded overflow-hidden">
                <div className="p-3 border-b border-border">
                  <h3 className="font-display font-semibold text-sm">Recent Detections</h3>
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
                      {recentEvents.map((evt, i) => (
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
                    No recent events detected.
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="md:col-span-3 flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ForecastGauge 
                probability={forecast?.probability_15min ?? 0} 
                predictedClass={forecast?.predicted_class ?? '—'} 
              />
            </motion.div>
            <FeaturesStrip features={features} />
          </div>

        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
          <SolarGlobePanel events={eventsData?.events ?? []} />
        </motion.div>
      </main>
    </div>
  );
}

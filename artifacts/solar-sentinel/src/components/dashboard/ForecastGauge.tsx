import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { getAlertLevel } from "@/utils/goesClass";

interface ForecastGaugeProps {
  probability: number;
  predictedClass: string;
}

export function ForecastGauge({ probability, predictedClass }: ForecastGaugeProps) {
  const percent = Math.round(probability * 100);
  const alert = getAlertLevel(probability);
  
  // Angle from -90 to 90
  const angle = -90 + (probability * 180);

  return (
    <Card className="p-6 flex flex-col items-center justify-center border-border shadow-[0_0_20px_rgba(0,212,255,0.05)] bg-card relative overflow-hidden">
      <h3 className="font-display text-lg text-foreground font-semibold mb-6 absolute top-4 left-6">Flare Forecast</h3>
      
      <div className="relative w-48 h-24 mt-8">
        {/* Gauge Arc Background */}
        <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            className="opacity-40"
          />
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${probability * 283} 283`}
          />
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 w-1 h-20 origin-bottom rounded-full"
          style={{ backgroundColor: alert.color, marginLeft: '-2px' }}
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          <div className="w-3 h-3 rounded-full absolute -bottom-1 -left-1" style={{ backgroundColor: alert.color }} />
        </motion.div>
      </div>

      <div className="mt-4 text-center">
        <div className="text-5xl font-display font-bold tracking-tighter" style={{ color: alert.color }}>
          {percent}%
        </div>
        <div className="text-muted-foreground font-mono text-sm mt-1 uppercase tracking-wider">
          Probability (15m)
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between w-full">
        <div className="px-3 py-1.5 rounded-full bg-black/40 border border-white/5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">CLASS</span>
          <span className="font-display font-bold text-lg" style={{ color: alert.color }}>{predictedClass || '—'}</span>
        </div>
        <div className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wider ${alert.bgClass} ${alert.borderClass}`} style={{ color: alert.color }}>
          {alert.level}
        </div>
      </div>
    </Card>
  );
}

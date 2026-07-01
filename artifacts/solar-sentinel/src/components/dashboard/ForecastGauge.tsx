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
  const isHighRisk = probability >= 0.5;
  
  // Angle from -90 to 90
  const angle = -90 + (probability * 180);

  return (
    <div className={`p-6 flex flex-col items-center justify-center relative overflow-hidden h-[340px] ${
      isHighRisk ? 'cyber-card-orange cyber-corner' : 'cyber-card cyber-corner'
    }`}>
      <h3 className={`font-display text-xs uppercase tracking-wider font-semibold absolute top-4 left-6 flex items-center gap-1.5 ${
        isHighRisk ? 'text-[#F5A623] glow-text-orange' : 'text-[#00D4FF] glow-text-cyan'
      }`}>
        <span className="opacity-50 font-mono">[FCT.02]</span> Flare Forecast
      </h3>
      
      <div className="relative w-48 h-24 mt-12">
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
            className="opacity-20"
          />
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${probability * 283} 283`}
            className="filter drop-shadow-[0_0_8px_rgba(245,166,35,0.4)]"
          />
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 w-1 h-20 origin-bottom rounded-full"
          style={{ backgroundColor: alert.color, marginLeft: '-2px', boxShadow: `0 0 12px ${alert.color}` }}
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          <div className="w-3.5 h-3.5 rounded-full absolute -bottom-1.5 -left-1.5 border border-black/40 shadow-lg" style={{ backgroundColor: alert.color }} />
        </motion.div>
      </div>

      <div className="mt-4 text-center">
        <div className={`text-5xl font-display font-bold tracking-tighter ${
          isHighRisk ? 'glow-text-orange' : 'glow-text-cyan'
        }`} style={{ color: alert.color }}>
          {percent}%
        </div>
        <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mt-1">
          Probability (15m window)
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between w-full">
        <div className="px-3 py-1 rounded border border-[#00D4FF]/25 bg-[#00D4FF]/5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">CLASS</span>
          <span className="font-display font-bold text-base text-[#00D4FF] glow-text-cyan">{predictedClass || '—'}</span>
        </div>
        <div className={`px-3 py-1 rounded border text-[10px] font-mono font-bold tracking-widest uppercase ${alert.bgClass} ${alert.borderClass}`} style={{ color: alert.color }}>
          {alert.level}
        </div>
      </div>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getAlertLevel } from "@/utils/goesClass";

interface AlertBannerProps {
  probability: number | null;
  predictedClass: string | null;
  timestamp: string | null;
}

export function AlertBanner({ probability, predictedClass, timestamp }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state if probability jumps up significantly
  useEffect(() => {
    if (probability && probability >= 0.5) {
      setDismissed(false);
    }
  }, [probability]);

  if (probability === null || probability < 0.5 || dismissed) {
    return null;
  }

  const alert = getAlertLevel(probability);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className={`fixed top-16 left-0 right-0 z-40 border-b p-3 flex items-center justify-between shadow-lg backdrop-blur-md ${alert.bgClass} ${alert.borderClass}`}
      >
        <div className="flex items-center gap-4 px-4">
          <div className="relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: alert.color }}></span>
            <AlertTriangle className="h-6 w-6 relative z-10" style={{ color: alert.color }} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-lg tracking-wide" style={{ color: alert.color }}>
                {alert.level} ALERT
              </span>
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white">
                {predictedClass} CLASS
              </span>
              <span className="font-mono text-sm text-white/70">
                {(probability * 100).toFixed(1)}% PROBABILITY
              </span>
            </div>
            {timestamp && (
              <span className="font-mono text-xs text-white/50">
                Forecast generated at {timestamp}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4"
        >
          <X className="h-5 w-5 text-white/70" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

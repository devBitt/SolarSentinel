import { Card } from "@/components/ui/card";
import { formatSI } from "@/utils/formatFlux";
import { motion } from "framer-motion";

interface FeaturesStripProps {
  features: any | null;
}

export function FeaturesStrip({ features }: FeaturesStripProps) {
  const cards = [
    { label: "Soft X-Ray", value: formatSI(features?.solexs_flux), delay: 0 },
    { label: "Hard X-Ray", value: formatSI(features?.hel1os_flux), delay: 0.1 },
    { label: "Flux Ratio", value: features?.flux_ratio ? features.flux_ratio.toFixed(2) : '—', delay: 0.2 },
    { label: "Spectral Hardness", value: features?.spectral_hardness ? features.spectral_hardness.toFixed(4) : '—', delay: 0.3 },
    { label: "dSoft/dt", value: features?.solexs_deriv ? formatSI(features.solexs_deriv) : '—', delay: 0.4 },
    { label: "Rolling Var", value: features?.rolling_var ? formatSI(features.rolling_var) : '—', delay: 0.5 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: card.delay }}
        >
          <Card className="p-4 border-border shadow-[0_0_20px_rgba(0,212,255,0.02)] bg-card/50 hover:bg-card transition-colors flex flex-col justify-center">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
              {card.label}
            </span>
            <span className="text-lg font-mono font-bold text-foreground">
              {card.value}
            </span>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

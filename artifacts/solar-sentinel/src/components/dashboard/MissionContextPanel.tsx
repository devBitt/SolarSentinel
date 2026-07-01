import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Info } from "lucide-react";

export function MissionContextPanel() {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-refresh the image every 10 minutes by appending a timestamp
  const [timestamp, setTimestamp] = useState(Date.now());
  
  // A real implementation would use setInterval to update timestamp
  
  return (
    <div className="cyber-card cyber-corner overflow-hidden mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#00D4FF]/5 transition-colors border-b border-[#00D4FF]/15">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-secondary filter drop-shadow-[0_0_4px_rgba(245,166,35,0.4)]" />
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-[#00D4FF] glow-text-cyan flex items-center gap-1.5">
                <span className="opacity-50 font-mono">[SYS.02]</span> Mission Context
              </h3>
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4 text-[#00D4FF]" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-4 bg-[#050b1a]/40">
            <div className="rounded overflow-hidden border border-[#00D4FF]/30 bg-black relative group shadow-[0_0_15px_rgba(0,212,255,0.08)]">
              <img 
                src={`https://sdo.gsfc.nasa.gov/assets/img/latest/latest_256_0193.jpg?t=${timestamp}`} 
                alt="SDO AIA 193" 
                className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-[#00D4FF]/80 border border-[#00D4FF]/25 backdrop-blur-sm">
                SDO AIA 193Å
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-baseline border-b border-[#00D4FF]/10 pb-1">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">SoLEXS Range</span>
                <span className="text-xs font-mono font-semibold text-secondary glow-text-orange">1-30 keV</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-[#00D4FF]/10 pb-1">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">HEL1OS Range</span>
                <span className="text-xs font-mono font-semibold text-[#00D4FF] glow-text-cyan">10-150 keV</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-[#00D4FF]/10 pb-1">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Cadence</span>
                <span className="text-xs font-mono font-semibold text-foreground">1s</span>
              </div>
            </div>
            
            <div className="bg-[#00D4FF]/5 p-3 rounded border border-[#00D4FF]/20 shadow-[inset_0_0_8px_rgba(0,212,255,0.03)]">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong className="text-secondary font-bold uppercase tracking-wider font-mono block mb-1">[NOAA SWPC FORECAST]</strong>
                Solar activity is expected to be low with a slight chance for M-class flares over the next 3 days. Active Region 3590 remains the primary threat.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

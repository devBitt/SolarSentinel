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
    <Card className="border-border shadow-[0_0_20px_rgba(0,212,255,0.05)] bg-card overflow-hidden mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-secondary" />
              <h3 className="font-display font-semibold text-sm">Mission Context</h3>
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            <div className="rounded overflow-hidden border border-border bg-black relative group">
              <img 
                src={`https://sdo.gsfc.nasa.gov/assets/img/latest/latest_256_0193.jpg?t=${timestamp}`} 
                alt="SDO AIA 193" 
                className="w-full h-auto"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground backdrop-blur-sm">
                SDO AIA 193Å
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-baseline border-b border-border/50 pb-1">
                <span className="text-xs text-muted-foreground font-mono">SoLEXS Range</span>
                <span className="text-xs font-mono text-secondary">1-30 keV</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-border/50 pb-1">
                <span className="text-xs text-muted-foreground font-mono">HEL1OS Range</span>
                <span className="text-xs font-mono text-primary">10-150 keV</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-border/50 pb-1">
                <span className="text-xs text-muted-foreground font-mono">Cadence</span>
                <span className="text-xs font-mono">1s</span>
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">NOAA Forecast:</strong> Solar activity is expected to be low with a slight chance for M-class flares over the next 3 days. Active Region 3590 remains the primary threat.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

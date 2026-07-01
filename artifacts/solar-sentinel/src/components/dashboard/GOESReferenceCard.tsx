import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";

export function GOESReferenceCard() {
  const [isOpen, setIsOpen] = useState(true);

  const classes = [
    { label: "X-Class", flux: "≥ 10⁻⁴", color: "#9333EA", desc: "Extreme. Planet-wide radio blackouts." },
    { label: "M-Class", flux: "10⁻⁵ - 10⁻⁴", color: "#EF4444", desc: "Major. Brief radio blackouts at poles." },
    { label: "C-Class", flux: "10⁻⁶ - 10⁻⁵", color: "#F59E0B", desc: "Minor. Few noticeable consequences." },
    { label: "B-Class", flux: "10⁻⁷ - 10⁻⁶", color: "#6B8FA8", desc: "Background. No visible effects." },
  ];

  return (
    <div className="cyber-card cyber-corner overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#00D4FF]/5 transition-colors border-b border-[#00D4FF]/15">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-secondary filter drop-shadow-[0_0_4px_rgba(245,166,35,0.4)]" />
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-[#00D4FF] glow-text-cyan flex items-center gap-1.5">
                <span className="opacity-50 font-mono">[REF.01]</span> GOES Classification
              </h3>
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4 text-[#00D4FF]" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-3 bg-[#050b1a]/40">
            {classes.map((c) => (
              <div key={c.label} className="flex flex-col gap-1 border-l-2 pl-3 py-1 bg-[#050b1a]/50 rounded-r" style={{ borderLeftColor: c.color }}>
                <div className="flex justify-between items-baseline">
                  <span className="font-display font-bold text-xs uppercase tracking-wider" style={{ color: c.color }}>{c.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.flux} <span className="text-[8px] uppercase">W/m²</span></span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">{c.desc}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

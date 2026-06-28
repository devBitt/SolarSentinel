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
    <Card className="border-border shadow-[0_0_20px_rgba(0,212,255,0.05)] bg-card overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-secondary" />
              <h3 className="font-display font-semibold text-sm">GOES Classification</h3>
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-3">
            {classes.map((c) => (
              <div key={c.label} className="flex flex-col gap-1 border-l-2 pl-3 py-1" style={{ borderLeftColor: c.color }}>
                <div className="flex justify-between items-baseline">
                  <span className="font-display font-bold text-sm" style={{ color: c.color }}>{c.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.flux} <span className="text-[10px]">W/m²</span></span>
                </div>
                <span className="text-xs text-muted-foreground leading-tight">{c.desc}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

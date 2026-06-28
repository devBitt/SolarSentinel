import { useState } from "react";
import { Play, FastForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResetReplay } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function ReplayControls() {
  const [speed, setSpeed] = useState(1);
  const resetMutation = useResetReplay();
  const { toast } = useToast();

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Replay Reset", description: "Stream restarted from beginning." });
        setSpeed(1);
      }
    });
  };

  const speeds = [1, 5, 10, 50];

  return (
    <div className="flex items-center justify-between p-3 bg-muted border border-border rounded shadow-[0_0_20px_rgba(0,212,255,0.02)]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider mr-2">Replay Speed</span>
        <div className="flex bg-card rounded border border-border overflow-hidden">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1 text-xs font-mono font-medium transition-colors ${
                speed === s 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleReset}
        disabled={resetMutation.isPending}
        className="gap-2 border-border text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="font-mono text-xs">Reset</span>
      </Button>
    </div>
  );
}

import { Navbar } from "@/components/layout/Navbar";
import { useGetModelMetrics } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";

export default function Model() {
  const { data: metrics, isLoading } = useGetModelMetrics();

  const renderProgress = (val: number, colorClass: string) => (
    <div className="h-2 w-full bg-black/50 rounded overflow-hidden">
      <div className={`h-full ${colorClass}`} style={{ width: `${val * 100}%` }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />
      
      <main className="max-w-[1000px] mx-auto p-6 pt-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-primary">Model Architecture</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2">Pipeline overview and validation metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="p-6 border-border shadow-[0_0_20px_rgba(0,212,255,0.05)] bg-card">
            <h3 className="font-display font-semibold text-lg mb-6 text-secondary border-b border-border pb-2">Detection Pipeline</h3>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">1</div>
                <div><span className="font-bold text-foreground">Raw Data</span> <span className="text-muted-foreground text-xs">SoLEXS & HEL1OS 1s cadence</span></div>
              </div>
              <div className="pl-4 border-l-2 border-border ml-4 h-4"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">2</div>
                <div><span className="font-bold text-foreground">Feature Extraction</span> <span className="text-muted-foreground text-xs">Derivatives, ratios, running var</span></div>
              </div>
              <div className="pl-4 border-l-2 border-border ml-4 h-4"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center border border-primary/50">3</div>
                <div><span className="font-bold text-foreground">Anomaly Detection</span> <span className="text-muted-foreground text-xs">Isolation Forest (n_estimators=100)</span></div>
              </div>
              <div className="pl-4 border-l-2 border-border ml-4 h-4"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-secondary/20 text-secondary flex items-center justify-center border border-secondary/50">4</div>
                <div><span className="font-bold text-foreground">ARIMA Forecast</span> <span className="text-muted-foreground text-xs">15-minute predictive horizon</span></div>
              </div>
              <div className="pl-4 border-l-2 border-border ml-4 h-4"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">5</div>
                <div><span className="font-bold text-foreground">Classification</span> <span className="text-muted-foreground text-xs">GOES proxy mapping</span></div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border shadow-[0_0_20px_rgba(245,166,35,0.05)] bg-card">
            <h3 className="font-display font-semibold text-lg mb-6 text-primary border-b border-border pb-2">Performance Metrics</h3>
            {isLoading ? (
              <div className="text-muted-foreground font-mono text-sm py-4">Loading metrics...</div>
            ) : metrics ? (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between font-mono text-sm mb-2">
                    <span>True Skill Statistic (TSS)</span>
                    <span className="text-primary font-bold">{metrics.tss.toFixed(3)}</span>
                  </div>
                  {renderProgress(metrics.tss, "bg-primary")}
                </div>
                <div>
                  <div className="flex justify-between font-mono text-sm mb-2">
                    <span>Probability of Detection (POD)</span>
                    <span className="text-secondary font-bold">{metrics.pod.toFixed(3)}</span>
                  </div>
                  {renderProgress(metrics.pod, "bg-secondary")}
                </div>
                <div>
                  <div className="flex justify-between font-mono text-sm mb-2">
                    <span>False Alarm Ratio (FAR)</span>
                    <span className="text-destructive font-bold">{metrics.far.toFixed(3)}</span>
                  </div>
                  {renderProgress(metrics.far, "bg-destructive")}
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border mt-6">
                  <div className="text-center bg-black/40 p-3 rounded">
                    <div className="text-xs font-mono text-muted-foreground uppercase">Precision</div>
                    <div className="font-mono text-lg">{metrics.precision.toFixed(2)}</div>
                  </div>
                  <div className="text-center bg-black/40 p-3 rounded">
                    <div className="text-xs font-mono text-muted-foreground uppercase">Recall</div>
                    <div className="font-mono text-lg">{metrics.recall.toFixed(2)}</div>
                  </div>
                  <div className="text-center bg-black/40 p-3 rounded">
                    <div className="text-xs font-mono text-muted-foreground uppercase">F1 Score</div>
                    <div className="font-mono text-lg">{metrics.f1_score.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="text-xs font-mono text-muted-foreground text-center pt-2">
                  v{metrics.model_version} • n={metrics.total_flares_tested} events • {metrics.test_period}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
        
        <div className="bg-muted p-4 rounded text-sm text-muted-foreground border border-border">
          <strong className="text-foreground">References:</strong> This pipeline uses methodologies described in the Aditya-L1 Science objectives, utilizing combined SoLEXS and HEL1OS observations to proxy GOES soft X-ray classifications.
        </div>
      </main>
    </div>
  );
}

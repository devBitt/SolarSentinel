import { useGetDataFull, getGetDataFullQueryKey } from "@workspace/api-client-react";
import { useMemo } from "react";
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatSI } from "@/utils/formatFlux";
import { format, parseISO } from "date-fns";

interface FluxPoint {
  timestamp: string;
  solexs_flux: number;
  hel1os_flux: number;
  [key: string]: unknown;
}

interface DualFluxChartProps {
  overrideData?: FluxPoint[];
  sourceLabel?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#050B1A]/90 border border-[#00D4FF]/30 p-3 rounded shadow-[0_0_15px_rgba(0,212,255,0.2)] backdrop-blur-md font-mono text-xs">
      <p className="text-[#00D4FF]/60 mb-2 border-b border-[#00D4FF]/20 pb-1">TIME: {label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-bold" style={{ color: entry.color }}>{formatSI(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function DualFluxChart({ overrideData, sourceLabel }: DualFluxChartProps) {
  const { data: fullData } = useGetDataFull({ query: { enabled: !overrideData, queryKey: getGetDataFullQueryKey() } });

  const chartData = useMemo(() => {
    const source = overrideData ?? fullData?.data ?? [];
    return source.map((d: FluxPoint) => ({
      ...d,
      time: format(parseISO(d.timestamp), "HH:mm"),
      rawTime: new Date(d.timestamp).getTime(),
    })).slice(-200);
  }, [overrideData, fullData]);

  const softLabel = sourceLabel ? `${sourceLabel} Long (≈ SoLEXS)` : "SoLEXS (Soft)";
  const hardLabel = sourceLabel ? `${sourceLabel} Short (≈ HEL1OS)` : "HEL1OS (Hard)";

  return (
    <div className="cyber-card cyber-corner p-4 w-full h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-xs uppercase tracking-wider text-[#00D4FF] glow-text-cyan font-semibold flex items-center gap-1.5">
          <span className="opacity-50 font-mono">[TLM.01]</span> Live X-Ray Flux
        </h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#00D4FF] rounded shadow-[0_0_8px_#00D4FF]" />
            <span className="text-[10px] font-mono text-[#00D4FF]/80 uppercase tracking-wider">{softLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#F5A623] rounded shadow-[0_0_8px_#F5A623]" />
            <span className="text-[10px] font-mono text-[#F5A623]/80 uppercase tracking-wider">{hardLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.08)" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#6B8FA8" 
              fontSize={10} 
              tickMargin={10}
              minTickGap={30}
              fontFamily="JetBrains Mono"
            />
            <YAxis 
              yAxisId="soft"
              scale="log"
              domain={['auto', 'auto']}
              stroke="#00D4FF" 
              fontSize={10}
              tickFormatter={(v) => formatSI(v)}
              fontFamily="JetBrains Mono"
              orientation="left"
            />
            <YAxis 
              yAxisId="hard"
              scale="log"
              domain={['auto', 'auto']}
              stroke="#F5A623" 
              fontSize={10}
              tickFormatter={(v) => formatSI(v)}
              fontFamily="JetBrains Mono"
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine y={1e-4} yAxisId="soft" stroke="#9333EA" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'X-Class', fill: '#9333EA', fontSize: 10, fontFamily: 'Space Grotesk' }} />
            <ReferenceLine y={1e-5} yAxisId="soft" stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'M-Class', fill: '#EF4444', fontSize: 10, fontFamily: 'Space Grotesk' }} />
            <ReferenceLine y={1e-6} yAxisId="soft" stroke="#F59E0B" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'C-Class', fill: '#F59E0B', fontSize: 10, fontFamily: 'Space Grotesk' }} />
            
            <Line 
              yAxisId="soft"
              type="monotone" 
              dataKey="solexs_flux" 
              name="SoLEXS"
              stroke="#00D4FF" 
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line 
              yAxisId="hard"
              type="monotone" 
              dataKey="hel1os_flux" 
              name="HEL1OS"
              stroke="#F5A623" 
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useGetDataFull, useGetDataStream } from "@workspace/api-client-react";
import { useEffect, useState, useMemo } from "react";
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

export function DualFluxChart() {
  const { data: fullData } = useGetDataFull();
  const [streamData, setStreamData] = useState<any[]>([]);

  // We rely on full data initially, and in a real setup we'd append stream data.
  // For the mockup, we will just display the stream data or full data as it comes.
  
  const chartData = useMemo(() => {
    if (fullData?.data) {
      return fullData.data.map(d => ({
        ...d,
        time: format(parseISO(d.timestamp), "HH:mm"),
        rawTime: new Date(d.timestamp).getTime()
      })).slice(-200); // show last 200 points for performance
    }
    return [];
  }, [fullData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded shadow-xl">
          <p className="text-muted-foreground font-mono text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 font-mono text-sm">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-foreground">{entry.name}:</span>
              <span className="text-foreground font-bold">{formatSI(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 w-full h-[400px] border-border shadow-[0_0_20px_rgba(0,212,255,0.05)] bg-card flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-lg text-foreground font-semibold">Live X-Ray Flux</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-secondary rounded" />
            <span className="text-xs font-mono text-muted-foreground">SoLEXS (Soft)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-primary rounded" />
            <span className="text-xs font-mono text-muted-foreground">HEL1OS (Hard)</span>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2E45" vertical={false} />
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
            
            {/* GOES Reference Lines */}
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
    </Card>
  );
}

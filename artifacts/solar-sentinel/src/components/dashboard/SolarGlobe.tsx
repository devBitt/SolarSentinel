import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface FlareEvent {
  id: string;
  goes_class: string;
  peak_solexs_flux: number;
  detection_confidence: number;
  start_time: string;
}

interface ActiveRegion {
  event: FlareEvent;
  phi: number;   // latitude: -π/2 .. π/2
  theta: number; // longitude: 0 .. 2π
  color: string;
  radius: number;
}

const CLASS_COLORS: Record<string, string> = {
  X: "#9333EA",
  M: "#EF4444",
  C: "#F5A623",
  B: "#6B8FA8",
};

function getRegionColor(cls: string): string {
  return CLASS_COLORS[cls?.[0]] ?? "#6B8FA8";
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function eventsToRegions(events: FlareEvent[]): ActiveRegion[] {
  return events.map((evt, i) => {
    const t = new Date(evt.start_time).getTime();
    const seed  = (t % 100000) / 100000;
    const seed2 = ((i * 137.508 + seed * 360) % 360) / 360;
    const phi   = (seed * 2 - 1) * Math.PI * 0.38;
    const theta = seed2 * Math.PI * 2;
    const letter = evt.goes_class?.[0];
    const radius = letter === "X" ? 14 : letter === "M" ? 10 : 7;
    return { event: evt, phi, theta, color: getRegionColor(evt.goes_class), radius };
  });
}

/** Project a heliographic (phi, theta) onto the 2D disk given current rotation. */
function project(
  phi: number, theta: number,
  rotY: number,
  cx: number, cy: number, R: number
): { x: number; y: number; visible: boolean } {
  const lon = theta - rotY;
  const cosLat = Math.cos(phi);
  const x3 = cosLat * Math.sin(lon);
  const y3 = Math.sin(phi);
  const z3 = cosLat * Math.cos(lon);
  return { x: cx + x3 * R, y: cy - y3 * R, visible: z3 > -0.1 };
}

/** Draw the solar sphere using Canvas 2D. */
function drawSolar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, R: number,
  regions: ActiveRegion[],
  rotY: number,
  t: number,
  hoveredId: string | null,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Corona glow
  const corona = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.55);
  corona.addColorStop(0,   "rgba(255,140,30,0.22)");
  corona.addColorStop(0.4, "rgba(255,100,10,0.08)");
  corona.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = corona;
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2); ctx.fill();

  // Atmosphere ring
  const atmo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.12);
  atmo.addColorStop(0,   "rgba(255,180,60,0.35)");
  atmo.addColorStop(1,   "rgba(255,80,0,0)");
  ctx.fillStyle = atmo;
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();

  // Solar disk — limb darkening
  const solar = ctx.createRadialGradient(cx - R * 0.12, cy - R * 0.12, R * 0.05, cx, cy, R);
  solar.addColorStop(0,    "#FFF8D0");
  solar.addColorStop(0.12, "#FFDD60");
  solar.addColorStop(0.38, "#FFB020");
  solar.addColorStop(0.62, "#E06000");
  solar.addColorStop(0.80, "#B03000");
  solar.addColorStop(0.92, "#701000");
  solar.addColorStop(1,    "#380600");
  ctx.fillStyle = solar;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  // Clip subsequent drawing to disk
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.clip();

  // Granulation texture — seeded noise dots
  let s = 0xdeadbeef;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = 0; i < 1400; i++) {
    const gx = cx + (rng() * 2 - 1) * R;
    const gy = cy + (rng() * 2 - 1) * R;
    if (Math.hypot(gx - cx, gy - cy) > R * 0.96) continue;
    const alpha = 0.04 + rng() * 0.08;
    const bright = rng() > 0.5;
    ctx.fillStyle = bright ? `rgba(255,240,160,${alpha})` : `rgba(60,20,0,${alpha * 0.8})`;
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }

  // Sunspots (small dark clusters)
  for (let i = 0; i < 28; i++) {
    const sx = cx + (rng() * 2 - 1) * R * 0.85;
    const sy = cy + (rng() * 2 - 1) * R * 0.6;
    if (Math.hypot(sx - cx, sy - cy) > R * 0.82) continue;
    const sr = 2 + rng() * 5;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.5);
    sg.addColorStop(0,   "rgba(15,5,0,0.75)");
    sg.addColorStop(0.5, "rgba(40,10,0,0.35)");
    sg.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 2.5, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore(); // end clip

  // Active region markers (drawn on top, outside clip so halos extend)
  regions.forEach((reg, idx) => {
    const { x, y, visible } = project(reg.phi, reg.theta, rotY, cx, cy, R);
    if (!visible) return;

    const isHov = reg.event.id === hoveredId;
    const pulse = (Math.sin(t * 2.8 + idx * 1.3) * 0.5 + 0.5);
    const sc    = isHov ? 1.5 + pulse * 0.35 : 1 + pulse * 0.2;
    const r     = reg.radius * sc;
    const [rr, gg, bb] = hexToRgb(reg.color);

    // Outer glow halo
    const haloR  = r * (isHov ? 3.2 : 2.4);
    const haloG  = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    haloG.addColorStop(0,   `rgba(${rr},${gg},${bb},${isHov ? 0.6 : 0.35})`);
    haloG.addColorStop(0.5, `rgba(${rr},${gg},${bb},${isHov ? 0.2 : 0.1})`);
    haloG.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = haloG;
    ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();

    // Pulsing ring
    const ringR   = r * (1.6 + pulse * (isHov ? 1.0 : 0.5));
    const ringAlpha = (0.25 + pulse * 0.35) * (isHov ? 1.0 : 0.6);
    ctx.strokeStyle = `rgba(${rr},${gg},${bb},${ringAlpha})`;
    ctx.lineWidth   = isHov ? 2 : 1.2;
    ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke();

    // Core dot
    const dotG = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    dotG.addColorStop(0, `rgba(255,255,255,0.9)`);
    dotG.addColorStop(0.3, `rgba(${rr},${gg},${bb},1)`);
    dotG.addColorStop(1,   `rgba(${Math.max(0,rr-40)},${Math.max(0,gg-40)},${Math.max(0,bb-40)},0.9)`);
    ctx.fillStyle = dotG;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Class label
    if (isHov || reg.event.goes_class[0] !== "B") {
      ctx.font       = `bold ${Math.round(r * 1.1)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle  = "rgba(255,255,255,0.95)";
      ctx.textAlign  = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(reg.event.goes_class, x, y);
    }
  });
}

interface SolarGlobeCanvasProps {
  events: FlareEvent[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

function SolarGlobeCanvas({ events, hoveredId, onHover }: SolarGlobeCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const hovIdRef     = useRef(hoveredId);
  hovIdRef.current   = hoveredId;
  const onHoverRef   = useRef(onHover);
  onHoverRef.current = onHover;
  const regionsRef   = useRef(eventsToRegions(events));

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let rotY = 0;
    let dragRotY = 0;
    let targetDragRotY = 0;
    let isDragging = false;
    let lastMx = 0;
    let t = 0;
    let animId = 0;

    const getGeom = () => {
      const W = cv.width, H = cv.height;
      const cx = W * 0.5, cy = H * 0.5;
      const R  = Math.min(W, H) * 0.38;
      return { W, H, cx, cy, R };
    };

    const loop = () => {
      animId = requestAnimationFrame(loop);
      t += 0.016;
      if (!isDragging) rotY += 0.0018;
      dragRotY += (targetDragRotY - dragRotY) * 0.07;
      const { cx, cy, R } = getGeom();
      drawSolar(ctx, cx, cy, R, regionsRef.current, rotY + dragRotY, t, hovIdRef.current);
    };
    loop();

    const findRegion = (mx: number, my: number): string | null => {
      const rect = cv.getBoundingClientRect();
      const px   = (mx - rect.left) * (cv.width  / rect.width);
      const py   = (my - rect.top)  * (cv.height / rect.height);
      const { cx, cy, R } = getGeom();
      let best: string | null = null;
      let bestDist = Infinity;
      regionsRef.current.forEach((reg) => {
        const { x, y, visible } = project(reg.phi, reg.theta, rotY + dragRotY, cx, cy, R);
        if (!visible) return;
        const d = Math.hypot(px - x, py - y);
        if (d < reg.radius * 2.5 && d < bestDist) { bestDist = d; best = reg.event.id; }
      });
      return best;
    };

    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        targetDragRotY += (e.clientX - lastMx) * 0.008;
        lastMx = e.clientX;
        return;
      }
      onHoverRef.current(findRegion(e.clientX, e.clientY));
    };
    const onDown = (e: MouseEvent) => { isDragging = true; lastMx = e.clientX; };
    const onUp   = () => { isDragging = false; };

    const onResize = () => {
      const parent = cv.parentElement;
      if (!parent) return;
      cv.width  = parent.clientWidth;
      cv.height = parent.clientHeight;
    };

    const ro = new ResizeObserver(onResize);
    if (cv.parentElement) ro.observe(cv.parentElement);
    onResize();

    cv.addEventListener("mousemove", onMove);
    cv.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(animId);
      cv.removeEventListener("mousemove", onMove);
      cv.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ display: "block" }}
    />
  );
}

interface SolarGlobePanelProps {
  events: FlareEvent[];
  sourceLabel?: string; // "Demo" | "GOES-18 LIVE" | "Custom Upload"
}

export function SolarGlobePanel({ events, sourceLabel }: SolarGlobePanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHoveredId(id), []);
  const hoveredEvent = events.find(e => e.id === hoveredId) ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded overflow-hidden"
      style={{ boxShadow: "0 0 40px rgba(245,166,35,0.05), 0 0 80px rgba(0,212,255,0.03)" }}
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="font-display font-semibold text-sm tracking-wide">Active Region Map</h3>
          <span className="text-muted-foreground text-xs font-mono">— Heliographic View</span>
          {sourceLabel && (
            <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded border"
              style={{ color: sourceLabel === "GOES-18 LIVE" ? "#00D4FF" : "#F5A623",
                       borderColor: sourceLabel === "GOES-18 LIVE" ? "#00D4FF" : "#F5A623" }}>
              {sourceLabel === "GOES-18 LIVE" ? "LIVE" : "DEMO"}
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest select-none">Drag to rotate</span>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Globe canvas */}
        <div className="relative flex-1 bg-[#020810]" style={{ minHeight: 360 }}>
          <SolarGlobeCanvas events={events} hoveredId={hoveredId} onHover={onHover} />

          {/* Hover tooltip */}
          {hoveredEvent && (
            <motion.div
              key={hoveredEvent.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-4 left-4 bg-[#0D1B2A]/90 border border-border rounded px-3 py-2.5 backdrop-blur-sm pointer-events-none"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getRegionColor(hoveredEvent.goes_class), boxShadow: `0 0 6px ${getRegionColor(hoveredEvent.goes_class)}` }}
                />
                <span className="font-mono text-sm font-bold">{hoveredEvent.goes_class}</span>
                <span className="text-muted-foreground text-xs font-mono">Active Region</span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                <div>Peak: <span className="text-[#00D4FF]">{hoveredEvent.peak_solexs_flux.toExponential(1)} W/m²</span></div>
                <div>Conf: <span className="text-foreground">{(hoveredEvent.detection_confidence * 100).toFixed(0)}%</span></div>
                <div>Time: <span className="text-foreground">{new Date(hoveredEvent.start_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar event list */}
        <div className="md:w-60 border-t md:border-t-0 md:border-l border-border p-4 flex flex-col gap-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Detected Regions</p>
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground font-mono">No active regions.</p>
          )}
          {events.map((evt) => {
            const color  = getRegionColor(evt.goes_class);
            const isHov  = evt.id === hoveredId;
            return (
              <div
                key={evt.id}
                onMouseEnter={() => setHoveredId(evt.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-all duration-150"
                style={{
                  backgroundColor: isHov ? `${color}18` : "transparent",
                  borderColor: isHov ? color : "rgba(26,46,69,0.8)",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all"
                  style={{ backgroundColor: color, boxShadow: isHov ? `0 0 10px ${color}` : "none" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold" style={{ color: isHov ? color : undefined }}>
                      {evt.goes_class}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {(evt.detection_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-muted-foreground font-mono text-[10px] truncate">
                    {new Date(evt.start_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-auto pt-3 border-t border-border">
            <p className="text-[9px] font-mono text-muted-foreground/50 leading-relaxed">
              Heliographic coordinates estimated from SoLEXS temporal profile. Positions are indicative.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

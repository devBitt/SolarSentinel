import { Link, useLocation } from "wouter";
import { Sun, Activity, Upload, Info, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/events", label: "Event Log", icon: Sun },
    { href: "/upload", label: "Upload Data", icon: Upload },
    { href: "/model", label: "Model Info", icon: Info },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 border-b border-[#00D4FF]/25 bg-[#050B1A]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,212,255,0.05)]">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Sun className="h-6 w-6 text-secondary group-hover:text-primary transition-colors filter drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]" />
          <span className="font-display font-bold text-xl tracking-tight uppercase">
            <span className="text-secondary glow-text-orange">Solar</span>
            <span className="text-foreground ml-1">Sentinel</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 ml-4 px-2 py-0.5 border border-green-500/30 rounded bg-green-500/10 shadow-[0_0_8px_rgba(34,197,94,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold text-green-500 tracking-widest glow-text-green">SYS.LIVE</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 font-mono text-xs uppercase transition-all duration-300 border ${
                location === href 
                  ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-secondary glow-text-cyan font-semibold shadow-[0_0_12px_rgba(0,212,255,0.15)]" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-[#00D4FF]/5 hover:border-[#00D4FF]/20"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  );
}

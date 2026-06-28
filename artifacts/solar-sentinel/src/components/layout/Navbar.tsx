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
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Sun className="h-6 w-6 text-secondary group-hover:text-primary transition-colors" />
          <span className="font-display font-bold text-xl tracking-tight">
            <span className="text-secondary">Solar</span>
            <span className="text-foreground">Sentinel</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 ml-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs font-mono font-medium text-green-500 tracking-wider">LIVE</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${location === href ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  );
}

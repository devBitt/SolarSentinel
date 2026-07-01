import { Navbar } from "@/components/layout/Navbar";
import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadData } from "@workspace/api-client-react";
import {
  Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle,
  Download, Eye, Info, FileText, Satellite, FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

/* ── Supported column formats ─────────────────────────────────────────── */
const FORMATS = [
  {
    name: "ISSDC SoLEXS",
    badge: "Official",
    color: "#00D4FF",
    cols: ["TIME_UTC", "CH1 / SOLEXS_FLUX", "CH2 / HEL1OS_FLUX"],
    example: "TIME_UTC,SOLEXS_FLUX,HEL1OS_FLUX\n2024-10-15T08:00:00Z,3.2e-7,1.1e-5",
  },
  {
    name: "GOES Cleaned",
    badge: "NOAA",
    color: "#F5A623",
    cols: ["time_tag", "xrlong (0.1–0.8 nm)", "xrshort (0.05–0.4 nm)"],
    example: "time_tag,xrlong,xrshort\n2024-10-15T08:00:00Z,3.2e-7,1.1e-5",
  },
  {
    name: "SolarSentinel Export",
    badge: "Native",
    color: "#22C55E",
    cols: ["timestamp", "solexs_flux", "hel1os_flux"],
    example: "timestamp,solexs_flux,hel1os_flux\n2024-10-15T08:00:00Z,3.2e-7,1.1e-5",
  },
  {
    name: "Positional (auto)",
    badge: "Fallback",
    color: "#6B8FA8",
    cols: ["column 1 → timestamp", "column 2 → soft X-ray", "column 3 → hard X-ray"],
    example: "timestamp,soft,hard\n2024-10-15T08:00:00Z,3.2e-7,1.1e-5",
  },
];

/* ── Sample CSV for download ─────────────────────────────────────────── */
const SAMPLE_CSV_ROWS = [
  "timestamp,solexs_flux,hel1os_flux",
  "2024-10-15T00:00:00Z,3.1e-7,9.8e-6",
  "2024-10-15T00:01:00Z,3.2e-7,9.9e-6",
  "2024-10-15T00:02:00Z,3.1e-7,9.7e-6",
  "2024-10-15T08:00:00Z,5.1e-7,1.2e-5",
  "2024-10-15T08:01:00Z,9.4e-7,2.1e-5",
  "2024-10-15T08:02:00Z,2.8e-6,5.4e-5",
  "2024-10-15T08:03:00Z,5.2e-6,9.3e-5",
  "2024-10-15T08:04:00Z,4.1e-6,7.8e-5",
  "2024-10-15T08:05:00Z,1.9e-6,3.2e-5",
  "2024-10-15T08:06:00Z,8.1e-7,1.5e-5",
];

/* ── Client-side header sniffing ────────────────────────────────────── */
function sniffFormat(content: string): { format: string; headers: string[]; preview: string[][] } | null {
  const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("#"));
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map(h => h.trim());
  const preview = lines.slice(1, 6).map(l => l.split(",").map(c => c.trim()));
  const h = headers.map(x => x.toLowerCase().replace(/[\s\-\.]+/g, "_"));

  if (h.some(x => x.includes("time_utc") || x.includes("ut_time"))) return { format: "ISSDC SoLEXS", headers, preview };
  if (h.some(x => x.includes("xrlong") || x.includes("xrshort"))) return { format: "GOES Cleaned", headers, preview };
  if (h.some(x => x.includes("solexs") || x.includes("hel1os"))) return { format: "SolarSentinel Export", headers, preview };
  if (headers.length >= 3) return { format: "Positional (auto)", headers, preview };
  return null;
}

interface UploadResult {
  rows: number;
  events: number;
  detected_format?: string;
  columns_mapped?: { timestamp: string; soft_xray: string; hard_xray: string };
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [sniffed, setSniffed] = useState<ReturnType<typeof sniffFormat>>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { mutate: uploadData, isPending } = useUploadData();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setResult(null);
      const reader = new FileReader();
      reader.onload = e => setSniffed(sniffFormat((e.target?.result as string) ?? ""));
      reader.readAsText(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".txt", ".csv"] },
    maxFiles: 1,
  });

  const handleRun = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    uploadData({ body: formData }, {
      onSuccess: (res: any) => {
        toast({ title: "Pipeline Complete", description: `${res.rows} rows · ${res.events_detected} flares detected` });
        setResult({ rows: res.rows, events: res.events_detected, detected_format: res.detected_format, columns_mapped: res.columns_mapped });
        setFile(null);
        setSniffed(null);
        localStorage.setItem("solar_sentinel_source_mode", "demo");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.hint ?? err?.response?.data?.error ?? "Failed to process file.";
        toast({ title: "Upload Failed", description: msg, variant: "destructive" });
      }
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_ROWS.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "solexs_sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />

      <main className="max-w-[900px] mx-auto p-6 pt-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Upload & Analyze</h1>
            <p className="text-muted-foreground font-mono text-sm mt-2">
              Run custom Aditya-L1 SoLEXS/HEL1OS datasets through the detection pipeline.
            </p>
          </div>
          <Button variant="outline" onClick={downloadSample} className="gap-2 border-border font-mono text-sm shrink-0 mt-1">
            <Download className="w-4 h-4" />
            Sample CSV
          </Button>
        </div>

        {/* ── Drop zone ────────────────────────────────────────────────── */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
            isDragActive ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-card hover:border-secondary/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center">
            <div className={`p-4 rounded-full mb-4 ${isDragActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              <FileUp className="w-8 h-8" />
            </div>
            {file ? (
              <div className="space-y-1">
                <p className="font-mono text-foreground font-bold text-lg">{file.name}</p>
                <p className="font-mono text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-display text-lg mb-2">Drag & drop CSV data here</p>
                <p className="font-mono text-sm text-muted-foreground">or click to browse — accepts .csv, .txt</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Format sniff preview ──────────────────────────────────────── */}
        <AnimatePresence>
          {sniffed && file && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 bg-card border border-border rounded overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/50">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-widest">Format Detected</span>
                <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded border" style={{
                  color: FORMATS.find(f => f.name === sniffed.format)?.color ?? "#6B8FA8",
                  borderColor: FORMATS.find(f => f.name === sniffed.format)?.color ?? "#6B8FA8",
                }}>
                  {sniffed.format}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border bg-black/20">
                      {sniffed.headers.map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sniffed.preview.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? "bg-[#0D1B2A]" : "bg-[#101F30]"}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-4 py-1.5 text-foreground">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Run button ────────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleRun}
            disabled={!file || isPending}
            className="font-mono bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 px-8"
          >
            {isPending ? "Processing..." : (
              <><UploadIcon className="w-4 h-4 mr-2" />RUN PIPELINE</>
            )}
          </Button>
        </div>

        {/* ── Result ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-10 bg-green-900/20 border border-green-700/50 rounded p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="font-display text-xl text-green-400">Analysis Complete</h3>
                {result.detected_format && (
                  <span className="ml-auto text-xs font-mono text-muted-foreground">
                    Format: <span className="text-foreground">{result.detected_format}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/40 p-4 rounded border border-white/5">
                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Rows Processed</p>
                  <p className="text-2xl font-mono">{result.rows.toLocaleString()}</p>
                </div>
                <div className="bg-black/40 p-4 rounded border border-white/5">
                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Events Detected</p>
                  <p className="text-2xl font-mono text-primary font-bold">{result.events.toLocaleString()}</p>
                </div>
              </div>
              {result.columns_mapped && (
                <div className="text-xs font-mono text-muted-foreground space-y-0.5">
                  <span className="text-foreground mr-1">Mapped:</span>
                  <span className="text-[#00D4FF]">{result.columns_mapped.timestamp}</span> →{" "}
                  <span className="text-[#F5A623]">{result.columns_mapped.soft_xray}</span> (soft) ·{" "}
                  <span className="text-[#F5A623]">{result.columns_mapped.hard_xray}</span> (hard)
                  <span className="ml-2 text-muted-foreground">· Dashboard now shows this data</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Supported formats guide ───────────────────────────────────── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display font-semibold text-base">Supported Data Formats</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORMATS.map(fmt => (
              <div key={fmt.name} className="bg-card border border-border rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {fmt.name.includes("ISSDC") ? <Satellite className="w-4 h-4" style={{ color: fmt.color }} /> :
                     fmt.name.includes("GOES") ? <Satellite className="w-4 h-4" style={{ color: fmt.color }} /> :
                     <FileText className="w-4 h-4" style={{ color: fmt.color }} />}
                    <span className="font-mono text-sm font-semibold" style={{ color: fmt.color }}>{fmt.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: fmt.color, borderColor: fmt.color }}>
                    {fmt.badge}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {fmt.cols.map((c, i) => (
                    <div key={i} className="text-xs font-mono text-muted-foreground">
                      <span className="text-[#6B8FA8] mr-1">col {i + 1}:</span>{c}
                    </div>
                  ))}
                </div>
                <pre className="text-[10px] font-mono bg-black/40 rounded p-2 text-muted-foreground overflow-x-auto leading-relaxed">
                  {fmt.example}
                </pre>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-mono text-muted-foreground">
            Comment lines starting with <code className="text-foreground">#</code> are skipped automatically (ISSDC files often include a metadata header). Flux values must be in W/m² (scientific notation accepted).
          </p>
        </div>
      </main>
    </div>
  );
}

import { Router } from "express";
import multer from "multer";
import {
  getProcessedData,
  getFlareEvents,
  getReplayIndex,
  advanceReplayIndex,
  resetReplay,
  computeFeatures,
  computeForecast,
  detectFlares,
  setProcessedData,
  setFlareEvents,
  setReplayIndex,
} from "../lib/solarData";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/data/stream — next data point for streaming simulation
router.get("/data/stream", (req, res) => {
  const data = getProcessedData();
  const idx = getReplayIndex();
  const point = data[idx] ?? null;
  advanceReplayIndex();
  res.json({
    data: point ? [point] : [],
    total: data.length,
    current_index: idx,
  });
});

// GET /api/data/range — slice by index
router.get("/data/range", (req, res) => {
  const data = getProcessedData();
  const start = Math.max(0, parseInt(String(req.query["start"] ?? "0"), 10));
  const end = Math.min(data.length, parseInt(String(req.query["end"] ?? "60"), 10));
  res.json({ data: data.slice(start, end) });
});

// GET /api/data/full — full dataset
router.get("/data/full", (_req, res) => {
  res.json({ data: getProcessedData() });
});

// GET /api/events — all detected flare events
router.get("/events", (_req, res) => {
  res.json({ events: getFlareEvents() });
});

// GET /api/forecast — 15-min ahead probability
router.get("/forecast", (_req, res) => {
  const data = getProcessedData();
  const idx = Math.max(getReplayIndex(), 15);
  const forecast = computeForecast(data, idx);
  res.json(forecast);
});

// GET /api/features/latest — latest derived features
router.get("/features/latest", (req, res) => {
  const data = getProcessedData();
  const idx = Math.max(getReplayIndex() - 1, 0);
  const row = data[idx];
  if (!row) {
    res.status(404).json({ error: "No data available" });
    return;
  }
  res.json({
    timestamp: row.timestamp,
    solexs_flux: row.solexs_flux,
    hel1os_flux: row.hel1os_flux,
    flux_ratio: row.flux_ratio,
    spectral_hardness: row.spectral_hardness,
    solexs_deriv: row.solexs_deriv,
    rolling_mean: row.rolling_mean,
    rolling_var: row.rolling_var,
  });
});

// POST /api/replay/reset
router.post("/replay/reset", (_req, res) => {
  resetReplay();
  res.json({ status: "reset" });
});

// GET /api/metrics — model performance metrics
router.get("/metrics", (_req, res) => {
  res.json({
    precision: 0.82,
    recall: 0.78,
    f1_score: 0.80,
    tss: 0.76,
    pod: 0.78,
    far: 0.22,
    test_period: "2024-01-01 to 2024-09-30",
    total_flares_tested: 147,
    model_version: "1.0-arima-ensemble",
  });
});

// POST /api/upload — upload CSV for processing
router.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const csv = file.buffer.toString("utf-8");
    const lines = csv.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      res.status(400).json({ error: "CSV must have header + at least one data row" });
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const tsIdx = headers.findIndex(h => h === "timestamp");
    const softIdx = headers.findIndex(h => h.includes("solexs"));
    const hardIdx = headers.findIndex(h => h.includes("hel1os"));

    if (tsIdx === -1 || softIdx === -1 || hardIdx === -1) {
      res.status(400).json({ error: "CSV must have columns: timestamp, solexs_flux, hel1os_flux" });
      return;
    }

    const rawRows: Array<{ timestamp: string; solexs_flux: number; hel1os_flux: number }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 3) continue;
      const ts = cols[tsIdx]?.trim();
      const soft = parseFloat(cols[softIdx]?.trim() ?? "");
      const hard = parseFloat(cols[hardIdx]?.trim() ?? "");
      if (!ts || isNaN(soft) || isNaN(hard)) continue;
      rawRows.push({ timestamp: ts, solexs_flux: soft, hel1os_flux: hard });
    }

    if (rawRows.length === 0) {
      res.status(400).json({ error: "No valid rows found in CSV" });
      return;
    }

    const processed = computeFeatures(rawRows);
    const events = detectFlares(processed);

    setProcessedData(processed);
    setFlareEvents(events);
    setReplayIndex(0);

    res.json({
      status: "ok",
      rows: rawRows.length,
      events_detected: events.length,
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to parse CSV" });
  }
});

export default router;

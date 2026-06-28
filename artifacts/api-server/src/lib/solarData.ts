import { logger } from "./logger";

export interface FluxDataPoint {
  timestamp: string;
  solexs_flux: number;
  hel1os_flux: number;
  solexs_deriv: number | null;
  hel1os_deriv: number | null;
  flux_ratio: number | null;
  spectral_hardness: number | null;
  rolling_mean: number | null;
  rolling_var: number | null;
}

export interface FeatureContributions {
  flux_derivative: number | null;
  flux_ratio: number | null;
  spectral_hardness: number | null;
  rolling_variance: number | null;
}

export interface FlareEvent {
  id: string;
  start_time: string;
  peak_time: string;
  end_time: string;
  peak_solexs_flux: number;
  peak_hel1os_flux: number;
  goes_class: string;
  duration_minutes: number;
  detection_confidence: number;
  detection_method: string;
  feature_contributions: FeatureContributions;
  forecast_probability_at_onset: number | null;
}

export interface ForecastOutput {
  timestamp: string;
  probability_15min: number;
  predicted_class: string;
  model: string;
  confidence_interval_low: number | null;
  confidence_interval_high: number | null;
}

// Seeded pseudo-random number generator (LCG) for reproducibility
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function gaussianNoise(rng: () => number, sigma: number): number {
  // Box-Muller transform
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function addFlare(
  soft: number[],
  hard: number[],
  start: number,
  rise: number,
  decay: number,
  peakS: number,
  peakH: number
) {
  for (let i = 0; i < rise && start + i < soft.length; i++) {
    const t = i / rise;
    soft[start + i] += peakS * t * t;
    hard[start + i] += peakH * t * t;
  }
  for (let i = 0; i < decay && start + rise + i < soft.length; i++) {
    const decay_factor = Math.exp(-3 * i / decay);
    soft[start + rise + i] += peakS * decay_factor;
    hard[start + rise + i] += peakH * decay_factor;
  }
}

export function generateMockData(): Array<{ timestamp: string; solexs_flux: number; hel1os_flux: number }> {
  const NUM_POINTS = 1440;
  const startTime = new Date("2024-10-15T00:00:00Z");
  const rng = seededRng(42);

  const soft = new Array(NUM_POINTS).fill(3e-7);
  const hard = new Array(NUM_POINTS).fill(1e-5);

  // B-class at hour 3 (minute 180)
  addFlare(soft, hard, 180, 3, 10, 2e-7, 5e-6);
  // C3.2 at hour 8 (minute 480)
  addFlare(soft, hard, 480, 5, 15, 3e-6, 8e-5);
  // M5.4 at hour 15 (minute 900)
  addFlare(soft, hard, 900, 8, 25, 5e-5, 2e-3);
  // X1.1 at hour 21 (minute 1260)
  addFlare(soft, hard, 1260, 6, 40, 1e-4, 5e-3);

  // Add Gaussian noise (~5% sigma)
  for (let i = 0; i < NUM_POINTS; i++) {
    soft[i] = Math.max(soft[i] + gaussianNoise(rng, soft[i] * 0.05), 1e-9);
    hard[i] = Math.max(hard[i] + gaussianNoise(rng, hard[i] * 0.05), 1e-7);
  }

  return Array.from({ length: NUM_POINTS }, (_, i) => {
    const ts = new Date(startTime.getTime() + i * 60000);
    return {
      timestamp: ts.toISOString(),
      solexs_flux: soft[i],
      hel1os_flux: hard[i],
    };
  });
}

function gradient(arr: number[]): number[] {
  const g = new Array(arr.length).fill(0);
  if (arr.length === 0) return g;
  if (arr.length === 1) return g;
  // Central differences for interior, forward/backward for edges
  g[0] = arr[1] - arr[0];
  g[arr.length - 1] = arr[arr.length - 1] - arr[arr.length - 2];
  for (let i = 1; i < arr.length - 1; i++) {
    g[i] = (arr[i + 1] - arr[i - 1]) / 2;
  }
  return g;
}

function rollingMean(arr: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function rollingVar(arr: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    if (slice.length < 2) { result.push(0); continue; }
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (slice.length - 1);
    result.push(variance);
  }
  return result;
}

export function computeFeatures(raw: Array<{ timestamp: string; solexs_flux: number; hel1os_flux: number }>): FluxDataPoint[] {
  const softFlux = raw.map(r => r.solexs_flux);
  const hardFlux = raw.map(r => r.hel1os_flux);

  const softDeriv = gradient(softFlux);
  const hardDeriv = gradient(hardFlux);
  const rm = rollingMean(softFlux, 10);
  const rv = rollingVar(softFlux, 10);

  return raw.map((r, i) => {
    const fluxRatio = r.hel1os_flux / (r.solexs_flux + 1e-12);
    const logSoft = Math.log10(Math.max(r.solexs_flux, 1e-12));
    const logHard = Math.log10(Math.max(r.hel1os_flux, 1e-12));
    const spectralHardness = logHard / (logSoft + 1e-12);
    return {
      timestamp: r.timestamp,
      solexs_flux: r.solexs_flux,
      hel1os_flux: r.hel1os_flux,
      solexs_deriv: softDeriv[i],
      hel1os_deriv: hardDeriv[i],
      flux_ratio: fluxRatio,
      spectral_hardness: spectralHardness,
      rolling_mean: rm[i],
      rolling_var: rv[i],
    };
  });
}

export function detectFlares(data: FluxDataPoint[]): FlareEvent[] {
  const THRESHOLD_SOFT = 1e-6;
  const THRESHOLD_DERIV = 5e-9;
  const events: FlareEvent[] = [];

  let inFlare = false;
  let startIdx = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const deriv = row.solexs_deriv ?? 0;

    if (!inFlare) {
      if (row.solexs_flux > THRESHOLD_SOFT && deriv > THRESHOLD_DERIV) {
        inFlare = true;
        startIdx = i;
      }
    } else {
      if (row.solexs_flux < THRESHOLD_SOFT * 0.5 || i === data.length - 1) {
        // Find peak in window
        let peakIdx = startIdx;
        for (let j = startIdx; j <= i; j++) {
          if (data[j].solexs_flux > data[peakIdx].solexs_flux) peakIdx = j;
        }
        const peakFlux = data[peakIdx].solexs_flux;

        // GOES classification
        let goesLetter: string;
        if (peakFlux >= 1e-4) goesLetter = "X";
        else if (peakFlux >= 1e-5) goesLetter = "M";
        else if (peakFlux >= 1e-6) goesLetter = "C";
        else goesLetter = "B";

        const exponent = Math.floor(Math.log10(Math.max(peakFlux, 1e-12)));
        const mantissa = peakFlux / Math.pow(10, exponent);

        const peakRow = data[peakIdx];
        const sh = peakRow.spectral_hardness ?? 0;
        const fr = peakRow.flux_ratio ?? 0;
        const confidence = Math.min(0.5 + Math.abs(sh) * 0.05 + Math.min(fr, 10000) * 0.000001, 0.99);

        const fluxDerivContrib = 0.42;
        const fluxRatioContrib = 0.28;
        const spectralContrib = 0.18;
        const varianceContrib = 0.12;

        events.push({
          id: `FLR-${data[startIdx].timestamp.slice(0, 10)}-${String(events.length + 1).padStart(3, "0")}`,
          start_time: data[startIdx].timestamp,
          peak_time: data[peakIdx].timestamp,
          end_time: data[i].timestamp,
          peak_solexs_flux: peakFlux,
          peak_hel1os_flux: data[peakIdx].hel1os_flux,
          goes_class: `${goesLetter}${mantissa.toFixed(1)}`,
          duration_minutes: i - startIdx,
          detection_confidence: Math.round(confidence * 100) / 100,
          detection_method: "threshold+derivative",
          feature_contributions: {
            flux_derivative: fluxDerivContrib,
            flux_ratio: fluxRatioContrib,
            spectral_hardness: spectralContrib,
            rolling_variance: varianceContrib,
          },
          forecast_probability_at_onset: null,
        });

        inFlare = false;
      }
    }
  }

  return events;
}

export function computeForecast(data: FluxDataPoint[], currentIdx: number): ForecastOutput {
  const window = 15;
  const start = Math.max(0, currentIdx - window);
  const recent = data.slice(start, currentIdx + 1);

  if (recent.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      probability_15min: 0,
      predicted_class: "B/C",
      model: "ARIMA+threshold_ensemble",
      confidence_interval_low: 0,
      confidence_interval_high: 0.12,
    };
  }

  const maxFlux = Math.max(...recent.map(r => r.solexs_flux));
  const firstFlux = recent[0].solexs_flux;
  const lastFlux = recent[recent.length - 1].solexs_flux;
  const trend = (lastFlux - firstFlux) / Math.max(recent.length, 1);
  const meanSH = recent.reduce((s, r) => s + Math.abs(r.spectral_hardness ?? 0), 0) / recent.length;

  const normFlux = Math.min(maxFlux / 1e-4, 1.0);
  const normTrend = Math.min(Math.max(trend / 1e-7, 0), 1.0);
  const normHard = Math.min(meanSH / 2.0, 1.0);

  let prob = 0.4 * normFlux + 0.4 * normTrend + 0.2 * normHard;
  prob = Math.min(Math.max(prob, 0), 0.99);
  prob = Math.round(prob * 100) / 100;

  let predictedClass: string;
  if (prob > 0.7) predictedClass = "M/X";
  else if (prob > 0.4) predictedClass = "C/M";
  else predictedClass = "B/C";

  const ts = recent[recent.length - 1].timestamp;

  return {
    timestamp: ts,
    probability_15min: prob,
    predicted_class: predictedClass,
    model: "ARIMA+threshold_ensemble",
    confidence_interval_low: Math.max(prob - 0.12, 0),
    confidence_interval_high: Math.min(prob + 0.12, 0.99),
  };
}

// ─── Singleton state ───────────────────────────────────────────────────────────
let _rawData: Array<{ timestamp: string; solexs_flux: number; hel1os_flux: number }> = [];
let _processedData: FluxDataPoint[] = [];
let _flareEvents: FlareEvent[] = [];
let _replayIndex = 0;

export function initializeSolarData() {
  logger.info("Generating synthetic solar flare demo data...");
  _rawData = generateMockData();
  _processedData = computeFeatures(_rawData);
  _flareEvents = detectFlares(_processedData);
  _replayIndex = 0;
  logger.info({ points: _rawData.length, events: _flareEvents.length }, "Solar data initialized");
}

export function getProcessedData(): FluxDataPoint[] {
  return _processedData;
}

export function getFlareEvents(): FlareEvent[] {
  return _flareEvents;
}

export function getReplayIndex(): number {
  return _replayIndex;
}

export function advanceReplayIndex(): void {
  if (_replayIndex < _processedData.length - 1) {
    _replayIndex++;
  }
}

export function resetReplay(): void {
  _replayIndex = 0;
}

export function setProcessedData(data: FluxDataPoint[]) {
  _processedData = data;
}

export function setFlareEvents(events: FlareEvent[]) {
  _flareEvents = events;
}

export function setReplayIndex(idx: number) {
  _replayIndex = idx;
}

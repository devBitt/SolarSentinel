# SolarSentinel

An automated pipeline that ingests combined Soft and Hard X-ray time-series data from ISRO's Aditya-L1 mission to nowcast and forecast solar flares in real time.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS (dark mode space observatory theme)
- Charts: Recharts (dual log-scale time-series, gauge SVG, bar charts)
- Animations: Framer Motion (alert banner slide-in, gauge needle spring)
- API: Express 5 (with all detection/forecast logic in TypeScript)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/solar-sentinel/src/` — React frontend
  - `pages/` — Dashboard, Events, Upload, Model
  - `components/` — Navbar, AlertBanner, DualFluxChart, ForecastGauge, FeaturesStrip, etc.
  - `utils/formatFlux.ts` — SI notation formatting
  - `utils/goesClass.ts` — GOES classification colors and alert levels
- `artifacts/api-server/src/lib/solarData.ts` — synthetic data generator + detection algorithms
- `artifacts/api-server/src/routes/solar.ts` — all solar flare API route handlers

## Architecture decisions

- Python Flask backend was ported to TypeScript/Node.js to keep the monorepo homogeneous
- Flare detection uses threshold + derivative method (threshold: 1e-6 W/m², derivative: 5e-9)
- Mock data: 1440 points at 1-min resolution with 3 embedded flares (C3.3, M5.1, X-class) using seeded LCG for reproducibility
- Forecast: weighted ensemble of normalized flux, trend, and spectral hardness
- Replay state is in-memory singleton; `/api/replay/reset` resets it
- NASA SDO image embedded directly as `<img>` (no API key needed)
- NOAA 3-day forecast fetched client-side (free, CORS-enabled)

## Data sources

### Live (GOES-18)
- `/api/data/goes-live` fetches `services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json`
- Band mapping: GOES long (0.1-0.8 nm) -> solexs_flux, short (0.05-0.4 nm) -> hel1os_flux
- 90-second server-side cache; dashboard refreshes on a countdown ticker
- `/api/events/noaa-archive` fetches 7-day verified flare catalog from NOAA SWPC

### Synthetic (Demo)
- Fixed epoch: 2024-10-15T00:00:00Z, 1440 points, 3 flares, seeded LCG
- All dashboard panels show DEMO badge when active

### Upload
- Accepts CSV with auto-detected formats: ISSDC SoLEXS, GOES Cleaned, SolarSentinel native, positional
- Comment lines (`#`) skipped automatically

## Product

- **Dashboard** (`/`): Live dual-channel X-ray chart, forecast probability gauge, derived features, mission context with NASA SDO image, GOES classification reference, replay speed controls, **GOES-18 LIVE / DEMO toggle with refresh countdown**, 3D Canvas solar globe with heliographic flare markers, solar wind + particle flux panel with SEP detection
- **Event Log** (`/events`): Full table of detected flare events with expandable confidence breakdown, **class distribution summary bar**, CSV export, **NOAA SWPC Archive tab** with real verified flares
- **Upload & Analyze** (`/upload`): Drag-and-drop CSV upload with **4-format auto-detection**, client-side preview table, sample CSV download, mapped column feedback
- **Model Info** (`/model`): Detection pipeline flowchart, **full Aditya-L1 instrument specification cards**, **10-row algorithm parameter table with rationales**, **validation vs NOAA SWPC baseline** with score comparison bars

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The detection algorithm resets replay index on upload — all endpoints reflect the new data immediately
- The OpenAPI `upload` endpoint has no `requestBody` schema to avoid `File`/`Blob` TypeScript issues with Orval's codegen; upload uses raw FormData on the frontend
- NOAA space weather APIs are public/CORS-enabled but may be slow or unavailable
- GOES-18 data is a proxy for SoLEXS/HEL1OS — same wavelength bands but different detector geometry

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

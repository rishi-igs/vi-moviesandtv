# Lighthouse Performance Tracking Dashboard

A full-stack web application that runs Google Lighthouse audits on any URL, stores the results in a database, and displays a dashboard with historical trends and performance metrics.

## The Problem

Lighthouse (Chrome DevTools) only shows metrics for one page at a time. Every new audit replaces the old results — there's no built-in history, no comparison across runs, and no way to track multiple websites.

## The Solution

Enter a URL → backend runs a Lighthouse audit → saves scores + Core Web Vitals to PostgreSQL → dashboard visualizes history and trends.

## Architecture

```
User enters URL (or extension auto-triggers)
       │
       ▼
API Route (/api/audit) — creates a "pending" audit row, responds immediately
       │
       ▼
Background queue — serialized Lighthouse run (chrome-launcher + headless Chrome)
       │
       ▼
Results saved to DB via Prisma (audit + metrics tables)
       │
       ▼
Frontend dashboard — fetches data every 15s, displays scores, charts, history
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) + React 18 | UI + API routes in one app |
| Backend | Next.js API routes | Runs audits server-side |
| Audit Engine | `lighthouse` + `chrome-launcher` | Headless Chrome audit runner |
| Database | PostgreSQL (Neon serverless) | Persistent storage |
| ORM | Prisma | Type-safe DB access, migrations |
| Charts | Recharts (available) + SVG donut rings | Trend graphs, score visuals |
| Styling | Tailwind CSS + custom CSS | UI design |
| Extension | Chrome Extension (Manifest V3) | Auto-trigger audits on page visit |
| Types | TypeScript | End-to-end type safety |

## Database Schema (Prisma)

Three related tables:

- **websites** — One row per monitored URL (`id`, `url`, `title`, `created_at`)
- **audits** — One row per Lighthouse run (`id`, `website_id`, `performance_score`, `accessibility_score`, `best_practices_score`, `seo_score`, `status: pending|complete|failed`, `error`, `created_at`)
- **metrics** — Detailed numeric metrics per audit (`id`, `audit_id`, `fcp`, `lcp`, `cls`, `tbt`, `speed_index`, `tti`)

## Features

### Core (MVP)

- **URL Input** — Submit any URL to trigger a Lighthouse audit
- **Live Dashboard** — Lists all audited websites with their latest Core Web Vitals (FCP, LCP, CLS, TBT, Speed Index, TTI) and Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
- **Auto-Refresh** — Dashboard refreshes every 15 seconds
- **Performance Overview** — Best FCP, Avg FCP, Worst LCP, Highest TBT, Highest Speed Index, Highest Page Load
- **Score Distribution** — Donut charts showing avg Accessibility, Best Practices, SEO, and Page Load scores
- **Performance Rating** — Segmented donut chart breaking down page load times into Fast (<1s), Moderate (1-2s), Slow (>2s)
- **Website Detail Page** — Per-website view with all audit history, score breakdowns, and Core Web Vitals
- **Background Audits** — API responds immediately (202 Accepted), audit runs asynchronously and updates the DB when complete
- **Audit Queue** — Lighthouse runs are serialized to prevent timing mark corruption in concurrent runs
- **Cooldown** — Prevents re-auditing the same URL within 5 minutes
- **Status Tracking** — Audits track as `pending` → `complete` / `failed` with error messages

### Chrome Extension

- Automatically audits every page visited on `moviesandtv.myvi.in`
- Toggle on/off from popup UI
- Shows recent audit results (OK/Failed) with timestamps
- Badge icon shows audit status per tab (✓ green / ✗ red / ON blue)
- Retries across multiple API endpoints (localhost:3000-3002)
- Supports SPA navigation via content script messages
- Desktop notifications on audit failure

### Advanced

- **Playwright runner** (alternative) — `USE_PLAYWRIGHT=1` env var swaps `chrome-launcher` for Playwright-managed Chrome
- **Pre-flight reachability check** — Tests URL before launching the browser to catch dead URLs faster
- **CORS headers** — API accepts cross-origin requests from extensions
- **LocalStorage caching** — Dashboard caches results for instant display on reload

## Project Structure

```
lighthouse/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── audit/route.ts        # POST — trigger Lighthouse audit
│   │   │   └── websites/
│   │   │       ├── route.ts          # GET — list all websites
│   │   │       └── [id]/route.ts     # GET — website detail + audit history
│   │   ├── websites/[id]/page.tsx    # Website detail page
│   │   ├── _lib/
│   │   │   ├── prisma.ts             # Prisma client singleton
│   │   │   ├── lighthouse-runner.ts  # Lighthouse via chrome-launcher
│   │   │   └── playwright-runner.ts  # Lighthouse via Playwright
│   │   ├── _components/
│   │   │   ├── UrlInput.tsx          # URL submit form
│   │   │   ├── WebsiteList.tsx       # Website card grid
│   │   │   └── ScoreCard.tsx         # Score badge component
│   │   ├── _types/index.ts           # TypeScript interfaces
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Dashboard home page
│   │   └── globals.css               # Global + component styles
│   ├── components/                   # Shared components (legacy)
│   ├── lib/                          # Shared lib (legacy)
│   ├── App.jsx                       # Vite React prototype (legacy)
│   ├── main.jsx                      # Vite entry point (legacy)
│   ├── data.js                       # Static mock data (legacy)
│   └── styles.css                    # Vite styles (legacy)
├── prisma/
│   └── schema.prisma                 # Database schema
├── extension/                        # Chrome Extension
│   ├── manifest.json                 # Manifest V3
│   ├── background.js                 # Service worker — auto-audits pages
│   ├── popup.html                    # Popup UI
│   ├── popup.js                      # Popup logic
│   ├── content-script.js             # SPA navigation detection
│   └── icon*.png                     # Extension icons
├── scripts/
│   └── generate-icons.mjs            # PNG icon generator
├── docs/                             # Documentation
├── tests/                            # Test files
└── Configuration files               # next.config, tailwind, tsconfig, etc.
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up database
# Create a .env file with DATABASE_URL pointing to your PostgreSQL instance
# Then push the schema:
npm run db:push

# Start dev server
npm run dev

# Open http://localhost:3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/audit` | Submit URL for audit (returns 202 immediately) |
| `GET` | `/api/websites` | List all websites with latest audit |
| `GET` | `/api/websites/[id]` | Website detail with full audit history |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `USE_PLAYWRIGHT` | `0` | Set to `1` to use Playwright instead of chrome-launcher |

## Future Enhancements (v2+)

- Scheduled daily audits (cron / GitHub Actions)
- Alerts when scores drop below thresholds
- Side-by-side website comparison
- Multi-user accounts
- Public API for external access
- Audit queue system (BullMQ + Redis) for scaling
- Trend charts over time (Recharts integration)

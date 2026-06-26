# ⚽ FIFA World Cup 2026 — Analytics Dashboard

> End-to-end data platform for FIFA World Cup 2026 statistics — automated ETL pipeline, cloud PostgreSQL database, and three interactive analytical panels built entirely from scratch.

[![Live Demo](https://img.shields.io/badge/🔴%20Live%20Demo-brightgreen?style=for-the-badge)](https://dashboard-modeleiros.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python%203.x-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

---

## 🎯 Business Problem

FIFA's official statistics exist but are fragmented across 8 separate tabs, require manual pagination, and have no public API. This makes it impractical to:

- Cross-reference metrics across different statistical categories
- Compare multiple players or teams simultaneously
- Track how statistics evolve throughout the tournament
- Perform head-to-head analysis between national teams

**This project answers:**

> *"How can a BI Analyst access, structure, and visually compare 48 national teams and 900+ players across 40+ KPIs from the FIFA World Cup 2026 — automatically and in real time?"*

**Solution:** Automated web scraper → structured cloud database → interactive multi-panel dashboard.

---

## 📊 Dashboard — Three Analytical Panels

| Panel | Type | Use Case |
|-------|------|----------|
| **Jogadores** (Players) | Radar Chart | Compare up to 10 players across 3 simultaneous KPIs — filterable by team and position |
| **Times** (Teams) | Bubble / Scatter Plot | 4-dimensional team comparison: X axis, Y axis, bubble size, and temperature color scale |
| **Duelo** (Head-to-Head) | Butterfly Chart | Side-by-side comparison of 40+ KPIs between two selected national teams |

All charts are **pure SVG** — no external chart libraries. Custom neon temperature palette:  
`#001eff` → `#00e5ff` → `#bf00ff` → `#ff00aa` → `#ff5500` → `#ffee00`

> **[🔴 Access Live Dashboard →](https://dashboard-modeleiros.vercel.app)**

---

## 🏗️ Architecture

```
                        ┌─────────────────────────────────┐
                        │  FIFA.com/stats (Official Site) │
                        └────────────────┬────────────────┘
                                         │ Playwright (headless Chromium)
                                         ▼
                        ┌─────────────────────────────────┐
                        │  Python ETL Scraper             │
                        │  fifa_scraper.py                │
                        │  • 8 statistical tabs           │
                        │  • "Load More" pagination       │
                        │  • Retry logic (3 attempts)     │
                        │  • Data cleaning & normalization│
                        └────────────────┬────────────────┘
                                         │ psycopg2 UPSERT
                                         │ ON CONFLICT (nome, pais)
                                         ▼
                        ┌─────────────────────────────────┐
                        │  Supabase (PostgreSQL)           │
                        │  8 physical tables              │
                        │  2 aggregated views             │
                        │  Row-Level Security             │
                        └────────────────┬────────────────┘
                                         │ Supabase JS SDK
                                         │ Server Components (SSR)
                                         ▼
                        ┌─────────────────────────────────┐
                        │  Next.js 14 (App Router)        │
                        │  Server → Client Component split│
                        │  Pure SVG interactive charts    │
                        └────────────────┬────────────────┘
                                         │ Vercel CLI / CI
                                         ▼
                        ┌─────────────────────────────────┐
                        │  Vercel — Edge CDN              │
                        │  dashboard-modeleiros.vercel.app│
                        └─────────────────────────────────┘

  Update trigger: GitHub Actions (workflow_dispatch) → etl_disciplina.yml
```

---

## 🗂️ Data Model

### Physical Tables (8)

| Table | Source Tab | Key Metrics |
|-------|-----------|-------------|
| `disciplina_jogadores` | Disciplina | **Anchor table** — fouls, yellow/red cards, offsides |
| `gols_jogadores` | Artilharia | Goals, assists, minutes played |
| `ataque_jogadores` | Ataque | Shots, crosses, headers, corners, expected goals |
| `defesa_jogadores` | Defesa | Ball losses, defensive pressures, own goals |
| `distribuicao_jogadores` | Distribuição | Passes, pass accuracy %, line-breaking attempts |
| `fisico_jogadores` | Físico | Speed (km/h), high-velocity runs, total distance (m) |
| `goleiro_jogadores` | Goleiro | Saves, inside/outside box actions |
| `movimentacao_jogadores` | Movimentação | Ball requests, between-line receptions, under-pressure receptions |

**UPSERT natural key:** `UNIQUE (nome, pais)` — never on `id` (serial).

### Aggregated Views (2)

- **`stats_completos`** — 1 row per player · LEFT JOIN of all 8 tables
- **`stats_completos_por_time`** — 1 row per national team · `SUM` for absolute counts, `AVG` for percentages and physical means

### Naming Conventions

| Pattern | Example |
|---------|---------|
| Physical tables | `gols_jogadores` |
| Percentage columns | `precisao_passes_pct` (suffix `_pct`) |
| Goalkeeper fields in views | `defesas_goleiro` (suffix `_goleiro`) |
| Team view sums | `total_gols`, `total_passes` (prefix `total_`) |
| Team view averages | `media_velocidade`, `media_ge` (prefix `media_`) |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Web Scraping | **Python + Playwright** | Headless Chromium, DOM extraction via `page.evaluate()`, pagination |
| ETL | **Python (pandas)** | Data cleaning, type coercion, CSV export (UTF-8 BOM) |
| Database | **Supabase (PostgreSQL)** | Cloud-managed Postgres, views, row-level security, schema reload |
| DB Driver | **psycopg2** | Direct Postgres connection for bulk UPSERT performance |
| SDK Fallback | **supabase-py** | SDK-based insert when psycopg2 credentials unavailable |
| Automation | **GitHub Actions** | Manual-trigger ETL pipeline (`workflow_dispatch`) |
| Frontend Framework | **Next.js 14** | App Router, Server + Client Components, TypeScript, SSR |
| Styling | **Tailwind CSS** | Utility-first, dark theme, no custom CSS |
| Charts | **Pure SVG** | Zero chart libraries — custom radar, bubble, butterfly charts |
| Deployment | **Vercel** | Edge CDN, automatic CI/CD on push to `main` |
| Version Control | **Git + GitHub** | Conventional commits (`feat/fix/chore/docs`) |

---

## 📦 Data Pipeline

```
① TRIGGER   GitHub Actions → workflow_dispatch (manual or scheduled)

② SCRAPE    Playwright → Chromium → fifa.com/stats
            8 tabs in sequence:
            Artilharia · Ataque · Defesa · Distribuição ·
            Disciplina · Físico · Goleiro · Movimentação
            "Load More" pagination until DOM no longer changes
            Retry loop (up to 3 attempts per tab)

③ CLEAN     Remove measurement units (%, km/h, km)
            Normalize decimals: comma → dot
            Handle missing values: "-" and empty → 0

④ EXPORT    Save UTF-8 BOM CSV to:
            Data_Site_Fifa/Data_Estatisticas_Players/<table>.csv

⑤ UPSERT   psycopg2 → ON CONFLICT (nome, pais) DO UPDATE SET ...
            Fallback: supabase-py SDK if psycopg2 not configured

⑥ NOTIFY   NOTIFY pgrst, 'reload schema'
            PostgREST picks up view/table changes automatically
```

---

## 📁 Project Structure

```
Copa_2026/
│
├── 📄 README.md
├── 📄 requirements.txt               # Python dependencies
├── 📄 .github/
│   └── workflows/
│       └── etl_disciplina.yml        # GitHub Actions ETL (manual trigger)
│
├── 🐍 Python Scripts (ETL Layer)
│   ├── fifa_scraper.py               # Main scraper — 8 tabs, generic UPSERT system
│   ├── supabase_setup.py             # Initial DB schema: tables, indexes, constraints
│   ├── upload_disciplina.py          # Legacy single-tab uploader
│   ├── etapa4_setup.py               # Views creation, grants & PostgREST reload
│   ├── etapa4_team_view.py           # Team aggregation view helper
│   └── reload_schema.py              # PostgREST schema reload utility
│
├── 📋 PRD/                           # Business requirements & data specifications
│   ├── 01_desafio_de_negocio.md      # Business problem, personas, success criteria
│   └── 02_modelagem_dados.md         # Data model, SQL patterns, naming conventions
│
├── 📂 Data_Site_Fifa/                # Raw data extracted by the scraper
│   └── Data_Estatisticas_Players/
│       ├── disciplina_jogadores.csv
│       ├── gols_jogadores.csv
│       ├── ataque_jogadores.csv
│       ├── defesa_jogadores.csv
│       ├── distribuicao_jogadores.csv
│       ├── fisico_jogadores.csv
│       ├── goleiro_jogadores.csv
│       └── movimentacao_jogadores.csv
│
└── 🌐 dashboard/                     # Next.js 14 application
    ├── app/
    │   ├── page.tsx                  # Root — data fetching + Suspense
    │   └── api/trigger-scraper/      # Internal API route (GitHub Actions trigger)
    ├── components/
    │   ├── TabContainer.tsx          # Client tab manager (state preserved across tabs)
    │   ├── PlayerChart.tsx           # Radar chart — player comparison
    │   ├── TeamChart.tsx             # Bubble/scatter chart — team comparison
    │   ├── DuelChart.tsx             # Butterfly chart — head-to-head
    │   ├── PlayerPanel.tsx           # Server: fetches player data
    │   ├── TeamPanel.tsx             # Server: fetches team data
    │   └── DuelPanel.tsx             # Server: fetches team data (reused)
    └── lib/
        └── supabase.ts               # Types (JogadorCompleto, TimeStatCompleto),
                                      # query functions, NUMERIC → Number() coercion
```

---

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account (free tier sufficient)

### 1. Clone & install dependencies

```bash
git clone https://github.com/denisonabdias/Copa_2026.git
cd Copa_2026

# Python
pip install -r requirements.txt
playwright install chromium

# Next.js
cd dashboard && npm install
```

### 2. Configure environment variables

**`dashboard/.env.local`** (frontend):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**`.env`** (scraper, at project root):
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_DB_PASSWORD=your_db_password
```

### 3. Initialize the database

```bash
python supabase_setup.py     # Creates tables and constraints
python etapa4_setup.py       # Creates views and grants SELECT to anon
```

### 4. Run the scraper

```bash
python fifa_scraper.py       # Scrapes all 8 tabs and upserts to Supabase
```

### 5. Start the dashboard

```bash
cd dashboard && npm run dev
# → http://localhost:3000
```

---

## 🔄 Updating Data (Production)

Data updates are triggered manually via **GitHub Actions** to avoid unintended load on FIFA.com.

1. Go to the [Actions tab](https://github.com/denisonabdias/Copa_2026/actions)
2. Select `ETL — Scraper FIFA Disciplina`
3. Click **Run workflow**

The pipeline runs headless Chromium, scrapes all 8 tabs, and upserts to Supabase. The dashboard reflects new data immediately on next page load.

---

## 📈 Skills Demonstrated

| Area | Implementation in this Project |
|------|-------------------------------|
| **Web Scraping** | Playwright headless browser, DOM extraction via `page.evaluate()`, "Load More" pagination, retry logic |
| **ETL Pipeline** | Extract → Clean → Transform → Load with dual-driver strategy (psycopg2 primary, SDK fallback) |
| **SQL & Data Modeling** | PostgreSQL, 8 normalized tables, UPSERT with natural composite keys, 2 aggregated views |
| **Data Cleaning** | Unit removal, decimal normalization, null/empty → 0 handling, deduplication strategy |
| **Dashboard Design** | 3 panels for distinct analytical use cases: individual, aggregate, and head-to-head |
| **Data Visualization** | Custom SVG — radar chart, bubble/scatter plot, butterfly chart; no chart libraries |
| **KPI Framework** | 40+ KPIs across 8 categories; normalization against universe max for cross-KPI comparability |
| **Automation** | GitHub Actions `workflow_dispatch`, manual trigger, CSV artifact with 7-day retention |
| **Cloud Infrastructure** | Supabase (managed PostgreSQL + PostgREST), Vercel (Edge CDN), environment-based config |
| **Frontend Development** | Next.js 14 App Router, Server/Client Component split, TypeScript, pure SVG charts |
| **State Management** | Client-side tab state with CSS show/hide to preserve filter selections across navigation |
| **Version Control** | Conventional commits (`feat/fix/chore/docs`), CI/CD via Vercel on push to `main` |

---

## 📝 Data Source

All statistics from the **[official FIFA 2026 World Cup stats page](https://www.fifa.com/fifaplus/pt/tournaments/mens/worldcup/canadamexicousa2026/stats)**.

Data reflects cumulative player and team performance across all 2026 FIFA World Cup matches.

---

*Portfolio project by [Denison Abdias](https://github.com/denisonabdias)*  
*Copa do Mundo FIFA 2026 — Canada · Mexico · USA*

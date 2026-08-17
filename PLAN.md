# Decision Intelligence Platform — Vertical Slice v1

## Context

The user wants an enterprise-grade "Decision Intelligence Platform" (business problem → AI pipeline → ranked business decisions → what-if simulation → dashboards), styled like a fusion of Palantir Foundry / DataRobot / Power BI, with Stripe/Linear-level UX polish. The full spec (20+ data connectors, 12 industries of 1M-row data, 25+ ML algorithms, 8 collaborating AI agents, Kubernetes/Snowflake/SAP/Kafka integrations) is a multi-quarter enterprise build, not something a single session can stand up — there is no live Kubernetes, Snowflake, SAP, or Kafka available here.

Decisions already confirmed with the user this session:
- **New standalone project**, separate from the `portfolio` repo (which has its own locked, unrelated Next.js/Supabase architecture per its `CLAUDE.md`).
- **React.js frontend + a real Python FastAPI backend** (not mocked-in-TypeScript) — actual pandas/scikit-learn computation, not fabricated numbers.
- **One vertical slice, fully real, first**: the "Increase Product Sales" use case, end-to-end, polished — used as the template for later expansion to more industries/dashboards/connectors.

This plan scopes that first vertical slice honestly: what will be genuinely computed vs. what will be a clearly-labeled "coming soon" integration card, so nothing in the delivered product silently fakes a capability (e.g., a "Connect to Snowflake" button will open a real config form and save real settings, but won't perform a live external OAuth handshake or query a real Snowflake warehouse — there's no way to do that here).

## Project layout

New directory: `D:\Claude Code Project\decision-intelligence-platform` (sibling to `portfolio`), as a monorepo:

```
decision-intelligence-platform/
  apps/
    api/            # FastAPI backend (Python)
    web/            # React 19 + Vite + TS frontend
  README.md
  .gitignore
```

`apps/api` and `apps/web` run as two local dev processes (`uvicorn` + `vite`), proxied together in dev via Vite's `server.proxy`.

## Backend — `apps/api` (FastAPI)

**Stack**: FastAPI, Pydantic v2, pandas, numpy, scikit-learn, xgboost, statsmodels (ARIMA) — all real, all actually executing.

### Synthetic data generation (`app/data_generation/sales.py`)
A generator (Faker + numpy) producing a **relationally structured** Sales dataset — Products, Regions/Stores, Customers, Orders — over 24 months, with baked-in causal structure: a Q2 price increase in specific regions + inventory stockouts, so the "why did sales decrease in Q2" narrative is genuinely recoverable by analysis, not cosmetic. Script supports scaling to 1M+ rows standalone (documented, invoked via CLI flag); the interactive demo seeds a responsive ~150k-row slice so the UI stays snappy over HTTP.

### Real pipeline stages (`app/pipeline/`)
1. **Profiling** — pandas-computed missing-value %, IQR-based outlier counts, correlation matrix, distribution stats, dtype-based column classification, and a name-pattern heuristic for business metadata (price/date/region/customer_id, etc.) — genuinely computed, not templated text with fake numbers.
2. **Feature engineering** — date parts, lag/rolling features, categorical encoding, price/discount ratios.
3. **Model training & comparison** — LinearRegression, RandomForestRegressor, GradientBoostingRegressor, XGBRegressor trained via real cross-validation on the generated data; best model selected by CV R²/MAE.
4. **Forecasting** — statsmodels ARIMA on monthly revenue for the trend/forecast chart.
5. **Feature importance** — real `feature_importances_` / permutation importance from the winning model.
6. **Decision generation** — a deterministic engine that perturbs the trained model's inputs (price ↓, inventory reallocation, discount ↑, etc.) and reads real predicted deltas back out, producing ranked decision options where confidence = actual CV score and impact = actual simulated model output — not fabricated numbers. (True LLM-narrated reasoning needs an API key this environment doesn't have; the plain-English explanations are template-driven off real computed values, with an optional `ANTHROPIC_API_KEY`-gated hook left in place for a future narrative-writer agent.)

### Endpoints
- `POST /use-cases` — create use case (name, problem, objective, KPI, description)
- `POST /use-cases/{id}/data/generate` — generate/attach the synthetic dataset; `POST /use-cases/{id}/data/upload` — real CSV upload path
- `GET /use-cases/{id}/data-quality` — profiling results
- `POST /use-cases/{id}/pipeline/run` + `GET /use-cases/{id}/pipeline/stream` (SSE) — runs and streams real stage-by-stage pipeline events for the animated "AI thinking" UI
- `GET /use-cases/{id}/decisions` — ranked decision options
- `POST /use-cases/{id}/simulate` — what-if: slider deltas (marketing spend, price, discount, inflation, demand, churn) re-run through the trained model, returns live-updated KPI predictions
- `GET /use-cases/{id}/dashboard` — aggregated series for chart components

Storage: SQLite (via SQLAlchemy) for use-case/run metadata; generated dataframes cached to parquet on disk per use case — no external DB dependency needed for a single-slice demo.

## Frontend — `apps/web` (React 19 + Vite + TS)

**Stack**: React Router, TanStack Query, Zustand, Tailwind CSS, shadcn/ui (Radix), Framer Motion, Recharts (line/bar/treemap/heatmap/radar/gauge/waterfall), `cmdk` command palette.

### Screens (this slice)
- **Landing** — product marketing page (dark, glassmorphism, gradient accents, Stripe/Linear-grade polish)
- **Use Case creation** — the 5-field form (Name, Problem, Objective, KPI, Description)
- **Data Sources** — connector gallery: **CSV upload + "Generate Synthetic Dataset" are fully functional**; the other 18 listed connectors (Snowflake, SAP, Salesforce, Kafka, etc.) render as real cards with a config modal that persists settings locally, clearly labeled "Not connected — configuration saved" rather than silently pretending to sync
- **AI Pipeline (visual)** — animated stage-by-stage view driven by the real SSE stream from the backend; each stage shows "What happened / Why / What AI is doing" in plain English computed from real stage output; **Business User mode** (simplified) vs **Expert Mode** (feature importance, CV scores, correlation heatmap, training metrics) toggle
- **Decision Engine** — ranked decision cards (confidence, pros/cons, impact, risk, ROI, timeline) from the real decision-generation engine
- **Scenario Simulator / Decision Sandbox** — sliders (marketing spend, price, discount, inventory, inflation, demand, churn) wired live to `/simulate`, charts update in real time
- **Executive Dashboard** — KPI cards, revenue trend + forecast, category treemap, correlation heatmap, decision-impact waterfall, radar for segment comparison
- **Export** — real PDF (print-to-PDF/jsPDF) and Excel (xlsx) export of the dashboard/decisions; Slack/Teams/PowerBI/email "publish" targets shown as connector-style cards, same "saved, not live" honesty as data sources
- Command palette + keyboard shortcuts, dark mode default

### Out of scope for this slice (explicitly, to set expectations)
- The other 11 industries' datasets, the other dashboards (Ops/Finance/Marketing/Supply Chain/Risk), the remaining ML families (clustering, anomaly detection, Bayesian, Monte Carlo, neural nets, recommendation systems), multi-agent orchestration (LangGraph/CrewAI), and real enterprise SSO/auth are **not** built in this pass. This slice is the template; each is a well-defined follow-up once the pattern is proven.

## Verification
- `apps/api`: run `uvicorn app.main:app --reload`, hit `/docs` (FastAPI Swagger UI), exercise the pipeline endpoints end-to-end via curl/HTTPie to confirm real numbers change when simulate inputs change.
- `apps/web`: run via the Browser pane's `preview_start` (Vite dev server), click through Use Case creation → Data Sources → Pipeline animation → Decision Engine → Sandbox sliders → Dashboard, confirm slider changes visibly update charts (network tab shows real `/simulate` calls, not static data).
- Confirm responsive behavior at the 5-tier breakpoint scale and dark mode.

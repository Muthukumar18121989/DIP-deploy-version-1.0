# Decision Intelligence Platform

**Transform Enterprise Data into Business Decisions**

A business-decision intelligence platform: describe a business problem, and the
platform runs a real (not simulated) data profiling → feature engineering →
model comparison → forecasting → decision-generation pipeline against your
data, then lets you interactively stress-test the result with a live what-if
simulator.

## What's real vs. illustrative in this build

This started as a single vertical slice and has since been extended into an
enterprise-shaped platform (versioned experiments, a persisted Decision
Library with lifecycle states, Lock-In Strategy re-runs, strategy comparison,
monitoring). It is still scoped deliberately:

- **Real**: CSV upload, synthetic data generation, data profiling, feature
  engineering, model training + comparison (scikit-learn/XGBoost), ARIMA
  forecasting, feature importance, the what-if simulator, and the Lock-In
  Strategy re-run (which genuinely retrains against the adjusted scenario)
  all execute actual computation against actual data — no numbers are
  hand-authored. Every AI Pipeline run creates a new immutable `Experiment`
  version rather than overwriting the last one; every generated decision is
  persisted as a `Strategy` with a real lifecycle (generated → reviewed →
  sandbox tested → locked in → approved → published → monitoring → archived).
- **Illustrative**: connectors to Snowflake/SAP/Salesforce/Kafka/etc. and
  publish targets (Slack/Teams/Power BI/email) render as real UI with a
  config form that persists your settings, but do not perform a live
  external network call — there's no way to reach a real enterprise system
  from this environment. Each is clearly labeled "configuration saved, not
  connected." Monitoring's "actual" KPI values are user-entered (no live
  production data feed exists here) — the variance/drift math on top of that
  input is real.

See `PLAN.md` for the vertical-slice architecture and scope notes. The
enterprise-extension design (Experiment/Strategy data model, Lock-In flow,
pipeline-state persistence across navigation) isn't in its own doc yet — see
the model definitions in `apps/api/app/models.py` and the routers in
`apps/api/app/routers/` for the authoritative shape.

### Application map (v2)

```
/                                     Landing
/use-cases                            Use Case Repository (home)
/use-cases/new                        Create use case
/use-cases/:id/data                   Data Sources
/use-cases/:id/experiments            Version history + compare
/use-cases/:id/pipeline               AI Pipeline ("AI Journey")
/use-cases/:id/decisions              Decision Library (Business Decisions)
/use-cases/:id/decisions?status=published   Published Strategies
/use-cases/:id/sandbox                Scenario Sandbox (+ Lock In Strategy)
/use-cases/:id/dashboard              Executive Dashboard
/use-cases/:id/reports                Reports (PDF/Excel/PPTX export)
/use-cases/:id/monitoring             Actual vs. expected KPI tracking
/strategies/:id                       Full decision report
/strategies/compare?ids=...           2–4 way strategy comparison
/settings                             Expert Mode + Appearance (theme)
/login                                Sign in / create account
/admin                                Admin Dashboard (admin role only) — every user, their use cases, their data
```

Every route above except `/login` requires being signed in — an anonymous
visitor to any URL is redirected to `/login?redirect=<that URL>` and lands
back there after signing in. A regular account only changes one thing versus
the old anonymous-by-default behavior: use cases you create while signed in
are attributed to your account, which is what the Admin Dashboard reads.

## Structure

```
apps/
  api/   FastAPI backend (Python) — real ML pipeline
  web/   React 19 + Vite + TypeScript frontend
```

## Running locally

### Backend

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

App at `http://localhost:5173`, proxying `/api/*` to the backend.

### Tests

```bash
cd apps/api
pip install -r requirements-dev.txt
pytest
```

The tests use a throwaway data directory (`DIP_DATA_DIR`) and a small demo
dataset (`DIP_DEMO_ROW_COUNT`), so they never touch `apps/api/data/`.

## Accounts and data access

Every API route except sign-in, registration and `/health` requires a valid
session, and each use case belongs to the account that created it. Other
accounts get a 404 for it and everything under it (data, experiments,
strategies, monitoring, widgets, connectors). Admins can see every use case.
Use cases created before ownership was enforced have no owner and are
visible to admins only.

## Bringing your own data

Upload any CSV with at least 6 months of history. If its columns don't
already match DIP's Sales layout, the Data Sources page asks you to match
them: a date (or year and month), the KPI to explain, and optionally region,
category, segment, channel, and levers such as price, marketing spend,
discount and inventory. DIP guesses the mapping from the column names. Roles
you leave out are filled with neutral constants, so models ignore them,
recommendations never touch them, and the dashboard shows "—" for KPIs your
data doesn't have.

Recommendations are built from your data: each mapped lever is tested up and
down, and every region and category is moved only as far as its own history
says is normal (its 80th or 20th percentile month), and only where it has
drifted from that range.

## Deploying to a private GCP VM

If you want the platform reachable only by people who can authenticate to
your GCP project — and you want its database and trained models to survive a
redeploy — see **[DEPLOY-GCP-VM.md](DEPLOY-GCP-VM.md)**. That topology suits
this app better than the serverless options below, because the backend keeps
SQLite and every run's artifacts on local disk.

## Deploying to a public URL

The backend and frontend deploy to separate hosts. **Storage caveat first:**
the backend keeps its SQLite database and every use case's generated data,
trained models, and pipeline artifacts as plain files under `apps/api/data/`.
Most free hosting tiers give the backend an *ephemeral* filesystem — that
data is wiped on every redeploy (not on every request/sleep, just on
redeploys). Fine for a portfolio demo; not fine for anything you need to
persist across deploys without attaching a real paid volume.

### Backend — Render

1. [render.com](https://render.com) → sign in with GitHub → **New +** →
   **Blueprint** → pick the `DIP` repo. Render reads `render.yaml` at the
   repo root and configures the service automatically.
2. Once created, note the service's public URL (e.g.
   `https://dip-api.onrender.com`).
3. You'll set the `CORS_ORIGINS` env var on this service *after* the frontend
   is deployed (step below) — Render will prompt for it since it's marked
   `sync: false` in `render.yaml`; you can leave it blank for now and fill it
   in later from the service's **Environment** tab.
4. Also set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (also `sync: false`) to your own
   values. If you leave `ADMIN_PASSWORD` unset the admin account is still
   created, with a random password printed once to the service's startup
   log — setting it explicitly is simply easier than reading it back out.

### Frontend — Vercel

1. [vercel.com](https://vercel.com) → sign in with GitHub → **Add New** →
   **Project** → pick the `DIP` repo.
2. Set **Root Directory** to `apps/web` (Vercel auto-detects the Vite
   framework preset from there).
3. Add an environment variable: `VITE_API_URL` =
   `https://dip-api.onrender.com/api` (your Render URL from above, with
   `/api` appended).
4. Deploy. Note the resulting URL (e.g. `https://dip.vercel.app`).

### Wire them together

Back on Render, set `CORS_ORIGINS` to your Vercel URL (e.g.
`https://dip.vercel.app`, no trailing slash) on the `dip-api` service, then
**Manual Deploy → Deploy latest commit** to restart it with the new setting.

## Deploying to GCP (Cloud Run)

Both services are also containerized (`apps/api/Dockerfile`,
`apps/web/Dockerfile`) for Cloud Run, if you'd rather keep everything on one
platform. Same storage caveat as above: Cloud Run's filesystem is ephemeral
per revision, so the SQLite database and generated pipeline artifacts don't
survive a redeploy — fine for a demo, not for anything you need to persist
(use Cloud SQL for the database and a bucket or Filestore mount for the
pipeline artifacts if you need that). Requires the
[`gcloud` CLI](https://cloud.google.com/sdk/docs/install), authenticated
(`gcloud auth login`) against your project (`gcloud config set project
YOUR_PROJECT_ID`).

**Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` below** to choose the seeded admin
credential. There is no default password: leaving `ADMIN_PASSWORD` unset
generates a random one and prints it once to the startup log, so a deployment
never ships with a credential that is public in this repo.

### Backend

```bash
cd apps/api
gcloud run deploy dip-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_EMAIL=you@example.com,ADMIN_PASSWORD=change-this-password
```

`--source .` builds the `Dockerfile` remotely via Cloud Build — no local
Docker install needed. Note the resulting `https://dip-api-xxxxx.run.app`
URL.

### Frontend

`VITE_API_URL` is baked into the static bundle at build time, so it has to
be passed as a build arg, not a runtime env var:

```bash
cd apps/web
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/dip-web \
  --substitutions=_VITE_API_URL=https://dip-api-xxxxx.run.app/api \
  --config - <<'EOF'
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '--build-arg', 'VITE_API_URL=${_VITE_API_URL}', '-t', 'gcr.io/$PROJECT_ID/dip-web', '.']
images: ['gcr.io/$PROJECT_ID/dip-web']
EOF
gcloud run deploy dip-web \
  --image gcr.io/YOUR_PROJECT_ID/dip-web \
  --region us-central1 \
  --allow-unauthenticated
```

Note the resulting `https://dip-web-xxxxx.run.app` URL.

### Wire them together

```bash
gcloud run services update dip-api \
  --region us-central1 \
  --update-env-vars CORS_ORIGINS=https://dip-web-xxxxx.run.app
```

## Generating a full-scale dataset

The demo seeds ~150k rows for responsiveness. To generate the full 1M+ row
dataset described in the original spec:

```bash
cd apps/api
python -m app.data_generation.sales --rows 1000000 --out data/sales_full.parquet
```

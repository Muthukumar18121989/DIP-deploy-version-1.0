# Deploying to a GCP VM (private, reached over IAP)

This is the deployment shape that matches how the app actually works: one
Compute Engine VM with a persistent disk, no external IP, reached from your
laptop through an IAP TCP tunnel.

**Why a VM rather than Cloud Run.** The backend keeps real state on local
disk — SQLite at `apps/api/data/app.db` plus a directory per experiment
holding the trained model, encoded features, and artifact JSON (~5–6 MB per
pipeline run, and runs accumulate because each one is immutable). Cloud Run's
filesystem is per-revision, so every redeploy would wipe the database, the
use cases, the trained models, and the seeded admin account. Cloud Run also
autoscales, and SQLite on instance-local disk means two instances can't see
each other's data. A VM with a persistent disk avoids all of that.

Nothing here exposes the app to the internet. IAP handles authentication and
the app is only reachable by someone who can already authenticate to your GCP
project.

---

## 0. Set your variables

```bash
export PROJECT=your-project-id
export ZONE=us-central1-a
export REGION=us-central1
export VM=dip-vm
gcloud config set project "$PROJECT"
```

## 1. Network: let the VM reach the internet, and let IAP reach the VM

A VM with no external IP cannot download packages, so give it Cloud NAT for
outbound access:

```bash
gcloud compute routers create dip-router \
  --network=default --region="$REGION"

gcloud compute routers nats create dip-nat \
  --router=dip-router --region="$REGION" \
  --auto-allocate-nat-external-ips \
  --nat-all-subnet-ip-ranges
```

Then allow inbound only from IAP's range — `35.235.240.0/20` is Google's
fixed IAP forwarding range, not a public opening:

```bash
gcloud compute firewall-rules create dip-allow-iap \
  --network=default --direction=INGRESS --action=allow \
  --rules=tcp:22,tcp:8080 --source-ranges=35.235.240.0/20
```

> Skipping Cloud NAT works too — create the VM with an ephemeral external IP
> instead, install everything, then remove the IP. The firewall above still
> means nothing but IAP can reach it. Cloud NAT is the cleaner end state.

## 2. Create the VM

Ubuntu 24.04 LTS ships Python 3.12 as the system Python, which is what this
backend requires (`requirements.txt` pins `xgboost>=3.3.0`, and xgboost
dropped 3.11 at 3.3.0).

```bash
gcloud compute instances create "$VM" \
  --zone="$ZONE" \
  --machine-type=e2-medium \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-balanced \
  --no-address \
  --scopes=cloud-platform
```

`e2-medium` (2 vCPU / 4 GB) is the practical minimum — training four models
on 150,000 rows with XGBoost and scikit-learn will thrash on 2 GB. Bump to
`e2-standard-2` if you plan to generate the full 1M-row dataset.

Connect with IAP Desktop, or from a terminal:

```bash
gcloud compute ssh "$VM" --zone="$ZONE" --tunnel-through-iap
```

## 3. Install the runtimes

Everything below runs **on the VM**.

```bash
sudo apt-get update
sudo apt-get install -y python3.12 python3.12-venv python3-pip nginx git

# Node 22.x for the frontend build (>=22.12 required by vite 8 / oxlint)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # expect v22.12 or newer
```

## 4. Get the code and create a service user

```bash
sudo mkdir -p /opt/dip
sudo chown "$USER":"$USER" /opt/dip
git clone https://github.com/Muthukumar18121989/DIP-deploy-version-1.0.git /opt/dip
cd /opt/dip

sudo useradd --system --home /opt/dip --shell /usr/sbin/nologin dip || true
```

## 5. Backend

```bash
cd /opt/dip/apps/api
python3.12 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

Put the admin credentials in a root-only env file rather than in the unit
file, so they aren't readable via `systemctl cat` by other users:

```bash
sudo mkdir -p /etc/dip
sudo tee /etc/dip/api.env >/dev/null <<'ENV'
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-real-password
ENV
sudo chmod 600 /etc/dip/api.env
```

> `ADMIN_PASSWORD` has no default. If you leave it unset the app generates a
> random password and prints it **once** to the service log at first startup
> (`journalctl -u dip-api`) — setting it here is simply easier than reading
> it back out.

The data directory lives inside the checkout (`apps/api/data`), so the
service user needs to own it:

```bash
sudo mkdir -p /opt/dip/apps/api/data
sudo chown -R dip:dip /opt/dip/apps/api/data
```

Now the unit:

```bash
sudo tee /etc/systemd/system/dip-api.service >/dev/null <<'UNIT'
[Unit]
Description=DIP API (FastAPI)
After=network-online.target
Wants=network-online.target

[Service]
User=dip
Group=dip
WorkingDirectory=/opt/dip/apps/api
EnvironmentFile=/etc/dip/api.env
ExecStart=/opt/dip/apps/api/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now dip-api
sudo systemctl status dip-api --no-pager
```

Binding to `127.0.0.1` is deliberate — only nginx talks to it.

## 6. Frontend

Leave `VITE_API_URL` unset. Unset means the bundle calls `/api` on its own
origin, which is exactly what the nginx proxy below serves — same origin, so
no CORS configuration is needed either.

```bash
cd /opt/dip/apps/web
npm ci
npm run build      # emits dist/
```

## 7. nginx

The repo's `apps/web/nginx.conf` is for the Cloud Run container and has no
`/api` proxy, so write a site config for this topology instead:

```bash
sudo tee /etc/nginx/sites-available/dip >/dev/null <<'NGINX'
server {
    listen 8080;
    server_name _;
    root /opt/dip/apps/web/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # react-router owns paths like /use-cases/:id/dashboard, which aren't
    # real files — unmatched paths fall back to index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # The AI pipeline streams its thirteen stages over Server-Sent Events
        # and the run executes inside that connection. With nginx's default
        # buffering the browser receives nothing until the whole run ends, so
        # the page looks frozen and then jumps to complete. Long timeouts
        # matter for the same reason: a large dataset keeps the connection
        # open for minutes.
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    client_max_body_size 100M;   # CSV uploads
}
NGINX

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/dip /etc/nginx/sites-enabled/dip
sudo nginx -t && sudo systemctl reload nginx
```

nginx must be able to traverse into the build output:

```bash
sudo chmod o+x /opt/dip /opt/dip/apps /opt/dip/apps/web
```

## 8. Reach it from your laptop

From your own machine, not the VM:

```bash
gcloud compute start-iap-tunnel dip-vm 8080 \
  --local-host-port=localhost:8080 \
  --zone=us-central1-a
```

Open **http://localhost:8080** and sign in with the `ADMIN_EMAIL` /
`ADMIN_PASSWORD` you set. IAP Desktop can hold the same tunnel if you prefer
a GUI.

## 9. Verify

```bash
# on the VM
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/            # 200
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/auth/me # 401 (not signed in) — proxy works
journalctl -u dip-api -n 30 --no-pager
```

Then in the browser: create a use case, generate the dataset, and run the
pipeline. If stages appear one at a time, SSE is flowing correctly through
nginx. If they all appear at once at the end, `proxy_buffering off` is not
in effect.

---

## Updating

```bash
cd /opt/dip
git pull
cd apps/api && .venv/bin/pip install -r requirements.txt
cd ../web && npm ci && npm run build
sudo systemctl restart dip-api
sudo systemctl reload nginx
```

The database and pipeline artifacts under `apps/api/data/` are untouched by
this, which is the whole point of running on a VM.

## Backups

Everything that matters is one directory:

```bash
sudo tar czf ~/dip-data-$(date +%F).tar.gz -C /opt/dip/apps/api data
```

Copy it off the box (`gcloud compute scp`) or write it to a GCS bucket on a
timer. A disk snapshot schedule on the boot disk works too.

## Known limits on this topology

- **A hard browser reload during a pipeline run ends that run.** The pipeline
  executes inside the SSE connection that streams it, so when the client
  disconnects the work stops. Completed stages are saved and restored; the
  rest never execute. Re-run to finish. Navigating between pages inside the
  app is unaffected.
- **One VM, one process.** Fine for a demo or a small team. Scaling out needs
  the database moved to Cloud SQL and the artifact store in `app/pipeline/store.py`
  pointed at GCS, since both currently assume a local filesystem.
- **No TLS.** Traffic rides inside the IAP tunnel, which is encrypted, and
  nginx only listens on a port reachable from IAP. If you ever put this behind
  a load balancer for direct access, terminate TLS there and add the origin to
  `CORS_ORIGINS`.

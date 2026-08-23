# West Bay Server Setup — Full Overview

VPS: `97.74.81.110` &middot; Ubuntu (`resolute`) &middot; ~1.9GB RAM &middot; user `kadmin`

## 1. Website — westbaycomputer.com

- Static HTML site: `index.html`, `404.html`, `/profile/index.html`, favicons, `og-image.png`, `robots.txt`, `sitemap.xml`.
- Served by **nginx**, root `/var/www/westbaycomputer.com`.
- **HTTPS forced** via Let's Encrypt for `westbaycomputer.com` and `www.westbaycomputer.com` (auto-renews on every deploy run).
- Hero section: "View core services" + "Company Profile" (turquoise pill button, links to `/profile/`).
- Nav menu: About / Services / Why Us / Contact (Company Profile link removed from nav — kept as hero button only).
- Contact section card order: Address, Email, Phone, Map.

## 2. Odoo (ERP) — erp.westbaycomputer.com

- **Odoo 17 Community + PostgreSQL 15**, running as Docker containers at `/opt/odoo` on the VPS (`docker-compose.yml`, `.env` with an auto-generated DB password).
- Currently exposed **directly on ports 8069 / 8072** (all interfaces) as a temporary stopgap:
  `http://97.74.81.110:8069` — plain HTTP, no certificate (IPs can't get a trusted TLS cert).
- An **nginx reverse proxy** for `erp.westbaycomputer.com` is already configured and pointed at the containers, ready to go — it just needs:
  1. A DNS **A record**: `erp.westbaycomputer.com` → `97.74.81.110` (not set yet — you said "later").
  2. The next push after that DNS record exists will auto-issue a Let's Encrypt cert and switch to `https://erp.westbaycomputer.com` with the HTTP port exposure no longer needed.
- No Odoo database has been created yet — first real visit will show Odoo's "create database" screen.

## 3. VPS infrastructure

- OS: Ubuntu, confirmed via automated check. `ufw` firewall is **inactive** at the OS level.
- Docker + Docker Compose installed.
- nginx installed, serving both the main site and the Odoo reverse proxy.
- SSH access is key-based (password auth was replaced with a dedicated deploy key early on for security).

## 4. GitHub repo & CI/CD (`globalscopeqa/westbay`)

Three GitHub Actions workflows, **all now trigger automatically on every push to `main`** (no manual "Run workflow" needed):

| Workflow | What it does |
|---|---|
| `deploy.yml` | Syncs site files to the VPS, configures nginx, renews the site's TLS cert. |
| `deploy-odoo.yml` | Installs Docker if missing, brings up Odoo + Postgres, configures the erp reverse proxy, attempts the erp TLS cert (fails harmlessly until DNS is set). |
| `check-system.yml` | Reports OS package updates, Docker image updates, firewall status, listening ports, and local Odoo health. |

Repository secrets in use: `VPS_HOST`, `VPS_USER`, `VPS_DEPLOY_KEY` (SSH private key). An earlier `VPS_SSH_KEY` secret was also added during setup and is no longer referenced by any workflow — safe to delete if you want to tidy up.

## 5. Open items — need your action

1. **Add DNS A record** for `erp.westbaycomputer.com` → `97.74.81.110`, so Odoo gets a real HTTPS domain instead of the temporary IP:port access.
2. **Check your VPS provider's firewall/security-group dashboard** — port 8069 wasn't reachable from outside during testing even though the server itself has it open; this is likely a provider-level firewall setting outside the OS.
3. **RAM is tight** (1.9GB total) for running Odoo + Postgres alongside the website — worth watching for slowness, may need a VPS upgrade later.
4. The VPS password shared earlier in chat during initial setup should be rotated if that hasn't been done — SSH now uses key auth only, so the password isn't needed anymore.

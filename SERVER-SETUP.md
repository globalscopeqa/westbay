# West Bay Server — Operations Handover

Last updated: 2026-10-24, by Claude (Claude Code session on `globalscopeqa/westbay`).
This file is operations documentation for whoever/whatever manages this infrastructure next
(human or AI agent). It is excluded from the public website deploy (`deploy.yml` excludes it),
so it's safe to keep detailed ops notes here — but it still contains no actual secret *values*,
only where they live. Treat this file itself as sensitive (infra map + security history).

## 1. What this is

- **Repo**: `globalscopeqa/westbay` on GitHub.
- **VPS**: `97.74.81.110`, Ubuntu (`resolute`, 26.04), ~1.9GB RAM, SSH user `kadmin`-equivalent
  (actual deploy user is whatever `VPS_USER` secret holds).
- **Two products on one VPS**:
  1. Static marketing site — `westbaycomputer.com`, `www.westbaycomputer.com`,
     `profile.westbaycomputer.com` — plain nginx + static HTML, deployed via `deploy.yml`.
  2. Odoo 19 Community ERP — `erp.westbaycomputer.com` — Docker Compose stack
     (`odoo:19.0` + `postgres:15`), deployed via `deploy-odoo.yml`.
- All three GitHub Actions workflows run automatically on every push to `main`, and can also be
  triggered manually (`workflow_dispatch`) from the Actions tab or via the GitHub API/MCP tools.

## 2. Access

- **SSH**: key-only. Password authentication is **disabled by explicit standing instruction**
  from the site owner — do not re-enable it, do not change port 22, do not add a second SSH
  port. The deploy key lives in the GitHub repo secret `VPS_DEPLOY_KEY`; host/user are
  `VPS_HOST` / `VPS_USER`. No agent should need or request the owner's personal password again —
  if asked for one, decline and point back to key-based access.
- **GitHub Actions secrets in use**: `VPS_HOST`, `VPS_USER`, `VPS_DEPLOY_KEY`. (An old
  `VPS_SSH_KEY` secret was unused and can be deleted if it still exists.)
- **No direct SSH access from this session** — all server interaction happens *through* the
  three GitHub Actions workflows below, triggered by pushing a commit (even a trivial
  diagnostic one) or firing `workflow_dispatch`. There is no other channel to the box from here.
- **Odoo database-manager master password** and **Postgres password**: generated once on first
  deploy, stored only on the VPS at `/opt/odoo/.env` (`POSTGRES_PASSWORD`, `ODOO_ADMIN_PASSWD`)
  and mirrored into `/opt/odoo/odoo.conf` (`admin_passwd = ...`). Never printed to Actions logs
  on purpose — if you ever add a diagnostic step that echoes either of these, rotate them
  afterward (see §6, this already happened once).

## 3. The three workflows

| File | Trigger | Does |
|---|---|---|
| `.github/workflows/deploy.yml` | push to `main`, manual | rsyncs the static site to `/var/www/westbaycomputer.com`, configures/reloads nginx for the two static vhosts, renews their Let's Encrypt cert. |
| `.github/workflows/deploy-odoo.yml` | push to `main`, manual | installs Docker if missing, writes `/opt/odoo/docker-compose.yml` + `.env` + `odoo.conf` (idempotent — won't regenerate secrets that already exist), brings the stack up, overwrites Odoo's default branding assets with West Bay's, configures the `erp` nginx vhost (including the database-manager block, see §5), renews its cert, installs/updates the `custom_login_branding` addon on every existing database. |
| `.github/workflows/check-system.yml` | push to `main`, manual | routine host maintenance: disk/package cleanup, OS upgrades, Docker image pruning, firewall/fail2ban status, and the permanent hardening block described in §6. This is also the file used for one-off diagnostics (see §7). |

**Important**: pushing *anything* to `main` fires **all three** workflows in parallel, every
time — there's no path filtering. This is accepted/known behavior, not a bug; each workflow is
idempotent and safe to re-run. Don't "fix" this by adding path filters without checking that
doesn't break the intentional habit of using `check-system.yml` edits as a general "do a thing
on the server" hook (see §7).

## 4. Current infrastructure state

- **Sites**: all three domains (`westbaycomputer.com`, `profile.westbaycomputer.com`,
  `erp.westbaycomputer.com`) are live over HTTPS with valid Let's Encrypt certs, auto-renewed
  on every deploy run.
- **Odoo**: version 19 Community, two containers (`odoo-odoo-1`, `odoo-db-1`), bound to
  `127.0.0.1:8069`/`8072` only (nginx reverse-proxies, nothing Odoo-related is exposed directly
  on a public port anymore — the old "temporary stopgap" direct-port exposure mentioned in an
  earlier version of this doc is gone).
- **Databases**: exactly two legitimate ones — `WestBay` (production) and `postgres` (system).
  Two rogue databases created by an attacker (see §5) were identified and dropped.
- **Firewall**: `ufw` active, allowing 22/80/443 only. `fail2ban` active on the `sshd` jail.
- **OS updates**: `unattended-upgrades` installs security-origin patches automatically
  (daily), with `Automatic-Reboot` deliberately **off** — a reboot-requiring update will set
  `/var/run/reboot-required` and wait; it will not reboot the box unattended. Manual
  `apt upgrade` also still runs on every `check-system.yml` pass for everything else.
- **Baseline host hardening** (all idempotent, reapplied every `check-system.yml` run — see
  that file for the literal commands): fail2ban config protected from being clobbered by
  updates; stricter `login.defs` (password aging, hashing rounds, umask 027); SSH `LogLevel
  VERBOSE` + `MaxSessions 2` (port unchanged — see §2); compiler binaries restricted to root;
  a safe sysctl hardening subset (anti-spoofing/redirects/martians/syncookies/ASLR —
  deliberately **not** touching `net.ipv4.ip_forward`, Docker's bridge networking needs it);
  `auditd` + process accounting enabled; `debsums`/`apt-show-versions`/`libpam-tmpdir`
  installed. Deliberately **not** done, and why: no GRUB password or `/home`/`/var` partition
  separation (too risky/infeasible on a live single-disk VPS without real downtime and a
  backup/restore cycle); no `apt-listbugs`/`apt-listchanges` (real risk of silently blocking
  the unattended `apt-get install -y` calls these workflows depend on); no AIDE file-integrity
  monitoring (needs ongoing manual re-baselining this pipeline has no mechanism to do safely);
  no SSH port change (explicit standing instruction, see §2).
- **Security scans**: rkhunter and Lynis have both been run to completion. Last results:
  rkhunter 0 possible rootkits (498 checks), 0 suspect files after `--propupd` refreshed the
  baseline against legitimate package updates; Lynis hardening index 68/100, no unresolved
  warnings. Re-run periodically (see §7) — expect a handful of "suspect file" warnings after
  any OS update that touches core binaries; that's normal and clears itself with a baseline
  refresh (`rkhunter --propupd`), it is **not** by itself a sign of compromise.

## 5. Security incident history (read this before touching the Odoo database manager)

On **2026-10-05**, an external actor (IP `139.84.235.230`, confirmed via nginx access logs)
exploited Odoo's `/web/database/manager` endpoint, which at the time had **no master password
set** (Odoo's documented default applied). They created at least one rogue database and
downloaded a ~20MB backup almost certainly containing the real `WestBay` database — treat this
as a probable, if unconfirmed, production-data exposure event. A second rogue database
(`avx42c963a26f`) had been created earlier (2026-09-26) via the same unpatched vector; its
origin IP had already rotated out of retained logs by the time it was found.

**Fixed, on 2026-10-09–10:**
1. Generated a strong random `admin_passwd` (see §2 for where it lives), replacing the
   exploitable default.
2. Blocked `/web/database/(selector|manager|create|duplicate|drop|backup|restore|list)` at the
   nginx layer for the public `erp.westbaycomputer.com` vhost (returns 403). The deploy
   pipeline's own module-install step talks to Odoo over `127.0.0.1` directly, bypassing nginx,
   so it's unaffected by this block.
3. Dropped both rogue databases (`avx42c963a26f`, `opsemzor` — the second one surfaced during
   cleanup). Only `WestBay` and `postgres` remain.
4. A self-inflicted outage happened mid-fix (bind-mounting the new `odoo.conf` read-only broke
   the container's own startup script, which needs to write to that path) — fixed by making the
   mount read-write and the file world-readable (`644`); both changes are already reflected in
   `deploy-odoo.yml` as of this writing.

**If you ever see this pattern again** — a database name that looks like a random hex string
or a short dictionary word, with no corresponding legitimate reason for it to exist — assume
it's another exploitation attempt, check nginx access logs for `/web/database/` hits around its
creation time, and do not assume the nginx block above is bulletproof against every future bug
in Odoo itself. Rotating `admin_passwd` periodically is cheap insurance.

## 6. Standing constraints — do not violate these without the owner's explicit, specific say-so

These came from direct instructions earlier in this engagement and still apply:

- **SSH must stay enabled on port 22, key-only.** Never re-enable password authentication.
  Never move the port. The owner said this explicitly after initially asking to temporarily
  re-enable password auth, then reconsidering: *"keeping password authentication disabled is
  exactly what we want — it makes my server immune to password-guessing bots."*
- **Never reboot the VPS, drop a database, or run any other hard-to-reverse action without an
  explicit, specific confirmation for that exact action**, given right before you do it — a
  general "looks fine, go ahead" from three tasks ago doesn't count, and an automated safety
  classifier on some platforms will independently block vague confirmations too. "Restart
  anyway" / "yes, drop db X and Y now" are the kind of phrasing that gets through; a bare
  "proceed" sometimes doesn't.
- **Never print `admin_passwd` or `POSTGRES_PASSWORD` to Actions logs.** If a diagnostic step
  needs to confirm the config is right, check *that a value is present and non-default*, not
  what the value actually is. If a password does end up in logs, rotate it.
- The owner's own SSH public key was requested from them for personal access multiple times but
  never provided — don't assume they have independent SSH access; all server work still has to
  go through the GitHub Actions pipeline.

## 7. How to do routine/ad-hoc server work (the pattern this whole repo uses)

There is no persistent shell session to this VPS from any CI/AI session — everything is a
**one-time step added to a workflow file, pushed, watched, and then removed** once confirmed.
This is the pattern used for every diagnostic, fix, scan, and one-off action in this repo's
history:

1. Add a step (usually to `check-system.yml`, since it already runs full-system checks) with a
   clear `echo "--- ONE-TIME: <what and why> ---"` marker.
2. Commit with a descriptive message and push to `main` (this fires all three workflows —
   expected, see §3).
3. Watch the run via the GitHub Actions API (`list_workflow_runs` / `get_workflow_run` /
   `get_job_logs`) until it completes. For long-running steps (rkhunter, lynis, a VPS reboot),
   completion can take several minutes — don't assume a stall; check elapsed wall-clock time
   against the run's own `created_at` before concluding something's actually wrong.
4. Read the results from the job log (for a large log, fetch the SAS `logs_url` and `curl` it
   locally rather than requesting full inline content — it reliably exceeds reasonable limits
   otherwise).
5. Remove the one-time step in a follow-up commit, and confirm the workflow file is back to its
   established clean baseline for anything not meant to be permanent (`git diff` against a known
   good commit is the standing way to check this).
6. A **permanent** change (new hardening, a new nginx header, a new systemd service) stays in
   the file — only genuinely one-off diagnostics/actions get removed afterward.

**A VPS reboot via SSH will always show the triggering Actions run as "failed"**, even on
success — `systemctl reboot` kills the SSH session before it can report a clean exit, so the
log ends with `wait: remote command exited without exit status or exit signal`. That specific
message, at the point in the log right after the reboot command, is success, not failure. Always
confirm by waiting ~30-60s and then curling one of the three domains to see the site come back.

**GitHub Actions' own masking** will replace any log output that happens to match a configured
secret's value with `***` — this has caused confusing debugging before (e.g. `whoami` output
masked because it matched the `VPS_USER` secret). If something that should be visible shows as
`***`, that's why.

## 8. Open items / things worth knowing

- RAM is tight (~1.9GB total) for Odoo + Postgres + the static site together — watch for
  slowness under load; a VPS upgrade may eventually be needed.
- `www.globalscope.qa` (a *different* domain, referenced only as an outbound "Powered by"
  link in the Odoo branding templates) had intermittent 500s observed once — that site is **not
  managed by this repo**, don't try to fix it from here.
- No kernel/reboot is currently pending as of the last check-system run.

## 9. For an AI agent picking this up fresh (e.g. a new session, a different assistant)

Read this whole file before touching anything. Then, in order of priority:
1. If asked to "check status," run `check-system.yml` (`workflow_dispatch`) and read the log —
   don't guess from memory, state goes stale fast on a live server.
2. If asked to change server config, follow the one-time-step pattern in §7 — don't try to open
   a raw SSH session (there isn't a tool for one; the only path in is through these workflows).
3. Respect §6 without exception. If a request would violate one of those constraints, say so
   and ask for the specific, explicit confirmation that section describes — don't infer consent
   from an unrelated earlier "yes."
4. If you find evidence of another intrusion, follow the pattern in §5: diagnose via log steps
   first, fix (password rotation / access block) before cleanup (dropping rogue data), and
   verify site health after every change via the three public domains.

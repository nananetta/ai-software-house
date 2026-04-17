# Wealth Plus — Pre-Flight Deployment Checklist

Use this checklist before first use (or after any full reset). Work through each item top to bottom. All items must pass before the app is considered ready.

---

## Environment

- [ ] Node 20+ installed (`node --version` shows v20.x or higher)
- [ ] npm 10+ installed (`npm --version` shows 10.x or higher)
- [ ] Docker installed (`docker --version` succeeds)

---

## Dependencies

- [ ] Server dependencies installed (`cd implementation/server && npm install` completed without errors)
- [ ] Client dependencies installed (`cd implementation/client && npm install` completed without errors)
- [ ] Single delivery image builds successfully (`cd implementation && docker build -t wealth-plus:latest .`)
- [ ] Host data directory exists for persistent SQLite storage (example: `$HOME/wealth-plus-data`)

---

## Configuration

- [ ] `.env` file created in `implementation/server/` (copied from `.env.example`)
- [ ] `JWT_SECRET` is set to a value that is 32+ characters, randomly generated (not a word, phrase, or placeholder)
  - Generate with: `openssl rand -hex 32`
- [ ] `JWT_REFRESH_SECRET` is set to a different value, also 32+ characters, randomly generated
  - Generate a second: `openssl rand -hex 32`
- [ ] `SEED_USER1_PASSWORD` is set to a strong password (not the `.env.example` placeholder `ChangeMe001!`)
- [ ] `SEED_USER2_PASSWORD` is set to a strong password (not the `.env.example` placeholder `ChangeMe002!`)
- [ ] `CLIENT_ORIGIN` is set to `http://localhost:5173` (the Vite dev server address)
- [ ] `PORT` is set (default `4000`) and is not already in use on this machine
- [ ] Docker run command mounts a host directory to `/data` so the SQLite database persists across container restarts

---

## Database

- [ ] Database migrated — `npm run db:push` (or `npm run db:migrate`) completed without errors inside `implementation/server/`
- [ ] SQLite file created at `implementation/server/src/prisma/wealth-plus.db`
- [ ] Seed script run successfully — `npm run seed` completed without errors inside `implementation/server/`
- [ ] Both users confirmed created (check with `npm run db:studio` or `sqlite3 ... SELECT * FROM User;`)
- [ ] Containerized SQLite file created in the mounted host data directory after first startup

---

## Application Startup

- [ ] Backend server starts without errors on the configured port (default 4000)
  - Run `npm run dev` inside `implementation/server/` and confirm the startup message appears
- [ ] Frontend dev server starts without errors on port 5173
  - Run `npm run dev` inside `implementation/client/` and confirm Vite reports "Local: http://localhost:5173"
- [ ] Single container starts without errors on port 4000
  - Run `docker run --rm -p 4000:4000 -v "$HOME/wealth-plus-data:/data" ... wealth-plus:latest`
- [ ] Containerized app loads successfully at `http://localhost:4000`

---

## Functional Verification

- [ ] Login works for `net@family.local` with the password set in `SEED_USER1_PASSWORD`
- [ ] Login works for `ann@family.local` with the password set in `SEED_USER2_PASSWORD`
- [ ] Each user can only see their own data — logging in as one user shows no data from the other
- [ ] Dashboard loads with correct totals (no JavaScript errors in the browser console)
- [ ] Create a new blank snapshot — snapshot appears in the list
- [ ] Duplicate a snapshot — all items are copied into the new snapshot with previous balances pre-filled
- [ ] Edit an investment balance — amount change and % change update correctly
- [ ] Lock a snapshot — edit controls are hidden or disabled on the locked snapshot
- [ ] Allocation pie chart renders on the dashboard
- [ ] Retirement goal widget renders (after entering financial settings)

---

## Backup

- [ ] Backup directory exists or is planned (`products/wealth-plus/backups/` or equivalent)
- [ ] `ops/backup.sh` is executable (`chmod +x ops/backup.sh`) and runs successfully
- [ ] Cron job configured (optional but recommended) — see `ops/backup-strategy.md` for instructions
- [ ] `.db` file and `backups/` directory are excluded from git (`.gitignore` confirmed)

---

## Checklist Complete

Once all items above are checked, the app is ready for use. Record the date of this check:

**Checked on:** _______________

**Checked by:** _______________

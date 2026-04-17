# Wealth Plus — SQLite Backup Strategy

## Context

Wealth Plus uses a SQLite file as its database. This is appropriate for a 2-user personal app running locally — it requires no database server and the entire dataset lives in a single file:

```
implementation/server/src/prisma/wealth-plus.db
```

The backup strategy is designed accordingly: simple, file-based, and local.

---

## 1. Manual Backup

To create a point-in-time backup, copy the `.db` file with a datestamped name.

### Convention

```
wealth-plus-YYYY-MM-DD.db
```

Examples:
- `wealth-plus-2026-01-01.db`
- `wealth-plus-2026-06-30.db`

### Steps

```bash
# From the project root
cp implementation/server/src/prisma/wealth-plus.db \
   backups/wealth-plus-$(date +%Y-%m-%d).db
```

Create the backups directory first if it does not exist:

```bash
mkdir -p backups
```

### When to take a manual backup

- Before running `npm run seed` for the first time
- Before deleting the database and re-migrating
- Before any schema migration (`db:migrate`)
- Before a significant data entry session (e.g. yearly snapshot update)
- After completing and locking a yearly snapshot

---

## 2. Automated Backup Script

An automated backup script is provided at `ops/backup.sh`. It:

1. Copies the `.db` file to a `backups/` directory in the project root with today's date in the filename.
2. Keeps only the 12 most recent backup files, deleting older ones automatically.
3. Prints a confirmation message with the path to the new backup.

### Running it manually

```bash
bash ops/backup.sh
```

### Setting up a weekly cron job

To run the backup automatically every Sunday at 02:00:

```bash
crontab -e
```

Add the following line (replace `/path/to` with the absolute path to your project):

```cron
0 2 * * 0 /path/to/ai-software-house/products/wealth-plus/ops/backup.sh >> /path/to/ai-software-house/products/wealth-plus/backups/backup.log 2>&1
```

Verify the cron job is registered:

```bash
crontab -l
```

### What "keep last 12 backups" means

With weekly backups, 12 backups covers approximately 3 months of history. If you run the script more frequently, adjust the retention number in `backup.sh` by changing the value in the `tail -n +13` line.

---

## 3. Restore Procedure

To restore from a backup:

**Step 1 — Stop the backend server**

Press `Ctrl+C` in the terminal running `npm run dev` (server). Do not restore while the server is running — SQLite locks the file during active connections.

**Step 2 — Identify the backup to restore**

List available backups:

```bash
ls -lh backups/
```

Choose the file you want, e.g. `wealth-plus-2026-01-01.db`.

**Step 3 — Replace the live database file**

```bash
cp backups/wealth-plus-2026-01-01.db \
   implementation/server/src/prisma/wealth-plus.db
```

**Step 4 — Verify the schema is current**

After restoring an older backup, the schema may be behind the current Prisma schema. Run db:push to ensure the file matches the current schema without losing data:

```bash
cd implementation/server
npm run db:push
```

If Prisma reports conflicts, review the changes before proceeding. For minor additions (new columns with defaults), `db:push` is safe.

**Step 5 — Restart the server**

```bash
npm run dev
```

Log in and confirm the expected data is present.

---

## 4. Backup Location Recommendations

| Option | Notes |
|--------|-------|
| `products/wealth-plus/backups/` (default) | Simple and co-located with the project. Exclude from git with `.gitignore`. |
| External drive or USB | Protects against local disk failure. Good for long-term archival. |
| Cloud storage (iCloud, Dropbox, Google Drive) | Auto-synced off-device. Suitable since this is a personal app with no sensitive external exposure beyond the machine. |
| Separate directory outside the project | e.g. `~/Backups/wealth-plus/`. Survives accidental project folder deletion. |

**Recommended approach for a personal app:**

1. Keep automated backups in `products/wealth-plus/backups/` (excluded from git).
2. Sync the `backups/` folder to iCloud or Dropbox for off-device redundancy.
3. Before any major operation, take a manual backup with an explicit descriptive name (e.g. `wealth-plus-2026-01-01-pre-migration.db`).

### Excluding backups from git

Add to `products/wealth-plus/.gitignore` (or the root `.gitignore`):

```
products/wealth-plus/backups/
products/wealth-plus/implementation/server/src/prisma/*.db
products/wealth-plus/implementation/server/src/prisma/*.db-journal
```

---

## 5. What Is NOT Backed Up and Why

| Item | Reason not backed up |
|------|---------------------|
| `node_modules/` | Fully reproducible by running `npm install`. Checked against `package.json` and `package-lock.json`. Large (often hundreds of MB) and not unique to this installation. |
| `server/.env` | Contains secrets (JWT_SECRET, passwords). Should never be committed to git or stored in a shared backup location. Re-create from `.env.example` and re-enter secrets manually. Store secrets in a password manager instead. |
| `client/dist/` | Build output, regenerated by `npm run build`. Not needed for development. |
| `server/dist/` | Compiled TypeScript output, regenerated by `npm run build`. |
| `*.db-journal` | Temporary SQLite write-ahead file. Only present during active writes; automatically cleaned up. Has no value outside of an active SQLite session. |

The only file that contains irreplaceable data is the `.db` file itself. Everything else is either configuration (re-creatable from examples), secrets (should be stored separately), or derived output (re-buildable from source).

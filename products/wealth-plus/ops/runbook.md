# Wealth Plus — Developer Runbook

## 1. Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 20.x or higher | `node --version` |
| npm | 10.x or higher (bundled with Node 20) | `npm --version` |
| Git | Any recent version | `git --version` |
| Docker | Any recent version | `docker --version` |

Install Node 20 from https://nodejs.org or via a version manager such as `nvm`:

```bash
nvm install 20
nvm use 20
```

For the standard delivery flow, install Docker Desktop or an equivalent Docker runtime so the app can be packaged and run as a single container.

---

## 2. First-Time Setup

### 2a. Build and run the delivery container

The standard deployment artifact for Wealth Plus is a single Docker image containing both the frontend and backend application.

Build the image:

```bash
cd ai-software-house/products/wealth-plus/implementation
docker build -t wealth-plus:latest .
```

Run the container:

```bash
mkdir -p "$HOME/wealth-plus-data"

docker run --rm -p 4000:4000 \
  -v "$HOME/wealth-plus-data:/data" \
  -e JWT_SECRET="<32+ char secret>" \
  -e JWT_REFRESH_SECRET="<32+ char secret>" \
  -e SEED_USER1_PASSWORD="<seed password>" \
  -e SEED_USER2_PASSWORD="<seed password>" \
  wealth-plus:latest
```

Open the application at `http://localhost:4000`.

On container start, the image will:
- apply the Prisma schema to the SQLite database at `/data/wealth-plus.db`
- seed the default users if `SEED_USER1_PASSWORD` and `SEED_USER2_PASSWORD` are provided
- serve both frontend and backend from the same container
- reuse the same host-mounted database file across container restarts

### 2b. Clone the repository

```bash
git clone <repository-url>
cd ai-software-house/products/wealth-plus/implementation
```

### 2c. Install dependencies

Install server dependencies first, then client dependencies:

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2d. Configure environment variables

The server requires a `.env` file. Copy the provided example and then fill in real values:

```bash
cd ../server
cp .env.example .env
```

Open `server/.env` in your editor and set the following values:

**JWT_SECRET** must be at least 32 random characters. Generate one with:

```bash
openssl rand -hex 32
```

**JWT_REFRESH_SECRET** must also be at least 32 characters and different from `JWT_SECRET`. Generate a second one:

```bash
openssl rand -hex 32
```

**SEED_USER1_PASSWORD** and **SEED_USER2_PASSWORD** should be set to strong, memorable passwords before running the seed script. Once the database is seeded, changing these values does not update the stored passwords — you would need to change the password through the app or re-seed.

**CLIENT_ORIGIN** must match the URL the Vite dev server runs on. The default Vite port is 5173, so set:

```
CLIENT_ORIGIN="http://localhost:5173"
```

> The `.env.example` defaults to port 3000 — update this to 5173 for local development.

### 2e. Run Prisma migration

Apply the database schema to create (or update) the SQLite file:

```bash
cd server
npm run db:push
```

Alternatively, use the migration workflow (creates a named migration history):

```bash
npm run db:migrate
```

Use `db:push` for local development and `db:migrate` for version-controlled schema changes.

### 2f. Run the seed script

Create both user accounts in the database:

```bash
npm run seed
```

This creates:
- `net@family.local` with the password from `SEED_USER1_PASSWORD`
- `ann@family.local` with the password from `SEED_USER2_PASSWORD`

> Re-running seed on a non-empty database will error if users already exist. Reset the database first (see section 4) if you need to re-seed.

### 2g. Start the backend dev server

```bash
cd server
npm run dev
```

The API server starts on **http://localhost:4000** (or the `PORT` value in `.env`).

You should see output similar to:

```
[nodemon] starting `ts-node src/index.ts`
Server running on port 4000
```

### 2h. Start the frontend dev server

Open a second terminal:

```bash
cd client
npm run dev
```

The Vite dev server starts on **http://localhost:5173**.

### 2i. Open the app and log in

Navigate to http://localhost:5173 in your browser.

Log in with:
- **Email:** `net@family.local`
- **Password:** the value you set for `SEED_USER1_PASSWORD` in `.env`

Or for the second account:
- **Email:** `ann@family.local`
- **Password:** the value you set for `SEED_USER2_PASSWORD` in `.env`

---

## 3. Day-to-Day Dev Commands

### Container (`implementation/`)

| Command | Description |
|---------|-------------|
| `docker build -t wealth-plus:latest .` | Build the single Docker image that contains frontend and backend |
| `docker run --rm -p 4000:4000 -v "$HOME/wealth-plus-data:/data" ... wealth-plus:latest` | Run the full app from one container with persistent SQLite storage |

### Server (`implementation/server/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload via nodemon + ts-node |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Start compiled production server from `dist/index.js` |
| `npm run seed` | Seed the database with two user accounts |
| `npm run db:push` | Push schema changes to the SQLite file without creating a migration |
| `npm run db:migrate` | Create and apply a named Prisma migration |
| `npm run db:generate` | Regenerate the Prisma client after schema changes |
| `npm run db:studio` | Open Prisma Studio (visual database browser) at http://localhost:5555 |

### Client (`implementation/client/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot module replacement at http://localhost:5173 |
| `npm run build` | Type-check and build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across all TypeScript and TSX files |

---

## 4. Database Management

### Location of the SQLite file

For local development outside Docker, the database file lives at:

```
implementation/server/src/prisma/wealth-plus.db
```

This path is set by `DATABASE_URL` in `server/.env`:

```
DATABASE_URL="file:./src/prisma/wealth-plus.db"
```

Prisma also creates a `-journal` file alongside it during writes — this is normal SQLite behavior.

For the containerized deployment, the default database file lives at:

```text
/data/wealth-plus.db
```

Mount a host directory to `/data` so the SQLite file survives container recreation.

### Resetting the database

To wipe all data and start fresh:

```bash
# 1. Delete the database file
rm implementation/server/src/prisma/wealth-plus.db

# 2. Re-apply the schema
cd implementation/server
npm run db:push

# 3. Re-seed the users
npm run seed
```

### Inspecting the database with Prisma Studio

Prisma Studio provides a visual table browser:

```bash
cd implementation/server
npm run db:studio
```

Open http://localhost:5555 in your browser. You can browse and edit rows directly. Close with Ctrl+C.

### Inspecting the database with SQLite CLI

If you have the `sqlite3` CLI installed:

```bash
sqlite3 implementation/server/src/prisma/wealth-plus.db
.tables
SELECT * FROM User;
.quit
```

---

## 5. Environment Variables Reference

All variables go in `implementation/server/.env`. None are required on the client side (Vite reads `VITE_` prefixed vars from `client/.env`, but this project drives all configuration from the server).

| Variable | Required | Default in example | Description |
|----------|----------|--------------------|-------------|
| `DATABASE_URL` | Yes | `file:./src/prisma/wealth-plus.db` in local dev, `file:/data/wealth-plus.db` in Docker | SQLite connection string. Use a host-mounted path for persistent containerized storage. |
| `JWT_SECRET` | Yes | _(placeholder)_ | Secret used to sign access tokens. Must be at least 32 random characters. Generate with `openssl rand -hex 32`. |
| `JWT_REFRESH_SECRET` | Yes | _(placeholder)_ | Secret used to sign refresh tokens. Must be at least 32 characters and different from `JWT_SECRET`. |
| `JWT_ACCESS_EXPIRES_IN` | Yes | `15m` | Access token lifetime in jsonwebtoken format (e.g. `15m`, `1h`). |
| `JWT_REFRESH_EXPIRES_IN` | Yes | `7d` | Refresh token lifetime (e.g. `7d`, `30d`). |
| `PORT` | No | `4000` | Port the Express server listens on. |
| `NODE_ENV` | No | `development` | Node environment. Use `production` for production builds. |
| `CLIENT_ORIGIN` | Yes | `http://localhost:5173,http://localhost:4000` | Comma-separated list of allowed CORS origins. Include the Vite dev server URL for local development and the app URL for containerized runs. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in milliseconds (default: 15 minutes). Applies to `/api/auth/login`. |
| `RATE_LIMIT_MAX` | No | `10` | Maximum login attempts per window before requests are blocked. |
| `SEED_USER1_PASSWORD` | Yes (for seeding) | `ChangeMe001!` | Password assigned to `net@family.local` when `npm run seed` is run. Set before first seed. |
| `SEED_USER2_PASSWORD` | Yes (for seeding) | `ChangeMe002!` | Password assigned to `ann@family.local` when `npm run seed` is run. Set before first seed. |
| `AUTO_SEED_ON_START` | No | `true` | When `true`, the container attempts to seed the default users during startup. |

---

## 6. Troubleshooting

### Port already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::4000`

**Resolution:**

Find and kill the process using the port:

```bash
# Find the process
lsof -i :4000

# Kill it (replace PID with the number shown)
kill -9 <PID>
```

Or change the `PORT` value in `server/.env` to a free port (e.g. `4001`) and update `CLIENT_ORIGIN` accordingly if needed.

---

### JWT_SECRET too short

**Symptom:** Server starts but returns 500 errors on login, or a startup validation error such as `JWT_SECRET must be at least 32 characters`.

**Resolution:**

Generate a proper secret:

```bash
openssl rand -hex 32
```

Paste the output into `server/.env` as the value of `JWT_SECRET`. Do the same for `JWT_REFRESH_SECRET` using a second run of the command.

---

### Prisma schema out of sync

**Symptom:** Errors like `The table 'main.RefreshToken' does not exist in the current database`, or Prisma client methods failing with unknown field errors.

**Resolution:**

Re-push the schema to the database:

```bash
cd implementation/server
npm run db:push
```

If you changed the schema and need to regenerate the client:

```bash
npm run db:generate
```

For a full reset, delete the `.db` file and re-push:

```bash
rm src/prisma/wealth-plus.db
npm run db:push
npm run seed
```

---

### CORS error in browser

**Symptom:** Browser console shows `Access to XMLHttpRequest at 'http://localhost:4000' from origin 'http://localhost:5173' has been blocked by CORS policy`.

**Resolution:**

Open `server/.env` and confirm `CLIENT_ORIGIN` includes the exact origin the frontend is running on:

```
CLIENT_ORIGIN="http://localhost:5173"
```

If you are running the frontend on a different port, update the value accordingly. Restart the backend server after changing `.env`.

---

### Cookie not sent (refresh token missing)

**Symptom:** Silent 401 errors after the 15-minute access token expires. The frontend does not automatically re-authenticate.

**Resolution:**

This is typically a `withCredentials` / `SameSite` configuration issue.

1. Confirm the Axios instance in the client sets `withCredentials: true`.
2. Confirm the server sets the refresh token cookie with `httpOnly: true` and `sameSite: 'lax'` (or `'none'` with `secure: true` for cross-origin setups).
3. Both frontend and backend must be on the same origin (localhost) for `SameSite: 'lax'` to work without `secure`. In local dev, keep both on `localhost` with different ports.

---

### Cannot log in — invalid credentials

**Symptom:** Login returns 401 even with correct email.

**Resolution:**

The password stored in the database comes from the value of `SEED_USER1_PASSWORD` / `SEED_USER2_PASSWORD` at the time `npm run seed` was run. If those values were changed after seeding, the stored hash no longer matches.

To fix: reset the database and re-seed, ensuring the `.env` passwords are set correctly before running `npm run seed`.

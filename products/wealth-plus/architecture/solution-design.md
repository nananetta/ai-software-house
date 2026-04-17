# Solution Design — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft
**Author:** Solution Architect
**Reviewed by:** (pending CEO sign-off)

---

## 1. Solution Overview

Wealth Plus is a private, two-user personal wealth tracking web application. It replaces a manual Google Sheets workflow in which the couple records investment balances once or twice a year, compares growth versus the prior period, and monitors progress toward a personal retirement target.

The core interaction model is the **snapshot**: a dated, point-in-time record of all investment positions for one user. The primary workflow is:

1. User logs in.
2. Creates a new snapshot by duplicating the most recent one (all rows pre-populated with prior balances).
3. Updates current balances inline.
4. Reviews gain/loss per investment and overall portfolio metrics on the dashboard.
5. Locks the snapshot to protect historical data.

The system must enforce strict per-user data isolation, support a spreadsheet-like ledger feel with inline editing, and deliver computed analytics (allocation breakdown, retirement projection) server-side.

This is **not** a trading system. There is no real-time data feed, no multi-currency FX conversion in v1, and no external integrations. The application runs locally on localhost for v1.

---

## 2. Architecture Style

### Pattern: Monorepo — Client-Server SPA with Local-First SQLite

The application is built as a monorepo containing two independently runnable packages:

| Package | Technology |
|---------|-----------|
| `client/` | React 18 + Vite SPA (TypeScript strict) |
| `server/` | Node.js 20 + Express REST API (TypeScript strict) |

**Why monorepo over split repos:**
- Two-person personal tool — no separate team ownership concern.
- Shared TypeScript types between client and server are straightforward in a monorepo.
- Single `npm install` and coordinated `dev` scripts.

**Why SPA over SSR:**
- No SEO requirement for a private, authenticated-only application.
- SPA enables fast, spreadsheet-like inline editing without full-page reloads.
- React Query handles server state, caching, and optimistic updates naturally in a SPA.

**Why SQLite over PostgreSQL:**
- Zero infrastructure. Runs on a local machine with no Docker, no Postgres daemon.
- Two users, low write frequency (a few times per year), small dataset — SQLite is more than sufficient.
- Prisma's provider abstraction means migrating to PostgreSQL later requires only changing the `datasource provider` string in `schema.prisma` and running `prisma migrate deploy`.

**Why local-first (localhost) for v1:**
- No cloud hosting cost or complexity for a personal tool.
- No need for HTTPS certificate management in v1 (HTTPS required when deployed beyond localhost per BR-050).
- Simplifies secret management to a local `.env` file.

---

## 3. Component Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React SPA (client/)                        │   │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │   │
│  │  │  Pages   │  │  Features  │  │  Shared Components│   │   │
│  │  └──────────┘  └────────────┘  └──────────────────┘   │   │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │   │
│  │  │  Hooks   │  │   Store    │  │    API Layer      │   │   │
│  │  │ (Query)  │  │ (Zustand)  │  │   (Axios)         │   │   │
│  │  └──────────┘  └────────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/JSON (REST)
                                │ Access token: Authorization header
                                │ Refresh token: httpOnly cookie
┌───────────────────────────────▼─────────────────────────────────┐
│                      Express API (server/)                       │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Auth         │  │  Rate Limiter│  │  Request Logger      │ │
│  │  Middleware   │  │  (login only)│  │  (redacts secrets)   │ │
│  └───────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Routers → Controllers → Services                         │  │
│  │  auth / me / snapshots / items / dashboard                │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Zod Validation Layer (all incoming request bodies)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM Client                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Prisma queries (parameterized)
┌───────────────────────────────▼─────────────────────────────────┐
│              SQLite Database (wealth-plus.db)                    │
│  Users | UserFinancialSettings | Snapshots | SnapshotItems       │
│  RefreshTokens                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **React SPA** | Renders all UI; manages client-side routing via React Router v6; handles user interactions; coordinates server state via TanStack Query; manages lightweight UI state (modals, sidebar open) via Zustand. |
| **Axios API Layer** (`client/src/api/`) | Wraps all HTTP calls to the Express API; injects the JWT access token from memory into `Authorization: Bearer` headers; intercepts 401 responses to trigger silent token refresh before retrying the original request. |
| **TanStack Query (React Query)** | Caches and synchronizes server state for snapshots, items, dashboard data, and settings; provides loading/error states; invalidates relevant query keys after mutations. |
| **Zustand Store** (`client/src/store/`) | Holds ephemeral UI state: currently authenticated user identity (name, email extracted from JWT), active snapshot selector value, inline edit state. Does not persist to localStorage in v1. |
| **React Hook Form + Zod** | Handles form validation on the client side (login, snapshot header, item add, settings). Zod schemas are the single source of truth for client-side validation rules. |
| **Express Router** (`server/src/routes/`) | Declares route paths and HTTP verbs; attaches middleware chains (auth guard, rate limiter, Zod body parser). |
| **Controllers** (`server/src/controllers/`) | Thin HTTP layer: extract validated request data, call the appropriate service, and serialize the response. No business logic lives here. |
| **Services** (`server/src/services/`) | All business logic: comparison engine, retirement projection formula, snapshot duplication, lock enforcement, userId scoping. Services receive plain data objects and return plain data objects. |
| **Auth Middleware** (`server/src/middleware/auth.ts`) | Verifies the JWT access token on every protected route. Extracts `userId` and attaches it to `req.user`. Returns 401 if token is missing or invalid. |
| **Zod Validation Middleware** (`server/src/middleware/validate.ts`) | Generic middleware factory that validates `req.body` against a provided Zod schema. Returns 400 with field-level errors on failure. |
| **Prisma ORM** | Provides a type-safe database client generated from `schema.prisma`. All queries are parameterized — no raw SQL with interpolated user input. Handles migrations and the seed script. |
| **SQLite Database** | Single-file relational database (`wealth-plus.db`) stored on the local filesystem. Tables: `User`, `UserFinancialSettings`, `Snapshot`, `SnapshotItem`, `RefreshToken`. |
| **RefreshToken Store** (DB table) | Server-side token store for refresh tokens. Each token is stored hashed. On logout or password change, the token record is deleted, invalidating the session. |

---

## 4. Data Flow

### 4.1 Login Flow

```
Client                          Server                          DB
  │                               │                              │
  │  POST /api/auth/login         │                              │
  │  { email, password }          │                              │
  │──────────────────────────────►│                              │
  │                               │  SELECT user WHERE email     │
  │                               │─────────────────────────────►│
  │                               │◄─────────────────────────────│
  │                               │  bcrypt.compare(password)    │
  │                               │  sign JWT access (15 min)    │
  │                               │  generate refresh token      │
  │                               │  INSERT RefreshToken (hashed)│
  │                               │─────────────────────────────►│
  │  200 { accessToken, user }    │                              │
  │  Set-Cookie: refreshToken     │                              │
  │◄──────────────────────────────│                              │
  │  Store accessToken in memory  │                              │
```

### 4.2 Authenticated Request Flow (Access Token Expired)

```
Client                          Server
  │                               │
  │  GET /api/snapshots           │
  │  Authorization: Bearer <exp>  │
  │──────────────────────────────►│
  │  401 Unauthorized             │
  │◄──────────────────────────────│
  │  POST /api/auth/refresh       │
  │  (cookie: refreshToken sent)  │
  │──────────────────────────────►│
  │                               │  Validate refresh token hash
  │                               │  Issue new access token
  │  200 { accessToken }          │
  │◄──────────────────────────────│
  │  Retry GET /api/snapshots     │
  │  Authorization: Bearer <new>  │
  │──────────────────────────────►│
  │  200 { snapshots: [...] }     │
  │◄──────────────────────────────│
```

### 4.3 Create Snapshot by Duplication (Primary Workflow)

```
Client                          Server                          DB
  │                               │                              │
  │  POST /api/snapshots/:id/     │                              │
  │  duplicate                    │                              │
  │  { snapshotName, date }       │                              │
  │──────────────────────────────►│                              │
  │                               │  Auth middleware: verify JWT │
  │                               │  Find source snapshot (highest
  │                               │  snapshotDate for userId)    │
  │                               │─────────────────────────────►│
  │                               │  SELECT Snapshot + Items     │
  │                               │◄─────────────────────────────│
  │                               │  Verify source.userId ==     │
  │                               │  req.user.id → else 403      │
  │                               │  BEGIN TRANSACTION           │
  │                               │  INSERT new Snapshot         │
  │                               │  INSERT SnapshotItems        │
  │                               │  (copy type/institution/name/│
  │                               │  currency/note/displayOrder; │
  │                               │  currentBalance = source val)│
  │                               │  COMMIT                      │
  │                               │─────────────────────────────►│
  │  201 { snapshot with items }  │                              │
  │◄──────────────────────────────│                              │
  │  Navigate to /snapshots/:newId│                              │
```

### 4.4 View Snapshot with Comparison Data

```
Client                          Server                          DB
  │                               │                              │
  │  GET /api/snapshots/:id       │                              │
  │──────────────────────────────►│                              │
  │                               │  SELECT Snapshot WHERE id    │
  │                               │  AND userId = req.user.id    │
  │                               │─────────────────────────────►│
  │                               │  SELECT SnapshotItems        │
  │                               │  SELECT prior Snapshot       │
  │                               │  (max snapshotDate < current)│
  │                               │  SELECT prior SnapshotItems  │
  │                               │◄─────────────────────────────│
  │                               │  Run comparison engine:      │
  │                               │  For each current item,      │
  │                               │  find matching prior item    │
  │                               │  (investmentName +           │
  │                               │   institution +              │
  │                               │   investmentType, case-insens│
  │                               │  Compute amountChange,       │
  │                               │  percentChange               │
  │                               │  Build closedItems list      │
  │  200 { snapshot, items with  │                              │
  │  comparison, closedItems }    │                              │
  │◄──────────────────────────────│                              │
```

### 4.5 Dashboard Load Flow

```
Client                          Server                          DB
  │                               │                              │
  │  GET /api/dashboard           │                              │
  │──────────────────────────────►│                              │
  │                               │  Find latest snapshot for    │
  │                               │  userId                      │
  │                               │  Find prior snapshot         │
  │                               │─────────────────────────────►│
  │                               │  SELECT Snapshots + Items    │
  │                               │◄─────────────────────────────│
  │                               │  Compute:                    │
  │                               │  totalCurrent, totalPrevious │
  │                               │  changeAmount, changePercent │
  │                               │  Return snapshot list (5)    │
  │  200 { totalCurrent,         │                              │
  │  totalPrevious, changeAmount, │                              │
  │  changePercent, recentSnaps } │                              │
  │◄──────────────────────────────│                              │
  │                               │                              │
  │  GET /api/dashboard/allocation│                              │
  │──────────────────────────────►│                              │
  │                               │  Group items by type → SUM   │
  │  200 { allocation: [...] }    │                              │
  │◄──────────────────────────────│                              │
  │                               │                              │
  │  GET /api/dashboard/retirement│                              │
  │──────────────────────────────►│                              │
  │                               │  Load UserFinancialSettings  │
  │                               │  Run FV formula              │
  │  200 { projectedFV, gap,     │                              │
  │  progressPercent, years }     │                              │
  │◄──────────────────────────────│                              │
```

---

## 5. API Contract Summary

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <accessToken>` header.

### Authentication

| Method | Path | Auth | Key Request Fields | Response Shape |
|--------|------|------|--------------------|----------------|
| POST | `/auth/login` | No | `email`, `password` | `{ accessToken, user: { id, email, name } }` + Set-Cookie refreshToken |
| POST | `/auth/refresh` | Cookie | — (reads httpOnly cookie) | `{ accessToken }` |
| POST | `/auth/logout` | Yes | — | `{ message: "logged out" }` + clears cookie |

### Current User

| Method | Path | Auth | Key Request Fields | Response Shape |
|--------|------|------|--------------------|----------------|
| GET | `/me` | Yes | — | `{ id, email, name, createdAt }` |
| PUT | `/me` | Yes | `name?`, `currentPassword?`, `newPassword?` | `{ id, email, name }` |
| GET | `/me/financial-settings` | Yes | — | `UserFinancialSettings` object |
| PUT | `/me/financial-settings` | Yes | `currentAge?`, `retirementAge?`, `retirementTargetAmount?`, `expectedAnnualReturn?`, `expectedAnnualContribution?` | `UserFinancialSettings` object |

### Snapshots

| Method | Path | Auth | Key Request Fields | Response Shape |
|--------|------|------|--------------------|----------------|
| GET | `/snapshots` | Yes | — | `{ snapshots: [{ id, snapshotName, snapshotDate, total, changeAmount, changePercent, isLocked }] }` |
| POST | `/snapshots` | Yes | `snapshotName`, `snapshotDate`, `notes?` | `{ snapshot }` (with empty items array) |
| GET | `/snapshots/:id` | Yes | — | `{ snapshot, items: [item + comparison fields], closedItems }` |
| PUT | `/snapshots/:id` | Yes | `snapshotName?`, `snapshotDate?`, `notes?` | `{ snapshot }` |
| DELETE | `/snapshots/:id` | Yes | — | `204 No Content` |
| POST | `/snapshots/:id/duplicate` | Yes | `snapshotName`, `snapshotDate`, `notes?` | `201 { snapshot, items }` |
| POST | `/snapshots/:id/lock` | Yes | — | `{ snapshot }` with `isLocked: true` |
| POST | `/snapshots/:id/unlock` | Yes | — | `{ snapshot }` with `isLocked: false` |

### Snapshot Items

| Method | Path | Auth | Key Request Fields | Response Shape |
|--------|------|------|--------------------|----------------|
| POST | `/snapshots/:id/items` | Yes | `investmentType`, `institution`, `investmentName`, `currentBalance`, `currency?`, `note?`, `displayOrder?` | `{ item }` |
| PUT | `/snapshots/:id/items/:itemId` | Yes | any subset of item fields | `{ item }` |
| DELETE | `/snapshots/:id/items/:itemId` | Yes | — | `204 No Content` |

### Dashboard

| Method | Path | Auth | Key Request Fields | Response Shape |
|--------|------|------|--------------------|----------------|
| GET | `/dashboard` | Yes | `?snapshotId=` (optional) | `{ snapshotId, snapshotName, totalCurrent, totalPrevious, changeAmount, changePercent, recentSnapshots }` |
| GET | `/dashboard/allocation` | Yes | `?snapshotId=` (optional) | `{ allocation: [{ investmentType, total, percent }] }` |
| GET | `/dashboard/retirement` | Yes | — | `{ projectedFV, gap, progressPercent, yearsRemaining, settings }` |

---

## 6. Data Model

The Prisma schema below refines the model from PRD Section 9 with one addition: a `RefreshToken` table to support server-side refresh token invalidation (required by BR-004).

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id             String                  @id @default(uuid())
  email          String                  @unique
  password       String                  // bcrypt hash, cost factor 12
  name           String
  settings       UserFinancialSettings?
  snapshots      Snapshot[]
  refreshTokens  RefreshToken[]
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt
}

// Added: server-side refresh token store (BR-004)
// Allows invalidation on logout and password change.
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique  // SHA-256 hash of the raw refresh token
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model UserFinancialSettings {
  id                         String   @id @default(uuid())
  userId                     String   @unique
  user                       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  baseCurrency               String   @default("THB")
  currentAge                 Int?
  retirementAge              Int?
  retirementTargetAmount     Float?
  expectedAnnualReturn       Float?
  expectedAnnualContribution Float?
  updatedAt                  DateTime @updatedAt
}

model Snapshot {
  id           String         @id @default(uuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  snapshotName String
  snapshotDate DateTime       // Stored as date; ISO 8601 YYYY-MM-DD
  notes        String?
  isLocked     Boolean        @default(false)
  items        SnapshotItem[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([userId, snapshotDate])  // Added: speeds up prior-snapshot lookup (BR-026)
}

model SnapshotItem {
  id             String   @id @default(uuid())
  snapshotId     String
  snapshot       Snapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  investmentType String   // Free text; preset codes defined in BR-022
  institution    String   // Free text; preset names defined in BR-023
  investmentName String
  currentBalance Float    // Must be >= 0 (BR-021)
  currency       String   @default("THB")
  note           String?
  displayOrder   Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([snapshotId, displayOrder])  // Added: speeds up ordered item fetch
}
```

### Schema Changes vs PRD

| Change | Reason |
|--------|--------|
| Added `RefreshToken` model | BR-004 requires server-side invalidation. Without this table, logout cannot truly invalidate a refresh token — only expiry can. |
| Added `User.refreshTokens` relation | Supports cascade delete when a user is removed. |
| Added `@@index([userId, snapshotDate])` on `Snapshot` | The comparison engine queries "prior snapshot for userId by date" repeatedly; this index eliminates a full table scan. |
| Added `@@index([snapshotId, displayOrder])` on `SnapshotItem` | Items are always fetched ordered by `displayOrder`; this index makes the sort efficient. |
| Added `onDelete: Cascade` on `UserFinancialSettings` and `RefreshToken` | Ensures clean deletion if a user record is ever removed. |
| `snapshotDate` type remains `DateTime` | SQLite does not have a native DATE type; Prisma stores it as a DateTime. Application code truncates time to midnight UTC when storing and compares by date only for the comparison engine. |

---

## 7. Security Architecture

### 7.1 JWT Strategy

```
┌─────────────────────────────────────────────────────┐
│  Access Token (JWT, signed HS256)                   │
│  Payload: { sub: userId, email, name, iat, exp }    │
│  Lifetime: 15 minutes                               │
│  Storage: JavaScript memory (not localStorage)      │
│  Transport: Authorization: Bearer <token> header    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Refresh Token (opaque random token, 32 bytes hex)  │
│  Lifetime: 7 days                                   │
│  Storage (client): httpOnly, Secure, SameSite=Strict│
│           cookie — NOT accessible via JavaScript    │
│  Storage (server): SHA-256 hash in RefreshToken     │
│           table with expiresAt                      │
│  Transport: Sent automatically by browser on POST   │
│           /api/auth/refresh                         │
└─────────────────────────────────────────────────────┘
```

**Access token signing key:** Loaded from `JWT_SECRET` environment variable at server startup. Must be at least 32 characters of cryptographically random data. Never hardcoded.

**Refresh token lifecycle:**
- Generated on login using `crypto.randomBytes(32).toString('hex')`.
- SHA-256 hash stored in `RefreshToken.tokenHash`.
- On `POST /api/auth/refresh`: hash the incoming token, look up the row, verify `expiresAt > now()`, issue a new access token.
- On `POST /api/auth/logout`: delete the `RefreshToken` row — the cookie is simultaneously cleared.
- On `PUT /me` (password change): delete ALL `RefreshToken` rows for the user to force re-login on all sessions.

**Silent refresh flow (client):**
Axios response interceptor detects a 401 from any protected endpoint. It calls `POST /api/auth/refresh` (cookie sent automatically). On success, the new access token is stored in memory and the failed request is retried. On failure (refresh token expired or missing), the user is redirected to `/login`.

### 7.2 Password Hashing

- Algorithm: bcrypt via the `bcrypt` npm package.
- Cost factor: **12 rounds** (BR-001).
- Passwords are never stored in plaintext, never logged, and never returned in any API response.

### 7.3 Rate Limiting

- Library: `express-rate-limit`.
- Applied **only** to `POST /api/auth/login` (BR-005).
- Window: 15 minutes.
- Max attempts: 10 per IP.
- Response on breach: HTTP 429 with `{ error: "Too many requests, please try again later." }`.
- General API rate limiting (optional, recommended): 200 req/min per IP on all routes to prevent abuse.

### 7.4 Row-Level Data Isolation (BR-006)

Every Prisma query that touches `Snapshot`, `SnapshotItem`, or `UserFinancialSettings` includes `where: { userId: req.user.id }` or verifies `snapshot.userId === req.user.id` before proceeding. A mismatch at any layer returns HTTP 403. No query is executed without a verified `userId` on the request context.

### 7.5 Input Validation

- Both layers validate using **Zod schemas** (BR-047).
- Backend Zod validation is authoritative — it runs before any database call.
- A shared `validate` middleware wraps every POST/PUT route.
- Validation errors return HTTP 400 with a structured body: `{ error: "Validation failed", fields: { fieldName: "message" } }`.

### 7.6 Other Protections

| Threat | Mitigation |
|--------|-----------|
| SQL injection | Prisma parameterized queries only (BR-048). No `$queryRaw` with user input. |
| XSS | React's default JSX escaping; no `dangerouslySetInnerHTML` with user data (BR-049). |
| CSRF | `SameSite=Strict` on the refresh token cookie prevents cross-site requests from triggering refresh. Access token is sent in a header (not a cookie), so CSRF cannot forge authenticated API calls. |
| Sensitive data in logs | Request logging middleware redacts the `Authorization` header and any body field named `password`, `token`, or `refreshToken` (BR-051). |
| HTTPS | Required for any deployment beyond localhost (BR-050). |

---

## 8. Non-Functional Requirements

| Requirement | Implementation |
|------------|---------------|
| **Local-only deployment** | No cloud infrastructure in v1. Runs on `localhost:3000` (client, Vite dev server) and `localhost:4000` (Express API). `npm run dev` in monorepo root starts both. |
| **SQLite** | Single-file database at path configured in `DATABASE_URL` env var (e.g., `file:./wealth-plus.db`). File lives in `server/prisma/`. |
| **TypeScript strict** | Both `client/tsconfig.json` and `server/tsconfig.json` enable `"strict": true`. No `any` types in application code (lint rule enforced). |
| **THB formatting** | All monetary values formatted with `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 })` or equivalent comma-separated formatting (1,500,000.00). Formatting is a UI concern only — amounts are stored as raw floats. |
| **No real-time sync** | No WebSockets, SSE, or polling. Each user logs in independently. TanStack Query caches data per session; cache is invalidated after mutations. |
| **Thai investment type labels** | Preset investment type Thai labels (from BR-022) are stored in a client-side constant and displayed in the UI. The database stores the code string (e.g., `CASH_DEPOSIT`); the UI maps codes to Thai labels on render. |
| **Seed script** | `npm run seed` inside `server/` creates exactly two user accounts (`net@family.local`, `ann@family.local`) with bcrypt-hashed passwords. No snapshots or settings are seeded (BR-055). |
| **No self-registration** | The `POST /api/auth/register` endpoint does not exist. The auth router only exposes login, refresh, and logout (BR-007). |

---

## 9. Technical Decisions and Trade-offs

### 9.1 SQLite vs PostgreSQL

| Factor | SQLite | PostgreSQL |
|--------|--------|-----------|
| Infrastructure | None — single file | Requires running server process |
| Performance at scale | Excellent for 2 users, <10k rows | Far more scalable, unnecessary here |
| Concurrent writes | Single writer (fine for personal use) | Multi-writer MVCC |
| Migration path | Change one line in `schema.prisma` | Already there |
| Backup | Copy `.db` file | `pg_dump` |
| **Decision** | **SQLite for v1** | **Migrate if ever deployed to cloud** |

### 9.2 Monorepo vs Split Repos

| Factor | Monorepo | Split Repos |
|--------|----------|-------------|
| Type sharing | Easy — shared `types/` folder | Requires publishing package or symlinking |
| Deployment | Single `npm install` | Separate CI/CD pipelines |
| Team size | Ideal for 1–2 developers | Better for large teams |
| **Decision** | **Monorepo** | Not needed for this scale |

### 9.3 SPA vs SSR (Next.js)

| Factor | SPA (React + Vite) | SSR (Next.js) |
|--------|-------------------|---------------|
| SEO | Irrelevant — auth-gated | Not needed |
| Inline editing UX | Excellent — no page reloads | Possible but more complex |
| Bundle size | Fine for internal tool | Fine either way |
| Complexity | Simpler | Additional server rendering layer |
| **Decision** | **SPA** | Over-engineered for this use case |

### 9.4 Refresh Token Storage: httpOnly Cookie vs localStorage

Access tokens in localStorage are vulnerable to XSS theft. Storing the refresh token in an httpOnly cookie means JavaScript cannot read it, protecting it from XSS. The trade-off is that `SameSite=Strict` must be set to prevent CSRF. This is enforced by BR-003.

### 9.5 Comparison Engine: Server-Side vs Client-Side

The comparison engine (matching items across snapshots, computing amountChange and percentChange) runs on the server. This keeps business logic out of the React layer, ensures the computed values are consistent regardless of client, and makes the data easily testable in unit tests without rendering a React component.

### 9.6 Denormalized Snapshot Total: Not Stored

Snapshot totals (`SUM(currentBalance)`) are computed on read rather than stored as a denormalized column (BR-054). For a dataset with at most a few dozen items per snapshot, this query is negligible. Denormalization would add complexity and the risk of stale totals.

---

## 10. Risks and Assumptions

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R-001 | Locked snapshot edited via direct DB access | Low | High | API enforces 403 on writes to locked snapshots (BR-013). Document clearly in ops guide. |
| R-002 | Comparison engine wrong if snapshots created out of date order | Medium | Medium | Comparison uses `snapshotDate` (not `createdAt`) for prior-snapshot resolution (BR-026). Covered by automated tests. |
| R-003 | User accidentally deletes snapshot with no undo | Medium | High | UI shows confirmation dialog. Consider soft-delete (`deletedAt` timestamp) as a v1.1 improvement. |
| R-004 | SQLite file corruption on local machine | Low | High | Document a backup script (`cp wealth-plus.db wealth-plus.backup.$(date +%Y%m%d).db`). Automated cron backup deferred to ops phase. |
| R-005 | Duplicate rows cause ambiguous comparison | Low | Medium | UI warns on save if triple-key collision detected (BR-015). Comparison picks the first match; behavior documented. |
| R-006 | Retirement projection formula misunderstood by user | Medium | Low | Formula displayed in UI tooltip (US-032). Units and assumptions are explicit. |
| R-007 | Refresh token cookie flags misconfigured | Low | High | `httpOnly + Secure + SameSite=Strict` enforced in code. Integration test verifies cookie flags on login response. |
| R-008 | JWT secret leaked from `.env` | Low | High | `.env` added to `.gitignore`. Server startup fails if `JWT_SECRET` is not set or shorter than 32 characters. |

### Assumptions

| ID | Assumption |
|----|-----------|
| A-001 | The application will run on a single machine for both users (sequential use, not simultaneous). SQLite's single-writer model is acceptable. |
| A-002 | Dataset size remains small: <50 investment rows per snapshot, <20 snapshots total per user over the application lifetime. |
| A-003 | All investment balances are in THB. Multi-currency conversion is not needed in v1. |
| A-004 | The two user accounts are static — there is no need to add, remove, or rename users in v1. |
| A-005 | No email delivery is required in v1. Password resets are handled manually (re-running the seed script or a future admin script). |
| A-006 | The React client and Express server run on the same machine. CORS is configured to allow `http://localhost:3000` during development. |
| A-007 | `snapshotDate` is compared at the date level (year-month-day), ignoring time of day, for the purpose of prior-snapshot resolution. |

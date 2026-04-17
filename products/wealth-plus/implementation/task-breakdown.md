# Task Breakdown — Wealth Plus MVP

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Ready for development
**Author:** Tech Lead

---

## Conventions

- **Phases:** 1 = Foundation | 2 = Snapshot Engine | 3 = Analytics | 4 = Polish
- **Assignee:** BE = Backend Developer | FE = Frontend Developer
- **Dependencies:** A task cannot start until all listed dependency tasks have a "done" check.
- **Done criteria:** Each condition is independently verifiable without running the full app.

---

## Phase 1 — Foundation

---

### TASK-001
**Title:** Monorepo scaffold and tooling setup
**Assigned to:** BE
**Phase:** 1
**Dependencies:** none

**Description:**
Create the monorepo root and both package folders. Set up npm workspaces, TypeScript configurations, ESLint, and development runner.

Steps:
1. Create `wealth-plus/` root with `package.json` (workspaces: `["client", "server"]`), `.gitignore`, `.nvmrc` (value: `20`).
2. Add `concurrently` to root devDependencies.
3. Add root scripts: `dev`, `build`, `db:generate`, `db:migrate`, `db:seed`.
4. Create `server/` with `package.json`, `tsconfig.json` (strict mode, target ES2022, outDir `dist`), `tsconfig.build.json`.
5. Install server dependencies: `express`, `jsonwebtoken`, `bcrypt`, `zod`, `cookie-parser`, `cors`, `express-rate-limit`.
6. Install server devDependencies: `typescript`, `tsx`, `@types/express`, `@types/node`, `@types/jsonwebtoken`, `@types/bcrypt`, `@types/cookie-parser`, `@types/cors`, `eslint`, `@typescript-eslint/eslint-plugin`.
7. Create `server/src/index.ts` (entry point stub that logs "Server starting..." and exits).
8. Create `server/src/app.ts` (Express app factory stub returning an app with no routes).
9. Confirm `npm run dev -w server` exits cleanly with no TypeScript errors.
10. Create `client/` with `package.json` using `vite` + `react` + `typescript` template.
11. Install client dependencies: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zustand`, `axios`, `react-hook-form`, `zod`, `recharts`, `tailwindcss`, `postcss`, `autoprefixer`.
12. Install shadcn/ui base: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
13. Configure `tailwind.config.js` and `postcss.config.js`.
14. Configure `vite.config.ts` with proxy: `/api` → `http://localhost:4000`.
15. Confirm `npm run dev -w client` opens a blank Vite page at `http://localhost:3000` with no TypeScript errors.

**Done criteria:**
- [ ] `npm install` at root installs all workspace dependencies without errors.
- [ ] `npm run dev` (from root, via concurrently) starts both server (port 4000) and client (port 3000) without errors.
- [ ] `tsc --noEmit` passes in both `client/` and `server/` with zero errors.
- [ ] `server/.gitignore` includes `node_modules`, `.env`, `dist`, `prisma/wealth-plus.db`.
- [ ] `client/.gitignore` includes `node_modules`, `.env`, `dist`.

---

### TASK-002
**Title:** Prisma schema + initial migration
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-001

**Description:**
Define the full Prisma schema and run the initial migration to create the SQLite database.

Steps:
1. Install `prisma` and `@prisma/client` in `server/`.
2. Run `npx prisma init --datasource-provider sqlite` inside `server/`.
3. Write `server/src/prisma/schema.prisma` with all five models exactly as specified in the solution design (Section 6):
   - `User` (id, email, password, name, settings, snapshots, refreshTokens, createdAt, updatedAt)
   - `RefreshToken` (id, userId, tokenHash unique, expiresAt, createdAt; `@@index([userId])`)
   - `UserFinancialSettings` (id, userId unique, baseCurrency default "THB", currentAge Int?, retirementAge Int?, retirementTargetAmount Float?, expectedAnnualReturn Float?, expectedAnnualContribution Float?, updatedAt; onDelete: Cascade)
   - `Snapshot` (id, userId, snapshotName, snapshotDate DateTime, notes String?, isLocked false, items, createdAt, updatedAt; `@@index([userId, snapshotDate])`)
   - `SnapshotItem` (id, snapshotId, investmentType, institution, investmentName, currentBalance Float, currency "THB", note String?, displayOrder 0, createdAt, updatedAt; `@@index([snapshotId, displayOrder])`; onDelete: Cascade)
4. Set `DATABASE_URL="file:./prisma/wealth-plus.db"` in `server/.env`.
5. Run `npx prisma migrate dev --name init`.
6. Create `server/src/lib/prisma.ts` with singleton PrismaClient export.
7. Add `db:generate` script to `server/package.json`: `prisma generate`.
8. Add `db:migrate` script: `prisma migrate dev`.
9. Add `db:seed` script: `tsx src/seed.ts`.
10. Update root `package.json` scripts to delegate to workspace.

**Done criteria:**
- [ ] `server/src/prisma/schema.prisma` exists with all 5 models.
- [ ] `npx prisma migrate dev` produces a migration SQL file in `server/src/prisma/migrations/`.
- [ ] `server/src/prisma/wealth-plus.db` exists after migration.
- [ ] `npx prisma studio` opens and shows all 5 tables.
- [ ] `server/src/lib/prisma.ts` exports a typed `prisma` instance without instantiating inside functions.

---

### TASK-003
**Title:** Seed script for two user accounts
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-002

**Description:**
Write and verify the seed script that creates `net@family.local` and `ann@family.local` with bcrypt-hashed passwords.

Steps:
1. Write `server/src/seed.ts` as specified in tech-plan Section 9.
2. The script must use `bcrypt.hash(password, 12)` (cost factor 12, per BR-001).
3. Use `prisma.user.upsert` (idempotent — safe to re-run).
4. Passwords are read from `SEED_PASSWORD_NET` and `SEED_PASSWORD_ANN` env vars, with weak defaults printed as a warning if env vars are absent.
5. Script MUST NOT create any snapshots or financial settings (BR-055).
6. On completion, print "Seeded: net@family.local" and "Seeded: ann@family.local".

**Done criteria:**
- [ ] `npm run db:seed` from root exits with code 0.
- [ ] Two rows exist in the `User` table after seeding (confirmed via Prisma Studio or CLI).
- [ ] `password` column contains bcrypt hash starting with `$2b$12$` (cost factor 12).
- [ ] Re-running `npm run db:seed` does not create duplicate rows.
- [ ] No `Snapshot` or `UserFinancialSettings` rows exist after seeding.

---

### TASK-004
**Title:** Server entry point, app factory, and environment guard
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-001

**Description:**
Implement the full Express app setup with CORS, cookie-parser, JSON body parsing, request logging, and the environment guard.

Steps:
1. Implement `server/src/index.ts`:
   - Check `JWT_SECRET` exists and length >= 32; throw and exit if not (hard startup failure).
   - Check `DATABASE_URL` is set; throw and exit if not.
   - Call `createApp()` from `app.ts`.
   - Listen on `process.env.PORT ?? 4000`.
   - Log `Server listening on port 4000`.
2. Implement `server/src/app.ts`:
   - Apply `cors({ origin: process.env.CLIENT_ORIGIN, credentials: true })`.
   - Apply `express.json()`.
   - Apply `cookie-parser()`.
   - Apply request logger middleware (next step).
   - Mount a health check route: `GET /health → 200 { status: 'ok' }`.
   - Register all routers under `/api` (stubs acceptable at this point).
   - Register `errorHandler` as last middleware.
3. Implement `server/src/middleware/requestLogger.ts`:
   - Log method, path, status code, and response time in ms.
   - Redact `Authorization` header value (replace with `[REDACTED]`).
   - Redact any body field named `password`, `token`, or `refreshToken`.
4. Implement `server/src/middleware/errorHandler.ts`:
   - Handle `AppError` → respond with `{ error: message }` at the AppError status.
   - Handle `ZodError` → respond with `{ error: "Validation failed", fields: {...} }` at 400.
   - Handle unexpected `Error` → log the error, respond 500 `{ error: "Internal server error." }`.
5. Implement `server/src/lib/AppError.ts` (class with `statusCode` and `message`).

**Done criteria:**
- [ ] Starting server with `JWT_SECRET` unset causes a clear error and `process.exit(1)`.
- [ ] Starting server with `JWT_SECRET` shorter than 32 chars causes the same failure.
- [ ] `GET http://localhost:4000/health` returns `200 { status: "ok" }`.
- [ ] CORS header `Access-Control-Allow-Origin: http://localhost:3000` appears on API responses.
- [ ] A thrown `AppError(403, "Forbidden")` in a route returns exactly `{ error: "Forbidden" }` with status 403.
- [ ] `Authorization` header is not printed in plain text in server logs.

---

### TASK-005
**Title:** Auth endpoints — login, refresh, logout
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-002, TASK-004

**Description:**
Implement all three auth endpoints plus the Zod validation middleware factory.

Steps:
1. Implement `server/src/middleware/validate.ts`:
   - Factory function `validate(schema: ZodSchema)` returns Express middleware.
   - On failure, calls `next(zodError)` which the errorHandler formats as a 400.
2. Implement `server/src/schemas/auth.schema.ts`:
   - `loginSchema`: `{ email: z.string().email(), password: z.string().min(1) }`.
3. Implement `server/src/middleware/rateLimiter.ts`:
   - `loginRateLimiter` using `express-rate-limit`: window 15 min, max 10, handler returns `{ error: "Too many requests..." }` at 429.
4. Implement `server/src/services/auth.service.ts`:
   - `login(email, password)`: find user by email (return generic 401 if not found), `bcrypt.compare` (return generic 401 if mismatch), sign JWT access token (15m, payload: `{ sub: userId, email, name }`), generate refresh token (`crypto.randomBytes(32).toString('hex')`), SHA-256 hash it, store in `RefreshToken` table with `expiresAt = now + 7d`, return `{ accessToken, user }`.
   - `refresh(rawRefreshToken)`: hash incoming token, find in DB, check `expiresAt`, sign new access token, return `{ accessToken }`.
   - `logout(userId, rawRefreshToken)`: hash token, delete the matching `RefreshToken` row.
5. Implement `server/src/controllers/auth.controller.ts`:
   - `login`: call service, set httpOnly cookie (`refreshToken`, `Path=/api/auth/refresh`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age=604800`), return 200.
   - `refresh`: read cookie from `req.cookies.refreshToken`, call service, return 200.
   - `logout`: read cookie, call service, clear cookie (Max-Age=0), return 200.
6. Implement `server/src/routes/auth.routes.ts`:
   - `POST /login` — `loginRateLimiter`, `validate(loginSchema)`, `asyncHandler(login)`.
   - `POST /refresh` — `asyncHandler(refresh)`.
   - `POST /logout` — `authMiddleware`, `asyncHandler(logout)`.
7. Mount `authRouter` at `/api/auth` in `app.ts`.

**Done criteria:**
- [ ] `POST /api/auth/login` with valid credentials returns 200 `{ accessToken, user }` and sets `refreshToken` httpOnly cookie.
- [ ] `POST /api/auth/login` with wrong password returns 401 with message "Invalid email or password." (no field-specific disclosure).
- [ ] `POST /api/auth/login` with invalid email format returns 400 `{ error: "Validation failed", fields: { email: "..." } }`.
- [ ] `POST /api/auth/refresh` with valid cookie returns 200 `{ accessToken }`.
- [ ] `POST /api/auth/refresh` with no cookie returns 401.
- [ ] `POST /api/auth/logout` with valid token deletes the `RefreshToken` DB row and clears the cookie.
- [ ] Cookie attributes include `HttpOnly`, `SameSite=Strict`, and `Path=/api/auth/refresh`.
- [ ] Making 11 login attempts from same IP within 15 min returns 429 on the 11th.

---

### TASK-006
**Title:** Auth middleware
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-005

**Description:**
Implement the `authMiddleware` function used by all protected routes.

Steps:
1. Implement `server/src/middleware/auth.ts` as specified in tech-plan Section 5.1.
2. The middleware reads `Authorization: Bearer <token>`, verifies the JWT signature and expiry using `JWT_SECRET`.
3. On success, attaches `{ id, email, name }` to `req.user`.
4. On failure (missing header, invalid signature, expired), throws `AppError(401, 'Token is invalid or expired.')`.
5. Add TypeScript global augmentation (`declare global { namespace Express { interface Request { user: AuthenticatedUser } } }`) in `auth.ts` or a separate `express.d.ts` type file.

**Done criteria:**
- [ ] A request with a valid token to a protected route succeeds and `req.user.id` is populated.
- [ ] A request with an expired token returns 401.
- [ ] A request with a tampered token (wrong signature) returns 401.
- [ ] A request with no `Authorization` header returns 401.
- [ ] TypeScript does not require `req.user!` (non-null assertion) inside controllers after this augmentation.

---

### TASK-007
**Title:** Me endpoints — profile and financial settings
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-006

**Description:**
Implement `GET /me`, `PUT /me`, `GET /me/financial-settings`, `PUT /me/financial-settings`.

Steps:
1. Write `server/src/schemas/settings.schema.ts`:
   - `updateProfileSchema`: `{ name: z.string().min(1).optional(), currentPassword: z.string().optional(), newPassword: z.string().min(8).optional() }`. Cross-field: if `newPassword` present, `currentPassword` must be present too.
   - `financialSettingsSchema`: `{ currentAge: z.number().int().min(1).max(120).optional(), retirementAge: z.number().int().optional(), retirementTargetAmount: z.number().positive().optional(), expectedAnnualReturn: z.number().min(0.01).max(100).optional(), expectedAnnualContribution: z.number().min(0).optional() }`. Refine: if both `currentAge` and `retirementAge` present, `retirementAge > currentAge`.
2. Implement `server/src/services/me.service.ts`:
   - `getProfile(userId)`: return user (without password field).
   - `updateProfile(userId, dto)`: if `newPassword` provided, verify `currentPassword` against bcrypt hash (throw 403 if mismatch), hash new password, update user, delete ALL `RefreshToken` rows for userId. If only `name` provided, update name. Return updated user (without password).
   - `getFinancialSettings(userId)`: upsert-read pattern — if no settings record exists, return a null-fields response object (as per API contracts Section 2).
   - `updateFinancialSettings(userId, dto)`: `prisma.userFinancialSettings.upsert`.
3. Implement `server/src/controllers/me.controller.ts` and `server/src/routes/me.routes.ts`.
4. Apply `authMiddleware` to all four routes.
5. Mount at `/api/me`.

**Done criteria:**
- [ ] `GET /api/me` returns `{ id, email, name, createdAt }` — no password field.
- [ ] `PUT /api/me` with `newPassword` and wrong `currentPassword` returns 403.
- [ ] `PUT /api/me` with `newPassword` and correct `currentPassword` updates the hash and deletes all refresh tokens for that user.
- [ ] `PUT /api/me` with `newPassword` shorter than 8 chars returns 400.
- [ ] `GET /api/me/financial-settings` with no saved record returns `{ id: null, ...null fields }`.
- [ ] `PUT /api/me/financial-settings` with `retirementAge <= currentAge` returns 400 with field-level error.
- [ ] `PUT /api/me/financial-settings` persists and returns the upserted record.

---

### TASK-008
**Title:** Shared types file (server)
**Assigned to:** BE
**Phase:** 1
**Dependencies:** TASK-001

**Description:**
Write the canonical `server/src/types/shared.ts` file with all DTO interfaces and constants as defined in tech-plan Section 3. This is the source of truth; the frontend will maintain a copy.

Steps:
1. Create `server/src/types/shared.ts` with:
   - `INVESTMENT_TYPE_CODES` const array.
   - `InvestmentTypeCode` type.
   - `INVESTMENT_TYPE_LABELS` record.
   - `PRESET_INSTITUTIONS` const array.
   - All DTO interfaces: `UserDto`, `UserFinancialSettingsDto`, `SnapshotSummaryDto`, `SnapshotItemDto`, `ClosedItemDto`, `SnapshotDetailDto`, `DashboardSummaryDto`, `AllocationItemDto`, `DashboardAllocationDto`, `RetirementDto`.
   - All request body interfaces: `LoginRequestDto`, `CreateSnapshotRequestDto`, `UpdateSnapshotRequestDto`, `CreateItemRequestDto`, `UpdateItemRequestDto`, `UpdateProfileRequestDto`, `UpdateFinancialSettingsRequestDto`.

**Done criteria:**
- [ ] File compiles with `tsc --noEmit` in `server/` with zero errors.
- [ ] All interfaces match the exact field names and types in the API contracts document.
- [ ] No `any` types appear.

---

### TASK-009
**Title:** Client scaffold — routing, stores, Axios instance
**Assigned to:** FE
**Phase:** 1
**Dependencies:** TASK-001

**Description:**
Set up the React application skeleton: React Router, TanStack Query, Zustand stores, and the Axios instance with interceptors.

Steps:
1. Create `client/src/main.tsx`:
   - Wrap `<App />` in `<QueryClientProvider client={queryClient}>` and `<BrowserRouter>`.
2. Create `client/src/lib/queryClient.ts` with a `QueryClient` configured with `retry: 1` and `staleTime: 30_000`.
3. Create `client/src/store/authStore.ts` (Zustand store with `user`, `accessToken`, `setAuth`, `clearAuth` as per tech-plan Section 5.2).
4. Create `client/src/store/uiStore.ts` (Zustand store with `selectedSnapshotId`, `setSelectedSnapshotId`).
5. Create `client/src/lib/axios.ts` with the full Axios instance including:
   - Request interceptor: inject `Authorization: Bearer <token>` from authStore.
   - Response interceptor: detect 401, call `/auth/refresh`, store new token, retry original request, redirect to `/login` on refresh failure.
6. Create `client/src/App.tsx` with route structure:
   - Public route: `/login` → `<LoginPage />`
   - Protected routes (wrapped in an `<AuthGuard>` component): `/dashboard`, `/snapshots`, `/snapshots/new`, `/snapshots/:id`, `/settings`, `/settings/account`.
   - `<AuthGuard>`: reads `accessToken` from authStore; if null, calls `/auth/refresh` once (on mount) then redirects to `/login` if still unauthenticated.
7. Create stub page components for all routes (render a `<h1>` with the page name).
8. Create `client/src/types/shared.ts` as a copy of `server/src/types/shared.ts`.

**Done criteria:**
- [ ] `npm run dev -w client` shows no TypeScript errors.
- [ ] Navigating to `http://localhost:3000/dashboard` redirects to `/login` when no auth token is in memory.
- [ ] `authStore.setAuth(mockUser, 'fake-token')` in browser console followed by navigation to `/dashboard` renders the dashboard stub.
- [ ] Axios instance sends `Authorization: Bearer <token>` when `accessToken` is set in the store.

---

### TASK-010
**Title:** Login page and auth hook
**Assigned to:** FE
**Phase:** 1
**Dependencies:** TASK-005, TASK-009

**Description:**
Implement the login page with form validation and auth state management.

Steps:
1. Create `client/src/api/auth.ts`:
   - `login(dto: LoginRequestDto)`: POST `/auth/login`, returns `{ accessToken, user }`.
   - `refresh()`: POST `/auth/refresh`, returns `{ accessToken }`.
   - `logout()`: POST `/auth/logout`.
2. Create `client/src/hooks/useAuth.ts`:
   - `useLogin()`: TanStack Query `useMutation` that calls `api.auth.login`, on success calls `authStore.setAuth` and navigates to `/dashboard`.
   - `useLogout()`: mutation that calls `api.auth.logout`, on success calls `authStore.clearAuth` and navigates to `/login`.
3. Create `client/src/features/auth/LoginForm.tsx`:
   - React Hook Form + Zod schema: `{ email: z.string().email(), password: z.string().min(1) }`.
   - On submit: call `useLogin().mutate({ email, password })`.
   - Show field-level validation errors inline below inputs.
   - Show server error message (e.g., "Invalid email or password") in a red alert.
   - Disable submit button and show loading spinner while mutation is pending.
4. Create `client/src/pages/LoginPage.tsx` that renders `<LoginForm />` centered on screen with the app name "Wealth Plus" as a heading.

**Done criteria:**
- [ ] Submitting valid credentials → redirects to `/dashboard`.
- [ ] Submitting wrong password → shows "Invalid email or password." error message.
- [ ] Submitting with empty email field → shows inline "Invalid email" validation error (before any API call).
- [ ] Submit button is disabled while the login request is in flight.
- [ ] After successful login, `authStore.getState().accessToken` is a non-empty string.

---

### TASK-011
**Title:** App shell layout
**Assigned to:** FE
**Phase:** 1
**Dependencies:** TASK-009

**Description:**
Implement the persistent authenticated layout with sidebar navigation and top bar.

Steps:
1. Install or generate shadcn/ui components: `Button`, `Separator`, `Tooltip`.
2. Create `client/src/components/layout/Sidebar.tsx`:
   - Navigation links: Dashboard (`/dashboard`), Snapshots (`/snapshots`), Settings (`/settings`).
   - Active link highlighted (use `NavLink` from react-router-dom).
   - App logo/name "Wealth Plus" at top.
3. Create `client/src/components/layout/TopBar.tsx`:
   - Shows logged-in user's name from `authStore`.
   - "Logout" button calls `useLogout().mutate()`.
4. Create `client/src/components/layout/AppShell.tsx`:
   - Renders `<Sidebar />` + `<TopBar />` + `<Outlet />` (React Router nested route outlet).
   - Sidebar is fixed-width (e.g., 240px); main content fills the rest.
5. Update `client/src/App.tsx` to nest all protected routes inside `<AppShell>`.

**Done criteria:**
- [ ] After login, all protected pages render inside the shell with sidebar and top bar visible.
- [ ] Active route is highlighted in the sidebar.
- [ ] Clicking "Logout" calls the logout API, clears the store, and redirects to `/login`.
- [ ] The shell renders correctly on 1280px and 1920px viewport widths.

---

## Phase 2 — Snapshot Engine

---

### TASK-012
**Title:** Snapshot CRUD — server (list, create, get, update, delete)
**Assigned to:** BE
**Phase:** 2
**Dependencies:** TASK-006

**Description:**
Implement the five core snapshot endpoints.

Steps:
1. Write `server/src/schemas/snapshot.schema.ts`:
   - `createSnapshotSchema`: `{ snapshotName: z.string().min(1), snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().optional() }`. Add `.refine` to validate it is a real calendar date.
   - `updateSnapshotSchema`: all fields optional; same validations as create when present.
2. Implement `server/src/services/snapshots.service.ts`:
   - `listSnapshots(userId)`: fetch all snapshots for user sorted by snapshotDate DESC, createdAt DESC. For each snapshot, compute `total = SUM(items.currentBalance)` and compare with prior snapshot to produce `previousTotal`, `changeAmount`, `changePercent`. Return list of `SnapshotSummaryDto`.
   - `createSnapshot(userId, dto)`: insert new snapshot with `isLocked: false`, return with empty items array.
   - `getSnapshotById(id, userId)`: find snapshot, verify ownership (403 if mismatch, 404 if missing). Return the raw snapshot record (comparison is handled in comparison.service).
   - `updateSnapshot(id, userId, dto)`: find snapshot, verify ownership, verify NOT locked (403 if locked, BR-013). Apply partial update. Return updated snapshot.
   - `deleteSnapshot(id, userId)`: find snapshot, verify ownership. Delete (Prisma cascade removes items). Return void.
3. Implement `server/src/controllers/snapshots.controller.ts` (thin handlers: call service, return response).
4. Implement `server/src/routes/snapshots.routes.ts`:
   - `GET /` → `authMiddleware`, `asyncHandler(list)`
   - `POST /` → `authMiddleware`, `validate(createSnapshotSchema)`, `asyncHandler(create)`
   - `GET /:id` → `authMiddleware`, `asyncHandler(getById)` (comparison handled in TASK-016)
   - `PUT /:id` → `authMiddleware`, `validate(updateSnapshotSchema)`, `asyncHandler(update)`
   - `DELETE /:id` → `authMiddleware`, `asyncHandler(delete)`
5. Mount at `/api/snapshots`.

**Done criteria:**
- [ ] `POST /api/snapshots` creates a snapshot and returns 201 with an empty `items` array.
- [ ] `GET /api/snapshots` returns snapshots sorted newest-first with `total`, `previousTotal`, `changeAmount`, `changePercent`.
- [ ] `GET /api/snapshots/:id` for another user's snapshot returns 403.
- [ ] `GET /api/snapshots/:wrongId` returns 404.
- [ ] `PUT /api/snapshots/:id` on a locked snapshot returns 403.
- [ ] `DELETE /api/snapshots/:id` removes the snapshot and all its items (confirmed via DB query).
- [ ] `changePercent` is `null` when `previousTotal` is 0.

---

### TASK-013
**Title:** Snapshot items CRUD — server
**Assigned to:** BE
**Phase:** 2
**Dependencies:** TASK-012

**Description:**
Implement add, update, and delete item endpoints with locked-snapshot enforcement and duplicate-key warning.

Steps:
1. Write `server/src/schemas/item.schema.ts`:
   - `createItemSchema`: required `investmentType`, `institution`, `investmentName` (all non-empty strings), `currentBalance` (number >= 0); optional `currency`, `note`, `displayOrder`.
   - `updateItemSchema`: all fields optional; same validations when present; must have at least one key (use `.refine`).
2. Implement `server/src/services/items.service.ts`:
   - `addItem(snapshotId, userId, dto)`: verify snapshot exists + owned by userId (403/404), verify snapshot is NOT locked (403). Check triple-key duplicate: `investmentType + institution + investmentName` case-insensitive exists in snapshot → set `hasDuplicateWarning: true`. Insert item. Return `{ item, hasDuplicateWarning }`.
   - `updateItem(snapshotId, itemId, userId, dto)`: verify snapshot ownership, verify NOT locked, verify item belongs to this snapshot. Apply partial update. Check duplicate if identity fields changed. Return `{ item, hasDuplicateWarning }`.
   - `deleteItem(snapshotId, itemId, userId)`: verify snapshot ownership, verify NOT locked, verify item belongs to snapshot. Delete. Return void.
3. Implement `server/src/controllers/items.controller.ts` and `server/src/routes/items.routes.ts`.
4. Mount items router nested under `/api/snapshots/:id/items` (or merge into snapshots router).

**Done criteria:**
- [ ] `POST /api/snapshots/:id/items` on a locked snapshot returns 403.
- [ ] `POST /api/snapshots/:id/items` with `currentBalance: -1` returns 400.
- [ ] `POST /api/snapshots/:id/items` with all valid fields creates item and returns 201.
- [ ] Adding a second item with identical `investmentType + institution + investmentName` returns `hasDuplicateWarning: true` in the 201 response (item is still saved).
- [ ] `PUT /api/snapshots/:id/items/:itemId` with empty body returns 400.
- [ ] `DELETE /api/snapshots/:id/items/:itemId` removes the item; subsequent GET of the snapshot omits it.
- [ ] An item not belonging to the specified snapshot returns 404 on update/delete.

---

### TASK-014
**Title:** Lock and unlock endpoints
**Assigned to:** BE
**Phase:** 2
**Dependencies:** TASK-012

**Description:**
Implement `POST /api/snapshots/:id/lock` and `POST /api/snapshots/:id/unlock`.

Steps:
1. Add `lockSnapshot(id, userId)` to `snapshots.service.ts`: find snapshot, verify ownership, set `isLocked: true`. Return updated snapshot (only id, snapshotName, snapshotDate, isLocked, updatedAt).
2. Add `unlockSnapshot(id, userId)`: same but set `isLocked: false`. MUST NOT touch any item or header fields (BR-053).
3. Add controller handlers and routes:
   - `POST /:id/lock` → `authMiddleware`, `asyncHandler(lock)`
   - `POST /:id/unlock` → `authMiddleware`, `asyncHandler(unlock)`

**Done criteria:**
- [ ] `POST /api/snapshots/:id/lock` returns snapshot with `isLocked: true`.
- [ ] After locking, `PUT /api/snapshots/:id` returns 403.
- [ ] After locking, `POST /api/snapshots/:id/items` returns 403.
- [ ] `POST /api/snapshots/:id/unlock` sets `isLocked: false` only — no other fields change.
- [ ] Lock/unlock on another user's snapshot returns 403.

---

### TASK-015
**Title:** Duplicate snapshot endpoint
**Assigned to:** BE
**Phase:** 2
**Dependencies:** TASK-013

**Description:**
Implement `POST /api/snapshots/:id/duplicate` which clones all items from the user's most recent snapshot into a new snapshot.

Steps:
1. Add `duplicateSnapshot(userId, dto)` to `snapshots.service.ts`:
   - Find the source snapshot: `prisma.snapshot.findFirst({ where: { userId }, orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }] })`.
   - If no snapshot exists for user, throw `AppError(404, 'No snapshots exist to duplicate from.')`.
   - Use `prisma.$transaction`: create new Snapshot with `isLocked: false`; `createMany` for SnapshotItems cloning `investmentType`, `institution`, `investmentName`, `currentBalance`, `currency`, `note`, `displayOrder` — new ids, new `snapshotId`.
   - Return `{ snapshot, items, sourceSnapshotId }` (201).
2. Add controller handler.
3. Add route: `POST /:id/duplicate` → `authMiddleware`, `validate(createSnapshotSchema)`, `asyncHandler(duplicate)`.

**Done criteria:**
- [ ] `POST /api/snapshots/:id/duplicate` returns 201 with a new snapshot id (different from source).
- [ ] All items from the most recent snapshot are present in the new snapshot with the same field values and a new `id` and `snapshotId`.
- [ ] The new snapshot has `isLocked: false` regardless of whether the source was locked.
- [ ] Source snapshot `createdAt` and `updatedAt` are not modified.
- [ ] Calling duplicate when no snapshots exist returns 404.
- [ ] The `sourceSnapshotId` in the response matches the actual most-recent snapshot by `snapshotDate`.

---

### TASK-016
**Title:** Comparison engine service
**Assigned to:** BE
**Phase:** 2
**Dependencies:** TASK-013

**Description:**
Implement the comparison engine that enriches snapshot items with prior-snapshot comparison fields.

Steps:
1. Create `server/src/services/comparison.service.ts` implementing `buildSnapshotWithComparison(snapshotId, userId)` as specified in tech-plan Section 6 (the full pseudocode).
2. Key behaviours:
   - Prior snapshot: highest `snapshotDate` strictly less than current snapshot's date (BR-026).
   - Match key: lowercase(`investmentName|institution|investmentType`) (BR-027).
   - Build `priorIndex` map; first match wins if duplicate keys in prior.
   - Compute `amountChange`, `percentChange` per BR-028, BR-029, BR-030.
   - Build `closedItems` list: items in prior not matched in current (BR-032).
3. Update `snapshots.service.getSnapshotById`: after fetching the snapshot, call `comparison.service.buildSnapshotWithComparison` and return the enriched `SnapshotDetailDto`.

**Done criteria:**
- [ ] `GET /api/snapshots/:id` for a snapshot with prior items returns `previousBalance`, `amountChange`, `percentChange` on matched items.
- [ ] New items (no prior match) return `isNew: true` with `previousBalance: null`, `amountChange: null`, `percentChange: null`.
- [ ] `previousBalance: 0` + `currentBalance > 0` returns `percentChange: null` (UI will render "New").
- [ ] `closedItems` array contains items from prior snapshot not found in current, with `previousBalance` set.
- [ ] `priorSnapshotId` and `priorSnapshotDate` are `null` when no prior snapshot exists.
- [ ] Matching is case-insensitive: "kbank fixed deposit" matches "KBank Fixed Deposit".

---

### TASK-017
**Title:** Snapshot list page
**Assigned to:** FE
**Phase:** 2
**Dependencies:** TASK-012, TASK-009

**Description:**
Build the snapshot list page showing all snapshots with totals and actions.

Steps:
1. Create `client/src/api/snapshots.ts`:
   - `listSnapshots()`: GET `/snapshots`, returns `{ snapshots: SnapshotSummaryDto[] }`.
   - `createSnapshot(dto)`: POST `/snapshots`.
   - `getSnapshot(id)`: GET `/snapshots/:id`.
   - `updateSnapshot(id, dto)`: PUT `/snapshots/:id`.
   - `deleteSnapshot(id)`: DELETE `/snapshots/:id`.
   - `duplicateSnapshot(id, dto)`: POST `/snapshots/:id/duplicate`.
   - `lockSnapshot(id)`: POST `/snapshots/:id/lock`.
   - `unlockSnapshot(id)`: POST `/snapshots/:id/unlock`.
2. Create `client/src/hooks/useSnapshots.ts`:
   - `useSnapshots()`: `useQuery(['snapshots'], listSnapshots)`.
   - `useCreateSnapshot()`: `useMutation` + invalidate `['snapshots']`.
   - `useDeleteSnapshot()`: `useMutation` + invalidate `['snapshots']`.
   - `useDuplicateSnapshot()`: `useMutation` + invalidate `['snapshots']`.
   - `useLockSnapshot()` / `useUnlockSnapshot()`: mutations + invalidate `['snapshots', id]`.
3. Create `client/src/features/snapshots/SnapshotListTable.tsx`:
   - Table columns: Snapshot Name, Date, Total (formatted THB), Change (amount + %, green/red), Status (locked badge), Actions (View, Delete).
   - Delete action shows `<ConfirmDialog>` before calling `useDeleteSnapshot`.
4. Create `client/src/components/common/ConfirmDialog.tsx` (shadcn Dialog with confirm/cancel buttons).
5. Create `client/src/components/common/CurrencyDisplay.tsx` (renders `formatCurrency(amount)`).
6. Create `client/src/components/common/ChangeDisplay.tsx` (renders amount + % with green/red coloring).
7. Create `client/src/pages/SnapshotListPage.tsx`:
   - Renders `<SnapshotListTable />`.
   - "New Snapshot" button navigates to `/snapshots/new`.
8. Install shadcn components: `Table`, `Badge`, `Dialog`.

**Done criteria:**
- [ ] Page at `/snapshots` shows all snapshots for the logged-in user sorted newest first.
- [ ] Each row shows total formatted as "฿1,500,000.00".
- [ ] Positive `changeAmount` renders in green; negative in red; null renders as "-".
- [ ] Locked snapshots show a "Locked" badge.
- [ ] Delete button opens a confirmation dialog; confirming deletes and refreshes the list.
- [ ] Loading state shows a spinner; error state shows an error message.

---

### TASK-018
**Title:** Create snapshot flow (blank + duplicate)
**Assigned to:** FE
**Phase:** 2
**Dependencies:** TASK-015, TASK-017

**Description:**
Implement the new snapshot creation flow with choice between blank and duplicate.

Steps:
1. Create `client/src/features/snapshots/CreateSnapshotModal.tsx`:
   - Two options: "Blank snapshot" or "Duplicate from latest".
   - Selecting either shows `<SnapshotHeaderForm>` with name and date fields.
   - On submit: calls `useCreateSnapshot` (blank) or `useDuplicateSnapshot` (duplicate).
   - On success: navigate to `/snapshots/:newId`.
2. Create `client/src/features/snapshots/SnapshotHeaderForm.tsx`:
   - React Hook Form + Zod: `{ snapshotName: z.string().min(1), snapshotDate: z.string().regex(...), notes: z.string().optional() }`.
   - Date input pre-fills today's date.
   - Show inline validation errors.
3. Create `client/src/pages/NewSnapshotPage.tsx` that opens the `CreateSnapshotModal` on mount (or renders the form inline).
4. Install shadcn `Select` and `Input` components if not already done.

**Done criteria:**
- [ ] Navigating to `/snapshots/new` presents the blank vs duplicate choice.
- [ ] Creating a blank snapshot with a valid name and date creates the snapshot and redirects to `/snapshots/:id`.
- [ ] Creating a duplicate snapshot navigates to the new snapshot which has all items pre-populated.
- [ ] Submitting with an empty name shows "Snapshot name is required" inline.
- [ ] Submitting with an invalid date format shows a date validation error inline.

---

### TASK-019
**Title:** Snapshot detail page — ledger table with comparison columns
**Assigned to:** FE
**Phase:** 2
**Dependencies:** TASK-016, TASK-017

**Description:**
Build the snapshot detail view with the investment ledger showing comparison data.

Steps:
1. Create `client/src/hooks/useSnapshots.ts` additions:
   - `useSnapshot(id)`: `useQuery(['snapshots', id], () => getSnapshot(id))`.
2. Create `client/src/features/snapshots/LedgerTable.tsx`:
   - Columns: Investment Type (Thai label), Institution, Investment Name, Previous Balance, Current Balance (editable), Amount Change (green/red), % Change (green/red), Note, Actions (edit row, delete row).
   - Locked snapshot: all edit controls hidden, table is read-only.
   - "Add investment" button opens `<AddItemForm>`.
   - Show "New" badge (gray) in % Change column when `isNew: true`.
   - Show "-" in Previous Balance when `isNew: true`.
   - Sticky total row at the bottom showing sum of all current balances.
3. Create `client/src/features/snapshots/LedgerRow.tsx`:
   - Inline editable row: clicking Current Balance cell shows an input; blur/Enter saves.
   - On balance change, calls `useUpdateItem` mutation.
   - Duplicate warning: if `hasDuplicateWarning: true` in response, show a yellow inline warning.
4. Create `client/src/features/snapshots/ClosedItemsSection.tsx`:
   - Collapsible section shown when `closedItems.length > 0`.
   - Shows closed items in a read-only table with their prior balance and a "Closed" badge.
5. Create `client/src/pages/SnapshotDetailPage.tsx`:
   - Fetches `useSnapshot(id)`.
   - Renders `<LedgerTable>`, `<ClosedItemsSection>`, `<LockUnlockButton>`.
   - Shows snapshot name, date, and lock status in a header.
6. Install shadcn `Table`, `Badge`, `Tooltip`.

**Done criteria:**
- [ ] Snapshot detail at `/snapshots/:id` renders the full ledger.
- [ ] Items with a prior match show `previousBalance`, green/red `amountChange`, and `percentChange`.
- [ ] New items show "New" in gray and "-" for previous balance.
- [ ] Sticky total row shows sum of current balances.
- [ ] Locked snapshot hides edit controls and shows a "Read only" indicator.
- [ ] `closedItems` appear in a collapsible section when present.

---

### TASK-020
**Title:** Add and edit item forms
**Assigned to:** FE
**Phase:** 2
**Dependencies:** TASK-013, TASK-019

**Description:**
Implement the add-item form and inline row editing with Zod validation.

Steps:
1. Create `client/src/api/items.ts`:
   - `addItem(snapshotId, dto)`: POST `/snapshots/:snapshotId/items`.
   - `updateItem(snapshotId, itemId, dto)`: PUT `/snapshots/:snapshotId/items/:itemId`.
   - `deleteItem(snapshotId, itemId)`: DELETE `/snapshots/:snapshotId/items/:itemId`.
2. Create `client/src/hooks/useItems.ts`:
   - `useAddItem(snapshotId)`: mutation + invalidate `['snapshots', snapshotId]`.
   - `useUpdateItem(snapshotId)`: mutation + invalidate `['snapshots', snapshotId]`.
   - `useDeleteItem(snapshotId)`: mutation + invalidate `['snapshots', snapshotId]`.
3. Create `client/src/features/snapshots/AddItemForm.tsx`:
   - React Hook Form + Zod. Fields: investment type (ComboBox with preset codes + free text), institution (ComboBox with presets + free text), investment name (text input), current balance (number input, min 0), currency (hidden, default "THB"), note (optional text).
   - Calls `useAddItem`. On success, invalidates query and resets form.
   - Show `hasDuplicateWarning` toast/alert if true.
4. Create `client/src/components/common/ComboBox.tsx`:
   - Searchable dropdown with preset options + free-text fallback.
   - Uses shadcn `Command` + `Popover` pattern.
5. Create `client/src/utils/investmentTypeUtils.ts` with `getInvestmentTypeLabel(code)` helper.

**Done criteria:**
- [ ] "Add investment" button opens the add form.
- [ ] Submitting with `currentBalance: -1` shows "Balance must be 0 or greater" inline.
- [ ] Submitting with empty institution shows "Institution is required" inline.
- [ ] Investment type ComboBox shows Thai labels alongside codes, allows free text.
- [ ] Institution ComboBox shows preset names, allows free text entry.
- [ ] Duplicate warning appears as a yellow alert when `hasDuplicateWarning: true`.
- [ ] After adding, the table updates immediately (optimistic or refetch).

---

### TASK-021
**Title:** Lock/Unlock button and confirmation
**Assigned to:** FE
**Phase:** 2
**Dependencies:** TASK-014, TASK-019

**Description:**
Implement the lock/unlock toggle button in the snapshot detail page.

Steps:
1. Create `client/src/features/snapshots/LockUnlockButton.tsx`:
   - Shows "Lock Snapshot" when `isLocked: false`; "Unlock Snapshot" when `isLocked: true`.
   - Locking shows a confirmation dialog: "Locking this snapshot makes it read-only. Continue?".
   - Unlocking also shows a confirmation: "Are you sure you want to unlock this snapshot?".
   - On confirm, calls `useLockSnapshot(id)` or `useUnlockSnapshot(id)`.
   - After mutation success, the `LedgerTable` re-renders in the appropriate mode.
2. Hook mutations are defined in TASK-017 (`useLockSnapshot`, `useUnlockSnapshot`). Verify they invalidate `['snapshots', id]`.

**Done criteria:**
- [ ] Clicking "Lock" opens a confirmation modal.
- [ ] Confirming lock updates the snapshot state and hides all edit controls.
- [ ] Clicking "Unlock" on a locked snapshot opens confirmation; confirming restores edit controls.
- [ ] The button label toggles correctly between "Lock" and "Unlock" based on current state.

---

## Phase 3 — Analytics

---

### TASK-022
**Title:** Dashboard summary endpoint
**Assigned to:** BE
**Phase:** 3
**Dependencies:** TASK-012, TASK-016

**Description:**
Implement `GET /api/dashboard` returning total net worth summary and recent snapshots.

Steps:
1. Implement `server/src/services/dashboard.service.ts` — `getSummary(userId, snapshotId?)`:
   - If `snapshotId` provided: verify ownership, use that snapshot; else find latest by `snapshotDate DESC`.
   - If no snapshots exist: return `{ snapshotId: null, totalCurrent: 0, ..., recentSnapshots: [] }`.
   - Compute `totalCurrent = SUM(items.currentBalance)` for selected snapshot.
   - Find prior snapshot (same logic as comparison engine) → `totalPrevious = SUM(prior items)`.
   - `changeAmount = totalCurrent - totalPrevious`; `changePercent` = round to 2 dp (null if `totalPrevious = 0`).
   - Fetch recent 5 snapshots with their totals (BR-039).
2. Implement `server/src/controllers/dashboard.controller.ts` — `getSummary` handler.
3. Implement `server/src/routes/dashboard.routes.ts`:
   - `GET /` → `authMiddleware`, `asyncHandler(getSummary)`.
4. Mount at `/api/dashboard`.

**Done criteria:**
- [ ] `GET /api/dashboard` returns `totalCurrent` matching `SUM(latestSnapshot.items.currentBalance)`.
- [ ] `recentSnapshots` contains at most 5 entries, sorted newest first, each with `total`.
- [ ] `totalPrevious`, `changeAmount`, `changePercent` are all `null` when no prior snapshot exists.
- [ ] `?snapshotId=<id>` parameter overrides the default latest-snapshot selection.
- [ ] `?snapshotId=<othersId>` returns 403.
- [ ] No snapshots at all returns `{ snapshotId: null, totalCurrent: 0, recentSnapshots: [] }`.

---

### TASK-023
**Title:** Dashboard allocation endpoint
**Assigned to:** BE
**Phase:** 3
**Dependencies:** TASK-022

**Description:**
Implement `GET /api/dashboard/allocation` grouping items by investment type.

Steps:
1. Add `getAllocation(userId, snapshotId?)` to `dashboard.service.ts`:
   - Resolve snapshot (latest or provided).
   - Group items by `investmentType` with `SUM(currentBalance)`.
   - Compute each type's `percent = (typeTotal / grandTotal) * 100`, rounded to 2 dp.
   - Attach Thai label from `INVESTMENT_TYPE_LABELS` (use code as label if not in preset, per BR-022).
   - Exclude types with zero total (BR-036).
   - Sort by total descending.
2. Add controller and route: `GET /allocation` → `authMiddleware`, `asyncHandler(getAllocation)`.

**Done criteria:**
- [ ] Response contains one `allocation` entry per non-zero investment type.
- [ ] `percent` values sum to 100 (allowing floating point rounding to within 0.1%).
- [ ] Preset investment types include the correct Thai label.
- [ ] A custom free-text type uses the type string as its own label.
- [ ] A snapshot with all balances = 0 returns an empty `allocation` array.

---

### TASK-024
**Title:** Retirement projection endpoint
**Assigned to:** BE
**Phase:** 3
**Dependencies:** TASK-007, TASK-022

**Description:**
Implement `GET /api/dashboard/retirement` with the FV formula.

Steps:
1. Add `calculateRetirementFV(pv, r, n, c)` pure function to `dashboard.service.ts` as specified in tech-plan Section 7.
2. Add `buildRetirementProjection(currentPortfolioTotal, settings)` as specified in tech-plan Section 7.
3. Add `getRetirement(userId)` to `dashboard.service.ts`:
   - Fetch `UserFinancialSettings` for userId.
   - Get `currentPortfolioTotal` from latest snapshot (sum of items); 0 if no snapshot.
   - Call `buildRetirementProjection`.
   - Return `RetirementDto`.
4. Add controller and route: `GET /retirement` → `authMiddleware`, `asyncHandler(getRetirement)`.

**Done criteria:**
- [ ] `GET /api/dashboard/retirement` with settings configured returns `projectedFV`, `gap`, `progressPercent`, `yearsRemaining`.
- [ ] With no settings saved, returns `{ settings: null, projectedFV: null, ... }`.
- [ ] Formula check: PV=15,000,000, r=7%, n=20, C=500,000 → `projectedFV ≈ 78,542,673` (within ±1 THB of expected value).
- [ ] When `progressPercent > 100`, `isTargetReached: true` and `surplusAmount` is present.
- [ ] When `yearsRemaining <= 0`, `projectedFV` is `null`.
- [ ] `progressPercent` is rounded to 1 decimal place.

---

### TASK-025
**Title:** Dashboard page — net worth widget and recent snapshots
**Assigned to:** FE
**Phase:** 3
**Dependencies:** TASK-022, TASK-011

**Description:**
Build the dashboard page with the net worth summary widget and recent snapshots list.

Steps:
1. Create `client/src/api/dashboard.ts`:
   - `getDashboard(snapshotId?)`: GET `/dashboard?snapshotId=...`.
   - `getAllocation(snapshotId?)`: GET `/dashboard/allocation?snapshotId=...`.
   - `getRetirement()`: GET `/dashboard/retirement`.
2. Create `client/src/hooks/useDashboard.ts`:
   - `useDashboard(snapshotId?)`: `useQuery(['dashboard', snapshotId], ...)`.
   - `useAllocation(snapshotId?)`: `useQuery(['dashboard', 'allocation', snapshotId], ...)`.
   - `useRetirement()`: `useQuery(['dashboard', 'retirement'], ...)`.
3. Create `client/src/features/dashboard/NetWorthWidget.tsx`:
   - Shows `totalCurrent` in large text (formatted THB).
   - Shows `changeAmount` (green/red) and `changePercent` below.
   - Shows `totalPrevious` as "Previous: ฿X".
4. Create `client/src/features/dashboard/RecentSnapshotsList.tsx`:
   - Renders last 5 snapshots as clickable links to `/snapshots/:id`.
   - Each item shows name, date, total, locked badge if applicable.
5. Create `client/src/features/dashboard/SnapshotSelector.tsx`:
   - Dropdown populated from `useDashboard.recentSnapshots`.
   - On change, updates `uiStore.selectedSnapshotId` and re-fetches dashboard/allocation data.
6. Create `client/src/pages/DashboardPage.tsx`:
   - Composes `<NetWorthWidget>`, `<SnapshotSelector>`, `<RecentSnapshotsList>`, and placeholders for charts/retirement widget.

**Done criteria:**
- [ ] Dashboard page shows total from the latest snapshot after login.
- [ ] `changeAmount` is green when positive; red when negative; "-" when null.
- [ ] Selecting a different snapshot from the dropdown updates the net worth widget.
- [ ] Recent snapshots list shows at most 5 items; clicking navigates to the snapshot detail.
- [ ] Page shows a loading spinner while the query is in flight.

---

### TASK-026
**Title:** Allocation pie chart component
**Assigned to:** FE
**Phase:** 3
**Dependencies:** TASK-023, TASK-025

**Description:**
Build the allocation pie chart using Recharts.

Steps:
1. Create `client/src/components/charts/AllocationPieChart.tsx`:
   - Recharts `PieChart` + `Pie` + `Tooltip` + `Legend`.
   - Each slice labeled with Thai investment type label and percentage.
   - Slice colors: use a preset 10-color palette (one per investment type).
   - Tooltip shows: type label, total (formatted THB), percent.
   - Shows a "No data" placeholder when `allocation` is empty.
2. Connect to `useAllocation(selectedSnapshotId)` in `DashboardPage.tsx`.
3. Render the chart in a card below the net worth widget.

**Done criteria:**
- [ ] Pie chart renders with slices proportional to `percent` values.
- [ ] Each slice shows its Thai label and percentage in the legend.
- [ ] Hovering a slice shows the tooltip with THB total and percent.
- [ ] Chart renders "No allocation data" when the snapshot has no items.
- [ ] The chart re-renders when the snapshot selector changes.

---

### TASK-027
**Title:** Institution bar chart component
**Assigned to:** FE
**Phase:** 3
**Dependencies:** TASK-023, TASK-025

**Description:**
Build the institution bar chart. The allocation endpoint groups by investment type, so an institution grouping must be computed client-side from the snapshot detail, or a separate server computation is needed.

Steps:
1. Evaluate approach: the `GET /api/snapshots/:id` response includes all items. Group client-side:
   - In `DashboardPage.tsx`, use `useSnapshot(selectedSnapshotId)` if already fetched; otherwise fetch allocation items grouping.
   - Decision: compute institution totals client-side from `items` array available in `useSnapshot`.
2. Create `client/src/components/charts/InstitutionBarChart.tsx`:
   - Recharts `BarChart` + `Bar` + `XAxis` + `YAxis` + `Tooltip`.
   - Bars sorted by total descending (BR-037).
   - Y-axis shows formatted THB values.
   - Tooltip shows institution name and total.
3. Render in `DashboardPage.tsx` below the pie chart.

Note: If `useSnapshot` for the selected snapshot ID is not already in cache, compute a dedicated `institutionAllocation` query from the snapshot detail.

**Done criteria:**
- [ ] Bar chart renders one bar per institution, sorted tallest first.
- [ ] Y-axis labels are formatted as "฿1,500,000".
- [ ] Tooltip shows institution name and THB total.
- [ ] Chart updates when snapshot selector changes.
- [ ] Chart shows "No data" placeholder when no items.

---

### TASK-028
**Title:** Retirement goal widget
**Assigned to:** FE
**Phase:** 3
**Dependencies:** TASK-024, TASK-025

**Description:**
Build the retirement goal progress widget on the dashboard.

Steps:
1. Create `client/src/features/dashboard/RetirementWidget.tsx`:
   - "You are at X% of your retirement target" headline.
   - `<Progress>` bar (shadcn) capped at 100% visually.
   - "Projected wealth at age [retirementAge]: ฿X" line.
   - "Gap remaining: ฿Y" (or "Target reached! Surplus: ฿Z" if `isTargetReached`).
   - "Years remaining: N" line.
   - If settings not configured: show "Configure your retirement goal in Settings" with a link to `/settings`.
   - Formula tooltip icon (shadcn `Tooltip`) explaining the FV formula in plain language.
2. Render in `DashboardPage.tsx`.
3. Install shadcn `Progress` and `Tooltip` if not already done.

**Done criteria:**
- [ ] Progress bar shows `progressPercent`; capped at 100% wide even if value > 100%.
- [ ] `projectedFV` is formatted as "฿68,142,684.23".
- [ ] Gap is shown in red when positive; "Target reached" shown in green when `isTargetReached`.
- [ ] With no settings, the widget shows the configure link.
- [ ] Tooltip on the info icon explains the FV formula.

---

### TASK-029
**Title:** Settings page — financial settings form
**Assigned to:** FE
**Phase:** 3
**Dependencies:** TASK-007, TASK-011

**Description:**
Build the retirement/financial settings form page.

Steps:
1. Create `client/src/api/me.ts`:
   - `getProfile()`: GET `/me`.
   - `updateProfile(dto)`: PUT `/me`.
   - `getFinancialSettings()`: GET `/me/financial-settings`.
   - `updateFinancialSettings(dto)`: PUT `/me/financial-settings`.
2. Create `client/src/hooks/useProfile.ts` and `client/src/hooks/useFinancialSettings.ts` with query + mutation hooks.
3. Create `client/src/features/settings/FinancialSettingsForm.tsx`:
   - React Hook Form + Zod: all 5 settings fields with validations (BR-045).
   - Pre-fill defaults if `currentAge: null`: show placeholder of 60 for retirementAge and 30,000,000 for target (UI hint only, BR-046).
   - Cross-field validation: `retirementAge > currentAge`.
   - On submit: call `useUpdateFinancialSettings`. Show success toast.
4. Create `client/src/pages/SettingsPage.tsx` rendering `<FinancialSettingsForm>`.

**Done criteria:**
- [ ] Settings page loads existing settings into form fields.
- [ ] Submitting with `retirementAge <= currentAge` shows "Retirement age must be greater than current age" inline.
- [ ] Submitting valid settings shows a success toast and the retirement widget on the dashboard updates.
- [ ] `expectedAnnualReturn` of 0 shows a validation error.
- [ ] `expectedAnnualContribution` of 0 is accepted (valid; optional).

---

### TASK-030
**Title:** Account settings page
**Assigned to:** FE
**Phase:** 3
**Dependencies:** TASK-007, TASK-029

**Description:**
Build the account settings page for name update and password change.

Steps:
1. Create `client/src/features/settings/AccountSettingsForm.tsx`:
   - Section 1: "Update Name" — single input, calls `useUpdateProfile({ name })`.
   - Section 2: "Change Password" — `currentPassword`, `newPassword` (min 8 chars), `confirmNewPassword` (must match `newPassword`). Cross-field: confirm must equal new. Calls `useUpdateProfile({ currentPassword, newPassword })`.
   - Show 403 error as "Current password is incorrect."
2. Create `client/src/pages/AccountPage.tsx` rendering `<AccountSettingsForm>`.

**Done criteria:**
- [ ] Name update succeeds and the top bar updates to show the new name.
- [ ] Password change with wrong `currentPassword` shows "Current password is incorrect."
- [ ] `newPassword` shorter than 8 chars shows inline validation error (before API call).
- [ ] `confirmNewPassword` not matching `newPassword` shows "Passwords do not match" inline.
- [ ] Successful password change shows a success message (no automatic logout — user stays logged in on this session).

---

## Phase 4 — Polish

---

### TASK-031
**Title:** Common UI components — loading, error, toast
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-011

**Description:**
Implement shared presentational components used across all pages.

Steps:
1. Create `client/src/components/common/LoadingSpinner.tsx`: centered SVG or Tailwind animate-spin div.
2. Create `client/src/components/common/ErrorMessage.tsx`: red alert box with icon and message text.
3. Install and configure shadcn `Toast` + `Toaster`:
   - Add `<Toaster />` to `App.tsx` at the root.
   - Expose a `useToast()` hook (shadcn default); wrap in a convenience `showToast(message, type)` util.
4. Apply consistent loading/error patterns across all page components (use the components created here).

**Done criteria:**
- [ ] All pages using `useQuery` show `<LoadingSpinner>` while loading.
- [ ] All pages show `<ErrorMessage>` with the error message when a query fails.
- [ ] Successful mutations (add item, save settings, etc.) trigger a green toast.
- [ ] Failed mutations trigger a red toast with the server error message.
- [ ] `<Toaster>` is present and functional on all authenticated pages.

---

### TASK-032
**Title:** Form validation polish and edge case display
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-018, TASK-020, TASK-029, TASK-030

**Description:**
Audit all forms for consistent validation UX and edge case handling.

Steps:
1. Audit `LoginForm`, `SnapshotHeaderForm`, `AddItemForm`, `FinancialSettingsForm`, `AccountSettingsForm`.
2. Ensure every Zod error surfaces as an inline red message below the relevant field.
3. All submit buttons disabled while mutation is pending.
4. All text inputs trim whitespace on blur before validation (`.transform(s => s.trim())`).
5. Number inputs: `currentBalance`, all financial settings fields — prevent typing non-numeric characters.
6. Snapshot date input: use `<input type="date">` for native date picker.
7. Ensure no form allows a `currentBalance < 0` to reach the API — Zod `.min(0)` on the frontend.
8. Confirm dialogs for delete snapshot and delete item operations are tested.

**Done criteria:**
- [ ] All required-field errors appear immediately on submit without API call.
- [ ] All inputs trim surrounding whitespace before submission.
- [ ] `currentBalance` input rejects negative values at the form level.
- [ ] Pending mutations disable submit buttons and show a spinner inside the button.
- [ ] All Zod error messages are human-readable (not raw Zod codes).

---

### TASK-033
**Title:** Snapshot ledger inline balance edit UX
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-020

**Description:**
Polish the inline edit experience in `LedgerRow.tsx` to match the spreadsheet-like UX goal.

Steps:
1. Clicking a balance cell enters edit mode (shows a number `<input>`).
2. `Enter` or `Tab` submits and moves focus to the next balance cell (Tab) or blurs (Enter).
3. `Escape` cancels the edit without saving.
4. Optimistic update: show the new value immediately while the mutation is in flight.
5. On mutation error: revert to original value and show a red toast.
6. Changed cells show a subtle loading indicator while saving.
7. After saving, auto-calculate and display updated `amountChange` and `percentChange` in the same row (recomputed from the refetched server response).
8. Sticky total row re-calculates on every item update.

**Done criteria:**
- [ ] Clicking a balance cell enters edit mode.
- [ ] `Tab` moves to the next row's balance cell.
- [ ] `Escape` reverts the value.
- [ ] The total row updates immediately when a balance changes (optimistic).
- [ ] Server error on save reverts the cell and shows a toast.

---

### TASK-034
**Title:** Row reorder (up/down buttons)
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-020

**Description:**
Implement item reordering via up/down buttons in the ledger. (Drag-and-drop is deferred; up/down is sufficient for v1.)

Steps:
1. Add "Move Up" and "Move Down" icon buttons to each `LedgerRow` (disabled for first/last rows respectively).
2. On click, swap `displayOrder` values of the clicked item and its neighbor.
3. Call `useUpdateItem` for both swapped items (or a single batch call if API supports it; in v1, two sequential calls are acceptable).
4. After both mutations succeed, invalidate `['snapshots', snapshotId]` to refetch the sorted order.
5. Do not show reorder buttons on locked snapshots.

**Done criteria:**
- [ ] "Move Up" button is disabled on the first row; "Move Down" is disabled on the last row.
- [ ] Clicking "Move Up" swaps the row visually with the row above it after refetch.
- [ ] The new order persists on page refresh.
- [ ] Reorder buttons are hidden when the snapshot is locked.

---

### TASK-035
**Title:** Wealth line chart (wealth over time)
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-022, TASK-025

**Description:**
Build the wealth-over-time line chart on the dashboard.

Steps:
1. Use `useSnapshots()` data (already fetched for `RecentSnapshotsList`) to compute the series.
2. Create `client/src/components/charts/WealthLineChart.tsx`:
   - Recharts `LineChart` + `Line` + `XAxis` (snapshot dates) + `YAxis` (THB totals) + `Tooltip` + `CartesianGrid`.
   - X-axis: snapshot dates formatted as `MMM YYYY` (use `Intl.DateTimeFormat`).
   - Y-axis: abbreviated THB values (e.g., "฿15M", "฿30M") for readability.
   - Tooltip: full date + total formatted as "฿15,000,000.00".
   - If fewer than 2 snapshots exist, show "Add more snapshots to see wealth trend" placeholder.
3. Render in `DashboardPage.tsx` below the bar chart.

**Done criteria:**
- [ ] Line chart renders with one data point per snapshot, ordered by date ascending.
- [ ] X-axis labels show dates in "Apr 2026" format.
- [ ] Y-axis shows abbreviated values.
- [ ] Tooltip shows full formatted amounts.
- [ ] Fewer than 2 snapshots shows the placeholder message.

---

### TASK-036
**Title:** Security hardening — rate limiter + CORS + cookie audit
**Assigned to:** BE
**Phase:** 4
**Dependencies:** TASK-005

**Description:**
Add a general API rate limiter and audit all cookie and CORS settings.

Steps:
1. Add a general rate limiter in `app.ts` applied to all `/api` routes: 200 req/min per IP (distinct from the login rate limiter).
2. Verify CORS is configured with `credentials: true` and `origin` explicitly set to `CLIENT_ORIGIN` env var.
3. Audit the `refreshToken` cookie: confirm `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/refresh`, `Max-Age=604800` are all set on login and all are cleared (Max-Age=0) on logout.
4. Add `helmet` middleware (install `helmet` package) to set security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`.
5. Verify `requestLogger.ts` redacts `Authorization` header and `password`/`token`/`refreshToken` body fields (BR-051).

**Done criteria:**
- [ ] More than 200 requests/min to any `/api` route from the same IP returns 429.
- [ ] CORS rejects requests from origins other than `CLIENT_ORIGIN`.
- [ ] Login response `Set-Cookie` header includes all five cookie attributes.
- [ ] Logout response `Set-Cookie` header has `Max-Age=0`.
- [ ] `helmet` response headers are present (`X-Frame-Options: DENY`, etc.).
- [ ] Server logs do not contain raw tokens or passwords.

---

### TASK-037
**Title:** Input validation audit — both layers
**Assigned to:** BE
**Phase:** 4
**Dependencies:** TASK-005, TASK-007, TASK-012, TASK-013

**Description:**
Systematically verify that every POST and PUT endpoint rejects invalid inputs with the correct 400 structure, and that the frontend Zod schemas match the backend schemas.

Steps:
1. For each schema (`auth`, `snapshot`, `item`, `settings`), write a checklist of at least 3 invalid input cases.
2. Manually test or write simple integration tests (using `supertest`):
   - Missing required field.
   - Field with wrong type (string where number expected).
   - Field out of allowed range.
   - Empty string for a required string field.
3. Verify all 400 responses use the shape `{ error: "Validation failed", fields: { fieldName: "message" } }`.
4. Confirm frontend Zod schemas in all forms match the backend validation rules exactly (no stricter or more lenient than the server).
5. Document any discovered mismatches and fix them.

**Done criteria:**
- [ ] `POST /api/auth/login` with `email: 123` returns 400 with `fields.email`.
- [ ] `POST /api/snapshots` with no `snapshotDate` returns 400 with `fields.snapshotDate`.
- [ ] `POST /api/snapshots/:id/items` with `currentBalance: "abc"` returns 400 with `fields.currentBalance`.
- [ ] `PUT /api/me/financial-settings` with `expectedAnnualReturn: 0` returns 400 with `fields.expectedAnnualReturn`.
- [ ] All 400 responses include `"error": "Validation failed"` and a non-empty `fields` object.

---

### TASK-038
**Title:** Empty states and no-data handling
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-017, TASK-019, TASK-025

**Description:**
Add meaningful empty states for all pages and widgets that show data that may not yet exist.

Steps:
1. **Snapshot list page** — No snapshots yet: show "No snapshots yet. Create your first snapshot to get started." with a "New Snapshot" button.
2. **Snapshot detail page** — Snapshot with no items: show "This snapshot has no investments. Add your first investment to get started." with "Add Investment" button.
3. **Dashboard** — No snapshots: show "No snapshot data available. Create a snapshot to see your net worth." with a link.
4. **Pie chart** — No items: show a centered "No data" text inside the chart area.
5. **Bar chart** — No items: same "No data" treatment.
6. **Line chart** — Fewer than 2 snapshots: show "Add at least 2 snapshots to see wealth trend."
7. **Retirement widget** — Settings not configured: show a configure link.

**Done criteria:**
- [ ] All empty states render with a helpful message and a clear call to action.
- [ ] No component renders a blank or broken UI when its data array is empty.
- [ ] Charts do not throw runtime errors when passed empty data arrays.

---

### TASK-039
**Title:** Responsive layout tweaks
**Assigned to:** FE
**Phase:** 4
**Dependencies:** TASK-011, TASK-019, TASK-025

**Description:**
Ensure the application is usable on screens down to 1024px wide (laptop). Full mobile optimization is deferred per PRD Section 18.

Steps:
1. Set minimum content width to 1024px via Tailwind `min-w-[1024px]` on the main content area.
2. Ensure the ledger table has a horizontal scroll container (`overflow-x-auto`) so it does not break on narrow laptops.
3. Sidebar collapses to icons-only at < 1280px viewport (use Tailwind responsive classes).
4. Dashboard charts wrap to a single column below 1280px.
5. All forms are max 640px wide, centered.

**Done criteria:**
- [ ] At 1024px viewport width, no horizontal overflow occurs on the page level.
- [ ] Ledger table at 1024px shows a scrollbar rather than overflowing.
- [ ] Sidebar shows icon-only (no text labels) at 1280px.
- [ ] Dashboard charts stack vertically at < 1280px.

---

### TASK-040
**Title:** Database backup documentation and ops setup
**Assigned to:** BE
**Phase:** 4
**Dependencies:** TASK-002

**Description:**
Create a simple backup script and document the backup/restore procedure.

Steps:
1. Create `server/scripts/backup.sh`:
   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   SOURCE="src/prisma/wealth-plus.db"
   DEST="backups/wealth-plus.backup.$DATE.db"
   mkdir -p backups
   cp "$SOURCE" "$DEST"
   echo "Backup created: $DEST"
   ```
2. Add `"db:backup": "bash scripts/backup.sh"` to `server/package.json` scripts.
3. Add `server/backups/` to `.gitignore`.
4. Write a concise ops note in `server/README.md` (or the root README) covering:
   - How to run the backup script.
   - How to restore: `cp backups/<file> src/prisma/wealth-plus.db`.
   - How to re-seed if the DB is lost.

**Done criteria:**
- [ ] `npm run db:backup -w server` creates a dated `.db` copy in `server/backups/`.
- [ ] The backup directory is gitignored.
- [ ] Restore instructions are documented in plain English.

---

### TASK-041
**Title:** End-to-end smoke test
**Assigned to:** BE + FE (joint)
**Phase:** 4
**Dependencies:** All previous tasks

**Description:**
Walk through the primary workflows manually to verify the MVP is functional end-to-end.

Steps (both developers execute together):
1. Start `npm run dev` from root. Confirm both services start without error.
2. Run `npm run db:seed`. Confirm two user accounts exist.
3. Log in as `net@family.local`. Confirm redirect to dashboard. Dashboard shows empty state.
4. Create a blank snapshot "2025 Year End" with date 2025-12-31.
5. Add 3 investments: KBank Fixed Deposit (CASH_DEPOSIT), SCB Mutual Fund (MUTUAL_FUND), Gold Savings (GOLD).
6. Lock the snapshot. Confirm edit controls disappear.
7. Create a new snapshot "2026 Year End" by duplicating the latest. Confirm all 3 items are pre-populated.
8. Update balances on 2 items. Delete the 3rd item.
9. Verify comparison columns: matched items show green/red. Deleted item appears in "Closed / Missing" section.
10. Check dashboard: total, pie chart with 2 types, bar chart with 2 institutions.
11. Navigate to Settings → configure retirement goal (age 40, retire 60, target 30M, return 7%).
12. Dashboard retirement widget shows projection and progress bar.
13. Log out. Log in as `ann@family.local`. Confirm net@family.local's data is not visible.
14. Change net@family.local's password via Account settings. Confirm old password is rejected on re-login.

**Done criteria:**
- [ ] All 14 steps above complete without runtime errors or incorrect data.
- [ ] No console errors (JavaScript or server) during the walkthrough.
- [ ] Each user sees only their own snapshots.
- [ ] Retirement widget shows a non-zero `projectedFV` after settings are saved.
- [ ] Lock prevents any edit; unlock restores editing.

---

## Summary by Phase

| Phase | Tasks | Assigned BE | Assigned FE |
|-------|-------|-------------|-------------|
| 1 Foundation | TASK-001 to TASK-011 | 001,002,003,004,005,006,007,008 | 009,010,011 |
| 2 Snapshot Engine | TASK-012 to TASK-021 | 012,013,014,015,016 | 017,018,019,020,021 |
| 3 Analytics | TASK-022 to TASK-030 | 022,023,024 | 025,026,027,028,029,030 |
| 4 Polish | TASK-031 to TASK-041 | 036,037,040 | 031,032,033,034,035,038,039 |

**Total tasks: 41**

---

## Dependency Graph (Critical Path)

```
TASK-001 → TASK-002 → TASK-003
         → TASK-004 → TASK-005 → TASK-006 → TASK-007
                                           → TASK-012 → TASK-013 → TASK-014
                                                                  → TASK-015 → TASK-016
         → TASK-008
TASK-001 → TASK-009 → TASK-010 (also needs TASK-005)
                     → TASK-011 → TASK-017 → TASK-018 (also needs TASK-015)
                                           → TASK-019 (also needs TASK-016)
                                                      → TASK-020 (also needs TASK-013)
                                                      → TASK-021 (also needs TASK-014)
TASK-016 → TASK-022 → TASK-023
                     → TASK-024 (also needs TASK-007)
TASK-022 → TASK-025 → TASK-026 (also needs TASK-023)
                     → TASK-027
                     → TASK-028 (also needs TASK-024)
TASK-007 → TASK-029 → TASK-030
```

Minimum delivery order to unblock both developers:
1. BE: TASK-001, 002, 003, 004, 008 | FE: starts TASK-009 in parallel after 001
2. BE: TASK-005, 006, 007 | FE: TASK-010, 011 (after 009)
3. BE: TASK-012, 013, 014, 015 | FE: TASK-017, 018 (after 012, 015)
4. BE: TASK-016 | FE: TASK-019, 020, 021 (after 016, 013, 014)
5. BE: TASK-022, 023, 024 | FE: TASK-025, 026, 027, 028, 029, 030
6. Phase 4 Polish tasks (all parallel within each developer's lane)

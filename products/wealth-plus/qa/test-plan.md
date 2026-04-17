# Test Plan — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft
**Author:** QA Test Engineer
**Product:** Wealth Plus (Wealth Tracker)
**References:** PRD (README.md), User Stories (planning/user-stories.md), Business Rules (planning/business-rules.md), API Contracts (architecture/api-contracts.md)

---

## 1. Scope

### 1.1 In Scope (v1)

The following functional areas are covered by this test plan:

| Area | Coverage |
|------|----------|
| Authentication | Login, logout, refresh token, change password, rate limiting, cross-user isolation |
| Snapshot Management | Create (blank and duplicate), list, read, update header, lock, unlock, delete |
| Investment Ledger | Add item, edit item, delete item, duplicate warning, locked snapshot enforcement |
| Comparison Engine | Prior snapshot matching (3-field key), amount change, % change, new items, closed items |
| Dashboard | Total net worth widget, allocation breakdown, institution breakdown, snapshot selector, recent snapshots list |
| Retirement Goal | Configure settings, projected FV formula, progress %, gap calculation, years remaining |
| Security | JWT enforcement on all protected routes, token expiry, cross-user data isolation, userId scoping |
| Edge Cases | Empty snapshot, first snapshot (no prior), previousBalance = 0 guard, retirement target exceeded, invalid retirement age |

### 1.2 Out of Scope (v1 — deferred to later)

| Area | Reason |
|------|--------|
| Mobile responsive polish | Deferred post-MVP |
| Export to CSV / PDF | Not in v1 scope |
| Multi-currency FX conversion | THB only in v1 |
| Combined household view | Future feature |
| Email reminders | Not in v1 |
| File attachments | Not in v1 |
| Automatic bank/broker sync | Not in v1 |
| Dark mode | Explicitly excluded (PRD section 26) |
| Performance / load testing | 2-user app; no meaningful load profile |
| Browser compatibility matrix | In-scope only for the primary browser used during dev (Chrome latest) |

---

## 2. Test Approach

### 2.1 Unit Tests (Backend Services)

**Framework:** Jest + ts-jest  
**Location:** `server/src/services/__tests__/`  
**What to unit test:**

| Service | Units to Test |
|---------|--------------|
| `authService` | `hashPassword`, `comparePassword`, `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken` |
| `comparisonService` | Match-key logic (case-insensitive), `amountChange`, `percentChange`, `isNew`, `closedItems` list assembly |
| `retirementService` | FV formula with r > 0, FV formula with r = 0 (simplification), `progressPercent`, `gap`, `yearsRemaining`, `surplusAmount` |
| `snapshotService` | Sort order logic, `total` computation, `changePercent` null guard (totalPrevious = 0) |
| `validationSchemas` (Zod) | All Zod schema rejection cases: empty strings, negative balance, retirementAge <= currentAge, etc. |

**Approach:** Pure function tests with mocked Prisma client. No database required. Aim for 100% branch coverage on calculation and matching logic.

### 2.2 Integration Tests (API Endpoints)

**Framework:** Jest + Supertest  
**Location:** `server/src/__tests__/integration/`  
**Database:** In-memory SQLite (`:memory:`) seeded fresh before each test suite  
**Auth helper:** Helper utility that logs in as a seed user and returns `{ accessToken, cookie }` for use in test requests  

**Endpoints under integration test:**

| Method | Endpoint | Key scenarios |
|--------|----------|--------------|
| POST | `/api/auth/login` | 200 valid creds, 401 wrong password, 429 rate limit |
| POST | `/api/auth/refresh` | 200 valid cookie, 401 no cookie, 401 expired token |
| POST | `/api/auth/logout` | 200 success, refresh token invalidated |
| PUT | `/api/me` | 200 name change, 200 password change, 403 wrong current password, 400 short new password |
| GET | `/api/snapshots` | 200 sorted list with totals, 401 unauthenticated |
| POST | `/api/snapshots` | 201 blank create, 400 missing name, 400 invalid date |
| GET | `/api/snapshots/:id` | 200 with items + comparison, 403 wrong user, 404 not found |
| PUT | `/api/snapshots/:id` | 200 update, 403 locked, 403 wrong user |
| DELETE | `/api/snapshots/:id` | 204 cascade delete, 403 wrong user |
| POST | `/api/snapshots/:id/duplicate` | 201 all items copied, 404 no prior snapshot |
| POST | `/api/snapshots/:id/lock` | 200 isLocked=true |
| POST | `/api/snapshots/:id/unlock` | 200 isLocked=false, data intact |
| POST | `/api/snapshots/:id/items` | 201 valid item, 403 locked, 400 negative balance, 201 duplicate warning flag |
| PUT | `/api/snapshots/:id/items/:itemId` | 200 update, 403 locked, 400 negative balance |
| DELETE | `/api/snapshots/:id/items/:itemId` | 204 success, 403 locked, 403 wrong user |
| GET | `/api/dashboard` | 200 latest default, totals/change correct |
| GET | `/api/dashboard/allocation` | 200 grouped by type, excludes zero-balance types |
| GET | `/api/dashboard/retirement` | 200 with settings, 200 settings null |
| PUT | `/api/me/financial-settings` | 200 upsert, 400 retirementAge <= currentAge |

**Supertest configuration:** Each integration test file starts with `beforeAll` to run Prisma migrations against `:memory:` and seed two users (`net@family.local`, `ann@family.local`). `afterEach` clears snapshots and items. `afterAll` closes the Prisma connection.

### 2.3 E2E Checklist (Manual Browser Walkthrough)

**Environment:** Local dev (frontend Vite dev server + backend Express)  
**Browser:** Chrome latest  
**Users available:** User 1 (`net@family.local`), User 2 (`ann@family.local`)  

**E2E walkthrough sequence:**

1. Open `http://localhost:5173/login` — verify login page renders
2. Log in as User 1 — verify redirect to `/dashboard`
3. Navigate to `/snapshots` — verify empty state with "Create your first snapshot" prompt
4. Create a blank snapshot — verify redirect to ledger, zero items shown
5. Add 3 investment items with different types and institutions — verify all save correctly
6. Edit one item's currentBalance — verify amount change and % change recalculate immediately
7. Delete one item — verify table updates, sticky total updates
8. Lock the snapshot — verify all edit controls disappear, padlock icon shown in list
9. Attempt inline edit on a locked snapshot cell — verify nothing happens
10. Unlock the snapshot — verify edit controls return, all data intact
11. Create a second snapshot by duplicating — verify all 2 remaining items copied with correct balances
12. Update balances on copied items — verify comparison columns show correct previousBalance, amountChange, percentChange
13. Add a new item in the second snapshot — verify "New" shown in % Change column (gray)
14. Navigate to dashboard — verify total matches sum of items, allocation pie chart renders
15. Use snapshot selector to switch to the first snapshot — verify all widgets update
16. Open settings page — enter retirement settings, save — verify values persist
17. Navigate back to dashboard — verify retirement progress widget shows % achieved, projected FV, gap, years remaining
18. Log out — verify redirect to `/login`, protected route `/dashboard` redirects back to `/login`
19. Log in as User 2 — verify no snapshots visible (User 1's data not shown)
20. Attempt to navigate to a User 1 snapshot URL directly — verify 403 / redirect

---

## 3. Test Environments

### 3.1 Local Development

| Component | Setup |
|-----------|-------|
| Node.js | v20+ |
| npm | v10+ |
| Backend server | `cd server && npm install && npm run dev` → listens on `http://localhost:4000` |
| Frontend client | `cd client && npm install && npm run dev` → listens on `http://localhost:5173` |
| Database | SQLite file at `server/prisma/dev.db` (auto-created on first migration run) |
| Schema migration | `cd server && npx prisma migrate dev` |
| Seed accounts | `cd server && npm run seed` — creates `net@family.local` and `ann@family.local` |
| Environment variables | Copy `server/.env.example` to `server/.env`; set `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DATABASE_URL=file:./prisma/dev.db` |

### 3.2 Integration Test Environment

| Component | Setup |
|-----------|-------|
| Database | In-memory SQLite (`:memory:`) configured via `DATABASE_URL=file::memory:?cache=shared` in test environment |
| Test runner | `cd server && npm test` |
| Seed | Each test suite's `beforeAll` calls a test seed helper to insert 2 users |
| Isolation | `afterEach` truncates snapshots and items; `afterAll` disconnects Prisma |

### 3.3 Required Environment Variables for Tests

```
NODE_ENV=test
DATABASE_URL=file::memory:?cache=shared
JWT_SECRET=test-jwt-secret-min-32-chars-long
REFRESH_TOKEN_SECRET=test-refresh-secret-min-32-chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

---

## 4. Entry Criteria

Before formal testing begins, ALL of the following must be true:

| # | Criterion |
|---|-----------|
| EC-1 | All Phase 1 and Phase 2 implementation tasks are marked complete by the Tech Lead |
| EC-2 | `npm run seed` executes without error and creates exactly two user accounts |
| EC-3 | `npx prisma migrate dev` runs without error on a fresh database |
| EC-4 | Backend server starts and responds to `GET /api/me` with 401 (no auth) within 2 seconds |
| EC-5 | Frontend dev server starts and renders the `/login` page without console errors |
| EC-6 | Unit test suite (`npm test -- --testPathPattern=unit`) runs with 0 failures |
| EC-7 | API contract document (architecture/api-contracts.md) is at status "Draft" or later — no TBD endpoints |
| EC-8 | All required environment variables are documented in `.env.example` |

---

## 5. Exit Criteria

QA signs off when ALL of the following are true:

| # | Criterion |
|---|-----------|
| EX-1 | All P1 test cases pass with no failures |
| EX-2 | No more than 2 P2 test cases failing, with each failure having an accepted bug ticket |
| EX-3 | Zero P3 failures that represent data-loss or security issues |
| EX-4 | Cross-user isolation verified: User 2 cannot read, modify, or delete any resource owned by User 1 (and vice versa) |
| EX-5 | Locked snapshot enforcement verified: all 3 write operations (add item, update item, delete item) return 403 on a locked snapshot |
| EX-6 | Comparison engine verified: amount change and % change produce correct values against known seed data |
| EX-7 | Retirement FV formula verified: computed projectedFV matches hand-calculated expected value within ±1 THB (floating point tolerance) |
| EX-8 | E2E walkthrough completed end-to-end with no blocking issues |
| EX-9 | All P1 security test cases pass (JWT required, expired token rejected, cross-user snapshot access returns 403) |
| EX-10 | Bug report filed for any failing test case, with severity and owner assigned |

---

## 6. Risk Areas

The following areas carry elevated risk and require extra test attention:

### 6.1 Auth Isolation (CRITICAL)

**Risk:** A bug in the `userId` WHERE clause scoping could expose one user's financial data to the other user. With only two users sharing one database, any row-level leak is a complete privacy failure.

**Mitigations:**
- Dedicated cross-user test cases for every read and write endpoint
- Integration tests that explicitly use User 2's JWT to target User 1's snapshot IDs
- Verify `403` (not `404`) is returned — `404` could mask a data leak by accidentally returning wrong user's data or silently succeeding

### 6.2 Comparison Engine (HIGH)

**Risk:** The 3-field match key (investmentName + institution + investmentType) uses case-insensitive string comparison. A case-sensitivity bug could cause items to be incorrectly classified as "New" or fail to find their prior match. Division-by-zero when previousBalance = 0 must also be guarded.

**Mitigations:**
- Unit tests with mixed-case key values (e.g., "kbank" vs "KBank")
- Explicit test for previousBalance = 0 with currentBalance > 0 → expected display: "New"
- Test for exact formula values with known inputs

### 6.3 Locked Snapshot Enforcement (HIGH)

**Risk:** The lock gate must be checked in ALL item write routes. A missing guard on any one endpoint (add, update, delete, header update) would allow silent modification of historical data.

**Mitigations:**
- Individual test cases for each of the 4 write operations on a locked snapshot
- Test that the lock operation itself (POST /lock) succeeds when called, and that the unlock (POST /unlock) only sets isLocked = false without resetting item data

### 6.4 Retirement FV Formula (MEDIUM)

**Risk:** The FV formula `FV = PV × (1 + r)^n + C × [((1 + r)^n − 1) / r]` has a special case when `r = 0` that must be handled separately to avoid division by zero. An incorrect simplification produces a wrong projected value.

**Mitigations:**
- Unit test with r = 0 (FV = PV + C × n)
- Unit test with r > 0 and known values (e.g., PV=15,000,000, r=0.07, n=20, C=500,000 → expected FV = 68,142,684.23 per API contract example)
- Boundary test: yearsRemaining ≤ 0 must suppress the formula output

### 6.5 Cascade Delete (MEDIUM)

**Risk:** Prisma's `onDelete: Cascade` must be correctly configured on `SnapshotItem`. If missing, deleting a snapshot will leave orphaned items in the database.

**Mitigations:**
- Integration test that verifies item count = 0 after snapshot deletion (query items table directly via Prisma in test helper)

### 6.6 Refresh Token Lifecycle (MEDIUM)

**Risk:** Refresh tokens must be invalidated server-side on logout and on password change. A stale refresh token that continues to issue new access tokens after logout is a session security failure.

**Mitigations:**
- Integration test: log in → log out → attempt POST /api/auth/refresh → expect 401
- Integration test: log in → change password → attempt POST /api/auth/refresh with old cookie → expect 401

---

## 7. Test Data Requirements

### 7.1 Seed Users

Both users are created by `npm run seed`. Passwords must be set in the seed script and communicated to the QA team via the `.env.example` or a secure note.

| User | Email | Role |
|------|-------|------|
| User 1 | `net@family.local` | Primary test user — creates all primary test snapshots |
| User 2 | `ann@family.local` | Secondary test user — used for cross-user isolation tests |

### 7.2 Snapshot Seed Data (for Integration and E2E Tests)

The following snapshots and items should be seeded via a test fixture helper (not the production seed script):

**User 1 — Snapshot A (Prior Snapshot)**

| Field | Value |
|-------|-------|
| snapshotName | "2025 Year End" |
| snapshotDate | 2025-12-31 |
| isLocked | true |

Items:

| investmentType | institution | investmentName | currentBalance |
|---------------|-------------|----------------|---------------|
| CASH_DEPOSIT | KBank | KBank Fixed Deposit 12M | 500,000.00 |
| THAI_EQUITY | Interactive Brokers | SET Index Fund | 300,000.00 |
| GOLD | KBank | Gold Savings Account | 80,000.00 |

Snapshot A Total: 880,000.00

**User 1 — Snapshot B (Current Snapshot)**

| Field | Value |
|-------|-------|
| snapshotName | "2026 Year End" |
| snapshotDate | 2026-12-31 |
| isLocked | false |

Items:

| investmentType | institution | investmentName | currentBalance | Expected previousBalance | Expected amountChange | Expected percentChange |
|---------------|-------------|----------------|---------------|--------------------------|----------------------|----------------------|
| CASH_DEPOSIT | KBank | KBank Fixed Deposit 12M | 550,000.00 | 500,000.00 | +50,000.00 | +10.00% |
| THAI_EQUITY | Interactive Brokers | SET Index Fund | 280,000.00 | 300,000.00 | -20,000.00 | -6.67% |
| MUTUAL_FUND | Kasikorn Asset | K-Cash RMF | 200,000.00 | (no match) | — | New |

Closed/Missing Items (from Snapshot A not in Snapshot B):
- GOLD / KBank / Gold Savings Account → previousBalance 80,000.00

Snapshot B Total: 1,030,000.00
changeAmount vs Snapshot A: +150,000.00
changePercent vs Snapshot A: +17.05%

**User 1 — Retirement Settings**

| Field | Value |
|-------|-------|
| currentAge | 40 |
| retirementAge | 60 |
| retirementTargetAmount | 30,000,000.00 |
| expectedAnnualReturn | 7.0 |
| expectedAnnualContribution | 500,000.00 |

Expected retirement outputs (based on PV = 1,030,000.00 from Snapshot B total):
- yearsRemaining: 20
- progressPercent: 3.4% (1,030,000 / 30,000,000 × 100)
- gap: 28,970,000.00
- projectedFV: calculated via FV formula (see TC-REG-002 for manual verification)

**User 2 — No snapshots** (for isolation tests — User 2 starts with zero snapshots)

### 7.3 Data Reset Policy

- Unit tests: no database; pure function input/output only
- Integration tests: fresh SQLite `:memory:` database per test suite; fixture helper seeds required data in `beforeAll` / `beforeEach`
- E2E tests: reset by running `npm run seed` and manually creating snapshots per the E2E walkthrough sequence

---

## 8. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| QA Test Engineer | Write and execute all test cases; raise bugs; maintain this plan |
| Tech Lead | Review and approve test plan; provide test helper utilities |
| Backend Developer | Fix backend bugs found during testing; provide seed script |
| Frontend Developer | Fix UI bugs; support E2E walkthroughs |
| CEO (Product Owner) | Final sign-off on exit criteria |

---

## 9. Bug Severity Definitions

| Severity | Definition |
|----------|-----------|
| S1 — Blocker | Data loss, security breach, complete feature failure. Blocks release. |
| S2 — Critical | Major feature broken; no workaround. Must fix before release. |
| S3 — Major | Feature partially broken; workaround exists. Fix in current sprint. |
| S4 — Minor | Cosmetic or edge-case issue. Fix in next sprint. |

---

## 10. Test Schedule

| Phase | Activity | Duration |
|-------|----------|----------|
| Phase 1 | Write unit tests alongside service implementations | During development |
| Phase 2 | Write integration tests per completed endpoint | During development |
| Phase 3 | Full integration test run; fix P1 failures | 2 days |
| Phase 4 | E2E manual walkthrough | 1 day |
| Phase 5 | Regression run after bug fixes | 1 day |
| Phase 6 | QA sign-off | 0.5 days |

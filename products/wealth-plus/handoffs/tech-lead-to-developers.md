# Handoff Record — Tech Lead to Developers

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Ready

---

## From Role
Tech Lead

## To Role
Backend Developer + Frontend Developer

## Objective
Build the Wealth Plus MVP in full, from project scaffold to production-ready feature set, using the implementation plan and task breakdown as the authoritative build guide.

---

## Product Path
`/products/wealth-plus/`

The actual application code will live inside `products/wealth-plus/` as a monorepo:
```
products/wealth-plus/
├── client/        ← React SPA (Frontend Developer)
├── server/        ← Express API + Prisma (Backend Developer)
└── package.json   ← workspace root
```

---

## Context

Wealth Plus is a private, two-user personal wealth tracking web application that replaces a manual Google Sheets workflow. The two users (husband and wife) log investment balances once or twice a year, compare growth versus the prior period, and monitor retirement progress.

The core design decisions that govern all implementation choices:

1. **Monorepo** — npm workspaces, single `npm install`, single `npm run dev` starts both services.
2. **SQLite via Prisma** — zero infrastructure for v1; trivially migrates to PostgreSQL later by changing one line in `schema.prisma`.
3. **JWT in memory, refresh token in httpOnly cookie** — access token is never persisted in `localStorage`; refresh token is never accessible via JavaScript.
4. **Server-side comparison engine** — all snapshot comparison logic (prior balance, amount change, % change) runs in `comparison.service.ts`, not in the frontend.
5. **TypeScript strict everywhere** — `noImplicitAny`, `noUncheckedIndexedAccess`, and full strict mode in both packages.

---

## Inputs

All reference documents are in the product folder. Read them before starting:

| Document | Path | Purpose |
|----------|------|---------|
| PRD | `/products/wealth-plus/README.md` | Full product requirements, user stories, acceptance criteria |
| Solution Design | `/products/wealth-plus/architecture/solution-design.md` | Architecture, data model, security architecture, trade-off decisions |
| API Contracts | `/products/wealth-plus/architecture/api-contracts.md` | Exact request/response shapes for all 18 endpoints |
| Business Rules | `/products/wealth-plus/planning/business-rules.md` | BR-001 through BR-055 — enforcement requirements per layer |
| Tech Plan | `/products/wealth-plus/implementation/tech-plan.md` | Coding standards, env setup, monorepo file listing, shared types, auth flow code, comparison engine pseudocode, retirement formula |
| Task Breakdown | `/products/wealth-plus/implementation/task-breakdown.md` | 41 numbered tasks with dependencies and done criteria |

---

## Constraints

### Hard constraints (non-negotiable)
- TypeScript strict mode — no `any` types in application code.
- bcrypt cost factor minimum 12 (BR-001).
- Refresh token must be stored as a SHA-256 hash in the `RefreshToken` DB table, not plaintext (BR-004).
- Every database query touching user-owned data must scope to `userId = req.user.id` (BR-006).
- Locked snapshots reject all writes except lock/unlock (BR-013). Return HTTP 403.
- Passwords must never appear in server logs (BR-051).
- JWT_SECRET must be at least 32 characters; server must refuse to start if it is not set (see tech-plan Section 2.4).
- No self-registration endpoint (BR-007).
- Seed script must not create snapshots or financial settings (BR-055).

### Soft constraints (strong recommendations)
- Prefer editing existing files over creating new ones. Do not add files outside the documented structure.
- Keep controllers thin — no business logic in controllers. Business logic belongs in services.
- Keep React components free of raw `fetch`/`axios` calls. All API calls go through `client/src/api/*.ts` functions.
- All monetary amounts formatted using `formatCurrency` utility — never inline `toFixed` calls in components.
- Do not use `dangerouslySetInnerHTML` with user data (BR-049).

### Technology constraints
- Node.js 20 LTS (pin in `.nvmrc`).
- npm workspaces (not pnpm, not yarn).
- SQLite for v1. Do not introduce Docker or Postgres.
- Recharts for charts. Do not introduce another charting library.
- shadcn/ui + Tailwind for UI. Do not introduce a CSS-in-JS library.

---

## Expected Output (Key Deliverables)

Both developers together deliver a running application that satisfies all acceptance criteria in PRD Section 23. Specifically:

**Backend Developer delivers:**
1. Prisma schema with all 5 models, migration, and seed script.
2. Express app with CORS, cookie-parser, helmet, rate limiting, request logging, and global error handling.
3. Auth endpoints: login (rate-limited), refresh, logout — with correct cookie flags.
4. Auth middleware that verifies JWT and attaches `req.user`.
5. All 18 API endpoints implemented with full Zod validation, ownership enforcement, and correct HTTP status codes.
6. Comparison engine service (`comparison.service.ts`) with all edge cases handled (new items, closed items, zero previousBalance).
7. Retirement projection function (`calculateRetirementFV`) and `buildRetirementProjection`.
8. Database backup script.

**Frontend Developer delivers:**
1. React app skeleton: React Router, TanStack Query, Zustand stores, Axios instance with silent refresh interceptor.
2. Auth flow: login page, `AuthGuard` component, logout.
3. App shell: sidebar, top bar.
4. All 7 pages and their route bindings.
5. All React features: `SnapshotListTable`, `LedgerTable`, `LedgerRow` (inline edit), `AddItemForm`, `CreateSnapshotModal`, `LockUnlockButton`, `ClosedItemsSection`.
6. All TanStack Query hooks for every API endpoint.
7. All Recharts components: `AllocationPieChart`, `InstitutionBarChart`, `WealthLineChart`.
8. Retirement widget, net worth widget, snapshot selector.
9. Settings forms: financial settings + account settings.
10. Empty states for all pages and widgets.
11. Consistent toast feedback for all mutations.
12. `formatCurrency` and `formatPercent` utilities.

**Joint deliverable:**
- TASK-041 end-to-end smoke test completed and all 14 verification steps pass.

---

## Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| OQ-001 | Should the institution bar chart compute groupings server-side (new endpoint) or client-side from the existing snapshot items payload? Tech plan recommends client-side computation to avoid an extra endpoint. Confirm before TASK-027. | Tech Lead / FE Developer | Open |
| OQ-002 | The duplicate endpoint ignores the `:id` path parameter and always uses the most recent snapshot (BR-014). This is intentional per the API contract, but the UI could choose which snapshot to duplicate from in a future version. Confirm the FE always calls `POST /api/snapshots/:anyId/duplicate` without expecting the `:id` to matter. | FE Developer | Open |
| OQ-003 | TASK-034 specifies up/down reorder buttons. If time allows in Phase 4, drag-and-drop (react-dnd or @dnd-kit) is a UX improvement. Confirm whether this is in or out of scope before starting TASK-034. | Tech Lead / CEO | Open |

---

## Risks

| ID | Risk | Likely impact | Mitigation |
|----|------|---------------|-----------|
| R-001 | Comparison engine produces wrong results if snapshots are created out of chronological date order | Incorrect gain/loss display | Engine uses `snapshotDate` (not `createdAt`) for prior resolution; covered by TASK-016 done criteria |
| R-002 | Silent refresh loop: if `/auth/refresh` returns 401, the Axios interceptor could loop | Infinite API calls | The interceptor uses `_retry` flag on the original request config to prevent a second retry |
| R-003 | SQLite file corruption or accidental deletion | Loss of all user data | Backup script (TASK-040); ops documentation; `.gitignore` must not exclude the `.db` from being readable locally |
| R-004 | Shared types (`client/src/types/shared.ts`) diverges from `server/src/types/shared.ts` | Type mismatches surface at runtime, not compile time | Both developers must sync the file manually after any interface change; flag in code review |
| R-005 | Thai characters in investment type labels break if character encoding is not UTF-8 | Garbled labels in the UI | Confirm `Content-Type: application/json; charset=utf-8` is set by Express; set `charset` in Vite's HTML template |
| R-006 | displayOrder reorder in TASK-034 uses two sequential PUT calls rather than a transaction | Brief inconsistent order visible between calls | Acceptable for v1; add a batch reorder endpoint in v1.1 if needed |

---

## Storage Location

All implementation artifacts are stored under:

```
/products/wealth-plus/implementation/
├── tech-plan.md        ← coding standards, env setup, file listing, shared types, auth code, algorithms
└── task-breakdown.md   ← 41 numbered tasks, all phases, all dependencies, all done criteria
```

This handoff record is stored at:
```
/products/wealth-plus/handoffs/tech-lead-to-developers.md
```

On completion of development, the Backend Developer and Frontend Developer should each leave a completion note in:
```
/products/wealth-plus/handoffs/developers-to-qa.md
```
following the standard handoff template, listing any deviations from the task breakdown and any unresolved edge cases for QA to focus on.

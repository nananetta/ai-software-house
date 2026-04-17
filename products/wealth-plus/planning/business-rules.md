# Business Rules — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft — awaiting CEO sign-off
**Authors:** PM / BA

---

## Conventions

- Each rule is uniquely numbered (BR-001 …).
- Rules are grouped by domain.
- "MUST" = hard requirement enforced at the API layer.
- "SHOULD" = enforced at the UI layer as a warning; API may also warn.
- Enforcement column: **API** = backend enforced, **UI** = frontend enforced, **Both** = both layers.

---

## 1. Authentication & Session Rules

**BR-001 — Password hashing**
All user passwords MUST be hashed with bcrypt using a minimum cost factor of 12 before being persisted to the database. Plaintext passwords MUST never be stored or logged.
Enforcement: API

**BR-002 — JWT access token lifetime**
The JWT access token MUST be short-lived. Recommended lifetime: 15 minutes. The token MUST be signed with a secret that is not hardcoded in source code (loaded from environment variable).
Enforcement: API

**BR-003 — Refresh token storage**
The refresh token MUST be stored in an httpOnly, Secure, SameSite=Strict cookie. It MUST NOT be returned in the JSON response body or accessible via JavaScript.
Enforcement: API

**BR-004 — Refresh token lifetime**
The refresh token MUST have a longer lifetime than the access token. Recommended lifetime: 7 days. On logout, the refresh token MUST be invalidated server-side (blacklisted or deleted from the store).
Enforcement: API

**BR-005 — Login rate limiting**
The POST /api/auth/login endpoint MUST be rate-limited. After 10 failed attempts within a 15-minute window from the same IP address, subsequent attempts MUST return HTTP 429 Too Many Requests.
Enforcement: API

**BR-006 — User data isolation**
Every database query that returns or mutates user-owned data (snapshots, snapshot items, financial settings) MUST include a WHERE userId = <authenticatedUserId> clause. No query may return data belonging to a different user. A cross-user access attempt MUST return HTTP 403 Forbidden.
Enforcement: API

**BR-007 — No self-registration**
There is no public account registration endpoint in v1. User accounts are provisioned exclusively via the seed script (npm run seed inside server/). Any attempt to call an account creation endpoint (if it exists) from an unauthenticated context MUST be rejected.
Enforcement: API

**BR-008 — Password change requires current password**
To change a password, the user MUST provide their current password for verification. If the current password does not match, the system MUST return HTTP 403 and MUST NOT update the password hash.
Enforcement: API

**BR-009 — Minimum new password length**
A new password MUST be at least 8 characters long. Passwords shorter than 8 characters MUST be rejected with a validation error before attempting any database operation.
Enforcement: Both

---

## 2. Snapshot Rules

**BR-010 — Snapshot name required**
The snapshotName field MUST NOT be null or empty. An attempt to create or update a snapshot without a name MUST return HTTP 400 with a descriptive validation error.
Enforcement: Both

**BR-011 — Snapshot date required**
The snapshotDate field MUST NOT be null. An attempt to create or update a snapshot without a date MUST return HTTP 400.
Enforcement: Both

**BR-012 — Snapshot date format**
snapshotDate MUST be a valid ISO 8601 date (YYYY-MM-DD). The API MUST reject non-date strings with HTTP 400.
Enforcement: Both

**BR-013 — Locked snapshot is read-only**
When isLocked = true on a snapshot, any API request that attempts to:
- Update the snapshot header (PUT /api/snapshots/:id)
- Add an item (POST /api/snapshots/:id/items)
- Update an item (PUT /api/snapshots/:id/items/:itemId)
- Delete an item (DELETE /api/snapshots/:id/items/:itemId)
- Reorder items

MUST be rejected with HTTP 403 Forbidden. The lock status itself (lock / unlock) is the only permitted write operation.
Enforcement: API (UI hides controls)

**BR-014 — Duplicate snapshot copies from most recent by date**
When POST /api/snapshots/:id/duplicate is called (or a "duplicate previous" creation flow is used), the source snapshot MUST be the one with the highest snapshotDate for the authenticated user. If multiple snapshots share the same date, the one with the latest createdAt is used as the tiebreaker. The duplicate starts as a new, unlocked snapshot.
Enforcement: API

**BR-015 — Duplicate row warning**
If a snapshot contains two or more items with identical investmentType + institution + investmentName, the system SHOULD display a warning to the user. This combination creates ambiguity in the comparison engine. The user is not blocked from saving, but the warning MUST be shown.
Enforcement: UI (warning only); API MAY return a warning flag in the response.

**BR-016 — Delete cascades to items**
Deleting a snapshot (DELETE /api/snapshots/:id) MUST cascade and permanently delete all SnapshotItem records associated with that snapshot. This is enforced at the database level via Prisma's onDelete: Cascade.
Enforcement: API (DB constraint)

**BR-017 — Snapshot list sort order**
The GET /api/snapshots response MUST return snapshots sorted by snapshotDate descending. Within the same date, sort by createdAt descending.
Enforcement: API

---

## 3. Investment Item Rules

**BR-018 — Investment type required**
The investmentType field on a SnapshotItem MUST NOT be null or empty. The API MUST reject items without an investment type with HTTP 400.
Enforcement: Both

**BR-019 — Institution required**
The institution field on a SnapshotItem MUST NOT be null or empty. The API MUST reject items without an institution with HTTP 400.
Enforcement: Both

**BR-020 — Investment name required**
The investmentName field on a SnapshotItem MUST NOT be null or empty. The API MUST reject items without a name with HTTP 400.
Enforcement: Both

**BR-021 — Current balance non-negative**
The currentBalance field MUST be ≥ 0. A negative balance MUST be rejected with HTTP 400. Zero is a valid balance (e.g., a fully redeemed position not yet removed).
Enforcement: Both

**BR-022 — Preset investment types**
The following investment types are available as preset options in the UI. Custom free-text entries are also permitted; there is no server-side enum restriction in v1:

| Code | Thai Label | English Context |
|------|-----------|----------------|
| CASH_DEPOSIT | เงินฝาก | Cash / Deposits |
| THAI_EQUITY | หุ้นไทย | Thai Equities |
| FOREIGN_EQUITY | หุ้นต่างประเทศ | Foreign Equities |
| THAI_FIXED_INCOME | ตราสารหนี้ไทย | Thai Fixed Income |
| FOREIGN_FIXED_INCOME | ตราสารหนี้ต่างประเทศ | Foreign Fixed Income |
| MUTUAL_FUND | กองทุนรวม | Mutual Funds |
| GOLD | ทองคำ | Gold |
| REAL_ESTATE | อสังหาริมทรัพย์ | Real Estate |
| CASH_ON_HAND | เงินสด | Cash on Hand |
| OTHER | อื่นๆ | Other |

Enforcement: UI (preset list); API accepts any non-empty string.

**BR-023 — Preset institutions**
The following institutions are available as preset options in the UI. Custom free-text entries are also permitted:

KBank, SCB, BBL, Krungsri, Krungthai, TMBThanachart (ttb), UOB, Kasikorn Asset, Bualuang, One Asset, SCBAM, Fidelity, Interactive Brokers, Other

Enforcement: UI (preset list); API accepts any non-empty string.

**BR-024 — Default currency**
The currency field on a SnapshotItem defaults to "THB". In v1, all balances are treated as THB regardless of the currency field value. No FX conversion is performed.
Enforcement: API (default) / Both (display)

**BR-025 — Display order persistence**
When rows are reordered, the new displayOrder values for ALL affected items in the snapshot MUST be persisted atomically (single transaction or sequential updates within the same request) so that the order is not lost on refresh.
Enforcement: API

---

## 4. Comparison Engine Rules

**BR-026 — Prior snapshot selection**
When computing comparison data for snapshot S, the "prior snapshot" is defined as the snapshot with the highest snapshotDate that is strictly earlier than S's snapshotDate, belonging to the same user. If multiple snapshots share the same date that is strictly earlier, the one with the latest createdAt is used.
Enforcement: API

**BR-027 — Match key definition**
An item in the current snapshot matches an item in the prior snapshot if and only if all three of the following fields are identical (case-insensitive string comparison):
1. investmentName
2. institution
3. investmentType

The userId is always implicitly scoped by BR-006. No other fields (e.g., currency, note) are part of the match key.
Enforcement: API

**BR-028 — Amount change calculation**
For a matched item:
amountChange = currentBalance − previousBalance

The result is a signed float (positive = gain, negative = loss). Displayed with green color if > 0, red if < 0, neutral/gray if = 0.
Enforcement: API (calculation); Both (display)

**BR-029 — Percentage change calculation**
For a matched item where previousBalance > 0:
percentChange = (amountChange / previousBalance) × 100

Result is rounded to 2 decimal places. Displayed with green color if > 0, red if < 0.
Enforcement: API (calculation); Both (display)

**BR-030 — Division by zero in percent change**
If previousBalance = 0 and currentBalance > 0, percentChange MUST be displayed as "New" (not as a numeric percentage or infinity). If both previousBalance = 0 and currentBalance = 0, display percentChange as "0.00%".
Enforcement: Both

**BR-031 — No prior match handling**
If a current-snapshot item has no matching item in the prior snapshot:
- previousBalance column displays "-"
- amountChange column displays "-"
- percentChange column displays "New" in gray

This indicates the investment is new as of this snapshot.
Enforcement: Both

**BR-032 — Closed / missing item display**
Items present in the prior snapshot that have no matching item in the current snapshot MUST be surfaced in an optional "Closed / Missing" section. These items are displayed read-only with their prior snapshot balance. This section is informational and does not affect totals of the current snapshot.
Enforcement: Both

---

## 5. Dashboard & Calculation Rules

**BR-033 — Total current balance**
Total current = SUM(currentBalance) for all SnapshotItems in the selected snapshot. This includes items of all investment types and institutions.
Enforcement: API

**BR-034 — Total previous balance**
Total previous = SUM(currentBalance) for all SnapshotItems in the prior snapshot (as defined by BR-026). If no prior snapshot exists, total previous = 0 and the change widgets display "-".
Enforcement: API

**BR-035 — Portfolio change calculations**
changeAmount = totalCurrent − totalPrevious
changePercent = (changeAmount / totalPrevious) × 100, rounded to 2 decimal places.
If totalPrevious = 0, changePercent is displayed as "-" (no division by zero).
Enforcement: API (calculation); Both (display)

**BR-036 — Allocation chart grouping**
The allocation pie chart groups items by investmentType. Each slice value = SUM(currentBalance) for all items of that type in the selected snapshot. Types with zero or no items are excluded from the chart.
Enforcement: API / Both

**BR-037 — Institution chart grouping**
The institution bar chart groups items by institution. Each bar value = SUM(currentBalance) for all items at that institution in the selected snapshot. Bars are sorted by total descending.
Enforcement: API / Both

**BR-038 — Dashboard default snapshot**
On page load, the dashboard MUST display data from the snapshot with the latest snapshotDate for the authenticated user. If the user selects a different snapshot via the selector, all widgets update to reflect that snapshot.
Enforcement: Both

**BR-039 — Recent snapshots list**
The dashboard recent snapshots list MUST show the 5 most recent snapshots by snapshotDate. If fewer than 5 snapshots exist, show all available.
Enforcement: API

**BR-040 — Number formatting**
All monetary amounts displayed in the UI MUST use comma-separated thousands formatting (e.g., 1,500,000). Decimal places for balances: 2 (e.g., 1,500,000.00 or 1,500,000 if zero cents). Percentage values: 2 decimal places (e.g., 12.34%).
Enforcement: UI

---

## 6. Retirement Goal Calculation Rules

**BR-041 — Retirement projection formula**
The future value of the portfolio at retirement age is calculated as:

FV = PV × (1 + r)^n + C × [((1 + r)^n − 1) / r]

Where:
- PV = current total portfolio value (sum of latest snapshot)
- r = expectedAnnualReturn / 100 (annual rate as a decimal)
- n = retirementAge − currentAge (years remaining)
- C = expectedAnnualContribution (0 if not provided)

When r = 0, the formula simplifies to: FV = PV + (C × n)

Enforcement: API

**BR-042 — Retirement gap calculation**
retirementGap = retirementTargetAmount − currentPortfolioTotal

If gap ≤ 0, the user has met or exceeded the target. Display "Target reached" with the surplus amount (absolute value of gap).
Enforcement: API

**BR-043 — Retirement progress percentage**
progressPercent = (currentPortfolioTotal / retirementTargetAmount) × 100, rounded to 1 decimal place.
The progress bar in the UI is capped at 100% visually even if progressPercent > 100.
Enforcement: API (calculation); UI (cap at 100% bar width)

**BR-044 — Years remaining**
yearsRemaining = retirementAge − currentAge. This MUST be a positive integer for the projection to be meaningful. If yearsRemaining ≤ 0, the widget MUST display a message indicating the retirement age has been reached or passed, and suppress the projection formula output.
Enforcement: Both

**BR-045 — Retirement settings validation**
The following constraints apply when saving UserFinancialSettings:
- currentAge: integer, 1–120
- retirementAge: integer, must be > currentAge
- retirementTargetAmount: float, must be > 0
- expectedAnnualReturn: float, must be > 0 and ≤ 100
- expectedAnnualContribution: float, must be ≥ 0 (optional; defaults to 0 for calculations if absent)

Any violation MUST return HTTP 400 with field-level error messages.
Enforcement: Both

**BR-046 — Default retirement target values**
If a user has not configured their retirement settings, the system MAY pre-populate the form with the following defaults for display purposes only (not persisted until the user saves):
- Retirement age: 60
- Target amount: ฿30,000,000

These defaults are UI hints; the settings record is only created/updated on explicit save.
Enforcement: UI

---

## 7. Security Rules

**BR-047 — Input validation on both layers**
All user-supplied input MUST be validated using Zod schemas on both the frontend (before submission) and the backend (before any database operation). Backend validation is authoritative; frontend validation is for UX.
Enforcement: Both

**BR-048 — SQL injection prevention**
All database queries MUST use Prisma's parameterized query interface. Raw SQL strings with user input interpolation are prohibited.
Enforcement: API

**BR-049 — XSS prevention**
All user-supplied strings rendered in the React UI MUST be rendered through React's default JSX escaping. Direct use of dangerouslySetInnerHTML with user data is prohibited.
Enforcement: UI

**BR-050 — HTTPS in production**
When deployed to any environment beyond localhost, the application MUST be served over HTTPS. HTTP traffic MUST be redirected to HTTPS.
Enforcement: Ops / API

**BR-051 — Sensitive data not logged**
Passwords, JWT tokens, and refresh tokens MUST NOT appear in server-side logs. Request logging middleware MUST redact the Authorization header and any body field named password, token, or refreshToken.
Enforcement: API

---

## 8. Data Integrity Rules

**BR-052 — Snapshot item belongs to authenticated user**
Any operation on a SnapshotItem (read, create, update, delete) MUST first verify that the parent Snapshot belongs to the authenticated user. A mismatch MUST return HTTP 403.
Enforcement: API

**BR-053 — Unlock does not reset data**
Unlocking a snapshot (POST /api/snapshots/:id/unlock) MUST only set isLocked = false. It MUST NOT modify, reset, or delete any items or header fields.
Enforcement: API

**BR-054 — Snapshot total in list view is computed on read**
The total balance displayed in the snapshot list (GET /api/snapshots) MUST be computed as SUM(currentBalance) across all SnapshotItems for each snapshot. It MUST NOT be stored as a denormalized field.
Enforcement: API

**BR-055 — Seeded accounts have no default snapshots**
The seed script (npm run seed) MUST create exactly two user accounts with hashed passwords. It MUST NOT create any snapshots or financial settings — those are created by the users through the application.
Enforcement: API (seed script)

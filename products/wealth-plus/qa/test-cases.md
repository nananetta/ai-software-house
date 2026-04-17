# Test Cases — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft
**Author:** QA Test Engineer
**References:** test-plan.md, planning/business-rules.md, architecture/api-contracts.md

---

## Conventions

- **Test type:** Unit (U), Integration (I), E2E (E)
- **Priority:** P1 = must pass for release, P2 = important but not blocking, P3 = nice-to-have
- **Seed users:** User 1 = `net@family.local`, User 2 = `ann@family.local`
- **Base URL:** `http://localhost:4000/api` (integration tests via Supertest)
- **All integration tests** include `Authorization: Bearer <accessToken>` on protected routes unless the test is explicitly about missing auth
- **Expected results** specify exact HTTP status codes, exact JSON field values, and exact computed numbers where applicable

---

## 1. Authentication

### TC-001
**Feature area:** Authentication  
**Test name:** Happy path login — valid credentials return access token and refresh cookie  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- Database seeded with User 1 (`net@family.local`, password: `TestPassword1!`)
- No prior session exists

**Steps:**
1. Send `POST /api/auth/login` with body `{ "email": "net@family.local", "password": "TestPassword1!" }`

**Expected result:**
- HTTP 200
- Response body contains `accessToken` (non-empty JWT string)
- Response body contains `user.email = "net@family.local"`
- Response body contains `user.name = "Net"`
- Response `Set-Cookie` header includes a cookie named `refreshToken` with flags `HttpOnly`, `SameSite=Strict`, and `Path=/api/auth/refresh`
- The `refreshToken` cookie value is a non-empty opaque token string

---

### TC-002
**Feature area:** Authentication  
**Test name:** Wrong password returns 401 with generic message — does not reveal which field is wrong  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- Database seeded with User 1

**Steps:**
1. Send `POST /api/auth/login` with body `{ "email": "net@family.local", "password": "WrongPassword" }`

**Expected result:**
- HTTP 401
- Response body: `{ "error": "Invalid email or password" }`
- Response body does NOT contain "password" or "email" as the failing field
- No `Set-Cookie` header is present

---

### TC-003
**Feature area:** Authentication  
**Test name:** Non-existent email returns 401 with same generic message  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- Database seeded with both users; `unknown@family.local` does not exist

**Steps:**
1. Send `POST /api/auth/login` with body `{ "email": "unknown@family.local", "password": "AnyPassword" }`

**Expected result:**
- HTTP 401
- Response body: `{ "error": "Invalid email or password" }`
- Same error message as TC-002 (no field-level disclosure)

---

### TC-004
**Feature area:** Authentication  
**Test name:** Rate limit on login — 11th failed attempt within 15 minutes returns 429  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- Database seeded with User 1
- Rate limiter configured at 10 failures per 15-minute window per IP

**Steps:**
1. Send `POST /api/auth/login` with wrong password 10 times in rapid succession from the same IP
2. Send an 11th `POST /api/auth/login` (any credentials, same IP)

**Expected result:**
- Attempts 1–10: HTTP 401 each time
- Attempt 11: HTTP 429
- Response body on attempt 11: contains `"error"` field indicating rate limit exceeded (e.g., `"Too many requests"`)

---

### TC-005
**Feature area:** Authentication  
**Test name:** Refresh token flow — valid cookie returns new access token  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 logged in; valid `refreshToken` cookie obtained from TC-001

**Steps:**
1. Send `POST /api/auth/refresh` with the `refreshToken` cookie (no request body, no Authorization header)

**Expected result:**
- HTTP 200
- Response body contains `accessToken` (non-empty JWT string, different from the original access token)
- No `Set-Cookie` header required (refresh token is not rotated unless rotation is implemented)

---

### TC-006
**Feature area:** Authentication  
**Test name:** Logout invalidates refresh token — subsequent refresh returns 401  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 logged in; `accessToken` and `refreshToken` cookie obtained

**Steps:**
1. Send `POST /api/auth/logout` with `Authorization: Bearer <accessToken>` header
2. Verify response is 200 and `Set-Cookie` clears `refreshToken` (Max-Age=0)
3. Send `POST /api/auth/refresh` with the old `refreshToken` cookie

**Expected result:**
- Step 1: HTTP 200, body `{ "message": "Logged out successfully." }`, response sets cookie `refreshToken=; Max-Age=0`
- Step 3: HTTP 401, body `{ "error": "..." }` indicating token not found or invalid

---

### TC-007
**Feature area:** Authentication  
**Test name:** Cross-user isolation — User 1's JWT cannot access User 2's snapshot  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 logged in; `accessToken1` obtained
- User 2 logged in; snapshot `snap2Id` created under User 2's account

**Steps:**
1. Send `GET /api/snapshots/<snap2Id>` with `Authorization: Bearer <accessToken1>` (User 1's token targeting User 2's snapshot)

**Expected result:**
- HTTP 403
- Response body: `{ "error": "..." }` (Forbidden)
- Response body does NOT contain any snapshot data belonging to User 2

---

### TC-008
**Feature area:** Authentication  
**Test name:** Change password — correct current password updates hash and invalidates old refresh token  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 logged in; `accessToken` and `refreshToken` cookie obtained

**Steps:**
1. Send `PUT /api/me` with `Authorization: Bearer <accessToken>` and body:
   ```json
   { "currentPassword": "TestPassword1!", "newPassword": "NewPassword99!" }
   ```
2. Attempt `POST /api/auth/refresh` using the old `refreshToken` cookie
3. Attempt `POST /api/auth/login` with `{ "email": "net@family.local", "password": "NewPassword99!" }`

**Expected result:**
- Step 1: HTTP 200, body contains `{ "id": "...", "email": "net@family.local", "name": "Net" }`
- Step 2: HTTP 401 (old refresh token invalidated after password change)
- Step 3: HTTP 200 with new `accessToken` (new password works)

---

### TC-009 (bonus — locked/expired access token rejected)
**Feature area:** Authentication  
**Test name:** Expired access token is rejected on a protected route  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- An access token whose `exp` claim is set in the past (fabricate in test with a short-lived token or mock clock)

**Steps:**
1. Send `GET /api/me` with `Authorization: Bearer <expired_access_token>`

**Expected result:**
- HTTP 401
- Response body: `{ "error": "..." }` indicating token expired or invalid

---

## 2. Snapshot Management

### TC-010
**Feature area:** Snapshot Management  
**Test name:** Create blank snapshot — returns 201 with empty items array  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 authenticated; `accessToken1` available

**Steps:**
1. Send `POST /api/snapshots` with body:
   ```json
   { "snapshotName": "2026 Year End", "snapshotDate": "2026-12-31" }
   ```

**Expected result:**
- HTTP 201
- Response body: `snapshot.snapshotName = "2026 Year End"`
- Response body: `snapshot.snapshotDate = "2026-12-31T00:00:00.000Z"`
- Response body: `snapshot.isLocked = false`
- Response body: `snapshot.items = []`
- Response body: `snapshot.userId` matches User 1's ID

---

### TC-011
**Feature area:** Snapshot Management  
**Test name:** Duplicate snapshot — copies all items from most recent snapshot by date  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has Snapshot A (date: 2025-12-31) with 3 items: KBank Fixed Deposit (500,000), SET Index Fund (300,000), Gold Savings Account (80,000)

**Steps:**
1. Send `POST /api/snapshots/<snapshotAId>/duplicate` with body:
   ```json
   { "snapshotName": "2026 Year End", "snapshotDate": "2026-12-31" }
   ```

**Expected result:**
- HTTP 201
- `snapshot.isLocked = false`
- `items` array contains exactly 3 items
- Each item carries forward `investmentType`, `institution`, `investmentName`, `currency`, `displayOrder` from Snapshot A
- `items[0].currentBalance = 500000.00` (pre-filled from source)
- `items[1].currentBalance = 300000.00`
- `items[2].currentBalance = 80000.00`
- `sourceSnapshotId` matches Snapshot A's ID

---

### TC-012
**Feature area:** Snapshot Management  
**Test name:** List snapshots — returned sorted newest first  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has 3 snapshots:
  - Snapshot A: date 2024-12-31
  - Snapshot B: date 2025-12-31
  - Snapshot C: date 2026-12-31

**Steps:**
1. Send `GET /api/snapshots` with User 1's auth

**Expected result:**
- HTTP 200
- `snapshots` array has exactly 3 entries
- `snapshots[0].snapshotName` is Snapshot C (2026-12-31 — newest)
- `snapshots[1].snapshotName` is Snapshot B (2025-12-31)
- `snapshots[2].snapshotName` is Snapshot A (2024-12-31 — oldest)

---

### TC-013
**Feature area:** Snapshot Management  
**Test name:** Get snapshot with items returns comparison data  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has Snapshot A (2025-12-31) with KBank Fixed Deposit at 500,000
- User 1 has Snapshot B (2026-12-31) with KBank Fixed Deposit at 550,000 (same 3-field key)

**Steps:**
1. Send `GET /api/snapshots/<snapshotBId>`

**Expected result:**
- HTTP 200
- `items[0].investmentName = "KBank Fixed Deposit 12M"`
- `items[0].currentBalance = 550000.00`
- `items[0].previousBalance = 500000.00`
- `items[0].amountChange = 50000.00`
- `items[0].percentChange = 10.00`
- `items[0].isNew = false`
- `priorSnapshotId` matches Snapshot A's ID
- `priorSnapshotDate = "2025-12-31T00:00:00.000Z"`

---

### TC-014
**Feature area:** Snapshot Management  
**Test name:** Update snapshot header on unlocked snapshot  
**Type:** Integration  
**Priority:** P2

**Preconditions:**
- User 1 has an unlocked snapshot with name "2026 Draft"

**Steps:**
1. Send `PUT /api/snapshots/<snapshotId>` with body:
   ```json
   { "snapshotName": "2026 Year End Final", "snapshotDate": "2026-12-31" }
   ```

**Expected result:**
- HTTP 200
- `snapshot.snapshotName = "2026 Year End Final"`
- `snapshot.snapshotDate = "2026-12-31T00:00:00.000Z"`
- `snapshot.updatedAt` is more recent than the original `createdAt`

---

### TC-015
**Feature area:** Snapshot Management  
**Test name:** Lock snapshot — sets isLocked = true and blocks subsequent item edits  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has an unlocked snapshot with at least 1 item

**Steps:**
1. Send `POST /api/snapshots/<snapshotId>/lock`
2. Verify response
3. Send `POST /api/snapshots/<snapshotId>/items` with a valid new item body

**Expected result:**
- Step 1: HTTP 200, `snapshot.isLocked = true`
- Step 3: HTTP 403, body `{ "error": "..." }` indicating snapshot is locked

---

### TC-016
**Feature area:** Snapshot Management  
**Test name:** Unlock snapshot — sets isLocked = false, all item data intact  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a locked snapshot with 2 items (KBank Fixed Deposit: 500,000; SET Index Fund: 300,000)

**Steps:**
1. Send `POST /api/snapshots/<snapshotId>/unlock`
2. Send `GET /api/snapshots/<snapshotId>` to verify items are unchanged

**Expected result:**
- Step 1: HTTP 200, `snapshot.isLocked = false`
- Step 2: HTTP 200
  - `items` count = 2
  - `items[0].currentBalance = 500000.00` (unchanged)
  - `items[1].currentBalance = 300000.00` (unchanged)
  - No item fields were reset or modified

---

### TC-017
**Feature area:** Snapshot Management  
**Test name:** Delete snapshot cascades to remove all items  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has Snapshot A with 3 items (known item IDs stored in test)

**Steps:**
1. Send `DELETE /api/snapshots/<snapshotAId>`
2. Attempt `GET /api/snapshots/<snapshotAId>`
3. Query item IDs via Prisma test helper to verify they no longer exist

**Expected result:**
- Step 1: HTTP 204, empty body
- Step 2: HTTP 404
- Step 3: Zero records returned for any of the 3 item IDs in the SnapshotItem table

---

### TC-018
**Feature area:** Snapshot Management  
**Test name:** Duplicate when no prior snapshot exists returns 404  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has zero snapshots (fresh account or post-delete state)

**Steps:**
1. Send `POST /api/snapshots/any-uuid/duplicate` with body:
   ```json
   { "snapshotName": "2026 First", "snapshotDate": "2026-12-31" }
   ```

**Expected result:**
- HTTP 404
- Response body: `{ "error": "..." }` indicating no snapshots exist to duplicate from

---

### TC-019
**Feature area:** Snapshot Management  
**Test name:** View locked snapshot — read-only (header update returns 403)  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a locked snapshot

**Steps:**
1. Send `GET /api/snapshots/<lockedSnapshotId>` (read)
2. Send `PUT /api/snapshots/<lockedSnapshotId>` with body `{ "snapshotName": "Attempt Edit" }`

**Expected result:**
- Step 1: HTTP 200 (reads are always permitted regardless of lock state)
- Step 2: HTTP 403, body `{ "error": "..." }` indicating snapshot is locked

---

### TC-020
**Feature area:** Snapshot Management  
**Test name:** Snapshot list returns computed totals — not stored field  
**Type:** Integration  
**Priority:** P2

**Preconditions:**
- User 1 has one snapshot with 2 items: balance 500,000 and balance 300,000

**Steps:**
1. Send `GET /api/snapshots`

**Expected result:**
- HTTP 200
- `snapshots[0].total = 800000.00` (500,000 + 300,000)
- `total` is present and correct (not null, not undefined)

---

## 3. Investment Ledger

### TC-021
**Feature area:** Investment Ledger  
**Test name:** Add item to unlocked snapshot — persisted and returned  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has an unlocked snapshot with 0 items

**Steps:**
1. Send `POST /api/snapshots/<snapshotId>/items` with body:
   ```json
   {
     "investmentType": "CASH_DEPOSIT",
     "institution": "KBank",
     "investmentName": "KBank Fixed Deposit 12M",
     "currentBalance": 500000,
     "currency": "THB",
     "note": "Matures March 2027"
   }
   ```

**Expected result:**
- HTTP 201
- `item.investmentType = "CASH_DEPOSIT"`
- `item.institution = "KBank"`
- `item.investmentName = "KBank Fixed Deposit 12M"`
- `item.currentBalance = 500000.00`
- `item.currency = "THB"`
- `item.note = "Matures March 2027"`
- `item.snapshotId` matches the snapshot ID
- `hasDuplicateWarning = false`

---

### TC-022
**Feature area:** Investment Ledger  
**Test name:** Edit item — update currentBalance, response reflects new value  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has an unlocked snapshot with item (KBank Fixed Deposit, currentBalance: 500,000)
- `itemId` known

**Steps:**
1. Send `PUT /api/snapshots/<snapshotId>/items/<itemId>` with body:
   ```json
   { "currentBalance": 550000, "note": "Renewed at 3.5%" }
   ```

**Expected result:**
- HTTP 200
- `item.currentBalance = 550000.00`
- `item.note = "Renewed at 3.5%"`
- `item.investmentType = "CASH_DEPOSIT"` (unchanged)
- `item.institution = "KBank"` (unchanged)
- `item.updatedAt` is more recent than `item.createdAt`

---

### TC-023
**Feature area:** Investment Ledger  
**Test name:** Delete item from unlocked snapshot — returns 204 and item no longer exists  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has an unlocked snapshot with 2 items; `itemId` of the first item known

**Steps:**
1. Send `DELETE /api/snapshots/<snapshotId>/items/<itemId>`
2. Send `GET /api/snapshots/<snapshotId>`

**Expected result:**
- Step 1: HTTP 204, empty body
- Step 2: HTTP 200, `items` array has 1 entry (the other item remains), the deleted item's `id` does not appear

---

### TC-024
**Feature area:** Investment Ledger  
**Test name:** Add duplicate item (same 3-field key) returns warning flag  
**Type:** Integration  
**Priority:** P2

**Preconditions:**
- User 1 has an unlocked snapshot already containing an item with `investmentType = "CASH_DEPOSIT"`, `institution = "KBank"`, `investmentName = "KBank Fixed Deposit 12M"`

**Steps:**
1. Send `POST /api/snapshots/<snapshotId>/items` with identical `investmentType`, `institution`, `investmentName` values:
   ```json
   {
     "investmentType": "CASH_DEPOSIT",
     "institution": "KBank",
     "investmentName": "KBank Fixed Deposit 12M",
     "currentBalance": 100000
   }
   ```

**Expected result:**
- HTTP 201 (item is still created; not blocked)
- `hasDuplicateWarning = true`
- Two items with the same 3-field key now exist in the snapshot

---

### TC-025
**Feature area:** Investment Ledger  
**Test name:** Locked snapshot rejects add item with 403  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a locked snapshot

**Steps:**
1. Send `POST /api/snapshots/<lockedSnapshotId>/items` with a valid item body

**Expected result:**
- HTTP 403
- Response body: `{ "error": "..." }` indicating snapshot is locked
- Item is NOT created (verify by GET snapshot; items count unchanged)

---

### TC-026
**Feature area:** Investment Ledger  
**Test name:** Locked snapshot rejects edit item with 403  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a locked snapshot with 1 item; `itemId` known

**Steps:**
1. Send `PUT /api/snapshots/<lockedSnapshotId>/items/<itemId>` with body `{ "currentBalance": 999999 }`

**Expected result:**
- HTTP 403
- Response body: `{ "error": "..." }` indicating snapshot is locked
- Item's `currentBalance` remains unchanged (verify via GET snapshot)

---

### TC-027
**Feature area:** Investment Ledger  
**Test name:** Locked snapshot rejects delete item with 403  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a locked snapshot with 1 item; `itemId` known

**Steps:**
1. Send `DELETE /api/snapshots/<lockedSnapshotId>/items/<itemId>`

**Expected result:**
- HTTP 403
- Response body: `{ "error": "..." }` indicating snapshot is locked
- Item still exists (verify via GET snapshot; items count unchanged)

---

### TC-028
**Feature area:** Investment Ledger  
**Test name:** currentBalance must be >= 0 — negative value returns 400  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has an unlocked snapshot

**Steps:**
1. Send `POST /api/snapshots/<snapshotId>/items` with body:
   ```json
   {
     "investmentType": "CASH_DEPOSIT",
     "institution": "KBank",
     "investmentName": "KBank Fixed Deposit 12M",
     "currentBalance": -1
   }
   ```

**Expected result:**
- HTTP 400
- Response body: `{ "error": "Validation failed", "fields": { "currentBalance": "currentBalance must be a non-negative number." } }` (or equivalent validation error shape)
- No item is created

---

## 4. Comparison Engine

### TC-029
**Feature area:** Comparison Engine  
**Test name:** Item matched by 3-field key — previousBalance populated correctly  
**Type:** Unit + Integration  
**Priority:** P1

**Preconditions:**
- Unit test input: prior snapshot item `{ investmentName: "KBank Fixed Deposit 12M", institution: "KBank", investmentType: "CASH_DEPOSIT", currentBalance: 500000 }`, current snapshot item same key, `currentBalance: 550000`

**Steps:**
1. Call comparison service with the above inputs
2. (Integration) `GET /api/snapshots/<currentSnapshotId>` with Snapshot A as prior

**Expected result:**
- `previousBalance = 500000.00`
- `amountChange = 50000.00`
- `percentChange = 10.00`
- `isNew = false`

---

### TC-030
**Feature area:** Comparison Engine  
**Test name:** Amount change calculated correctly — negative change shown as negative value  
**Type:** Unit  
**Priority:** P1

**Preconditions:**
- Prior snapshot item: `currentBalance = 300000`
- Current snapshot item (same 3-field key): `currentBalance = 280000`

**Steps:**
1. Call comparison service with the above inputs

**Expected result:**
- `amountChange = -20000.00` (280000 − 300000)
- `percentChange = -6.67` (−20000 / 300000 × 100, rounded to 2 decimal places)

---

### TC-031
**Feature area:** Comparison Engine  
**Test name:** Percentage change calculated correctly — positive gain, rounded to 2 decimal places  
**Type:** Unit  
**Priority:** P1

**Preconditions:**
- Prior snapshot item: `currentBalance = 300000`
- Current snapshot item (same 3-field key): `currentBalance = 319500`

**Steps:**
1. Call comparison service

**Expected result:**
- `amountChange = 19500.00`
- `percentChange = 6.50` (19500 / 300000 × 100 = 6.5 → rounded to 6.50)

---

### TC-032
**Feature area:** Comparison Engine  
**Test name:** New item (no prior match) shows isNew = true and null comparison fields  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 Snapshot A (prior): only KBank Fixed Deposit
- User 1 Snapshot B (current): KBank Fixed Deposit + new item `{ investmentType: "MUTUAL_FUND", institution: "Kasikorn Asset", investmentName: "K-Cash RMF", currentBalance: 200000 }`

**Steps:**
1. Send `GET /api/snapshots/<snapshotBId>`

**Expected result:**
- The K-Cash RMF item in `items` array:
  - `previousBalance = null`
  - `amountChange = null`
  - `percentChange = null`
  - `isNew = true`
- The KBank Fixed Deposit item: `isNew = false`, `previousBalance = 500000.00`

---

### TC-033
**Feature area:** Comparison Engine  
**Test name:** Closed/missing item from prior snapshot appears in closedItems array  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 Snapshot A (prior): KBank Fixed Deposit (500,000), Gold Savings Account (80,000)
- User 1 Snapshot B (current): KBank Fixed Deposit only (Gold removed)

**Steps:**
1. Send `GET /api/snapshots/<snapshotBId>`

**Expected result:**
- `closedItems` array has exactly 1 entry
- `closedItems[0].investmentName = "Gold Savings Account"`
- `closedItems[0].institution = "KBank"`
- `closedItems[0].investmentType = "GOLD"`
- `closedItems[0].previousBalance = 80000.00`
- Gold Savings Account does NOT appear in the main `items` array

---

### TC-034
**Feature area:** Comparison Engine  
**Test name:** No prior snapshot — closedItems empty, all items isNew = true  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has exactly 1 snapshot (no prior snapshot exists)
- That snapshot has 2 items

**Steps:**
1. Send `GET /api/snapshots/<onlySnapshotId>`

**Expected result:**
- `priorSnapshotId = null`
- `priorSnapshotDate = null`
- `closedItems = []`
- All items in `items` array have `isNew = true`, `previousBalance = null`, `amountChange = null`, `percentChange = null`

---

## 5. Dashboard

### TC-035
**Feature area:** Dashboard  
**Test name:** Dashboard total equals sum of all items in latest snapshot  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has Snapshot B (2026-12-31, latest) with items: 550,000 + 280,000 + 200,000 = 1,030,000

**Steps:**
1. Send `GET /api/dashboard` (no `snapshotId` param — defaults to latest)

**Expected result:**
- HTTP 200
- `snapshotId` matches Snapshot B's ID
- `totalCurrent = 1030000.00`
- `snapshotName = "2026 Year End"`

---

### TC-036
**Feature area:** Dashboard  
**Test name:** Dashboard % change vs prior snapshot calculated correctly  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 Snapshot A total: 880,000 (prior)
- User 1 Snapshot B total: 1,030,000 (current, latest)

**Steps:**
1. Send `GET /api/dashboard`

**Expected result:**
- `totalPrevious = 880000.00`
- `changeAmount = 150000.00` (1,030,000 − 880,000)
- `changePercent = 17.05` ((150,000 / 880,000) × 100 = 17.0454... → 17.05 rounded to 2 decimal places)

---

### TC-037
**Feature area:** Dashboard  
**Test name:** Allocation endpoint groups items by investment type  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 Snapshot B has:
  - CASH_DEPOSIT / KBank / KBank Fixed Deposit 12M: 550,000
  - THAI_EQUITY / Interactive Brokers / SET Index Fund: 280,000
  - MUTUAL_FUND / Kasikorn Asset / K-Cash RMF: 200,000
- Total: 1,030,000

**Steps:**
1. Send `GET /api/dashboard/allocation` (defaults to latest snapshot)

**Expected result:**
- HTTP 200
- `total = 1030000.00`
- `allocation` array has exactly 3 entries
- Entry for CASH_DEPOSIT: `total = 550000.00`, `percent = 53.40` (550000/1030000×100 = 53.3980... → 53.40)
- Entry for THAI_EQUITY: `total = 280000.00`, `percent = 27.18` (280000/1030000×100 = 27.1844... → 27.18)
- Entry for MUTUAL_FUND: `total = 200000.00`, `percent = 19.42` (200000/1030000×100 = 19.4174... → 19.42)
- All `label` fields contain the corresponding Thai label (e.g., CASH_DEPOSIT → "เงินฝาก")

---

### TC-038
**Feature area:** Dashboard  
**Test name:** Institution grouping — each bar represents sum of items at that institution  
**Type:** Integration  
**Priority:** P2

**Preconditions:**
- User 1 Snapshot B items by institution:
  - KBank: 550,000 (KBank Fixed Deposit)
  - Interactive Brokers: 280,000 (SET Index Fund)
  - Kasikorn Asset: 200,000 (K-Cash RMF)

**Steps:**
1. Query allocation endpoint and verify institution data from `GET /api/dashboard` or institution-specific endpoint

**Expected result:**
- KBank total = 550,000.00
- Interactive Brokers total = 280,000.00
- Kasikorn Asset total = 200,000.00
- Results sorted by total descending: KBank first, Interactive Brokers second, Kasikorn Asset third

---

### TC-039
**Feature area:** Dashboard  
**Test name:** Snapshot selector — switching snapshot updates dashboard data  
**Type:** E2E  
**Priority:** P2

**Preconditions:**
- User 1 has Snapshot A (2025-12-31, total: 880,000) and Snapshot B (2026-12-31, total: 1,030,000)
- Dashboard loaded, showing Snapshot B by default

**Steps:**
1. Open `/dashboard` — note displayed total is 1,030,000
2. Use snapshot selector dropdown; select "2025 Year End" (Snapshot A)
3. Observe dashboard widgets

**Expected result:**
- Total Net Worth widget updates to show 880,000 (formatted as "880,000.00" or "880,000")
- Allocation pie chart re-renders with Snapshot A's items (KBank Fixed Deposit, SET Index Fund, Gold Savings Account)
- The 3-item composition of Snapshot A is shown, not Snapshot B's 3 items

---

### TC-040
**Feature area:** Dashboard  
**Test name:** No prior snapshot — dashboard shows current only, changeAmount and changePercent are null  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has exactly 1 snapshot with total 500,000

**Steps:**
1. Send `GET /api/dashboard`

**Expected result:**
- HTTP 200
- `totalCurrent = 500000.00`
- `totalPrevious = null`
- `changeAmount = null`
- `changePercent = null`

---

## 6. Retirement Goal

### TC-041
**Feature area:** Retirement Goal  
**Test name:** Configure retirement settings — all fields persisted correctly  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 authenticated; no existing `UserFinancialSettings` record

**Steps:**
1. Send `PUT /api/me/financial-settings` with body:
   ```json
   {
     "currentAge": 40,
     "retirementAge": 60,
     "retirementTargetAmount": 30000000,
     "expectedAnnualReturn": 7.0,
     "expectedAnnualContribution": 500000
   }
   ```
2. Send `GET /api/me/financial-settings`

**Expected result:**
- Step 1: HTTP 200
- Step 2: HTTP 200
  - `currentAge = 40`
  - `retirementAge = 60`
  - `retirementTargetAmount = 30000000.00`
  - `expectedAnnualReturn = 7.0`
  - `expectedAnnualContribution = 500000.00`
  - `baseCurrency = "THB"`

---

### TC-042
**Feature area:** Retirement Goal  
**Test name:** Projected FV formula correctness — verify with known values  
**Type:** Unit + Integration  
**Priority:** P1

**Preconditions:**
- User 1 retirement settings: currentAge = 40, retirementAge = 60, expectedAnnualReturn = 7.0, expectedAnnualContribution = 500,000
- User 1 latest snapshot total (PV) = 15,000,000
- n = 20, r = 0.07, C = 500,000

**Steps:**
1. (Unit) Call retirement calculation service with PV=15000000, r=0.07, n=20, C=500000
2. (Integration) Send `GET /api/dashboard/retirement`

**Expected result:**
- FV = PV × (1.07)^20 + C × [((1.07)^20 − 1) / 0.07]
- (1.07)^20 = 3.86968446...
- PV portion = 15,000,000 × 3.86968446 = 58,045,266.90
- C portion = 500,000 × [(3.86968446 − 1) / 0.07] = 500,000 × [2.86968446 / 0.07] = 500,000 × 40.99549228 = 20,497,746.14
- FV = 58,045,266.90 + 20,497,746.14 = **78,543,013.04** (±1 THB tolerance for floating point)
- Integration response: `projectedFV = 78543013.04` (within ±1.00)
- Note: The API contract example uses PV=15,000,000 with r=0.07, n=20, C=500,000 and states projectedFV = 68,142,684.23. The test team MUST verify with the implemented formula and cross-check against the architecture document. The value above is independently calculated; either the spec value or this value should be used as the expected result once confirmed correct by the Tech Lead.

---

### TC-043
**Feature area:** Retirement Goal  
**Test name:** Progress bar % calculation — correct percentage of target achieved  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 latest snapshot total: 1,030,000
- retirementTargetAmount: 30,000,000

**Steps:**
1. Send `GET /api/dashboard/retirement`

**Expected result:**
- `progressPercent = 3.4` (1,030,000 / 30,000,000 × 100 = 3.4333... → rounded to 1 decimal place = 3.4)
- `isTargetReached = false`

---

### TC-044
**Feature area:** Retirement Goal  
**Test name:** Gap calculation — correct remaining amount to retirement target  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 latest snapshot total: 1,030,000
- retirementTargetAmount: 30,000,000

**Steps:**
1. Send `GET /api/dashboard/retirement`

**Expected result:**
- `gap = 28970000.00` (30,000,000 − 1,030,000)
- `isTargetReached = false`
- `surplusAmount` field is absent or null

---

### TC-045
**Feature area:** Retirement Goal  
**Test name:** Years remaining calculation  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 settings: currentAge = 40, retirementAge = 60

**Steps:**
1. Send `GET /api/dashboard/retirement`

**Expected result:**
- `yearsRemaining = 20` (60 − 40)

---

## 7. Security

### TC-046
**Feature area:** Security  
**Test name:** JWT required on protected route — missing token returns 401  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- No Authorization header sent

**Steps:**
1. Send `GET /api/snapshots` with no `Authorization` header

**Expected result:**
- HTTP 401
- Response body: `{ "error": "..." }` indicating missing or invalid token
- No snapshot data is returned

---

### TC-047
**Feature area:** Security  
**Test name:** Expired access token rejected on protected route  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- An access token signed with the correct secret but with `exp` set 1 second in the past

**Steps:**
1. Send `GET /api/me` with `Authorization: Bearer <expired_token>`

**Expected result:**
- HTTP 401
- Response body: `{ "error": "..." }` indicating token expired or invalid

---

### TC-048
**Feature area:** Security  
**Test name:** Valid refresh token returns new access token  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a valid, non-expired, non-invalidated `refreshToken` cookie

**Steps:**
1. Send `POST /api/auth/refresh` with the `refreshToken` cookie attached

**Expected result:**
- HTTP 200
- Response body: `{ "accessToken": "<new_jwt>" }`
- `accessToken` is a valid JWT that can be decoded and contains `userId` matching User 1
- `accessToken` has a future `exp` claim (within 15 minutes from now)

---

### TC-049
**Feature area:** Security  
**Test name:** User cannot read another user's snapshot by ID — returns 403  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 authenticated; `accessToken1` available
- User 2 has a snapshot with known ID `snap2Id`

**Steps:**
1. Send `GET /api/snapshots/<snap2Id>` with `Authorization: Bearer <accessToken1>`

**Expected result:**
- HTTP 403 (NOT 200, NOT 404)
- Response body: `{ "error": "..." }` indicating Forbidden
- No snapshot or item data belonging to User 2 is present in the response

---

### TC-050
**Feature area:** Security  
**Test name:** All amounts filtered by userId — snapshot list contains only own snapshots  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has 2 snapshots
- User 2 has 3 snapshots

**Steps:**
1. Send `GET /api/snapshots` with `Authorization: Bearer <accessToken1>` (User 1)
2. Send `GET /api/snapshots` with `Authorization: Bearer <accessToken2>` (User 2)

**Expected result:**
- Step 1: HTTP 200, `snapshots` array has exactly 2 entries; all `userId` values match User 1's ID; none of User 2's snapshot IDs are present
- Step 2: HTTP 200, `snapshots` array has exactly 3 entries; all `userId` values match User 2's ID; none of User 1's snapshot IDs are present

---

## 8. Edge Cases

### TC-051
**Feature area:** Edge Cases  
**Test name:** Empty snapshot (no items) — GET returns empty items array, total = 0  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has a snapshot with zero items

**Steps:**
1. Send `GET /api/snapshots/<emptySnapshotId>`

**Expected result:**
- HTTP 200
- `items = []`
- `closedItems = []`
- No error or 500 response
- `GET /api/dashboard` with this snapshot: `totalCurrent = 0.00`

---

### TC-052
**Feature area:** Edge Cases  
**Test name:** All items new (first snapshot) — no comparison data, closedItems empty  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 has exactly 1 snapshot with 3 items (first and only snapshot — no prior)

**Steps:**
1. Send `GET /api/snapshots/<firstSnapshotId>`

**Expected result:**
- HTTP 200
- `priorSnapshotId = null`
- All 3 items have `isNew = true`, `previousBalance = null`, `amountChange = null`, `percentChange = null`
- `closedItems = []`
- Dashboard `GET /api/dashboard`: `totalPrevious = null`, `changeAmount = null`, `changePercent = null`

---

### TC-053
**Feature area:** Edge Cases  
**Test name:** previousBalance = 0 with currentBalance > 0 — division-by-zero guard, display "New"  
**Type:** Unit  
**Priority:** P1

**Preconditions:**
- Prior snapshot item: `investmentName = "Zero Balance Fund"`, `institution = "Other"`, `investmentType = "MUTUAL_FUND"`, `currentBalance = 0`
- Current snapshot item (same 3-field key): `currentBalance = 50000`

**Steps:**
1. Call comparison service with the above inputs

**Expected result:**
- `previousBalance = 0.00`
- `amountChange = 50000.00`
- `percentChange = null` OR service returns a sentinel indicating display as "New"
- No division-by-zero exception is thrown
- Per BR-030: when previousBalance = 0 and currentBalance > 0, display "New" (not Infinity, not NaN, not a numeric %)

---

### TC-054
**Feature area:** Edge Cases  
**Test name:** Retirement target already exceeded — progressPercent > 100, isTargetReached = true, surplusAmount returned  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 settings: retirementTargetAmount = 30,000,000
- User 1 latest snapshot total: 35,000,000 (exceeds target)

**Steps:**
1. Send `GET /api/dashboard/retirement`

**Expected result:**
- `progressPercent = 116.7` (35,000,000 / 30,000,000 × 100 = 116.6666... → rounded to 1 decimal = 116.7)
- `isTargetReached = true`
- `gap = -5000000.00` (30,000,000 − 35,000,000)
- `surplusAmount = 5000000.00`
- Progress bar in UI is visually capped at 100% width (E2E verification)

---

### TC-055
**Feature area:** Edge Cases  
**Test name:** retirementAge <= currentAge — PUT financial-settings returns 400  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 authenticated

**Steps:**
1. Send `PUT /api/me/financial-settings` with body:
   ```json
   {
     "currentAge": 60,
     "retirementAge": 55,
     "retirementTargetAmount": 30000000,
     "expectedAnnualReturn": 7.0
   }
   ```

**Expected result:**
- HTTP 400
- Response body: `{ "error": "Validation failed", "fields": { "retirementAge": "retirementAge must be greater than currentAge." } }` (or equivalent field-level error)
- No `UserFinancialSettings` record is created or updated

---

### TC-056 (bonus edge case)
**Feature area:** Edge Cases  
**Test name:** previousBalance = 0 and currentBalance = 0 — percentChange displayed as "0.00%"  
**Type:** Unit  
**Priority:** P2

**Preconditions:**
- Prior snapshot item: same 3-field key, `currentBalance = 0`
- Current snapshot item: same 3-field key, `currentBalance = 0`

**Steps:**
1. Call comparison service with both balances = 0

**Expected result:**
- `previousBalance = 0.00`
- `amountChange = 0.00`
- Per BR-030: when both previousBalance = 0 and currentBalance = 0, `percentChange` is displayed as `0.00%` (not "New", not null)
- No exception thrown

---

### TC-057 (bonus edge case)
**Feature area:** Edge Cases  
**Test name:** snapshotDate missing — create snapshot returns 400 with descriptive field error  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 authenticated

**Steps:**
1. Send `POST /api/snapshots` with body `{ "snapshotName": "2026 Year End" }` (no `snapshotDate`)

**Expected result:**
- HTTP 400
- Response body: `{ "error": "Validation failed", "fields": { "snapshotDate": "snapshotDate is required." } }` (or equivalent)
- No snapshot is created

---

### TC-058 (bonus edge case)
**Feature area:** Edge Cases  
**Test name:** Invalid ISO 8601 date string — create snapshot returns 400  
**Type:** Integration  
**Priority:** P1

**Preconditions:**
- User 1 authenticated

**Steps:**
1. Send `POST /api/snapshots` with body:
   ```json
   { "snapshotName": "2026 Year End", "snapshotDate": "31-12-2026" }
   ```

**Expected result:**
- HTTP 400
- Response body: `{ "error": "Validation failed", "fields": { "snapshotDate": "snapshotDate must be a valid ISO 8601 date (YYYY-MM-DD)." } }` (or equivalent)
- No snapshot is created

---

## Test Case Summary

| Feature Area | TC Range | Count | P1 | P2 | P3 |
|---|---|---|---|---|---|
| Authentication | TC-001 to TC-009 | 9 | 8 | 0 | 1 |
| Snapshot Management | TC-010 to TC-020 | 11 | 8 | 3 | 0 |
| Investment Ledger | TC-021 to TC-028 | 8 | 7 | 1 | 0 |
| Comparison Engine | TC-029 to TC-034 | 6 | 6 | 0 | 0 |
| Dashboard | TC-035 to TC-040 | 6 | 4 | 2 | 0 |
| Retirement Goal | TC-041 to TC-045 | 5 | 5 | 0 | 0 |
| Security | TC-046 to TC-050 | 5 | 5 | 0 | 0 |
| Edge Cases | TC-051 to TC-058 | 8 | 7 | 1 | 0 |
| **Total** | | **58** | **50** | **7** | **1** |

---

## Known Ambiguities and Assumptions

| # | Topic | Assumption |
|---|-------|-----------|
| A-1 | TC-042 FV calculation | The independent hand-calculation (78,543,013.04) differs from the API contract example (68,142,684.23). The Tech Lead must confirm which value is correct before TC-042 is executed. The API contract example value takes precedence if it can be reproduced by formula. |
| A-2 | percentChange rounding | All percentChange values are rounded to 2 decimal places at the API layer before returning, per BR-029. |
| A-3 | progressPercent rounding | Rounded to 1 decimal place per BR-043. |
| A-4 | Allocation percent rounding | Rounded to 2 decimal places per BR-040. Sum may not be exactly 100 due to floating point. |
| A-5 | Rate limit test (TC-004) | Integration test environment must not share rate-limit state between test runs. Use a unique IP or reset the rate limiter store in `afterEach`. |
| A-6 | Comparison match case-sensitivity | BR-027 specifies case-insensitive string comparison for the 3-field key. TC-029 should include a sub-case with "kbank" vs "KBank" to verify this. |

# API Contracts — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft
**Author:** Solution Architect

---

## Conventions

- **Base URL (development):** `http://localhost:4000/api`
- **Content-Type:** All request and response bodies are `application/json` unless noted.
- **Authentication:** Protected endpoints require the header `Authorization: Bearer <accessToken>`.
- **Access token:** JWT, 15-minute lifetime, signed HS256 with `JWT_SECRET` env var.
- **Refresh token:** Opaque 32-byte hex token stored in an `httpOnly; Secure; SameSite=Strict` cookie named `refreshToken`. Sent automatically by the browser on calls to `/api/auth/refresh`.
- **Error envelope:** All error responses use the shape `{ "error": "Human-readable message" }`. Validation errors use `{ "error": "Validation failed", "fields": { "fieldName": "message" } }`.
- **Timestamps:** All `DateTime` fields are returned as ISO 8601 strings (e.g., `"2026-04-16T00:00:00.000Z"`).
- **Row-level isolation:** All protected endpoints silently scope every DB query to the authenticated `userId`. A request that targets a resource owned by a different user returns `403 Forbidden`.

---

## 1. Authentication

### POST /api/auth/login

Log in with email and password. Issues a short-lived JWT access token and sets a long-lived refresh token httpOnly cookie.

**Auth required:** No

**Rate limit:** 10 failed attempts per 15-minute window per IP → 429 (BR-005)

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Non-empty |

```json
{
  "email": "net@family.local",
  "password": "MySecretPassword"
}
```

#### Success Response — 200 OK

Sets cookie: `refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=604800`

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "net@family.local",
    "name": "Net"
  }
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing or malformed request body |
| 401 | Email not found or password does not match — returns generic `"Invalid email or password"` without revealing which field is wrong |
| 429 | IP has exceeded 10 failed attempts in 15 minutes |

---

### POST /api/auth/refresh

Exchange a valid refresh token cookie for a new JWT access token. The refresh token is read from the httpOnly cookie — no request body is needed.

**Auth required:** No (cookie sent automatically)

#### Request Body

None.

#### Success Response — 200 OK

```json
{
  "accessToken": "<new_jwt>"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | No refresh token cookie present |
| 401 | Refresh token not found in DB (already invalidated) |
| 401 | Refresh token has expired (`expiresAt` < now) |

---

### POST /api/auth/logout

Invalidate the current session. Deletes the refresh token from the server-side store and clears the cookie.

**Auth required:** Yes (access token in header)

#### Request Body

None.

#### Success Response — 200 OK

Clears cookie: `refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=0`

```json
{
  "message": "Logged out successfully."
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |

---

## 2. Current User

### GET /api/me

Return the authenticated user's profile.

**Auth required:** Yes

#### Request Body

None.

#### Success Response — 200 OK

```json
{
  "id": "uuid",
  "email": "net@family.local",
  "name": "Net",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |

---

### PUT /api/me

Update profile name and/or change password. At least one of `name` or `newPassword` must be provided.

**Auth required:** Yes

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `name` | string | Optional | Non-empty if provided |
| `currentPassword` | string | Required if `newPassword` is provided | Must match stored bcrypt hash (BR-008) |
| `newPassword` | string | Optional | Minimum 8 characters (BR-009) |

```json
{
  "name": "Net",
  "currentPassword": "OldPassword",
  "newPassword": "NewPassword123"
}
```

#### Success Response — 200 OK

On password change: all refresh tokens for the user are deleted (forces re-login on other sessions).

```json
{
  "id": "uuid",
  "email": "net@family.local",
  "name": "Net"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `newPassword` shorter than 8 characters |
| 400 | `newPassword` provided but `currentPassword` missing |
| 400 | `name` is empty string |
| 401 | Missing or invalid access token |
| 403 | `currentPassword` does not match the stored hash |

---

### GET /api/me/financial-settings

Return the authenticated user's retirement and financial settings.

**Auth required:** Yes

#### Request Body

None.

#### Success Response — 200 OK

If no settings record exists yet, returns `null` fields (record not yet saved by user).

```json
{
  "id": "uuid",
  "userId": "uuid",
  "baseCurrency": "THB",
  "currentAge": 40,
  "retirementAge": 60,
  "retirementTargetAmount": 30000000,
  "expectedAnnualReturn": 7.0,
  "expectedAnnualContribution": 500000,
  "updatedAt": "2026-04-16T00:00:00.000Z"
}
```

If no record exists:

```json
{
  "id": null,
  "userId": "uuid",
  "baseCurrency": "THB",
  "currentAge": null,
  "retirementAge": null,
  "retirementTargetAmount": null,
  "expectedAnnualReturn": null,
  "expectedAnnualContribution": null,
  "updatedAt": null
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |

---

### PUT /api/me/financial-settings

Create or update the authenticated user's financial settings (upsert). All fields are optional per request, but the saved record is validated as a whole on save.

**Auth required:** Yes

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `baseCurrency` | string | Optional | Default `"THB"`; v1 only supports THB |
| `currentAge` | integer | Optional | 1–120 (BR-045) |
| `retirementAge` | integer | Optional | Must be > `currentAge` (BR-045) |
| `retirementTargetAmount` | float | Optional | > 0 (BR-045) |
| `expectedAnnualReturn` | float | Optional | > 0 and ≤ 100 (BR-045) |
| `expectedAnnualContribution` | float | Optional | ≥ 0 (BR-045) |

```json
{
  "currentAge": 40,
  "retirementAge": 60,
  "retirementTargetAmount": 30000000,
  "expectedAnnualReturn": 7.0,
  "expectedAnnualContribution": 500000
}
```

#### Success Response — 200 OK

```json
{
  "id": "uuid",
  "userId": "uuid",
  "baseCurrency": "THB",
  "currentAge": 40,
  "retirementAge": 60,
  "retirementTargetAmount": 30000000,
  "expectedAnnualReturn": 7.0,
  "expectedAnnualContribution": 500000,
  "updatedAt": "2026-04-16T00:00:00.000Z"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `retirementAge` ≤ `currentAge` |
| 400 | `retirementTargetAmount` ≤ 0 |
| 400 | `expectedAnnualReturn` ≤ 0 or > 100 |
| 400 | `expectedAnnualContribution` < 0 |
| 400 | `currentAge` out of range 1–120 |
| 401 | Missing or invalid access token |

---

## 3. Snapshots

### GET /api/snapshots

Return all snapshots for the authenticated user, sorted by `snapshotDate` descending (within same date, `createdAt` descending). Each snapshot includes its computed total balance and change vs the prior snapshot (BR-017, BR-054).

**Auth required:** Yes

#### Query Parameters

None.

#### Success Response — 200 OK

```json
{
  "snapshots": [
    {
      "id": "uuid",
      "snapshotName": "2026 Year End",
      "snapshotDate": "2026-12-31T00:00:00.000Z",
      "notes": null,
      "isLocked": false,
      "total": 15000000.00,
      "previousTotal": 12000000.00,
      "changeAmount": 3000000.00,
      "changePercent": 25.00,
      "createdAt": "2026-04-16T00:00:00.000Z",
      "updatedAt": "2026-04-16T00:00:00.000Z"
    }
  ]
}
```

Notes:
- `previousTotal`, `changeAmount`, `changePercent` are `null` if no prior snapshot exists.
- `changePercent` is `null` if `previousTotal` is 0 (avoids division by zero, per BR-035).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |

---

### POST /api/snapshots

Create a new blank snapshot with no items.

**Auth required:** Yes

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `snapshotName` | string | Yes | Non-empty (BR-010) |
| `snapshotDate` | string | Yes | ISO 8601 date `YYYY-MM-DD` (BR-011, BR-012) |
| `notes` | string | Optional | Any string |

```json
{
  "snapshotName": "2026 Year End",
  "snapshotDate": "2026-12-31",
  "notes": "Year-end review"
}
```

#### Success Response — 201 Created

```json
{
  "snapshot": {
    "id": "uuid",
    "userId": "uuid",
    "snapshotName": "2026 Year End",
    "snapshotDate": "2026-12-31T00:00:00.000Z",
    "notes": "Year-end review",
    "isLocked": false,
    "items": [],
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `snapshotName` is missing or empty |
| 400 | `snapshotDate` is missing, empty, or not a valid ISO 8601 date |
| 401 | Missing or invalid access token |

---

### GET /api/snapshots/:id

Return a single snapshot with all its items, comparison data against the immediately prior snapshot, and the list of closed/missing items from the prior snapshot (BR-026, BR-027).

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Snapshot ID |

#### Success Response — 200 OK

```json
{
  "snapshot": {
    "id": "uuid",
    "userId": "uuid",
    "snapshotName": "2026 Year End",
    "snapshotDate": "2026-12-31T00:00:00.000Z",
    "notes": null,
    "isLocked": false,
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z"
  },
  "items": [
    {
      "id": "uuid",
      "snapshotId": "uuid",
      "investmentType": "CASH_DEPOSIT",
      "institution": "KBank",
      "investmentName": "KBank Fixed Deposit 12M",
      "currentBalance": 500000.00,
      "currency": "THB",
      "note": null,
      "displayOrder": 0,
      "previousBalance": 450000.00,
      "amountChange": 50000.00,
      "percentChange": 11.11,
      "isNew": false,
      "createdAt": "2026-04-16T10:00:00.000Z",
      "updatedAt": "2026-04-16T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "snapshotId": "uuid",
      "investmentType": "THAI_EQUITY",
      "institution": "Interactive Brokers",
      "investmentName": "SET Index Fund",
      "currentBalance": 200000.00,
      "currency": "THB",
      "note": null,
      "displayOrder": 1,
      "previousBalance": null,
      "amountChange": null,
      "percentChange": null,
      "isNew": true,
      "createdAt": "2026-04-16T10:00:00.000Z",
      "updatedAt": "2026-04-16T10:00:00.000Z"
    }
  ],
  "closedItems": [
    {
      "investmentType": "GOLD",
      "institution": "KBank",
      "investmentName": "Gold Savings Account",
      "previousBalance": 80000.00,
      "currency": "THB"
    }
  ],
  "priorSnapshotId": "uuid",
  "priorSnapshotDate": "2025-12-31T00:00:00.000Z"
}
```

Notes:
- `previousBalance`, `amountChange`, `percentChange` are `null` when `isNew: true` (BR-031).
- `closedItems` is an empty array when no items from the prior snapshot are missing.
- `priorSnapshotId` and `priorSnapshotDate` are `null` when no prior snapshot exists.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | Snapshot exists but belongs to a different user (BR-006) |
| 404 | Snapshot ID not found |

---

### PUT /api/snapshots/:id

Update the snapshot header (name, date, notes). Rejected if snapshot is locked (BR-013).

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Snapshot ID |

#### Request Body

At least one field must be provided.

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `snapshotName` | string | Optional | Non-empty if provided (BR-010) |
| `snapshotDate` | string | Optional | ISO 8601 date `YYYY-MM-DD` if provided (BR-012) |
| `notes` | string | Optional | Any string or null |

```json
{
  "snapshotName": "2026 Mid Year",
  "snapshotDate": "2026-06-30"
}
```

#### Success Response — 200 OK

```json
{
  "snapshot": {
    "id": "uuid",
    "userId": "uuid",
    "snapshotName": "2026 Mid Year",
    "snapshotDate": "2026-06-30T00:00:00.000Z",
    "notes": null,
    "isLocked": false,
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `snapshotName` is empty string |
| 400 | `snapshotDate` is not a valid ISO 8601 date |
| 401 | Missing or invalid access token |
| 403 | Snapshot belongs to a different user |
| 403 | Snapshot is locked (`isLocked: true`) — header edits are blocked (BR-013) |
| 404 | Snapshot ID not found |

---

### DELETE /api/snapshots/:id

Permanently delete a snapshot and all its items (cascade, BR-016).

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Snapshot ID |

#### Request Body

None.

#### Success Response — 204 No Content

Empty body.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | Snapshot belongs to a different user |
| 404 | Snapshot ID not found |

---

### POST /api/snapshots/:id/duplicate

Create a new snapshot by copying all items from the snapshot with the highest `snapshotDate` for the authenticated user. The `:id` parameter in the URL is ignored for source selection — the source is always the user's most recent snapshot by date (BR-014). The `:id` is accepted to keep the URL consistent with the rest of the snapshot resource; it may be any valid snapshot id (or the id of the source snapshot itself).

All item fields (`investmentType`, `institution`, `investmentName`, `currency`, `note`, `displayOrder`) are copied verbatim. `currentBalance` of each copied item is set to the source snapshot's `currentBalance` (pre-filled as the starting point for editing). The new snapshot starts `isLocked: false`.

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Treated as context; source is resolved by BR-014 |

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `snapshotName` | string | Yes | Non-empty (BR-010) |
| `snapshotDate` | string | Yes | ISO 8601 date `YYYY-MM-DD` (BR-011, BR-012) |
| `notes` | string | Optional | Any string |

```json
{
  "snapshotName": "2027 Year End",
  "snapshotDate": "2027-12-31"
}
```

#### Success Response — 201 Created

```json
{
  "snapshot": {
    "id": "new-uuid",
    "userId": "uuid",
    "snapshotName": "2027 Year End",
    "snapshotDate": "2027-12-31T00:00:00.000Z",
    "notes": null,
    "isLocked": false,
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z"
  },
  "items": [
    {
      "id": "new-item-uuid",
      "snapshotId": "new-uuid",
      "investmentType": "CASH_DEPOSIT",
      "institution": "KBank",
      "investmentName": "KBank Fixed Deposit 12M",
      "currentBalance": 500000.00,
      "currency": "THB",
      "note": null,
      "displayOrder": 0,
      "createdAt": "2026-04-16T10:00:00.000Z",
      "updatedAt": "2026-04-16T10:00:00.000Z"
    }
  ],
  "sourceSnapshotId": "source-uuid"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `snapshotName` is missing or empty |
| 400 | `snapshotDate` is missing or not a valid ISO 8601 date |
| 401 | Missing or invalid access token |
| 404 | No snapshots exist for this user (nothing to duplicate from) |

---

### POST /api/snapshots/:id/lock

Set `isLocked = true` on the specified snapshot.

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Snapshot ID |

#### Request Body

None.

#### Success Response — 200 OK

```json
{
  "snapshot": {
    "id": "uuid",
    "snapshotName": "2026 Year End",
    "snapshotDate": "2026-12-31T00:00:00.000Z",
    "isLocked": true,
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | Snapshot belongs to a different user |
| 404 | Snapshot ID not found |

---

### POST /api/snapshots/:id/unlock

Set `isLocked = false` on the specified snapshot. Does not modify any items or header fields (BR-053).

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Snapshot ID |

#### Request Body

None.

#### Success Response — 200 OK

```json
{
  "snapshot": {
    "id": "uuid",
    "snapshotName": "2026 Year End",
    "snapshotDate": "2026-12-31T00:00:00.000Z",
    "isLocked": false,
    "updatedAt": "2026-04-16T13:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | Snapshot belongs to a different user |
| 404 | Snapshot ID not found |

---

## 4. Snapshot Items

All item endpoints verify that the parent snapshot belongs to the authenticated user before proceeding (BR-052). Write operations also verify the snapshot is not locked (BR-013).

### POST /api/snapshots/:id/items

Add a new investment item to a snapshot.

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Parent snapshot ID |

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `investmentType` | string | Yes | Non-empty (BR-018); preset codes or free text |
| `institution` | string | Yes | Non-empty (BR-019); preset names or free text |
| `investmentName` | string | Yes | Non-empty (BR-020) |
| `currentBalance` | number | Yes | ≥ 0 (BR-021) |
| `currency` | string | Optional | Default `"THB"` (BR-024) |
| `note` | string | Optional | Any string |
| `displayOrder` | integer | Optional | Default `0`; server may auto-assign next order |

```json
{
  "investmentType": "CASH_DEPOSIT",
  "institution": "KBank",
  "investmentName": "KBank Fixed Deposit 12M",
  "currentBalance": 500000,
  "currency": "THB",
  "note": "Matures March 2027",
  "displayOrder": 0
}
```

#### Success Response — 201 Created

Response includes a `hasDuplicateWarning` flag if the triple-key combination (`investmentType` + `institution` + `investmentName`) already exists in the same snapshot (BR-015).

```json
{
  "item": {
    "id": "uuid",
    "snapshotId": "uuid",
    "investmentType": "CASH_DEPOSIT",
    "institution": "KBank",
    "investmentName": "KBank Fixed Deposit 12M",
    "currentBalance": 500000.00,
    "currency": "THB",
    "note": "Matures March 2027",
    "displayOrder": 0,
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z"
  },
  "hasDuplicateWarning": false
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `investmentType` is missing or empty |
| 400 | `institution` is missing or empty |
| 400 | `investmentName` is missing or empty |
| 400 | `currentBalance` is missing, not a number, or < 0 |
| 401 | Missing or invalid access token |
| 403 | Parent snapshot belongs to a different user |
| 403 | Parent snapshot is locked |
| 404 | Snapshot ID not found |

---

### PUT /api/snapshots/:id/items/:itemId

Update one or more fields of an existing investment item.

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Parent snapshot ID |
| `itemId` | string (UUID) | Item ID |

#### Request Body

Partial update — provide only the fields to change. At least one field must be present.

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `investmentType` | string | Optional | Non-empty if provided (BR-018) |
| `institution` | string | Optional | Non-empty if provided (BR-019) |
| `investmentName` | string | Optional | Non-empty if provided (BR-020) |
| `currentBalance` | number | Optional | ≥ 0 if provided (BR-021) |
| `currency` | string | Optional | Non-empty if provided |
| `note` | string | Optional | Any string or null |
| `displayOrder` | integer | Optional | Any integer |

```json
{
  "currentBalance": 550000,
  "note": "Renewed at 3.5%"
}
```

#### Success Response — 200 OK

```json
{
  "item": {
    "id": "uuid",
    "snapshotId": "uuid",
    "investmentType": "CASH_DEPOSIT",
    "institution": "KBank",
    "investmentName": "KBank Fixed Deposit 12M",
    "currentBalance": 550000.00,
    "currency": "THB",
    "note": "Renewed at 3.5%",
    "displayOrder": 0,
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T14:00:00.000Z"
  },
  "hasDuplicateWarning": false
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Any provided field fails its validation rule |
| 400 | Request body is empty (no fields provided) |
| 401 | Missing or invalid access token |
| 403 | Parent snapshot belongs to a different user |
| 403 | Parent snapshot is locked |
| 404 | Snapshot ID not found |
| 404 | Item ID not found or does not belong to the specified snapshot |

---

### DELETE /api/snapshots/:id/items/:itemId

Permanently delete a single investment item from a snapshot.

**Auth required:** Yes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Parent snapshot ID |
| `itemId` | string (UUID) | Item ID |

#### Request Body

None.

#### Success Response — 204 No Content

Empty body.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | Parent snapshot belongs to a different user |
| 403 | Parent snapshot is locked |
| 404 | Snapshot ID not found |
| 404 | Item ID not found or does not belong to the specified snapshot |

---

## 5. Dashboard

Dashboard endpoints accept an optional `snapshotId` query parameter to view historical data. When omitted, the API uses the latest snapshot by `snapshotDate` for the authenticated user (BR-038).

### GET /api/dashboard

Return the summary widget data: total net worth for the selected snapshot, comparison vs the prior snapshot, and the 5 most recent snapshots.

**Auth required:** Yes

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `snapshotId` | string (UUID) | Optional | Snapshot to summarize. Defaults to the latest. |

#### Success Response — 200 OK

```json
{
  "snapshotId": "uuid",
  "snapshotName": "2026 Year End",
  "snapshotDate": "2026-12-31T00:00:00.000Z",
  "isLocked": true,
  "totalCurrent": 15000000.00,
  "totalPrevious": 12000000.00,
  "changeAmount": 3000000.00,
  "changePercent": 25.00,
  "recentSnapshots": [
    {
      "id": "uuid",
      "snapshotName": "2026 Year End",
      "snapshotDate": "2026-12-31T00:00:00.000Z",
      "total": 15000000.00,
      "isLocked": true
    }
  ]
}
```

Notes:
- `totalPrevious`, `changeAmount`, `changePercent` are `null` if no prior snapshot exists.
- `changePercent` is `null` if `totalPrevious` is 0 (BR-035).
- `recentSnapshots` contains up to 5 entries sorted by `snapshotDate` descending (BR-039).
- If no snapshots exist at all, returns `{ "snapshotId": null, "totalCurrent": 0, ... "recentSnapshots": [] }`.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | `snapshotId` provided belongs to a different user |
| 404 | `snapshotId` provided does not exist |

---

### GET /api/dashboard/allocation

Return the asset allocation breakdown for a snapshot, grouped by `investmentType` (BR-036).

**Auth required:** Yes

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `snapshotId` | string (UUID) | Optional | Snapshot to analyze. Defaults to latest. |

#### Success Response — 200 OK

```json
{
  "snapshotId": "uuid",
  "snapshotName": "2026 Year End",
  "total": 15000000.00,
  "allocation": [
    {
      "investmentType": "CASH_DEPOSIT",
      "label": "เงินฝาก",
      "total": 5000000.00,
      "percent": 33.33
    },
    {
      "investmentType": "THAI_EQUITY",
      "label": "หุ้นไทย",
      "total": 4000000.00,
      "percent": 26.67
    }
  ]
}
```

Notes:
- `label` is the Thai display label for the investment type (from the preset table in BR-022). For free-text custom types, `label` equals `investmentType`.
- Investment types with zero balance are excluded (BR-036).
- `percent` values sum to 100 (subject to floating point rounding).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |
| 403 | `snapshotId` belongs to a different user |
| 404 | `snapshotId` not found |

---

### GET /api/dashboard/retirement

Return the retirement goal progress for the authenticated user. Uses the latest snapshot total as the current portfolio value and the stored `UserFinancialSettings` for projection parameters (BR-041 to BR-047).

**Auth required:** Yes

#### Query Parameters

None. Always uses the latest snapshot for PV and the stored settings.

#### Success Response — 200 OK (settings configured)

```json
{
  "currentPortfolioTotal": 15000000.00,
  "settings": {
    "currentAge": 40,
    "retirementAge": 60,
    "retirementTargetAmount": 30000000.00,
    "expectedAnnualReturn": 7.0,
    "expectedAnnualContribution": 500000.00
  },
  "yearsRemaining": 20,
  "projectedFV": 68142684.23,
  "gap": 15000000.00,
  "progressPercent": 50.0,
  "isTargetReached": false,
  "trajectory": [
    {
      "yearOffset": 0,
      "age": 40,
      "date": "2026-04-19T00:00:00.000Z",
      "value": 15000000.00
    },
    {
      "yearOffset": 1,
      "age": 41,
      "date": "2027-04-19T00:00:00.000Z",
      "value": 16550000.00
    },
    {
      "yearOffset": 20,
      "age": 60,
      "date": "2046-04-19T00:00:00.000Z",
      "value": 68142684.23
    }
  ],
  "targetReachAge": 47.6,
  "targetReachDate": "2033-11-26T00:00:00.000Z",
  "targetReachYearOffset": 7.6,
  "targetReachValue": 30000000.00,
  "isTargetReachableByRetirement": true
}
```

When `gap ≤ 0` (target already exceeded):

```json
{
  "currentPortfolioTotal": 35000000.00,
  "settings": { "...": "..." },
  "yearsRemaining": 20,
  "projectedFV": 159666264.54,
  "gap": -5000000.00,
  "progressPercent": 116.7,
  "isTargetReached": true,
  "trajectory": [
    { "...": "..." }
  ],
  "targetReachAge": 40.0,
  "targetReachDate": "2026-04-19T00:00:00.000Z",
  "targetReachYearOffset": 0,
  "targetReachValue": 30000000.00,
  "isTargetReachableByRetirement": true,
  "surplusAmount": 5000000.00
}
```

#### Success Response — 200 OK (settings not configured)

```json
{
  "currentPortfolioTotal": 15000000.00,
  "settings": null,
  "yearsRemaining": null,
  "projectedFV": null,
  "gap": null,
  "progressPercent": null,
  "isTargetReached": false,
  "trajectory": [],
  "targetReachAge": null,
  "targetReachDate": null,
  "targetReachYearOffset": null,
  "targetReachValue": null,
  "isTargetReachableByRetirement": false
}
```

Notes:
- `projectedFV` uses the formula: `FV = PV × (1 + r)^n + C × [((1+r)^n − 1) / r]` (BR-041).
- When `r = 0`: `FV = PV + (C × n)`.
- `progressPercent` is rounded to 1 decimal place (BR-043).
- `trajectory` is a yearly series from the current date/age through retirement age. It is intended for chart rendering and always uses the same projection assumptions as `projectedFV`.
- `targetReachAge` / `targetReachDate` / `targetReachYearOffset` describe when the retirement target is first reached within the retirement window. These fields are `null` when the target is not reached by retirement age.
- When the target is already met at the current portfolio value, `targetReachAge` resolves to the current age and `targetReachYearOffset` is `0`.
- When `yearsRemaining ≤ 0`, `projectedFV` is `null`, `trajectory` contains only the current point, and the UI is expected to suppress the forward projection chart (BR-044).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid access token |

---

## 6. Error Response Reference

### Standard Error Envelope

```json
{
  "error": "Human-readable error message."
}
```

### Validation Error Envelope (400)

```json
{
  "error": "Validation failed",
  "fields": {
    "snapshotDate": "snapshotDate must be a valid ISO 8601 date (YYYY-MM-DD).",
    "currentBalance": "currentBalance must be a non-negative number."
  }
}
```

### HTTP Status Code Summary

| Status | Meaning |
|--------|---------|
| 200 | OK — request succeeded, body contains result |
| 201 | Created — resource created, body contains new resource |
| 204 | No Content — deletion succeeded, no body |
| 400 | Bad Request — validation error or malformed body |
| 401 | Unauthorized — missing, expired, or invalid JWT access token |
| 403 | Forbidden — authenticated but not permitted (wrong user, locked snapshot) |
| 404 | Not Found — resource ID does not exist |
| 429 | Too Many Requests — rate limit exceeded on `/api/auth/login` |
| 500 | Internal Server Error — unexpected server fault |

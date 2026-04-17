# Wealth Tracker — Product Requirements Document

## 1. Overview

A personal wealth tracking web app for two users (husband and wife) to log and monitor investment portfolios across multiple snapshots. Replaces a yearly Google Sheets workflow. Built with **Node.js + Express** (backend) and **React.js** (frontend).

Primary use case:
- Once or a few times per year, user opens the app
- Creates a new tracking snapshot
- Enters current balances for all investments
- Adds new investments if needed
- Compares current values vs previous snapshot
- Views dashboard of total wealth, allocation by asset type, and progress toward retirement target

This is **not** a trading app. This is a **wealth tracking and planning app**.

---

## 2. Goals

### Business goals
- Replace manual Google Sheet tracking with a cleaner and more structured system
- Support 2 separate accounts
- Make yearly or ad-hoc wealth updates easy
- Show wealth growth over time
- Show asset allocation clearly
- Show distance to retirement target

### User goals
- Enter balances quickly
- Reuse previous records instead of typing everything again
- Add new investments easily
- See gain/loss vs prior snapshot
- Understand diversification by investment type and institution
- Track retirement readiness

---

## 3. Users

| User | Role |
|------|------|
| User 1 (you) | Full access to own portfolio |
| User 2 (wife) | Full access to own portfolio |

Each user sees only their own data. No shared portfolio view in v1 (future optional feature).

---

## 4. Core Concepts

### Snapshot
A **snapshot** is a dated, point-in-time record of all investments — equivalent to one tab in the Google Sheet.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `userId` | fk | owner |
| `snapshotName` | string | e.g. "2025 Year End", "2026 Mid Year" |
| `snapshotDate` | date | |
| `notes` | string | optional |
| `isLocked` | boolean | locked = read-only |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Investment Item
One row inside a snapshot:

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `snapshotId` | fk | |
| `investmentType` | enum | see types below |
| `institution` | string | bank or broker |
| `investmentName` | string | e.g. "KBank Fixed Deposit 12M" |
| `currentBalance` | number | THB by default |
| `currency` | string | default THB |
| `note` | string | optional |
| `displayOrder` | int | for row ordering |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

---

## 5. Investment Types

- เงินฝาก (Cash / Deposits)
- หุ้นไทย (Thai Equities)
- หุ้นต่างประเทศ (Foreign Equities)
- ตราสารหนี้ไทย (Thai Fixed Income)
- ตราสารหนี้ต่างประเทศ (Foreign Fixed Income)
- กองทุนรวม (Mutual Funds)
- ทองคำ (Gold)
- อสังหาริมทรัพย์ (Real Estate)
- เงินสด (Cash on Hand)
- อื่นๆ (Other)

> Preset list. Allow custom entry for types not on the list.

---

## 6. Institutions (Preset List)

KBank, SCB, BBL, Krungsri, Krungthai, TMBThanachart (ttb), UOB, Kasikorn Asset, Bualuang, One Asset, SCBAM, Fidelity, Interactive Brokers, Other

> Allow free-text entry for institutions not on the list.

---

## 7. Functional Requirements

### 7.1 Authentication
- Email + password login
- JWT access token + refresh token
- bcrypt password hashing
- Change password
- No self-registration in v1 — seed two accounts via setup script
- Every API query must be filtered by authenticated `userId`

### 7.2 Snapshot Management
- List all snapshots (newest first) with total amount, change from prior, and status
- Create new snapshot (blank or duplicated from latest)
- **Duplicate previous snapshot** — copies all items from the most recent snapshot with balances pre-filled; user then updates balances. This is the primary workflow.
- Edit snapshot header (name, date, notes)
- Lock snapshot — makes it read-only after completion
- Unlock snapshot — allows re-editing if needed
- Delete snapshot

### 7.3 Investment Ledger (per snapshot)

Table columns shown when viewing a snapshot:

| Column | Notes |
|--------|-------|
| Investment Type | editable |
| Institution | editable |
| Investment Name | editable |
| Previous Balance | read-only, from prior snapshot |
| Current Balance | editable |
| Amount Change | auto-calculated, green/red |
| % Change | auto-calculated, green/red |
| Note | optional |
| Actions | edit, delete |

User actions:
- Add new row
- Inline edit any field
- Delete row
- Reorder rows (drag or up/down)

### 7.4 Comparison with Previous Snapshot

When viewing a snapshot, each item is compared against the immediately prior snapshot by date.

**Match criteria** (all must match):
1. Same user
2. Same `investmentName`
3. Same `institution`
4. Same `investmentType`

**Calculated fields:**
- `amountChange = currentBalance - previousBalance`
- `percentChange = (amountChange / previousBalance) * 100`

**Edge cases:**
- No previous match → show previous balance as `-`, % change as `New`
- Item existed before but removed in current snapshot → show in optional "Closed / Missing" section

### 7.5 Dashboard

Shown after login. Displays the **latest snapshot** by default with a snapshot selector to view historical data.

**Widgets:**

| Widget | Description |
|--------|-------------|
| Total Net Worth | Current snapshot total in THB with amount change and % change vs prior |
| Previous Snapshot Total | For direct comparison |
| Allocation Pie Chart | Breakdown by investment type (% and THB per slice) |
| Institution Bar Chart | Total balance per institution |
| Recent Snapshots List | Quick access to last 5 snapshots |
| Retirement Goal Progress | Progress bar with % achieved, gap remaining, projected value |

**Calculations:**
- Total current = sum of all items in current snapshot
- Total previous = sum of all items in prior snapshot
- Change = current total − previous total
- % change = change / previous total × 100

### 7.6 Retirement Goal Tracking

Per-user settings:
- Current age
- Retirement age
- Target retirement amount (THB)
- Expected annual return (%)
- Expected annual contribution (THB, optional)

Dashboard outputs:
- "You are at X% of your retirement target"
- "Projected wealth at age [retirement age] is ฿X"
- "Gap remaining is ฿Y"
- Years remaining

v1 projection formula: future value of current portfolio compounded at expected annual return, plus annual contributions if entered.

---

## 8. Tech Stack

### Frontend
| Layer | Choice |
|-------|--------|
| Framework | React 18 + Vite + TypeScript |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query) |
| UI state | Zustand |
| UI Components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| HTTP | Axios |

### Backend
| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20+ + TypeScript |
| Framework | Express.js |
| Database | SQLite via Prisma ORM — zero infra, local dev |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |

> SQLite is sufficient for a 2-user personal app. Can migrate to PostgreSQL later by changing the Prisma provider string — no other code changes needed.

---

## 9. Data Model (Prisma Schema)

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  name      String
  settings  UserFinancialSettings?
  snapshots Snapshot[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model UserFinancialSettings {
  id                       String  @id @default(uuid())
  userId                   String  @unique
  user                     User    @relation(fields: [userId], references: [id])
  baseCurrency             String  @default("THB")
  currentAge               Int?
  retirementAge            Int?
  retirementTargetAmount   Float?
  expectedAnnualReturn     Float?
  expectedAnnualContribution Float?
  updatedAt                DateTime @updatedAt
}

model Snapshot {
  id           String      @id @default(uuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id])
  snapshotName String
  snapshotDate DateTime
  notes        String?
  isLocked     Boolean     @default(false)
  items        SnapshotItem[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model SnapshotItem {
  id             String   @id @default(uuid())
  snapshotId     String
  snapshot       Snapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  investmentType String
  institution    String
  investmentName String
  currentBalance Float
  currency       String   @default("THB")
  note           String?
  displayOrder   Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 10. API Endpoints

### Auth
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Current User
```
GET    /api/me                          — profile
PUT    /api/me                          — update profile / change password
GET    /api/me/financial-settings
PUT    /api/me/financial-settings
```

### Snapshots
```
GET    /api/snapshots                   — list all snapshots for current user
POST   /api/snapshots                   — create new snapshot
GET    /api/snapshots/:id               — get snapshot with items
PUT    /api/snapshots/:id               — update snapshot header
DELETE /api/snapshots/:id               — delete snapshot
POST   /api/snapshots/:id/duplicate     — clone snapshot into new one
POST   /api/snapshots/:id/lock          — lock snapshot
POST   /api/snapshots/:id/unlock        — unlock snapshot
```

### Snapshot Items
```
POST   /api/snapshots/:id/items             — add item
PUT    /api/snapshots/:id/items/:itemId     — update item
DELETE /api/snapshots/:id/items/:itemId     — delete item
```

### Dashboard
```
GET    /api/dashboard                   — latest snapshot summary + comparison
GET    /api/dashboard/allocation        — breakdown by investment type
GET    /api/dashboard/retirement        — retirement goal progress
```

---

## 11. Frontend Pages & Routes

```
/login                          — Login
/dashboard                      — Dashboard (latest snapshot)
/snapshots                      — Snapshot list
/snapshots/new                  — Create snapshot
/snapshots/:id                  — View / edit snapshot ledger
/settings                       — Financial settings + retirement goal
/settings/account               — Profile + change password
```

---

## 12. Project Structure

```
wealth-tracker/
├── client/                     # React app (Vite + TypeScript)
│   └── src/
│       ├── api/                # Axios API calls
│       ├── components/         # Shared UI components
│       ├── pages/              # Route-level page components
│       ├── features/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── snapshots/
│       │   └── retirement/
│       ├── hooks/              # TanStack Query hooks
│       ├── store/              # Zustand stores
│       ├── types/              # Shared TypeScript types
│       └── utils/
│
├── server/                     # Express API (TypeScript)
│   └── src/
│       ├── routes/             # Express routers
│       ├── controllers/        # Route handlers
│       ├── middleware/         # Auth, error handling, validation
│       ├── services/           # Business logic
│       ├── prisma/             # schema.prisma + migrations
│       └── seed.ts             # Seed 2 user accounts
│
└── PRD.md
```

---

## 13. Key Workflows

### Workflow 1: Create yearly snapshot
1. User logs in
2. Clicks "New Snapshot"
3. Chooses "Duplicate previous snapshot"
4. App copies all prior line items with previous balances pre-filled
5. User updates current balances inline
6. User adds new investments if needed
7. Dashboard updates totals and charts in real time
8. User locks snapshot

### Workflow 2: Add a new investment
1. Open snapshot
2. Click "Add investment"
3. Fill in type, institution, name, amount
4. Save — app marks it as "New" vs prior snapshot

### Workflow 3: Review yearly progress
1. Open latest snapshot
2. Review each item's % change (green/red)
3. Review total wealth growth on dashboard
4. Check allocation pie chart for diversification
5. Check retirement target progress

---

## 14. UX Recommendations

### Keep data entry fast
The app will be used a few times per year. Prioritize low friction.

- Duplicate previous snapshot by default on new snapshot creation
- Editable table layout — spreadsheet-like feel, not card-heavy
- Inline save (no separate save button per row)
- Auto-calculate changes immediately on balance edit
- Sticky total row at bottom of ledger
- Searchable dropdown for institution and investment type
- Preset categories but allow free-text custom entry

### Use color intentionally
- Green → positive change
- Red → negative change
- Gray → no prior data / new entry

---

## 15. Validation Rules

- `snapshotName` required
- `snapshotDate` required
- `investmentType` required
- `institution` required
- `investmentName` required
- `currentBalance` must be ≥ 0
- Locked snapshots cannot be edited — return 403
- Warn if a snapshot has two identical rows (same type + institution + name)

---

## 16. Security Requirements

- Passwords hashed with bcrypt (min 12 rounds)
- JWT access token (short-lived) + refresh token (long-lived, httpOnly cookie)
- Every database query filtered by authenticated `userId` — no row-level data leaks
- Input validation on both frontend (Zod) and backend (Zod)
- HTTPS in production
- Protection against SQL injection (Prisma parameterized queries), XSS (React default escaping), brute-force login (rate limit on `/auth/login`)

---

## 17. Non-Functional Requirements

- Runs locally on localhost — no cloud deployment required for v1
- All amounts in **Thai Baht (THB)** by default
- Number formatting: `1,500,000` with comma separators
- Thai investment type labels preserved in the UI
- No real-time sync needed — each user logs in separately

---

## 18. MVP Scope

### Must include
- User authentication (login, logout, change password)
- Separate accounts — each user sees only own data
- Snapshot list
- Create snapshot (blank or duplicate from latest)
- Add / edit / delete investment rows
- Snapshot lock / unlock
- Comparison with previous snapshot (previous balance, amount change, % change)
- Dashboard: total net worth, % change, allocation pie chart, institution bar chart
- Retirement goal settings and progress widget

### Defer to later
- Mobile responsive polish
- Export to CSV / PDF
- Email yearly reminder
- Combined household view
- Multi-currency FX conversion
- File attachments
- Notification system
- Automatic bank/broker sync

---

## 19. Development Phases

### Phase 1 — Foundation
- Project scaffold (Vite + Express + Prisma)
- Auth (login, JWT, refresh token)
- DB schema + seed script

### Phase 2 — Snapshot Engine
- Snapshot CRUD
- Item CRUD
- Duplicate snapshot
- Lock / unlock

### Phase 3 — Analytics
- Comparison engine (previous balance, amount change, % change)
- Dashboard: total wealth summary
- Allocation pie chart + institution bar chart
- Retirement goal widget

### Phase 4 — Polish
- Form validation + error handling
- Responsive UI
- Edge case handling (new items, missing prior data, locked snapshots)
- Deployment / backup strategy

---

## 20. Reporting & Analytics

### v1 (MVP)
- Total wealth over time — line chart across all snapshots
- Asset allocation — pie chart by investment type
- Institution concentration — bar chart

### v2
- CAGR across snapshots
- Best / worst performing asset class
- Domestic vs foreign allocation split
- Liquidity view
- Retirement readiness trend

---

## 21. Future Enhancements

### v2
- Household consolidated dashboard (opt-in)
- Import from CSV or Google Sheet
- Multi-currency support with FX conversion
- Tag investments by goal
- Notes per snapshot
- Rebalancing suggestions
- Risk allocation score
- Mobile responsive optimization
- Email reminder once a year to update snapshot

### v3
- Connect to bank/broker APIs
- AI summary of yearly wealth change
- Retirement scenario simulation
- Tax-aware tracking
- Insurance, liabilities, and net worth view

---

## 22. User Stories

### Story 1
As a user, I want to create a new yearly snapshot by copying last year's investments so that I do not need to re-enter everything from scratch.

### Story 2
As a user, I want to see each investment's previous balance and % change so that I can review what grew or declined.

### Story 3
As a user, I want a dashboard pie chart by investment type so that I understand my asset allocation at a glance.

### Story 4
As a user, I want to see how far I am from my retirement target so that I can adjust my saving plan.

### Story 5
As a user, I want to lock a snapshot after completing it so that I do not accidentally change historical data.

### Story 6
As a user, I want my account data to be fully private from my spouse's account so that each person's finances stay separate.

---

## 23. Acceptance Criteria

### Authentication
- User can log in and log out
- User cannot access another user's data (any attempt returns 401/403)

### Snapshot management
- User can create a snapshot (blank or duplicated from latest)
- User can add, edit, and delete investment rows
- User can lock and unlock a snapshot
- Locked snapshot rejects any edit attempts

### Comparison
- System shows previous balance from the immediately prior snapshot
- System shows amount change and % change per item
- New items (no prior match) are labeled "New"
- % change is colored green (positive) or red (negative)

### Dashboard
- System shows total current amount from latest snapshot
- System shows prior snapshot total
- System shows absolute and % change
- System shows allocation pie chart by investment type
- System shows institution bar chart

### Retirement tracking
- User can enter retirement settings (current age, retirement age, target amount, expected return, annual contribution)
- System shows current % of goal achieved
- System shows remaining gap
- System shows projected wealth at retirement age

---

## 24. Product Direction

This app should feel like:
- A cleaner version of the current Google Sheet
- Structured enough to scale
- Simple enough to maintain as a personal tool
- Private for 2 separate users
- Useful for retirement tracking, not just raw balance entry

> **"Spreadsheet familiarity with app-level structure, privacy, and better analytics."**

---

## 25. Seed Data

```
User 1: net@family.local   / <set password in seed script>
User 2: ann@family.local  / <set password in seed script>
```

Run `npm run seed` inside the `server/` directory to create both accounts.

---

## 26. Decisions Made

| # | Question | Decision |
|---|----------|---------|
| 3 | Retirement target age | **60** |
| 3 | Retirement target amount | **฿30,000,000** |
| 4 | Dark mode | **No** |
| 5 | UI language | **English** |

## 27. Open Questions

| # | Question | Options |
|---|----------|---------|
| 1 | Do you want a combined household dashboard? | Yes / No / Later |
| 2 | Should both users be able to see each other's data? | No / Read-only view |

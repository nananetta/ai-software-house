# Technical Implementation Plan — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Approved
**Author:** Tech Lead
**Applies to:** wealth-plus MVP

---

## 1. Coding Standards

### 1.1 Language and Compiler Settings

- TypeScript strict mode is mandatory across all packages. Both `client/tsconfig.json` and `server/tsconfig.json` must include:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitReturns": true,
      "exactOptionalPropertyTypes": true,
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler"
    }
  }
  ```
- The `any` type is banned in application code. ESLint rule `@typescript-eslint/no-explicit-any: error` is enforced.
- Prefer `unknown` over `any` when a type is truly indeterminate; narrow with a type guard before use.

### 1.2 File Naming

| Context | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase `.tsx` | `SnapshotTable.tsx` |
| Non-component React files (hooks, utils) | camelCase `.ts` | `useSnapshots.ts` |
| Server source files | camelCase `.ts` | `authController.ts` |
| Zod schema files | camelCase, suffix `-schema` | `snapshotSchema.ts` |
| Constants files | camelCase, suffix `-constants` | `investmentTypes-constants.ts` |
| Test files | same name + `.test.ts(x)` | `authController.test.ts` |

No `index.ts` barrel files except at feature root level. Explicit imports over re-export barrels prevent circular dependencies.

### 1.3 Folder Structure

Described fully in Section 4. Key principle: **feature-first on the client, layer-first on the server**.

### 1.4 Import Style

- All internal imports use **relative paths** within the same package. No path aliases in v1 (avoids Vite/tsc configuration divergence).
- Node built-ins and npm packages first, blank line, then internal imports:
  ```ts
  import crypto from 'node:crypto';
  import { Router } from 'express';

  import { prisma } from '../lib/prisma';
  import { authMiddleware } from '../middleware/auth';
  ```
- No default exports from library files (services, utils). Named exports only. Default exports are acceptable only for React page components (required by React Router lazy loading).

### 1.5 Error Handling Pattern

**Server — global error handler:**
All route handlers are wrapped in `asyncHandler` (a small utility) so that thrown errors propagate to the Express error middleware. The global error handler normalises all errors into the API error envelope.

```ts
// server/src/lib/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
```

**Server — AppError class:**
Business logic throws `AppError` with an HTTP status and message. The global handler renders these to the error envelope; unexpected `Error` instances become 500s.

```ts
// server/src/lib/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

**Server — global error middleware:**
```ts
// server/src/middleware/errorHandler.ts
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  // ZodError is handled upstream in validate middleware
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});
```

**Client — Axios error interceptor:**
Axios instances wrap all API errors. React Query surfaces them via `error` states. Components read `error.message` to show toast notifications or inline messages. No raw `try/catch` in component render code.

### 1.6 Prisma Usage Rules

- One shared `PrismaClient` instance, exported from `server/src/lib/prisma.ts`. Never instantiate `PrismaClient` inside a route or service function.
- All queries that touch user-owned data must include `where: { userId: req.user.id }` (or an ownership check before the mutation). This is the single most important security rule.
- Transactions are used for multi-step writes: snapshot duplication (new Snapshot + N new SnapshotItems) and display order reordering.
  ```ts
  await prisma.$transaction([
    prisma.snapshot.create({ ... }),
    prisma.snapshotItem.createMany({ ... }),
  ]);
  ```
- No `$queryRaw` or `$executeRaw` with user-supplied strings.
- `prisma.snapshot.findFirst` and `prisma.snapshot.findUnique` return `null` when not found. Always null-check before using the result; throw `AppError(404, ...)` or `AppError(403, ...)` as appropriate.

---

## 2. Environment Setup

### 2.1 Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.x LTS (use `.nvmrc` to pin) |
| npm | Comes with Node 20 |
| Git | Any recent version |

> The project uses **npm workspaces** (not pnpm). npm 9+ supports workspaces natively.

### 2.2 Repository Bootstrap

```bash
# Clone / navigate to project
cd products/wealth-plus

# Install all workspace dependencies from monorepo root
npm install

# Generate Prisma client (run from server/ or via workspace script)
npm run db:generate

# Apply migrations and create the DB file
npm run db:migrate

# Seed two user accounts
npm run db:seed

# Start both client and server in development mode
npm run dev
```

### 2.3 `.nvmrc`

```
20
```

### 2.4 Environment Variables

#### Server — `server/.env` (never committed)

```dotenv
# Database
DATABASE_URL="file:./prisma/wealth-plus.db"

# JWT
JWT_SECRET="<at-least-32-random-chars>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development

# CORS
CLIENT_ORIGIN="http://localhost:3000"
```

#### Client — `client/.env` (safe to commit, no secrets)

```dotenv
VITE_API_BASE_URL="http://localhost:4000/api"
```

#### `.env.example` files

Both `server/.env.example` and `client/.env.example` must be committed with placeholder values. The `.env` files themselves are in `.gitignore`.

**Server startup guard:** `server/src/index.ts` must validate at startup:
```ts
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Aborting.');
}
```

### 2.5 npm Workspace Configuration

Root `package.json`:
```json
{
  "name": "wealth-plus",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w server && npm run build -w client",
    "db:generate": "npm run db:generate -w server",
    "db:migrate": "npm run db:migrate -w server",
    "db:seed": "npm run db:seed -w server"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

---

## 3. Shared Types

Shared types live in `server/src/types/shared.ts` and are imported by the client via a **path-based import** (the monorepo's relative paths make this practical without a full npm package). In v1, types are duplicated to `client/src/types/shared.ts` and kept in sync manually. If divergence becomes a problem, extract to a `packages/shared` workspace in v1.1.

```ts
// shared.ts (duplicate in both packages, kept in sync)

// --- Enums / Constants ---

export const INVESTMENT_TYPE_CODES = [
  'CASH_DEPOSIT',
  'THAI_EQUITY',
  'FOREIGN_EQUITY',
  'THAI_FIXED_INCOME',
  'FOREIGN_FIXED_INCOME',
  'MUTUAL_FUND',
  'GOLD',
  'REAL_ESTATE',
  'CASH_ON_HAND',
  'OTHER',
] as const;

export type InvestmentTypeCode = typeof INVESTMENT_TYPE_CODES[number];

export const INVESTMENT_TYPE_LABELS: Record<InvestmentTypeCode, string> = {
  CASH_DEPOSIT: 'เงินฝาก',
  THAI_EQUITY: 'หุ้นไทย',
  FOREIGN_EQUITY: 'หุ้นต่างประเทศ',
  THAI_FIXED_INCOME: 'ตราสารหนี้ไทย',
  FOREIGN_FIXED_INCOME: 'ตราสารหนี้ต่างประเทศ',
  MUTUAL_FUND: 'กองทุนรวม',
  GOLD: 'ทองคำ',
  REAL_ESTATE: 'อสังหาริมทรัพย์',
  CASH_ON_HAND: 'เงินสด',
  OTHER: 'อื่นๆ',
};

export const PRESET_INSTITUTIONS = [
  'KBank', 'SCB', 'BBL', 'Krungsri', 'Krungthai',
  'TMBThanachart (ttb)', 'UOB', 'Kasikorn Asset',
  'Bualuang', 'One Asset', 'SCBAM', 'Fidelity',
  'Interactive Brokers', 'Other',
] as const;

// --- API Response Types ---

export interface UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserFinancialSettingsDto {
  id: string | null;
  userId: string;
  baseCurrency: string;
  currentAge: number | null;
  retirementAge: number | null;
  retirementTargetAmount: number | null;
  expectedAnnualReturn: number | null;
  expectedAnnualContribution: number | null;
  updatedAt: string | null;
}

export interface SnapshotSummaryDto {
  id: string;
  snapshotName: string;
  snapshotDate: string;
  notes: string | null;
  isLocked: boolean;
  total: number;
  previousTotal: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotItemDto {
  id: string;
  snapshotId: string;
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency: string;
  note: string | null;
  displayOrder: number;
  // Comparison fields (null when no prior match)
  previousBalance: number | null;
  amountChange: number | null;
  percentChange: number | null;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClosedItemDto {
  investmentType: string;
  institution: string;
  investmentName: string;
  previousBalance: number;
  currency: string;
}

export interface SnapshotDetailDto {
  snapshot: {
    id: string;
    userId: string;
    snapshotName: string;
    snapshotDate: string;
    notes: string | null;
    isLocked: boolean;
    createdAt: string;
    updatedAt: string;
  };
  items: SnapshotItemDto[];
  closedItems: ClosedItemDto[];
  priorSnapshotId: string | null;
  priorSnapshotDate: string | null;
}

export interface DashboardSummaryDto {
  snapshotId: string | null;
  snapshotName: string | null;
  snapshotDate: string | null;
  isLocked: boolean;
  totalCurrent: number;
  totalPrevious: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  recentSnapshots: Array<{
    id: string;
    snapshotName: string;
    snapshotDate: string;
    total: number;
    isLocked: boolean;
  }>;
}

export interface AllocationItemDto {
  investmentType: string;
  label: string;
  total: number;
  percent: number;
}

export interface DashboardAllocationDto {
  snapshotId: string;
  snapshotName: string;
  total: number;
  allocation: AllocationItemDto[];
}

export interface RetirementDto {
  currentPortfolioTotal: number;
  settings: {
    currentAge: number;
    retirementAge: number;
    retirementTargetAmount: number;
    expectedAnnualReturn: number;
    expectedAnnualContribution: number;
  } | null;
  yearsRemaining: number | null;
  projectedFV: number | null;
  gap: number | null;
  progressPercent: number | null;
  isTargetReached: boolean;
  surplusAmount?: number;
}

// --- Request Body Types ---

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface CreateSnapshotRequestDto {
  snapshotName: string;
  snapshotDate: string;
  notes?: string;
}

export interface UpdateSnapshotRequestDto {
  snapshotName?: string;
  snapshotDate?: string;
  notes?: string | null;
}

export interface CreateItemRequestDto {
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency?: string;
  note?: string;
  displayOrder?: number;
}

export interface UpdateItemRequestDto {
  investmentType?: string;
  institution?: string;
  investmentName?: string;
  currentBalance?: number;
  currency?: string;
  note?: string | null;
  displayOrder?: number;
}

export interface UpdateProfileRequestDto {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateFinancialSettingsRequestDto {
  baseCurrency?: string;
  currentAge?: number;
  retirementAge?: number;
  retirementTargetAmount?: number;
  expectedAnnualReturn?: number;
  expectedAnnualContribution?: number;
}
```

---

## 4. Monorepo File Listing

Every file that must be created. Files generated by tooling (node_modules, Prisma client, dist) are excluded.

```
wealth-plus/                                      ← monorepo root
├── .gitignore
├── .nvmrc
├── package.json                                  ← workspace root
├── README.md                                     ← points to PRD

├── client/                                       ← React SPA (Vite + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── .env.example
│   ├── .env                                      ← gitignored
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx                              ← React entry point, QueryClient, Router setup
│       ├── App.tsx                               ← Route declarations
│       │
│       ├── types/
│       │   └── shared.ts                         ← Shared DTOs (duplicate of server/src/types/shared.ts)
│       │
│       ├── lib/
│       │   ├── axios.ts                          ← Axios instance + interceptors (auth header, 401 refresh)
│       │   └── queryClient.ts                    ← TanStack QueryClient configuration
│       │
│       ├── store/
│       │   ├── authStore.ts                      ← Zustand: { user, accessToken, setAuth, clearAuth }
│       │   └── uiStore.ts                        ← Zustand: { selectedSnapshotId, setSelectedSnapshot }
│       │
│       ├── api/
│       │   ├── auth.ts                           ← login(), refresh(), logout()
│       │   ├── me.ts                             ← getProfile(), updateProfile(), getSettings(), updateSettings()
│       │   ├── snapshots.ts                      ← listSnapshots(), getSnapshot(), createSnapshot(), ...
│       │   ├── items.ts                          ← addItem(), updateItem(), deleteItem()
│       │   └── dashboard.ts                      ← getDashboard(), getAllocation(), getRetirement()
│       │
│       ├── hooks/
│       │   ├── useAuth.ts                        ← login mutation, logout mutation
│       │   ├── useProfile.ts                     ← useProfile(), useUpdateProfile()
│       │   ├── useFinancialSettings.ts           ← useFinancialSettings(), useUpdateFinancialSettings()
│       │   ├── useSnapshots.ts                   ← useSnapshots(), useSnapshot(), useCreateSnapshot(), ...
│       │   ├── useItems.ts                       ← useAddItem(), useUpdateItem(), useDeleteItem()
│       │   └── useDashboard.ts                   ← useDashboard(), useAllocation(), useRetirement()
│       │
│       ├── components/
│       │   ├── ui/                               ← shadcn/ui generated components (Button, Input, etc.)
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── select.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── card.tsx
│       │   │   ├── table.tsx
│       │   │   ├── toast.tsx
│       │   │   ├── toaster.tsx
│       │   │   ├── tooltip.tsx
│       │   │   ├── progress.tsx
│       │   │   ├── label.tsx
│       │   │   └── separator.tsx
│       │   │
│       │   ├── layout/
│       │   │   ├── AppShell.tsx                  ← authenticated layout wrapper (sidebar + topbar)
│       │   │   ├── Sidebar.tsx                   ← navigation links
│       │   │   └── TopBar.tsx                    ← user name, logout button
│       │   │
│       │   ├── common/
│       │   │   ├── LoadingSpinner.tsx
│       │   │   ├── ErrorMessage.tsx
│       │   │   ├── ConfirmDialog.tsx             ← generic delete confirmation modal
│       │   │   ├── CurrencyDisplay.tsx           ← formats float → "฿1,500,000.00"
│       │   │   ├── ChangeDisplay.tsx             ← renders amount/% change with green/red color
│       │   │   └── ComboBox.tsx                  ← searchable dropdown (institution, investment type)
│       │   │
│       │   └── charts/
│       │       ├── AllocationPieChart.tsx        ← Recharts PieChart for asset allocation
│       │       ├── InstitutionBarChart.tsx        ← Recharts BarChart for institution totals
│       │       └── WealthLineChart.tsx            ← Recharts LineChart for wealth over time
│       │
│       ├── features/
│       │   ├── auth/
│       │   │   └── LoginForm.tsx                 ← email+password form with Zod validation
│       │   │
│       │   ├── dashboard/
│       │   │   ├── NetWorthWidget.tsx            ← total + change vs prior
│       │   │   ├── RecentSnapshotsList.tsx       ← quick access list of last 5 snapshots
│       │   │   ├── SnapshotSelector.tsx          ← dropdown to pick historical snapshot
│       │   │   └── RetirementWidget.tsx          ← progress bar + projected FV + gap
│       │   │
│       │   ├── snapshots/
│       │   │   ├── SnapshotListTable.tsx         ← table of all snapshots with totals + actions
│       │   │   ├── SnapshotHeaderForm.tsx        ← form for name, date, notes (create + edit)
│       │   │   ├── CreateSnapshotModal.tsx       ← modal: blank vs duplicate choice
│       │   │   ├── LedgerTable.tsx               ← the main investment ledger (inline edit rows)
│       │   │   ├── LedgerRow.tsx                 ← single editable row in the ledger
│       │   │   ├── AddItemForm.tsx               ← form to add a new investment item
│       │   │   ├── ClosedItemsSection.tsx        ← collapsible "Closed / Missing" section
│       │   │   └── LockUnlockButton.tsx          ← lock/unlock toggle with confirmation
│       │   │
│       │   └── settings/
│       │       ├── FinancialSettingsForm.tsx     ← retirement goal settings form
│       │       └── AccountSettingsForm.tsx       ← name + change password form
│       │
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── SnapshotListPage.tsx
│       │   ├── NewSnapshotPage.tsx
│       │   ├── SnapshotDetailPage.tsx
│       │   ├── SettingsPage.tsx
│       │   └── AccountPage.tsx
│       │
│       └── utils/
│           ├── formatCurrency.ts                 ← THB formatting utility
│           ├── formatPercent.ts                  ← percentage formatting utility
│           └── investmentTypeUtils.ts            ← code → Thai label lookup helpers

├── server/                                       ← Express API (Node 20 + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env                                      ← gitignored
│   └── src/
│       ├── index.ts                              ← server entry: env guard, app bootstrap, listen
│       ├── app.ts                                ← Express app factory (middleware stack, routers)
│       │
│       ├── types/
│       │   └── shared.ts                         ← Source of truth for shared types (client copies this)
│       │
│       ├── lib/
│       │   ├── prisma.ts                         ← singleton PrismaClient export
│       │   └── AppError.ts                       ← AppError class
│       │
│       ├── middleware/
│       │   ├── auth.ts                           ← JWT verification, attaches req.user
│       │   ├── validate.ts                       ← Zod validation middleware factory
│       │   ├── errorHandler.ts                   ← global Express error handler
│       │   ├── requestLogger.ts                  ← logs requests, redacts Authorization + password fields
│       │   └── rateLimiter.ts                    ← express-rate-limit config for /auth/login
│       │
│       ├── routes/
│       │   ├── auth.routes.ts                    ← POST /auth/login, /auth/refresh, /auth/logout
│       │   ├── me.routes.ts                      ← GET+PUT /me, GET+PUT /me/financial-settings
│       │   ├── snapshots.routes.ts               ← snapshot CRUD + lock/unlock/duplicate
│       │   ├── items.routes.ts                   ← item CRUD (nested under snapshots)
│       │   └── dashboard.routes.ts               ← GET /dashboard, /dashboard/allocation, /dashboard/retirement
│       │
│       ├── controllers/
│       │   ├── auth.controller.ts                ← login, refresh, logout handlers
│       │   ├── me.controller.ts                  ← getProfile, updateProfile, getSettings, updateSettings
│       │   ├── snapshots.controller.ts           ← list, create, get, update, delete, duplicate, lock, unlock
│       │   ├── items.controller.ts               ← addItem, updateItem, deleteItem
│       │   └── dashboard.controller.ts           ← getSummary, getAllocation, getRetirement
│       │
│       ├── services/
│       │   ├── auth.service.ts                   ← login logic, token issuance, refresh, logout
│       │   ├── me.service.ts                     ← profile get/update, settings upsert
│       │   ├── snapshots.service.ts              ← snapshot CRUD, duplication, lock enforcement
│       │   ├── items.service.ts                  ← item CRUD, duplicate-key check
│       │   ├── comparison.service.ts             ← comparison engine (prior snapshot matching)
│       │   └── dashboard.service.ts              ← summary totals, allocation grouping, retirement projection
│       │
│       ├── schemas/
│       │   ├── auth.schema.ts                    ← Zod schemas for auth request bodies
│       │   ├── snapshot.schema.ts                ← Zod schemas for snapshot create/update
│       │   ├── item.schema.ts                    ← Zod schemas for item create/update
│       │   └── settings.schema.ts                ← Zod schemas for financial settings + profile update
│       │
│       ├── prisma/
│       │   ├── schema.prisma                     ← Prisma schema (all 5 models)
│       │   ├── migrations/                       ← auto-generated by prisma migrate dev
│       │   └── wealth-plus.db                    ← gitignored; generated on first migrate
│       │
│       └── seed.ts                               ← seeds net@family.local + ann@family.local
```

---

## 5. Auth Flow in Code

### 5.1 Server-Side Auth Middleware

```ts
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/AppError';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authorization token is required.');
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      name: string;
    };
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    throw new AppError(401, 'Token is invalid or expired.');
  }
}
```

### 5.2 Token Storage on the Client

```ts
// client/src/store/authStore.ts
import { create } from 'zustand';
import type { UserDto } from '../types/shared';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  setAuth: (user: UserDto, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}));
```

Access token lives **only in Zustand memory** — never in `localStorage` or `sessionStorage`. Refreshing the page resets the store; the silent refresh interceptor re-issues a new token automatically before the first protected request.

### 5.3 Axios Instance with Interceptors

```ts
// client/src/lib/axios.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,          // sends httpOnly cookie on /auth/refresh
});

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Silent token refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        // Queue callers while a refresh is in flight
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.accessToken as string;
        useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken);
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

### 5.4 Login Flow (End to End)

1. User submits the `LoginForm` — React Hook Form validates with Zod.
2. `useAuth().login()` mutation calls `api.auth.login({ email, password })`.
3. Server: Zod validates body → `auth.service.login()` → bcrypt.compare → sign access JWT (15m) → generate 32-byte hex refresh token → SHA-256 hash stored in `RefreshToken` table → set httpOnly cookie → return `{ accessToken, user }`.
4. Client: Axios receives 200 → `useAuthStore.setAuth(user, accessToken)` → navigate to `/dashboard`.
5. On subsequent requests, request interceptor injects `Authorization: Bearer <accessToken>`.
6. When access token expires (15m), the response interceptor catches 401 → calls `POST /api/auth/refresh` (cookie sent automatically) → receives new access token → retries original request.
7. On logout: `POST /api/auth/logout` → server deletes `RefreshToken` row + clears cookie → client calls `clearAuth()` → navigate to `/login`.

---

## 6. Comparison Engine Algorithm

The comparison engine runs in `server/src/services/comparison.service.ts`. It is called by `snapshots.service.ts` when building the response for `GET /api/snapshots/:id`.

```
FUNCTION buildSnapshotWithComparison(currentSnapshot, userId):

  1. FETCH prior snapshot:
     priorSnapshot = SELECT snapshot WHERE
       userId = userId
       AND snapshotDate < currentSnapshot.snapshotDate
     ORDER BY snapshotDate DESC, createdAt DESC
     LIMIT 1

  2. IF priorSnapshot IS NULL:
     FOR EACH item IN currentSnapshot.items:
       item.previousBalance = null
       item.amountChange    = null
       item.percentChange   = null
       item.isNew           = true
     RETURN { items: currentSnapshot.items, closedItems: [] }

  3. FETCH priorItems = SELECT all SnapshotItems WHERE snapshotId = priorSnapshot.id

  4. BUILD matchKey(item):
     RETURN LOWERCASE(item.investmentName + '|' + item.institution + '|' + item.investmentType)

  5. BUILD priorIndex:
     priorIndex = Map<string, SnapshotItem>
     FOR EACH priorItem IN priorItems:
       key = matchKey(priorItem)
       priorIndex.set(key, priorItem)      // first match wins (BR-015 note)

  6. PROCESS current items:
     matchedPriorKeys = Set<string>
     FOR EACH item IN currentSnapshot.items (ordered by displayOrder):
       key = matchKey(item)
       priorItem = priorIndex.get(key)
       IF priorItem EXISTS:
         item.previousBalance = priorItem.currentBalance
         item.amountChange    = item.currentBalance - priorItem.currentBalance
         IF priorItem.currentBalance > 0:
           item.percentChange = ROUND((item.amountChange / priorItem.currentBalance) * 100, 2)
         ELSE IF item.currentBalance > 0:
           item.percentChange = null    // rendered as "New" in UI (BR-030)
         ELSE:
           item.percentChange = 0
         item.isNew = false
         matchedPriorKeys.add(key)
       ELSE:
         item.previousBalance = null
         item.amountChange    = null
         item.percentChange   = null
         item.isNew           = true

  7. BUILD closedItems:
     closedItems = []
     FOR EACH priorItem IN priorItems:
       key = matchKey(priorItem)
       IF key NOT IN matchedPriorKeys:
         closedItems.append({
           investmentType:  priorItem.investmentType,
           institution:     priorItem.institution,
           investmentName:  priorItem.investmentName,
           previousBalance: priorItem.currentBalance,
           currency:        priorItem.currency,
         })

  8. RETURN {
       items: currentSnapshot.items (with comparison fields attached),
       closedItems: closedItems,
       priorSnapshotId:   priorSnapshot.id,
       priorSnapshotDate: priorSnapshot.snapshotDate,
     }
```

**Edge cases handled:**
- No prior snapshot → all items are `isNew: true`, `closedItems = []`.
- `previousBalance = 0` + `currentBalance > 0` → `percentChange = null` (UI renders "New").
- `previousBalance = 0` + `currentBalance = 0` → `percentChange = 0`.
- Duplicate triple-key in prior snapshot → first occurrence wins in `priorIndex`.

---

## 7. Retirement Projection Formula

```ts
// server/src/services/dashboard.service.ts

/**
 * Calculates the projected future value of a portfolio at retirement age.
 *
 * Formula (BR-041):
 *   FV = PV × (1 + r)^n + C × [((1 + r)^n − 1) / r]
 *   When r = 0: FV = PV + (C × n)
 *
 * @param pv  - Current portfolio total (present value, THB)
 * @param r   - Expected annual return as a decimal (e.g., 0.07 for 7%)
 * @param n   - Years remaining until retirement (positive integer)
 * @param c   - Expected annual contribution (THB, 0 if not set)
 * @returns   - Projected future value in THB
 */
export function calculateRetirementFV(
  pv: number,
  r: number,
  n: number,
  c: number
): number {
  if (n <= 0) {
    throw new Error('n (years remaining) must be positive');
  }
  if (r === 0) {
    return pv + c * n;
  }
  const growthFactor = Math.pow(1 + r, n);
  const portfolioFV = pv * growthFactor;
  const contributionFV = c * ((growthFactor - 1) / r);
  return portfolioFV + contributionFV;
}

/**
 * Builds the full retirement projection response object.
 */
export function buildRetirementProjection(
  currentPortfolioTotal: number,
  settings: UserFinancialSettingsDto | null
): RetirementDto {
  if (
    !settings ||
    settings.currentAge === null ||
    settings.retirementAge === null ||
    settings.retirementTargetAmount === null ||
    settings.expectedAnnualReturn === null
  ) {
    return {
      currentPortfolioTotal,
      settings: null,
      yearsRemaining: null,
      projectedFV: null,
      gap: null,
      progressPercent: null,
      isTargetReached: false,
    };
  }

  const n = settings.retirementAge - settings.currentAge;
  const r = settings.expectedAnnualReturn / 100;
  const c = settings.expectedAnnualContribution ?? 0;
  const target = settings.retirementTargetAmount;

  if (n <= 0) {
    const gap = target - currentPortfolioTotal;
    const progressPercent = Math.round((currentPortfolioTotal / target) * 1000) / 10;
    return {
      currentPortfolioTotal,
      settings: settings as NonNullable<RetirementDto['settings']>,
      yearsRemaining: n,
      projectedFV: null,
      gap,
      progressPercent,
      isTargetReached: gap <= 0,
      ...(gap <= 0 ? { surplusAmount: Math.abs(gap) } : {}),
    };
  }

  const projectedFV = calculateRetirementFV(currentPortfolioTotal, r, n, c);
  const gap = target - currentPortfolioTotal;
  const progressPercent = Math.round((currentPortfolioTotal / target) * 1000) / 10;

  return {
    currentPortfolioTotal,
    settings: settings as NonNullable<RetirementDto['settings']>,
    yearsRemaining: n,
    projectedFV: Math.round(projectedFV * 100) / 100,
    gap,
    progressPercent,
    isTargetReached: gap <= 0,
    ...(gap <= 0 ? { surplusAmount: Math.abs(gap) } : {}),
  };
}
```

**Formula validation (example at n=20, r=7%, PV=15,000,000, C=500,000):**
```
growthFactor = (1.07)^20 ≈ 3.8697
portfolioFV  = 15,000,000 × 3.8697 ≈ 58,044,878
contributionFV = 500,000 × ((3.8697 - 1) / 0.07)
              = 500,000 × 40.9955 ≈ 20,497,795
FV ≈ 78,542,673
```

---

## 8. THB Number Formatting Utility

```ts
// client/src/utils/formatCurrency.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

```ts
// client/src/utils/formatPercent.ts
export function formatPercent(value: number | null, decimalPlaces = 2): string {
  if (value === null) return '-';
  return `${value.toFixed(decimalPlaces)}%`;
}
```

---

## 9. Seed Script

```ts
// server/src/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const COST_FACTOR = 12;

async function main(): Promise<void> {
  const users = [
    { email: 'net@family.local', name: 'Net', password: process.env.SEED_PASSWORD_NET ?? 'ChangeMe001!' },
    { email: 'ann@family.local', name: 'Ann', password: process.env.SEED_PASSWORD_ANN ?? 'ChangeMe002!' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, COST_FACTOR);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash, name: u.name },
      create: { email: u.email, name: u.name, password: hash },
    });
    console.log(`Seeded user: ${u.email}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

Passwords can be overridden via `SEED_PASSWORD_NET` and `SEED_PASSWORD_ANN` env vars. Default passwords are deliberately weak and must be changed after first login.

---

## 10. Key Library Versions

| Library | Version |
|---------|---------|
| react | ^18.3.0 |
| react-dom | ^18.3.0 |
| react-router-dom | ^6.26.0 |
| @tanstack/react-query | ^5.56.0 |
| zustand | ^4.5.0 |
| axios | ^1.7.0 |
| react-hook-form | ^7.53.0 |
| zod | ^3.23.0 |
| recharts | ^2.12.0 |
| tailwindcss | ^3.4.0 |
| express | ^4.21.0 |
| jsonwebtoken | ^9.0.2 |
| bcrypt | ^5.1.1 |
| @prisma/client | ^5.20.0 |
| prisma | ^5.20.0 |
| express-rate-limit | ^7.4.0 |
| cookie-parser | ^1.4.7 |
| cors | ^2.8.5 |
| concurrently | ^8.2.0 |
| typescript | ^5.6.0 |
| tsx | ^4.19.0 (server dev runner) |
| vite | ^5.4.0 |

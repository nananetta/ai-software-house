# Product Scope — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft — awaiting CEO sign-off
**Authors:** PM / BA

---

## 1. Product Goal

Deliver a private, two-user web application that replaces a manual Google Sheets wealth-tracking workflow. The app allows each user to record point-in-time investment snapshots, compare portfolio growth across periods, understand asset allocation, and monitor progress toward a personal retirement target.

---

## 2. Target Users

| User | Identifier | Access |
|------|-----------|--------|
| User 1 (primary) | net@family.local | Full access to own data only |
| User 2 (spouse) | ann@family.local | Full access to own data only |

Users are provisioned via a seed script. No self-registration exists in v1. Each user's data is fully isolated — one user cannot read or write the other's records.

---

## 3. Problem Statement

The current workflow relies on a manually maintained Google Sheet updated once or twice per year. This creates the following pain points:

- No version control or audit trail between yearly tabs
- No automatic calculation of change vs prior period per investment line
- No visual representation of asset allocation or diversification
- No retirement readiness indicator
- No data privacy between two separate users sharing the same sheet
- High re-entry burden: all rows must be copied manually each year

Wealth Plus solves each of these by providing a structured, private, browser-based tracking system with built-in comparison, allocation charting, and a retirement projection widget.

---

## 4. Scope In — Feature List

### 4.1 Authentication
- Email + password login and logout
- JWT access token (short-lived) + refresh token (long-lived, httpOnly cookie)
- Change own password
- Two pre-seeded user accounts (no self-registration)
- All API responses filtered strictly by authenticated userId

### 4.2 Snapshot Management
- List all snapshots for the authenticated user, sorted newest first, showing: name, date, total balance, change vs prior, lock status
- Create a blank snapshot
- Create a snapshot by duplicating the most recent snapshot (primary workflow) — all line items copied with prior balances pre-filled
- Edit snapshot header: name, date, notes
- Lock snapshot (makes it read-only)
- Unlock snapshot (allows re-editing)
- Delete snapshot

### 4.3 Investment Ledger (per snapshot)
- Table view: Investment Type, Institution, Investment Name, Previous Balance (read-only), Current Balance (editable), Amount Change (auto), % Change (auto, color-coded), Note, Actions
- Add a new investment row
- Inline edit any field on an unlocked snapshot
- Delete a row
- Reorder rows (drag-and-drop or up/down controls)
- Sticky total row at bottom of table
- Searchable dropdowns for Investment Type and Institution, with free-text custom entry allowed

### 4.4 Comparison Engine
- Each item in the current snapshot is matched against the immediately prior snapshot (by date) using the triple key: investmentName + institution + investmentType (same userId implied)
- Display Previous Balance, Amount Change, and % Change per row
- Items with no prior match display Previous Balance as "-" and % Change labeled "New"
- Optional "Closed / Missing" section for items present in prior snapshot but absent in current

### 4.5 Dashboard
- Default view: latest snapshot summary, with snapshot selector for historical views
- Widgets: Total Net Worth (current + delta vs prior), Previous Snapshot Total, Allocation Pie Chart (by investment type, % and THB), Institution Bar Chart (total per institution), Recent Snapshots List (last 5), Retirement Goal Progress Bar
- Total wealth over time line chart (across all snapshots)

### 4.6 Retirement Goal Tracking
- Per-user settings: current age, retirement age, target retirement amount (THB), expected annual return (%), expected annual contribution (THB, optional)
- Dashboard outputs: % of target achieved, projected wealth at retirement age, gap remaining (THB), years remaining
- Projection uses future-value compound formula with optional annual contribution

### 4.7 Settings
- Financial settings page: all retirement goal inputs
- Account settings page: update profile name, change password

---

## 5. Scope Out — Deferred to Later Versions

| Feature | Reason |
|---------|--------|
| Mobile responsive polish | Deferred to Phase 4 / v2 |
| Export to CSV / PDF | v2 |
| Email yearly reminder | v2 |
| Combined household / consolidated view | v2 (open question) |
| Multi-currency FX conversion | v2 |
| File attachments per investment | v2 |
| Notification system | v2 |
| Automatic bank / broker sync | v3 |
| Import from CSV or Google Sheet | v2 |
| CAGR, best/worst asset class analytics | v2 |
| Rebalancing suggestions | v2 |
| Risk allocation score | v2 |
| AI yearly wealth summary | v3 |
| Retirement scenario simulation | v3 |
| Tax-aware tracking | v3 |
| Insurance, liabilities, full net worth view | v3 |
| Dark mode | Decided against (see §8) |
| Self-registration for new users | Out of scope for personal tool |

---

## 6. Open Questions

| # | Question | Options | Impact |
|---|----------|---------|--------|
| OQ-001 | Should both users be able to see each other's data? | No / Read-only view for spouse | Architecture: row-level policy change |
| OQ-002 | Should there be a combined household dashboard? | Yes / No / Later | New aggregate query layer needed |
| OQ-003 | What is the deployment environment for v1? | Localhost only (decided) / Future cloud | Affects HTTPS, secret management |
| OQ-004 | Should the app support multiple currencies with live FX? | Deferred to v2 | Requires FX API integration |
| OQ-005 | What backup strategy is required for the SQLite database? | Manual / automated cron | Ops concern for Phase 4 |

---

## 7. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R-001 | A locked snapshot is inadvertently edited through direct DB manipulation | Low | High | API enforces 403 on any write to locked snapshot; seed data flag clearly documented |
| R-002 | Comparison engine produces incorrect "previous balance" if snapshots are created out of date order | Medium | Medium | Comparison always resolves prior snapshot by `snapshotDate` descending, not `createdAt`; test with out-of-order dates |
| R-003 | User accidentally deletes a snapshot with no undo | Medium | High | Add a confirmation dialog; consider soft-delete in DB |
| R-004 | SQLite file corruption on a local machine | Low | High | Document backup script; consider periodic automated file copy |
| R-005 | Row duplication (same type + institution + name in one snapshot) causes ambiguous comparison | Low | Medium | Validation warning on duplicate row detected at save; BR-015 enforces this |
| R-006 | Retirement projection formula diverges from user expectation | Medium | Low | Document formula explicitly; show formula in UI tooltip |
| R-007 | Refresh token stored insecurely if cookie flags misconfigured | Low | High | Enforce httpOnly + Secure + SameSite=Strict on refresh token cookie |

---

## 8. Decided Constraints

| # | Decision |
|---|---------|
| D-001 | Default retirement target age: 60 |
| D-002 | Default retirement target amount: ฿30,000,000 |
| D-003 | No dark mode |
| D-004 | UI language: English |
| D-005 | All amounts default to Thai Baht (THB) |
| D-006 | Number formatting: comma separators (e.g., 1,500,000) |
| D-007 | Thai investment type labels preserved in UI alongside English context |
| D-008 | No cloud deployment for v1 — localhost only |

---

## 9. Success Criteria

- Both users can log in and access only their own data
- A yearly snapshot can be created by duplicating the prior one in under 2 minutes of actual data-entry time
- Comparison shows correct previous balance, amount change, and % change for every matched row
- Dashboard displays total net worth, allocation pie chart, and institution bar chart derived from the latest snapshot
- Retirement goal widget shows accurate projection based on user settings
- Locked snapshots reject all edit attempts with a 403 response
- App runs on localhost with `npm run dev` (or equivalent) without external cloud dependencies

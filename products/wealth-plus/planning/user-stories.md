# User Stories — Wealth Plus

**Document version:** 1.0
**Date:** 2026-04-16
**Status:** Draft — awaiting CEO sign-off
**Authors:** PM / BA

---

## Conventions

- Format: "As a [user], I want to [action] so that [value]."
- Acceptance criteria use the "Given / When / Then" pattern where helpful.
- All stories assume the user is authenticated unless the story is about authentication itself.
- "User" refers to either User 1 or User 2 acting on their own data.

---

## 1. Authentication

**US-001 — Login**
As a user, I want to log in with my email and password so that I can access my private portfolio data.

Acceptance criteria:
- Given valid credentials, the system issues a JWT access token and sets a refresh token httpOnly cookie, then redirects to /dashboard.
- Given invalid credentials, the system returns a 401 error and displays a generic "Invalid email or password" message without revealing which field is wrong.
- Given 10 or more failed login attempts within 15 minutes from the same IP, the system rate-limits further attempts and returns 429.

---

**US-002 — Logout**
As a user, I want to log out so that my session is ended and my data is protected on a shared device.

Acceptance criteria:
- Given the user clicks Logout, the access token is discarded client-side and the refresh token cookie is cleared server-side.
- After logout, navigating to any protected route redirects to /login.

---

**US-003 — Refresh session**
As a user, I want my session to be silently refreshed using a refresh token so that I am not logged out mid-session while the app is open.

Acceptance criteria:
- Given an expired access token and a valid refresh token cookie, the app transparently calls POST /api/auth/refresh and retries the original request.
- Given an expired or invalid refresh token, the user is redirected to /login.

---

**US-004 — Change password**
As a user, I want to change my password so that I can maintain the security of my account.

Acceptance criteria:
- Given the user provides their current password and a new password (min 8 characters), the system updates the bcrypt hash and invalidates any existing refresh tokens.
- Given the current password is incorrect, the system returns 403 and does not update the password.
- Given the new password is fewer than 8 characters, the system returns a validation error before attempting the update.

---

**US-005 — Data isolation**
As a user, I want my portfolio data to be completely hidden from the other account so that each person's finances remain private.

Acceptance criteria:
- Given User 1 is authenticated, any API request for snapshot IDs or item IDs belonging to User 2 returns 403.
- The snapshot list, dashboard, and all item queries are filtered by the authenticated userId at the database layer.

---

## 2. Snapshot Management

**US-006 — View snapshot list**
As a user, I want to see a list of all my snapshots sorted by newest first so that I can find and navigate to any historical record.

Acceptance criteria:
- Each row shows: snapshot name, snapshot date, total balance (THB), change vs prior snapshot (amount and %), and lock status.
- The list is sorted by snapshotDate descending.
- If no snapshots exist, an empty-state prompt is shown with a "Create your first snapshot" call to action.

---

**US-007 — Create a blank snapshot**
As a user, I want to create a new blank snapshot so that I can start entering investment data for a new period from scratch.

Acceptance criteria:
- Given the user selects "Create blank snapshot," they are prompted for snapshot name and date (both required).
- After saving, the snapshot is created with zero items and the user is redirected to the snapshot ledger page.

---

**US-008 — Duplicate previous snapshot (primary workflow)**
As a user, I want to create a new snapshot by duplicating the most recent one so that I do not need to re-enter all investment rows from scratch.

Acceptance criteria:
- Given the user selects "Duplicate previous snapshot," the system copies all items from the snapshot with the latest snapshotDate.
- Each copied item carries forward its investmentType, institution, investmentName, currency, note, and displayOrder.
- The currentBalance on each copied item is pre-filled with the value from the source snapshot (acting as the starting point for editing).
- The new snapshot starts unlocked.
- The user is redirected to the ledger of the new snapshot and can immediately update balances inline.

---

**US-009 — Edit snapshot header**
As a user, I want to edit the name, date, and notes of a snapshot so that I can correct mistakes or add context.

Acceptance criteria:
- Given the snapshot is unlocked, the user can update snapshotName, snapshotDate, and notes.
- Given the snapshot is locked, the edit header form is disabled and returns 403 if called directly.

---

**US-010 — Lock a snapshot**
As a user, I want to lock a snapshot after I have finished entering data so that I cannot accidentally modify historical records.

Acceptance criteria:
- Given the user clicks "Lock snapshot," isLocked is set to true.
- After locking, all edit controls (inline edits, add row, delete row, reorder) are hidden or disabled in the UI.
- Any direct API call to modify items on a locked snapshot returns 403.
- The snapshot list shows the lock status visually (e.g., padlock icon).

---

**US-011 — Unlock a snapshot**
As a user, I want to unlock a previously locked snapshot so that I can make corrections if needed.

Acceptance criteria:
- Given the user clicks "Unlock snapshot," isLocked is set to false.
- All edit controls become active again.
- No data is lost or reset when unlocking.

---

**US-012 — Delete a snapshot**
As a user, I want to delete a snapshot I no longer need so that I can keep my records clean.

Acceptance criteria:
- Given the user confirms the delete dialog, the snapshot and all its items are permanently removed.
- The snapshot list refreshes and the deleted snapshot no longer appears.
- If deleting the snapshot that was the "previous snapshot" for another, the comparison columns of the remaining snapshot gracefully show "-" for previous balance (no prior match).

---

## 3. Investment Ledger

**US-013 — View investment ledger**
As a user, I want to view all investment rows in a snapshot as a table so that I can review all positions at a glance.

Acceptance criteria:
- The table displays columns: Investment Type, Institution, Investment Name, Previous Balance, Current Balance, Amount Change, % Change, Note, Actions.
- Previous Balance is read-only and sourced from the comparison engine.
- Amount Change and % Change are computed automatically.
- A sticky total row at the bottom sums all Current Balance values.
- Positive Amount Change / % Change is displayed in green; negative in red; no prior match displays "-" and "New" in gray.

---

**US-014 — Add a new investment row**
As a user, I want to add a new investment row to an unlocked snapshot so that I can record a new position.

Acceptance criteria:
- Given the user clicks "Add investment," a new inline row appears with empty fields.
- The user selects or types an investmentType, selects or types an institution, enters an investmentName, and enters a currentBalance (≥ 0).
- On save, the row is persisted and immediately visible in the table.
- The new row is labeled "New" in the % Change column because it has no prior match.

---

**US-015 — Inline edit an investment row**
As a user, I want to edit any field of an investment row directly in the table so that I can update balances quickly without opening a separate form.

Acceptance criteria:
- Given the snapshot is unlocked, clicking any editable cell activates inline editing.
- Changes are saved automatically on blur or on pressing Enter.
- Amount Change and % Change update immediately after currentBalance is changed.
- Given the snapshot is locked, cells are not editable and clicking them has no effect.

---

**US-016 — Delete an investment row**
As a user, I want to delete an investment row from an unlocked snapshot so that I can remove investments I no longer hold.

Acceptance criteria:
- Given the user clicks the delete action for a row and confirms, the row is removed from the snapshot.
- The snapshot total updates immediately.
- Deleting a row does not affect any other snapshot.

---

**US-017 — Reorder investment rows**
As a user, I want to reorder investment rows so that I can organize the ledger in a way that makes sense to me.

Acceptance criteria:
- Given the snapshot is unlocked, the user can drag rows to a new position or use up/down arrow controls.
- The new displayOrder is persisted after reordering.
- Given the snapshot is locked, reorder controls are hidden.

---

**US-018 — Searchable investment type dropdown**
As a user, I want to pick an investment type from a searchable dropdown that includes the preset Thai investment categories so that I can categorize investments quickly and consistently.

Acceptance criteria:
- The dropdown lists all 10 preset investment types with their Thai labels.
- The user can type to filter the list.
- If the desired type is not in the list, the user can enter free text and it is accepted.

---

**US-019 — Searchable institution dropdown**
As a user, I want to pick an institution from a searchable dropdown with preset Thai banks and brokers so that I do not have to type common names repeatedly.

Acceptance criteria:
- The dropdown lists all 14 preset institutions.
- The user can type to filter the list.
- If the institution is not in the list, the user can enter free text and it is accepted.

---

## 4. Comparison with Previous Snapshot

**US-020 — View previous balance per investment**
As a user, I want to see the previous balance for each investment row so that I know what each position was worth at the last snapshot.

Acceptance criteria:
- For each row, the system finds the matching item in the immediately prior snapshot (by snapshotDate) using the key: same investmentName + institution + investmentType.
- The matched previousBalance is displayed as a read-only column.
- If no match is found, the column shows "-".

---

**US-021 — View amount change per investment**
As a user, I want to see the absolute change in balance for each investment so that I can tell how much each position gained or lost.

Acceptance criteria:
- amountChange = currentBalance - previousBalance.
- Displayed in green if positive, red if negative, gray if no prior match.
- If no prior match, the field shows "-".

---

**US-022 — View percentage change per investment**
As a user, I want to see the percentage change for each investment so that I can compare relative performance across positions of different sizes.

Acceptance criteria:
- percentChange = (amountChange / previousBalance) × 100, rounded to two decimal places.
- Displayed in green if positive, red if negative.
- If no prior match, the field shows "New" in gray.
- If previousBalance is 0 and currentBalance > 0, display "New" to avoid division by zero.

---

**US-023 — View closed or missing investments**
As a user, I want to see investments that appeared in the previous snapshot but are absent in the current snapshot so that I am aware of positions I may have forgotten to include.

Acceptance criteria:
- A collapsible "Closed / Missing" section appears below the main table when one or more items from the prior snapshot have no matching row in the current snapshot.
- Each missing item shows its name, type, institution, and the balance it had in the prior snapshot.
- This section is informational only — no edit actions are shown.

---

## 5. Dashboard

**US-024 — View total net worth on dashboard**
As a user, I want to see my total net worth from the latest snapshot on the dashboard so that I can immediately understand my current financial position.

Acceptance criteria:
- Total is the sum of all currentBalance values in the latest snapshot, displayed in THB with comma formatting.
- The widget also shows the absolute change and % change versus the prior snapshot total.
- Change is colored green (positive) or red (negative).

---

**US-025 — Select historical snapshot on dashboard**
As a user, I want to select a historical snapshot from a dropdown on the dashboard so that I can review the state of my portfolio at a past point in time.

Acceptance criteria:
- A snapshot selector dropdown lists all snapshots for the user, sorted newest first.
- Selecting a snapshot updates all dashboard widgets to reflect that snapshot's data.
- The default selection is always the latest snapshot on page load.

---

**US-026 — View allocation pie chart**
As a user, I want to see a pie chart of my portfolio broken down by investment type so that I can understand my asset allocation at a glance.

Acceptance criteria:
- Each slice represents one investment type present in the selected snapshot.
- Each slice shows the THB total and the percentage of the total portfolio.
- The chart uses the Thai investment type labels.
- Investment types with zero balance in the selected snapshot are excluded from the chart.

---

**US-027 — View institution bar chart**
As a user, I want to see a bar chart showing total balance per institution so that I can assess concentration risk across banks and brokers.

Acceptance criteria:
- Each bar represents one institution present in the selected snapshot.
- The bar height corresponds to the total currentBalance for all items at that institution.
- Bars are sorted by total balance descending.
- THB values are shown on the y-axis with comma formatting.

---

**US-028 — View total wealth over time line chart**
As a user, I want to see a line chart of my total portfolio value across all snapshots so that I can visualize long-term wealth growth.

Acceptance criteria:
- The x-axis shows snapshot dates in chronological order.
- The y-axis shows total portfolio value in THB.
- Each data point corresponds to one snapshot's total.
- At least two snapshots must exist for the line chart to render; otherwise, an explanatory empty state is shown.

---

**US-029 — View recent snapshots list on dashboard**
As a user, I want to see a list of my five most recent snapshots on the dashboard so that I can quickly navigate to any of them.

Acceptance criteria:
- The list shows the five most recent snapshots by snapshotDate.
- Each entry shows: snapshot name, date, total balance, lock status.
- Clicking an entry navigates to that snapshot's ledger page.

---

## 6. Retirement Goal Tracking

**US-030 — Configure retirement settings**
As a user, I want to enter my retirement settings (current age, retirement age, target amount, expected annual return, and optional annual contribution) so that the app can project my retirement readiness.

Acceptance criteria:
- The settings page presents a form with all five fields.
- currentAge and retirementAge are positive integers; retirementAge must be greater than currentAge.
- retirementTargetAmount must be > 0.
- expectedAnnualReturn must be > 0 and ≤ 100 (percent).
- expectedAnnualContribution is optional and must be ≥ 0 if provided.
- On save, settings are persisted to UserFinancialSettings for the authenticated user.

---

**US-031 — View retirement goal progress widget**
As a user, I want to see a progress widget on the dashboard showing how close I am to my retirement target so that I can track whether I am on track.

Acceptance criteria:
- The widget shows: current % of target achieved (currentPortfolioTotal / retirementTargetAmount × 100), projected portfolio value at retirement age (using the FV formula), gap remaining (retirementTargetAmount − currentPortfolioTotal), and years remaining (retirementAge − currentAge).
- If retirement settings have not been configured, the widget shows a prompt to configure them.
- The progress bar fills proportionally (capped at 100% visually if over-target).

---

**US-032 — View projected wealth at retirement**
As a user, I want to see the projected value of my portfolio at my target retirement age so that I can understand whether my current savings rate and return assumptions will meet my goal.

Acceptance criteria:
- Projected value uses the future value formula: FV = PV × (1 + r)^n + C × [((1 + r)^n − 1) / r], where PV = current portfolio total, r = expectedAnnualReturn / 100, n = years remaining, C = expectedAnnualContribution (0 if not set).
- When r = 0, formula simplifies to FV = PV + (C × n).
- The projected value is displayed in THB with comma formatting.
- A tooltip or footnote explains the formula and its assumptions.

---

**US-033 — View gap to retirement target**
As a user, I want to see exactly how much more wealth I need to accumulate to reach my retirement target so that I can plan additional contributions or investment changes.

Acceptance criteria:
- Gap = retirementTargetAmount − currentPortfolioTotal.
- If gap ≤ 0 (target already exceeded), the widget shows "Target reached" with the surplus amount.
- Gap is displayed in THB with comma formatting.

---

## 7. Settings & Account

**US-034 — Update profile name**
As a user, I want to update my display name so that the app addresses me correctly.

Acceptance criteria:
- The account settings page contains a name field pre-populated with the current value.
- On save, the name is updated and reflected in any UI greeting or profile display.

---

**US-035 — View and update financial settings**
As a user, I want to view and update my financial settings from a dedicated settings page so that I can adjust my retirement parameters over time.

Acceptance criteria:
- The financial settings page displays all current retirement settings (or empty fields if not yet set).
- On save, changes are persisted immediately.
- Validation errors (e.g., retirementAge ≤ currentAge) are shown inline without losing other field values.

---

**US-036 — Persist base currency preference**
As a user, I want the app to remember my base currency (default THB) in my financial settings so that all totals and projections are displayed consistently.

Acceptance criteria:
- baseCurrency is stored in UserFinancialSettings with a default of "THB".
- All monetary displays use the stored baseCurrency.
- In v1, only THB is supported; the field is present in the data model for future multi-currency support.

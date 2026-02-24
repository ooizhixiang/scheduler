# Product Requirements Document (PRD)
## Scheduling & Workforce Management Application

**Document Version:** 3.2
**Last Updated:** 2026-02-13
**Owner:** Product Team
**Status:** Draft — Structurally reviewed

### Executive Summary

A fully employer-configurable roster and scheduling platform — no hard-coded labor rules. Managers assign shifts via a visual paint-mode grid, track attendance, and approve all employee requests (leave, overtime, replacement leave, schedule changes) through a unified card-based inbox. V1 is a single-tenant web + mobile app for <100 employees, architected for future multi-tenant SaaS. Built with Next.js, React Native, NestJS, PostgreSQL, and Redis.

---

## 1. Overview

The Scheduling & Workforce Management Application is a table-based roster and scheduling platform that allows employers to manage company rosters, oversee employee schedules, assign custom roles, track attendance, manage leave requests, and handle overtime and public holiday replacement leave.

The system is fully employer-configurable — no hard-coded labor regulations. All rules, thresholds, leave policies, and overtime rates are defined by the employer to match their specific business needs.

### Core Design Principles

Seven principles govern every design decision:

1. **Employer-First Configuration** — Every rule has a default + override. The employer shapes the system to their business.
2. **Default + Override Pattern** — Smart defaults at every level, always overridable. Works at company, leave type, and individual employee level.
3. **Critical vs Configurable Notifications** — Approval decisions always notify via in-app + email (non-negotiable). Other notifications are configurable.
4. **Information Surface, Not Rule Engine** — The app warns, flags, highlights, and surfaces context — but never blocks the employer. Every conflict is a warning, not a wall.
5. **Smart Defaults, Transparent Math** — Auto-calculate the objective (OT hours, lateness offset). Surface the subjective (Should I approve this?). Always show the working.
6. **Consistent Request Pattern** — Every employee action follows: Submit → Card in employer feed → Approve/Reject/Modify → Notify. One pattern for leave, OT, replacement leave, and schedule changes.
7. **Employer Master Override** — The employer is above the rules. They can override locked rosters, expired leave, and any system restriction. Every override is logged with an audit trail.

### Deployment Model

- **V1:** Single-tenant deployment for one organization
- **Future:** Multi-tenant SaaS architecture supporting multiple organizations with isolated data, per-tenant configuration, and tenant-specific branding
- **Architecture Requirement:** Design with tenant isolation in mind from day one (tenant_id on all core tables, scoped queries) to minimize future refactoring

### Regulatory Context

The system does **not** enforce any specific labor regulations. All labor rules — overtime rates, leave entitlements, rest time requirements, holiday policies — are fully configurable by the employer. The system ships with sensible defaults that the employer reviews and adjusts during setup.

---

## 2. Goals & Objectives

### Primary Goals
- Provide a table-based roster grid for centralized schedule and workforce management
- Enable paint mode scheduling for fast, visual shift assignment
- Track attendance (lateness, early departures) directly on the roster grid
- Manage employee leave requests with employer approval
- Handle overtime claims with configurable rate tiers
- Manage public holiday replacement leave through a claim-based system
- Provide a unified card-based approval system for all employee requests
- Deliver a full-featured experience on both web and mobile platforms

### Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Scheduling time per week | Measured via time-tracking survey during 2-week pre-launch period | Reduce by 80% within 3 months | In-app session duration for scheduling tasks vs pre-launch survey |
| Approval response time | N/A (no system) | <24 hours average | System timestamp: request created → decision made |
| Employee schedule visibility | 0% (no system) | 100% employees can view own schedule within 1 month | Unique employee logins / total active employees |
| Leave & overtime record accuracy | Measured via manual audit of 50 random records during parallel-run period | <2% discrepancy rate | Monthly reconciliation: system records vs payroll output |
| Manager adoption rate | 0% | 90% active managers within 2 months | Managers with ≥1 scheduling action per week / total managers |

---

## 3. Non-Goals

The first version will not include:
- Payroll processing engine
- Recruitment or hiring management
- Performance management tools
- Advanced workforce forecasting using AI
- Biometric device integration
- Clock-in/clock-out system (attendance is manager-reported)
- Shift swap feature (handled via existing schedule change requests)
- Request escalation or delegation system
- General undo system (actions are final; confirmations prevent mistakes). Exception: approval swipe actions have a brief grace period before server commit — see Section 5.8.

---

## 4. Target Users

Four system roles — see Section 7 for full definitions and permissions matrix.

- **Super Admin / Employer** and **Admin** — Configure and operate the system
- **Manager** — Department-level supervisor, approves department requests
- **Employee** — Self-service schedule viewing and request submission

### Scale
- **Launch:** <100 employees, single organization
- **Design for:** Up to 500 employees per tenant, multiple tenants (future SaaS)

---

## 5. Core Features

### 5.1 Roster Grid & Schedule Management

The roster grid is the backbone of the application — the primary interface for viewing and managing all schedules.

**Grid Layout:**
- Rows = Time Slots (employer-configurable intervals: 30 min, 1 hour, 2 hours, etc.)
- Columns = Employees
- Grid opens filtered by default department/role; expandable to full company view
- Sticky headers — employee names stick to top, time slots stick to left when scrolling
- Week and month view navigation

**Paint Mode Scheduling:**
- Manager selects a role from a toolbar, cursor changes to a "paint brush"
- Click-drag across time slots for one or multiple employees to assign shifts instantly
- Right-click or eraser tool to remove assignments
- On mobile: tap-and-swipe gestures for painting

**Shift Properties:**
- Each shift defined by: Start Date + Start Time + End Date + End Time + Role
- Supports overnight shifts (e.g., Mon 10 PM → Tue 6 AM) — displayed on start date cell with moon icon; ghost cell on next day shows continued coverage
- Back-to-back shifts visually merge into one flowing block with subtle divider between roles; data remains as separate records

**Recurring Schedules:**
- On save, system asks: "How should this schedule repeat?"
  - One-time only
  - Recurring weekly (repeats every week until changed)
  - Custom repeat (repeat for X weeks)
- Employer can edit individual weeks: "this week only" override vs "this and all future weeks"
- Recurring schedules respect holiday calendar: configurable "Skip Closed holidays" toggle per recurring schedule

**Conflict Handling:**
- Soft conflict warnings — orange warning triangles on cells. Clicking shows the reason. Manager can override.
- Conflict counter badge in toolbar shows total unresolved warnings
- Conflicts detected: double booking, scheduling over approved leave, scheduling on Closed holidays
- System **never blocks** the employer — all conflicts are warnings, not restrictions

**Collaborative Editing:**
- **V1:** Optimistic concurrency control — when a manager saves changes, the server checks for conflicts with changes made since the roster was loaded. If a conflict exists, the manager is notified and shown the updated roster to re-apply their changes. Simple, no WebSocket required.
- **Post-V1:** Upgrade to real-time WebSocket sync where multiple managers see each other's changes live, with first-action-wins conflict resolution on simultaneous cell edits.

**Data Integrity:**
- Current day's roster is freely editable until midnight
- Past days auto-lock at midnight — read-only, no edits or deletions
- Employer/super admin has master override to unlock any past day with mandatory reason and audit trail

**Employee Schedule Changes:**
- Configurable toggle: "Allow employees to edit their own schedule"
- When enabled, employee-proposed changes appear as pending cards in the employer's approval feed
- No separate shift swap feature — employees submit individual schedule change requests; employer coordinates

### 5.2 Role Management

Roles are fully custom, employer-defined, and lightweight.

**Role Properties:**
- Name (e.g., "Cleaning", "Reception", "Security")
- Color (picked from palette)
- Icon (picked from icon library)
- Short code (auto-generated, editable — e.g., "CLN", "REC")

**Assignment Rules:**
- Open role assignment — any employee can be assigned any role. No qualification gates.
- Employees can hold multiple roles on their profile (capabilities)
- Each shift is assigned exactly ONE role (the cell shows that role's color + icon)
- Two roles in one day = two separate shift cells on the grid

**Role Deletion:**
- Force delete allowed — system warns about affected shifts, employer confirms
- Affected future shifts show as "Unassigned" with grey indicator
- Past shifts retain the deleted role name in history

### 5.3 Organization Structure

Three-layer organization system:

1. **Roles** (required) — What you do. Every employee has at least one. Used for scheduling and grid display.
2. **Departments** (optional) — Where you belong. Employees assigned to one department each. Grid filterable by department.
3. **Groups** (temporary) — What you're working on right now. Employer creates for special projects, adds employees from any department/role. Groups get their own filterable roster view — disposable by design: create, use, delete when the project ends.

Groups are a filter lens on the same data — they don't create separate scheduling silos.

**Unassigned Employee Fallback:**
- Employees without a department are visible only to Super Admin and Admin roles (not department-scoped Managers).
- Their requests (leave, OT, etc.) appear in the Super Admin / Admin approval feed.
- The system warns during onboarding if no department is assigned: "This employee will only be manageable by Super Admin and Admin until assigned to a department."

### 5.4 Leave Management

**Leave Types:**
- Preset defaults ship with the app: Annual Leave, Sick Leave, Emergency Leave, Unpaid Leave
- Employer can add, rename, remove, and configure leave types freely
- Replacement Leave (from public holiday work) is a system-managed type

**Leave Balance Management:**
- Per leave type, employer chooses balance model:
  - **Fixed** — Manually set X days per employee
  - **Accrual** — Configure rate (e.g., 1.5 days/month), system auto-accumulates
- Models can be mixed (Annual on accrual, Emergency as fixed 3 days)
- **Accrual mechanics:** Accrual runs as a scheduled background job on the 1st of each month at midnight. It credits the configured rate (e.g., 1.5 days) to each active employee's balance for that leave type.
  - Mid-month joiners receive their first accrual on the 1st of the following month (no partial-month proration).
  - Terminated employees stop accruing on deactivation date.
  - If the accrual job fails, it retries up to 3 times with exponential backoff; failure after retries triggers an alert to the Super Admin.
- Per employee, each leave type shows company default with toggle to custom amount
- Admin can manually adjust any individual employee's balance anytime with a note

**Leave Request Flow:**
1. Employee selects leave type → picks dates
2. System shows: remaining balance + team conflict preview (who else is on leave on those dates — visibility depends on employer settings)
3. Employee adds reason and submits
4. Request appears as a card in the employer's approval feed AND as a pending indicator on the roster grid
5. Employer can approve from either location (grid or inbox)
6. On approval/rejection, employee receives in-app notification + email

**Edge Cases:**
- **Zero balance:** Auto-converts to Unpaid Leave with a notification: "This will be submitted as Unpaid Leave." Employee confirms.
- **Half-day leave:** Employee submits a single "Half-Day Leave" request specifying the date and which half (AM/PM). The system auto-generates a linked pair: a leave request for the half-day + a schedule change request to shorten the shift. Both appear as a single linked card in the employer's approval feed with one approve/reject action that applies to both. This preserves the consistent request pattern (Principle 6) while reusing existing data structures.
- **Unscheduled leave:** Warning: "No shift scheduled for this date. Submit anyway?" Employer sees context on the approval card.
- **Duplicate/overlapping requests:** Both are accepted. Cards show a link indicator between related requests. Employer picks.
- **Competing requests:** Multiple employees requesting the same dates get warning badges. Employer sees both with context.
- **Leave-roster collision:** Warning when scheduling over approved leave AND when approving leave over an existing shift. Pending leave never affects the roster.

**Year-End Balance Reset:**
- Automatic hard reset at midnight on January 1st (or employer-configured fiscal year start)
- All leave balances reset to defaults — no carryforward
- System auto-snapshots balances for historical records before reset
- Employer gets summary notification
- Replacement leave is handled separately (see Section 5.7)
- One week before reset: system alerts about pending requests that span the reset
- One month before: year-end checklist card appears on dashboard

**Mid-Year Joiners:**
- Employer configures policy: "Full allocation" or "Prorated" for new employees
- Prorated auto-calculates based on remaining months in the year
- Admin can override per individual during onboarding

### 5.5 Attendance Tracking

Attendance is manager-reported — no clock-in/clock-out system.

**Lateness:**
- Manager right-clicks/long-presses a shift cell → "Mark Late"
- Enters: minutes late + optional note
- Cell gets a red dot indicator
- Data stored: minutes late, note, date, employee, linked shift

**Early Departure:**
- Same interaction pattern as lateness → "Mark Early Departure"
- Enters: time left + optional note
- Cell gets an orange dot indicator

**Unified Attendance Indicators:**
- Shift cells accumulate multiple indicators: red dot (late), orange dot (early departure), holiday flag, conflict warning triangle
- Tapping a cell reveals all annotations

**Multi-Layer Visibility:**
- Grid indicator on the shift cell (daily view)
- Employee profile tab with full lateness/departure history and notes
- Dashboard analytics with trends: "most late arrivals this month", "lateness by day of week", "total late minutes per employee"

### 5.6 Overtime Management

Overtime is employee-initiated and claim-based. No automatic OT detection.

**OT Claim Submission:**
- Employee submits: date, OT start time, OT end time, reason
- System auto-calculates total overtime hours from the time inputs
- Quick claim shortcut: employee taps their shift cell → "Claim Overtime" → pre-filled form with date and shift end time as OT start time. Employee enters end time and reason only.
- Unscheduled OT: if no shift exists for that date, the claim is accepted but flagged: "No scheduled shift found."

**OT Rate System:**
- Employer configures rate tiers in settings (e.g., "Normal Day: 1.5x", "Rest Day: 2.0x", "Holiday: 3.0x")
- When approving an OT claim, system suggests the matching tier rate
- Employer can override with any custom amount (different multiplier, flat figure, or zero)
- Full discretion — the system suggests, the employer decides

**Lateness-OT Auto-Offset:**
- When an employee submits OT for a day they were marked late, system auto-deducts late minutes from OT hours
- Displayed transparently: "OT claimed: 2h 00m. Late deduction: -30m. Net OT: 1h 30m."
- Employer can modify the net amount during approval

### 5.7 Public Holiday & Replacement Leave Management

**Holiday Calendar:**
- Employer manually adds holidays with: name, date, "repeats yearly" toggle
- Recurring holidays auto-populate each new year; one-off holidays stay in their year
- Full CRUD — add, edit, delete, change status anytime
- Each holiday has a status:
  - **Closed** — Business is shut. No shifts scheduled. Grid shows blocked column.
  - **Business as Usual** — Normal operations. Shifts on this day flagged for replacement leave eligibility.
  - **Optional** — Employer decides per employee/role.
- Each holiday has a separate property: **"Eligible for replacement leave: Yes/No"** — separates "is the business open?" from "does working earn replacement leave?"

**Worked-on-Holiday Detection:**
- Auto-flag: shifts assigned on public holiday dates automatically get a holiday indicator
- Manual mark: manager can also flag any shift as "worked on holiday" for edge cases (last-minute call-ins)
- Both paths lead to replacement leave eligibility

**Replacement Leave Claim Flow:**
1. System notifies employee: "You worked on [Holiday Name] — you may be eligible for replacement leave"
2. Employee taps "Claim Replacement Leave" → sees a list of eligible holidays worked but unclaimed
3. Employee selects which holiday → calendar appears → taps desired day off → submits
4. Claim card appears in employer's approval feed
5. Employer approves, rejects, or modifies

**Replacement Leave Expiry:**
- Employer sets default expiry period in settings (e.g., 3 months from earned date)
- When approving, expiry date is pre-filled but employer can change per claim
- System notifies employee when replacement leave approaches expiry
- Expired balance auto-removes with record kept

**Year-End Handling:**
- Replacement leave is excluded from the automatic hard reset
- Separate year-end review screen: employer sees all outstanding replacement leave cases
- Per case: Extend (push expiry into new year), Expire (remove), or Convert (pay out)
- Bulk actions available for efficiency

### 5.8 Unified Approval System

All employee-initiated actions flow through one consistent approval system.

**Request Types Handled:**
- Leave requests
- Overtime claims
- Replacement leave claims
- Schedule change requests

**Unified Approval Inbox:**
- Single page with filter tabs: "All (6)" / "Leave (3)" / "OT (2)" / "Holiday (1)"
- Each tab shows pending count as a badge
- Card-based feed — scrollable cards showing: employee avatar/name, request type (color-coded), key details, action buttons

**Approval Actions (Three-Action Model):**
- **Approve** — Accept as is
- **Reject** — Must include a reason (mandatory)
- **Modify + Approve** — Employer adjusts hours/dates/amount, then approves the modified version. Employee is notified of modifications.

**Mobile Interactions:**
- Swipe right to approve, swipe left to reject
- Tap card to expand for full details and modify option
- **Swipe grace period:** After a swipe action, the card shows a 5-second "Cancel" banner before the action is committed to the server. During this window, the request status has not changed and no notification is sent. This is not an undo — it is a delayed commit to prevent accidental swipes. After 5 seconds (or if the user taps "Confirm"), the action is final.

**Notifications:**
- New request → employer receives in-app + email with preview and deep link to the approval item
- Decision made → employee receives in-app + email with status and any notes
- These are critical notifications — always both channels, not configurable

**No Escalation:**
- Pending requests have no timeout. They queue until the employer acts.
- Badge counter shows accumulated items. If urgent, the employee contacts the employer directly.

### 5.9 Employee Self-Service

**Employee Home Screen:**
- Roster grid for the current week, scoped by the employer visibility setting:
  - Own schedule only
  - Team schedule
  - Full company grid
- Employee's own shifts are highlighted/emphasized
- Bottom navigation: Home / Requests / Notifications / Profile

**Requests Hub:**
- Action buttons: Request Leave, Claim Overtime, Claim Replacement Leave
- Below: history feed of all past requests with status badges (Pending/Approved/Rejected/Modified)

**Notification Feed:**
- Chronological timeline of all updates: approval decisions, shift changes, OT modifications
- Each notification links to the relevant item

**Welcome Screen:**
- First login only: "Welcome to [Company], [Name]! Your role: [Role]. Your first shift: [Date/Time]."
- Three quick-start cards: View Schedule, Make Request, Notifications

### 5.10 Employer Dashboard & Reporting

**Split Dashboard (Home Screen for Employer):**
- Top section: key statistics cards (today's headcount, pending approvals count, late arrivals this week, upcoming holidays)
- Below: today's roster grid
- Stats are compact; grid gets maximum screen space

**Weekly Summary (End-of-Week Report):**
- Auto-generated every week (configurable day — default: Sunday midnight)
- Table view showing every employee with: total shifts worked, total scheduled hours, overtime hours, late count
- Sortable by any column — quickly spot who worked the most/least
- Filterable by department, role, group
- Exportable as CSV or PDF for payroll handoff
- Employer receives a notification when the weekly summary is ready
- Historical weekly summaries archived and browsable by week

**Monthly Summary (End-of-Month Report):**
- Auto-generated on the 1st of each month (covering the previous month)
- Same table layout as weekly: total shifts, total hours, OT hours, late count, early departures, leave days taken — per employee
- Additional monthly-only fields: approved OT cost (based on rate tiers), leave balance snapshot, replacement leave used/remaining
- Month-over-month comparison column (e.g., "+12 hours vs last month")
- Exportable as CSV or PDF for payroll and accounting
- Employer receives a notification when the monthly summary is ready
- Historical monthly summaries archived and browsable by month

**Visual Analytics:**
- OT summary: total hours this month, breakdown by employee, bar chart comparison
- Lateness overview: total incidents, top offenders, trend line by week
- Leave usage: days taken vs remaining per employee, pie chart by leave type
- Weekly hours trend: line chart showing total team hours per week over time
- All filterable by date range, employee, role, department
- Live data — always current, no "generate report" button

**Search & Filters:**
- Global search bar on every screen — type employee name, instant results, jump to profile/schedule
- Contextual filters on every list/grid: filter by role, department, group, date range, status

---

## 6. Key User Stories

Stories that express user intent beyond what Section 5 covers:

- As a manager, I want to swipe right to approve and left to reject on mobile so I can clear my queue during a coffee break.
- As a manager, I want to modify an employee's OT claim before approving it so I don't have to reject and ask for resubmission.
- As an employee, I want to claim overtime by tapping my shift cell — pre-filled form, submit in 15 seconds.
- As an employee, I want a welcome screen on first login showing my role and first shift.
- As an admin, I want a guided setup wizard so I can configure the system in under 10 minutes.
- As an admin, I want to onboard a new employee in one continuous flow — details, roles, leave balance, done.

---

## 7. System Roles & Permissions

### Role Definitions

The system has four distinct roles. A user holds exactly one role.

1. **Super Admin / Employer** — The business owner or top-level operator. Full system access including master overrides, system-wide settings, and all employee data. Can also submit personal requests (leave, OT, replacement leave) if they are a working employee.
2. **Admin** — Trusted staff who handle day-to-day configuration: employee onboarding/offboarding, role management, leave type setup, holiday calendar. Cannot access master override or system-wide settings. Can submit personal requests.
3. **Manager** — Department-level supervisor. A Manager is any employee whose `employee_id` appears in the `manager_id` field of one or more Department records. Their permissions are scoped to employees within the departments they manage. Can submit personal requests.
4. **Employee** — Views their own schedule, submits leave/OT/replacement leave/schedule change requests, receives notifications.

In the sub-100 employee launch context, the Employer and Admin may be the same person — assign the Super Admin role. The Manager role exists to delegate departmental oversight without granting organization-wide access.

### Permissions Matrix

| Permission | Super Admin / Employer | Admin | Manager | Employee |
|------------|:----------------------:|:-----:|:-------:|:--------:|
| **System Configuration** | | | | |
| Manage all system settings | Yes | No | No | No |
| Master override (unlock past rosters, etc.) | Yes | No | No | No |
| **User Management** | | | | |
| Create/edit/deactivate/archive employees | Yes | Yes | No | No |
| Assign roles & departments | Yes | Yes | No | No |
| **Organization** | | | | |
| Create/edit departments & groups | Yes | Yes | No | No |
| **Scheduling** | | | | |
| Edit roster grid (paint mode) | Yes | Yes | Yes (own dept) | No |
| View roster grid | Yes | Yes | Yes (own dept) | Configurable |
| Mark late / early departure | Yes | Yes | Yes (own dept) | No |
| **Leave Management** | | | | |
| Configure leave types, balances, policies | Yes | Yes | No | No |
| Approve/reject/modify leave requests | Yes | Yes | Yes (own dept) | No |
| Submit leave requests | Yes | Yes | Yes | Yes |
| View leave balances | Yes | Yes (all) | Yes (own dept) | Own only |
| **Overtime** | | | | |
| Configure OT rate tiers | Yes | Yes | No | No |
| Approve/reject/modify OT claims | Yes | Yes | Yes (own dept) | No |
| Submit OT claims | Yes | Yes | Yes | Yes |
| **Public Holidays** | | | | |
| Manage holiday calendar & policies | Yes | Yes | No | No |
| Approve/reject replacement leave claims | Yes | Yes | Yes (own dept) | No |
| Submit replacement leave claims | Yes | Yes | Yes | Yes |
| **Reporting** | | | | |
| View analytics dashboard | Yes | Yes | Yes (own dept) | No |
| **Settings** | | | | |
| Configure visibility, notifications | Yes | Yes | No | No |
| Configure schedule self-edit toggle | Yes | Yes | No | No |

### Scope Rules
- **"Own dept"**: Manager can only access data for employees in departments they manage
- **"Own only"**: Employee can only view their own records
- **"Configurable"**: Employee schedule visibility (own only / team / full grid) set by employer
- A Manager can manage multiple departments if assigned
- An employee belongs to exactly one department at a time
- **Unassigned employees** (no department): Only visible to Super Admin and Admin. Their requests route to the Super Admin / Admin approval feed, not to any Manager.
- **Groups**: Any Super Admin, Admin, or Manager can create/manage groups. Group membership does not affect permissions — groups are a roster filter only. A Manager can filter the roster by a group but can only see/edit employees within their own department(s) in that filtered view.
- **Self-approval**: When a Super Admin, Admin, or Manager submits a personal request (leave, OT, etc.), the request routes to the next-higher role for approval. Super Admin requests are auto-flagged and require a second Super Admin or are self-approved with audit log entry.

---

## 8. Notifications

### Notification Tiers

**Critical (always in-app + email, not configurable):**

| Event | Recipients |
|-------|-----------|
| Leave/OT/replacement leave request submitted | Employer/Manager |
| Request approved/rejected/modified | Requesting employee |
| Shift assigned or changed | Affected employee |
| Schedule change request submitted | Employer/Manager |

**Non-Critical (in-app by default, configurable):**

| Event | Recipients |
|-------|-----------|
| Replacement leave approaching expiry | Employee |
| Year-end reset summary | Employer |
| Year-end checklist reminder | Employer |
| Offboarding cascade — shifts removed | Affected managers |

### Channels
- **In-app notifications:** Always on for all events
- **Email notifications:** Always on for critical events; configurable for non-critical

---

## 9. Admin Setup & Configuration

### First-Time Setup Wizard

Guided step-by-step setup in dependency order (each step depends on the previous):

1. **Employee Roles** — Create custom roles (name, color, icon, short code). Roles are needed before assigning employees.
2. **Leave Types** — Review pre-loaded defaults (Annual, Sick, Emergency, Unpaid). Add/rename/remove. Leave types must exist before setting balances.
3. **Default Leave Counts** — Set default days per leave type (pre-filled with sensible defaults). Depends on leave types from step 2.
4. **Holiday Calendar** — Add holidays with recurring toggle (defaults pre-populated if applicable).
5. **Employees** — Add employees (name, email, phone, department, roles, leave balances). Bulk CSV import option. Depends on roles (step 1) and leave types/counts (steps 2-3).

Each step has a progress bar. Steps are skippable and revisitable. Smart defaults mean the admin reviews and tweaks rather than builds from scratch. Setup target: under 10 minutes.

### Employee Onboarding Flow

"+" button → single continuous form:
1. Details — name, email, phone, department
2. Roles — pick from existing custom roles (multi-select for capabilities)
3. Leave Balance — per leave type, toggle: "Use default" or "Custom" with specific number
4. Save → employee appears on the roster grid, ready to be scheduled

### Employee Offboarding

"Offboard Employee" → system shows cascade preview:
- "This will cancel 2 pending leave requests, 1 approved future leave request, 1 pending OT claim, remove 8 future shifts"
- **Pending requests** are cancelled automatically
- **Approved-but-not-yet-taken leave** is cancelled and the balance is restored (shown in the cascade preview so the employer can see the impact)
- **Approved-but-not-yet-taken replacement leave** is listed for employer review (extend to payout, or expire)
- Notifications sent to affected managers about removed shifts
- Generates summary report (leave taken, leave cancelled with restored balance, OT claimed, lateness history, full shift history)
- Employee is deactivated (can't log in, removed from active roster) AND archived (historical data preserved)
- Archived Employees section: searchable, read-only, and reactivatable

### Settings Architecture

**Central Settings Page** with categorized tabs:
- Schedule (time intervals, recurrence defaults, self-edit toggle)
- Roles & Departments (manage roles, departments, groups)
- Leave (types, defaults, fixed/accrual models)
- Overtime (rate tiers, lateness offset toggle)
- Holidays (calendar, replacement leave expiry, eligibility)
- Employees (visibility settings, employment types, mid-year join policy)
- Notifications (channel settings)

**Plus:** contextual gear icons on relevant pages that deep-link to the right settings tab.

---

## 10. Technology Stack

### Recommended Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend (Web)** | Next.js 14+ (React) with TypeScript | Server-side rendering, API routes, strong ecosystem |
| **Frontend (Mobile)** | React Native with Expo | Cross-platform iOS/Android, code sharing with web |
| **Backend API** | NestJS (Node.js) with TypeScript | Structured framework, built-in auth/guards/validation |
| **Database** | PostgreSQL 16+ | Strong relational model, JSON support, row-level security |
| **ORM** | Prisma | Type-safe database access, migration management |
| **Authentication** | Email + password with JWT tokens | Simple auth for V1; admin creates accounts with temp passwords |
| **Real-Time (post-V1)** | WebSocket (Socket.io or native) | Real-time collaborative roster editing (V1 uses optimistic concurrency) |
| **Caching** | Redis | Session store, rate limiting, background job coordination |
| **Hosting** | AWS or DigitalOcean | Start simple, scale later |
| **CI/CD** | GitHub Actions | Automated testing, build, deploy pipeline |

### Architecture Principles
- REST API with OpenAPI/Swagger documentation
- All API endpoints scoped by tenant_id (prepared for multi-tenancy)
- Stateless API servers (session state in Redis)
- Database migrations managed via Prisma Migrate
- Environment-based configuration (no secrets in code)
- Optimistic concurrency control for V1 collaborative editing; WebSocket upgrade path for post-V1
- Background job scheduler for recurring schedule materialization and leave accrual

---

## 11. Data Model

### Entity Relationship Diagram (Textual)

```
Organization (future multi-tenancy)
 ├── Department (1:N)
 ├── Role (1:N — custom roles with color, icon, code)
 ├── Group (1:N — temporary project groups)
 │    └── GroupMember (M:N — employees in group)
 └── Employee (1:N)
      ├── EmployeeRole (M:N — employee capabilities)
      ├── RecurringScheduleTemplate (1:N — repeating schedule patterns)
      │    └── Schedule (1:N — materialized instances)
      ├── Schedule (1:N — individual shifts, standalone or from template)
      │    └── Role (N:1 — each shift has one role)
      ├── AttendanceRecord (1:N — lateness, early departure per shift)
      ├── LeaveRequest (1:N)
      ├── LeaveBalance (1:N — one per leave type per year)
      ├── OvertimeClaim (1:N)
      └── ReplacementLeaveClaim (1:N)

PublicHoliday (standalone — calendar entries with status)
LeaveType (standalone — employer-configurable, with accrual config)
OvertimeRateTier (standalone — employer-configurable)
Notification (1:N per employee — one row per channel per event)
AuditLog (append-only, references any entity)
CompanySettings (singleton per tenant)
```

### Core Entity Attributes

**Employee**
- id, tenant_id, employee_number, first_name, last_name, email, phone
- department_id (FK, nullable), employment_type (full_time/part_time)
- employment_start_date
- status (active/archived), archived_at (nullable), archive_summary (JSON, nullable)
- created_at, updated_at

**Role**
- id, tenant_id, name, color_code, icon_name, short_code
- created_at, updated_at

**EmployeeRole** (many-to-many — employee capabilities)
- id, employee_id (FK), role_id (FK)

**Department**
- id, tenant_id, name, manager_id (FK to Employee, nullable)
- created_at, updated_at

**Group**
- id, tenant_id, name, description, is_active (boolean)
- created_at, updated_at

**GroupMember**
- id, group_id (FK), employee_id (FK)

**RecurringScheduleTemplate**
- id, tenant_id, employee_id (FK), role_id (FK)
- start_time (time only), end_time (time only), day_of_week (0-6)
- recurrence_type (weekly/custom), recurrence_count (nullable — null = indefinite)
- skip_closed_holidays (boolean, default: true)
- effective_from (date), effective_until (date, nullable)
- status (active/paused/ended)
- created_by (FK), created_at, updated_at

**Schedule** (individual shift instances — standalone or materialized from template)
- id, tenant_id, employee_id (FK), role_id (FK)
- template_id (FK to RecurringScheduleTemplate, nullable — null = standalone one-off shift)
- is_override (boolean, default: false — true when "this week only" edit applied to a recurring instance)
- start_datetime, end_datetime
- is_holiday_flagged (boolean), is_manually_holiday_marked (boolean)
- status (scheduled/cancelled)
- created_by (FK), created_at, updated_at

*Recurring schedule logic:* A background job materializes Schedule rows from active templates 4 weeks ahead (configurable horizon). "Edit this week only" sets `is_override = true` on that instance. "Edit this and all future weeks" updates the template and regenerates future instances. Deleting a template cancels all future unmaterialized instances.

**AttendanceRecord**
- id, tenant_id, employee_id (FK), schedule_id (FK), date
- is_late (boolean), late_minutes (nullable), late_note (nullable)
- is_early_departure (boolean), departure_time (nullable), departure_note (nullable)
- marked_by (FK), created_at, updated_at

**LeaveType**
- id, tenant_id, name, is_preset (boolean), is_active (boolean)
- balance_model (fixed/accrual), default_days (nullable)
- accrual_rate_per_month (nullable — e.g., 1.5), accrual_cap (nullable — max days that can accrue per year)
- created_at, updated_at

**LeaveBalance**
- id, tenant_id, employee_id (FK), leave_type_id (FK), year
- entitled_days (for fixed model: the allocated amount; for accrual model: the accrued-to-date total)
- taken_days
- *balance* — derived virtual field, never stored. Calculated as: `entitled_days - taken_days`. Application layer computes this at query time.
- last_accrual_date (nullable — tracks when accrual last ran for this record; null for fixed model)
- is_custom (boolean — vs company default)
- created_at, updated_at

**LeaveRequest**
- id, tenant_id, employee_id (FK), leave_type_id (FK)
- start_date, end_date, total_days, reason
- status (pending/approved/rejected/modified), approved_by (FK, nullable)
- approved_at, rejection_reason (nullable), modification_note (nullable)
- original_values (JSON, nullable — stored if modified)
- created_at, updated_at

**OvertimeRateTier**
- id, tenant_id, name (e.g., "Normal Day", "Rest Day", "Holiday")
- rate_multiplier, sort_order
- created_at, updated_at

**OvertimeClaim**
- id, tenant_id, employee_id (FK), date, schedule_id (FK, nullable)
- ot_start_time, ot_end_time, claimed_hours (calculated)
- late_offset_minutes (nullable), net_hours (calculated)
- rate_tier_id (FK, nullable), custom_rate (nullable), reason
- status (pending/approved/rejected/modified), approved_by (FK, nullable)
- modification_note (nullable), original_values (JSON, nullable)
- created_at, updated_at

**PublicHoliday**
- id, tenant_id, name, date
- is_recurring (boolean), status (closed/business_as_usual/optional)
- is_replacement_eligible (boolean)
- created_at, updated_at

**ReplacementLeaveClaim**
- id, tenant_id, employee_id (FK), public_holiday_id (FK), schedule_id (FK)
- desired_leave_date, reason (nullable)
- expiry_date, status (pending/approved/rejected/used/expired)
- approved_by (FK, nullable), modification_note (nullable)
- created_at, updated_at

**Notification**
- id, tenant_id, employee_id (FK), event_id (UUID — shared across channels for the same event)
- type (enum), title, message
- reference_type, reference_id (polymorphic link)
- channel (in_app/email) — one row per channel. Critical events generate two rows (one in_app, one email) sharing the same event_id.
- is_read (boolean), read_at (nullable) — tracked independently per channel. Reading the in-app notification does not affect the email row.
- email_sent_at (nullable — populated when email is dispatched; null for in_app rows)
- created_at

**AuditLog**
- id, tenant_id, actor_id (FK to Employee), action (enum)
- entity_type, entity_id, changes (JSON — before/after)
- reason (nullable — for overrides)
- ip_address, created_at

**CompanySettings**
- id, tenant_id
- grid_interval_minutes (default: 60)
- employee_schedule_visibility (own_only/team/full_grid)
- employee_self_edit_enabled (boolean, default: false)
- replacement_leave_default_expiry_days (default: 90)
- mid_year_join_policy (full/prorated)
- fiscal_year_start_month (default: 1)
- fiscal_year_start_day (default: 1)
- created_at, updated_at

### Key Constraints
- Employee belongs to exactly one department at a time (nullable — can be unassigned; see Section 5.3 for unassigned fallback rules)
- LeaveBalance is unique per (employee_id, leave_type_id, year)
- Schedule entries should not overlap for the same employee (soft warning at app level, not hard DB constraint)
- Schedule.template_id links to RecurringScheduleTemplate; null means standalone one-off shift
- RecurringScheduleTemplate materializes Schedule rows via background job (4-week rolling horizon)
- AttendanceRecord is unique per (employee_id, schedule_id)
- Notification.event_id groups rows across channels for the same event; unique per (event_id, channel)
- AuditLog is append-only — no updates or deletes permitted
- Past Schedule records (before current date) are immutable at application level; override creates AuditLog entry

---

## 12. Security & Compliance

### Authentication
- Email + password authentication
- **Password storage:** Passwords hashed using bcrypt with a minimum cost factor of 12. Plaintext passwords are never stored or logged.
- Admin creates accounts; system sends invite email with temporary password
- Employee sets own password on first login
- Standard forgot password flow via email with time-limited token (1 hour expiry)
- Password policy: Minimum 8 characters, at least one uppercase, one number, one special character
- Account lockout: 5 failed attempts → 15-minute lockout

### Authorization
- Role-based access control (RBAC) as defined in Section 7
- All API endpoints enforce role + department scope checks
- Row-level filtering in database queries (never trust client-side filtering alone)
- Employer master override logged in AuditLog

### Data Protection
- Encryption at rest: AES-256 for database
- Encryption in transit: TLS 1.2+ for all connections (HTTPS enforced)
- PII fields (phone, email): encrypted at application level
- Database backups: daily automated, encrypted, retained for 30 days
- No employee data in application logs (IDs only)

### API Rate Limiting & Abuse Protection
- **Global rate limit:** 100 requests per minute per authenticated user (429 Too Many Requests on exceed)
- **Auth endpoints:** 10 requests per minute per IP (login, forgot password, token refresh)
- **Request submission endpoints** (leave, OT, replacement leave): 10 submissions per hour per user to prevent notification spam
- **WebSocket connections (post-V1):** Maximum 5 concurrent connections per user
- Rate limiting enforced at API gateway / middleware level using Redis-backed token bucket
- All rate limit violations logged for security monitoring

### Session Management
- JWT access tokens (15-minute expiry) with refresh tokens (7-day expiry)
- Refresh tokens revocable by admin (e.g., lost device)
- Concurrent session limit: configurable (default: 3 devices per user)

---

## 13. UX Requirements

### Platform Strategy
- Full web app (responsive, desktop-optimized) AND full native mobile app (iOS/Android)
- Identical feature sets on both platforms — same account, real-time sync
- Platform adapts UX to device, not feature set

### Roster Grid Adaptation
- **Desktop:** Full grid visible, paint mode with click-drag, hover tooltips
- **Tablet:** Scrollable grid, tap to assign, split-screen for approvals alongside roster
- **Mobile:** Two modes with explicit toggle:
  - **View mode (default):** Horizontal swipe to navigate between employees, vertical scroll for time slots. Tap a cell to view details.
  - **Edit mode:** Activated via "Edit" button in toolbar. Swipe navigation is disabled. Tap cells to assign/remove roles (single-tap assignment, not drag-painting). Tap "Done" to exit edit mode. This avoids gesture conflict between navigation and editing.

### Navigation
- **Employer (bottom nav):** Home (dashboard + grid) / Approvals / Employees / Menu (settings, holidays, reports)
- **Employee (bottom nav):** Home (grid) / Requests / Notifications / Profile

### Interaction Patterns
- Paint mode for shift assignment (click-drag desktop, tap-to-assign in mobile edit mode)
- Swipe actions on approval cards (right = approve, left = reject)
- Right-click/long-press on shift cells for attendance marking
- Mass edit mode: universal "select multiple, act on all" toggle with confirmation safety
- Confirmation dialogs for all destructive/bulk actions (no undo system — prevent rather than cure)

### Performance Targets
- Page load time: <2 seconds on 4G connection
- API response time: <500ms for standard operations
- Concurrent users: support 100 simultaneous users at launch
- Mobile app startup: <3 seconds cold start
- Roster concurrency check: <500ms conflict detection on save (V1); <500ms real-time propagation (post-V1)

---

## 14. Risks & Challenges

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Resistance to change from manual scheduling | High | Medium | Guided setup wizard, intuitive paint mode, phased rollout |
| Data accuracy during migration | High | Medium | CSV import with validation, parallel run period |
| Concurrent editing conflicts | Medium | Low (V1) | V1: Optimistic concurrency with conflict detection on save. Post-V1: WebSocket real-time sync |
| Grid performance at 50+ employees | Medium | Medium | Filtered default view, virtual scroll, sticky headers |
| Mobile grid usability | Medium | Medium | Dedicated mobile layout (day-list view), not just a shrunken desktop |
| Mobile app store approval delays | Medium | Low | Submit early, web app as fallback |

### Data Migration Plan
- **Source:** Determine the current system (spreadsheets, paper) during implementation kickoff
- **Approach:** CSV import tool for employee master data and leave balances
- **Validation:** Import into staging, reconciliation reports, employer sign-off
- **Parallel run:** Run old and new systems simultaneously for 1 pay period before cutover

---

## 15. Implementation Roadmap

### Phase 1: Foundation
1. Auth system (email + password, bcrypt hashing, invite flow, rate limiting)
2. Employee CRUD (add, edit, archive, deactivate, employment tags)
3. Role management (name, color, icon, short code)
4. Department & group management
5. Settings architecture (categorized tabs + contextual gear icons)
6. Notification infrastructure (in-app + email, dual-channel with event_id)
7. **Web responsive shell + mobile app shell** (navigation, auth screens, empty states — both platforms built in parallel from the start)

### Phase 2: Core Scheduling
8. Roster grid (time slots x employees, configurable intervals, filters)
9. Paint mode (select role, click-drag to assign on web; tap-to-assign on mobile edit mode)
10. Shift creation (start/end date+time, overnight support)
11. Recurring schedule templates + materialization job
12. Soft conflict warnings (orange triangles, never block)
13. Sticky headers, filtered default view, responsive adaptation
14. Visual merge for back-to-back shifts
15. Overnight shift indicators (moon icon + ghost cells)
16. Optimistic concurrency control for concurrent editing

### Phase 3: Leave Management + Approval System
*Approval system is built alongside its first request type so it can be validated end-to-end.*
17. Leave types (preset + custom, employer-configurable)
18. Leave balance system (fixed OR accrual, per type, with accrual job)
19. Context-aware leave requests (balance + team conflict preview)
20. **Unified approval inbox with filter counters** (built with leave as the first request type)
21. **Card-based approval feed + three-action approval** (approve/reject/modify)
22. **Swipe actions with grace period on cards** (mobile)
23. **Critical vs configurable notification tiers**
24. Dual approval interface (grid indicators + inbox)
25. Zero balance auto-convert to unpaid leave
26. Half-day leave linked request flow
27. Competing leave request flagging
28. Duplicate request tolerance
29. Unscheduled leave request warning

### Phase 4: Attendance Tracking
30. Mark Late (right-click/long-press, minutes + note)
31. Mark Early Departure (same pattern, orange indicator)
32. Unified attendance indicators on grid cells
33. Employee attendance history tab
34. Dashboard attendance trends

### Phase 5: Overtime
35. OT claim submission (start/end time, auto-calculate, reason) — flows into existing approval inbox
36. Quick OT claim from shift cell (pre-filled form)
37. Flexible rate tiers + custom override per claim
38. Lateness-OT auto-offset with transparent math
39. Unscheduled OT claim warning

### Phase 6: Public Holidays & Replacement Leave
40. Holiday calendar (manual + recurring, status + eligibility toggles)
41. Auto-flag shifts on holidays + manual mark
42. Claim-based replacement leave — flows into existing approval inbox
43. Eligible holiday list for employees
44. Flexible expiry (default + per-claim override)
45. Recurring shift holiday skip configuration

### Phase 7: Employee Self-Service
46. Employee home screen (scoped grid by visibility setting)
47. Requests hub (submit + history with status badges)
48. Notification feed (chronological timeline)
49. Welcome screen for new employees
50. Employee self-edit (configurable toggle, flows through approval)
51. Schedule change request cards — flows into existing approval inbox
52. Bottom navigation (both platforms)

### Phase 8: Admin Setup & Onboarding
53. Admin setup wizard (dependency-ordered: roles → leave types → defaults → holidays → employees)
54. Employee onboarding flow (details → roles → leave balance → save)
55. Offboarding cascade with preview, approved-future-leave handling, and manager notifications

### Phase 9: Employer Dashboard & Reporting
56. Split dashboard (stats cards + roster grid)
57. Weekly + monthly summary reports (auto-generated: shifts, hours, OT, lateness, leave per employee — exportable CSV/PDF)
58. Visual analytics (OT summary, lateness trends, leave usage, weekly hours trend)
59. Filterable by date range, employee, role, department
60. Global search + contextual filters

### Phase 10: Data Integrity & Edge Cases
61. Immutable past roster (auto-lock at midnight)
62. Employer master override with audit trail
63. Leave-roster dual warning with approval gate
64. Context-rich collision handling across features
65. Mass edit mode with confirmation safety
66. Unassigned employee fallback routing

### Phase 11: Year-End Processes
67. Automatic leave balance hard reset at fiscal year start
68. Replacement leave year-end review (extend/expire/convert)
69. Pending request year-end warning (one week before)
70. Year-end checklist on dashboard (one month before)
71. Configurable mid-year join policy (full/prorated)

---

## 16. Appendix

### Definitions
- **Tenant:** A single organization/company in a multi-tenant SaaS system
- **PII:** Personally Identifiable Information

---

**End of Document**

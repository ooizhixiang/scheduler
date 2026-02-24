---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: complete
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# SCHEDULER - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for SCHEDULER, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Owner/Manager can create shifts using drag-to-schedule (paint-mode)
FR2: Owner/Manager can assign employees and roles to shifts
FR3: System displays soft conflict warnings during scheduling (availability conflicts, overlapping shifts)
FR4: Owner/Manager can copy a schedule to recur in subsequent periods
FR5: Owner/Manager can share a completed schedule to the team
FR6: Owner can unpublish a schedule before the schedule period starts
FR7: Owner/Manager can amend a published schedule with diff preview
FR8: Owner/Manager can see which employees have viewed a shared schedule (viewed/pending status)
FR9: System nudges the owner when employees haven't viewed a schedule after 48 hours
FR10: Owner can send a reminder to individual employees who haven't viewed the schedule
FR11: Employees can set weekly recurring availability preferences, surfaced as soft warnings in the schedule builder
FR12: Employees can view their assigned schedule (current and upcoming weeks), including co-workers on the same shift
FR13: Employee can clock in with one tap, verified via GPS geofence
FR14: Employee can clock out with one tap
FR15: Manager can log and adjust clock events for their team (tagged with manager name, transparent to all parties)
FR16: System auto-clocks-out employees at shift end +1 hour, with warning notification at +15 minutes
FR17: System sends missing clock-in reminder at shift start +15 minutes
FR18: Employee receives clear feedback when GPS verification fails, with guidance on next steps
FR19: System auto-computes timesheets from clock events
FR20: System applies configurable break deductions to computed timesheets
FR21: Employee can view their own computed timesheet
FR22: Employee can view their clock-in/out event history with attribution tags
FR23: Owner/Manager can view team timesheets per employee and period
FR24: Owner/Manager can export timesheets as CSV
FR25: Employee can clock in for an unscheduled shift (ad hoc); flagged for manager review
FR26: Employee can request a day off (pick date, reason, optional note)
FR27: Manager/Owner can approve or reject a day off request with reason
FR28: Manager sees coverage impact before approving a day off request
FR29: Approved days display as "Day Off" on the schedule (shift not removed)
FR30: System tracks leave balance per employee
FR31: Approval actions include 5-second undo toast to prevent accidental actions
FR32: System sends approval nudge when a leave request is pending more than 24 hours
FR33: Pending approvals escalate to Super Admin after 48 hours with no manager action (configurable)
FR34: Manager/Owner can view and act on pending approvals in a unified card-based feed
FR35: Super Admin can invite employees by email
FR36: Invited employees can view their schedule via read-only preview link without creating an account
FR37: Invited employees can create their account (set password) via invite link
FR38: Super Admin can edit employee profiles
FR39: Super Admin can archive an employee (revokes access immediately; prevents archiving last Super Admin)
FR40: Super Admin can reactivate an archived employee
FR41: Super Admin can create, edit, and delete roles (name, color, icon, short code)
FR42: Super Admin can assign roles to employees
FR43: Super Admin can create, edit, and delete departments (deletion sets employees to unassigned)
FR44: Super Admin can assign a manager to a department
FR45: Owner/Manager can create and manage groups with batch member assignment
FR46: Owner/Manager can view employee invite status (Invited / Active)
FR47: Super Admin can create and manage work locations (name, address, geofence radius)
FR48: Super Admin can resend an expired employee invitation
FR49: Employees are notified when a schedule is shared
FR50: Schedule amendments trigger notification chain: manager first, then affected employees with diff
FR51: Employee is notified of day off decision (approval with confirmation, rejection with reason)
FR52: Manager is notified when a new team member creates their account
FR53: Owner/Manager receives push notification when multiple employees are missing at shift start
FR54: Owner/Manager receives notification when all scheduled employees have clocked in
FR55: All critical notifications are delivered via dual channel (in-app and email)
FR56: Owner/Manager can view team attendance status (On Time / Late / Missing)
FR57: Manager's dashboard view is scoped to their assigned department
FR58: Dashboard auto-refreshes via polling
FR59: Owner/Manager can drill down from status overview to individual employee detail
FR60: Users can log in with email and password
FR61: Users can reset their password via email link
FR62: Invited employees can set their initial password via invite link
FR63: System enforces role-based access control (Super Admin, Manager, Employee)
FR64: Super Admin can revoke an employee's active session
FR65: System maintains an append-only audit log of all data modifications (Super Admin access only)
FR66: Owner can create a new business account and complete guided setup
FR67: Super Admin can configure scheduling cadence (weekly, bi-weekly, custom)
FR68: Super Admin can configure break deduction rules per shift length
FR69: Super Admin can set the owner's usual publish day (displayed to employees)
FR70: Employee can view their pending and past day off requests with current status

### NonFunctional Requirements

NFR1: Audit log entries are immutable — no modification or deletion mechanism exists
NFR2: Archived employee profiles retained 12 months, then deleted; clock events/timesheets anonymized
NFR3: All PII encrypted at rest in the database
NFR4: Database backups 30-day rolling retention; PII may persist in backups until expiry
NFR5: RPO: Maximum 1 hour of data loss via continuous archiving with PITR
NFR6: RTO: 4 hours business hours, 8 hours overnight
NFR7: Backup restoration tested before V1 launch and quarterly thereafter
NFR8: Health endpoint returning service status, DB connectivity
NFR9: Uptime monitoring at 1-minute intervals; alert within 2 minutes of downtime
NFR10: Error tracking with stack trace, user context (role, tenant), no PII in error logs
NFR11: Structured logging on all API requests (timestamp, method, path, status, duration, userId, tenantId)
NFR12: Alert thresholds — error rate >5% over 5 min; p95 >3s over 5 min; DB pool exhaustion
NFR13: Background job heartbeat every 5 min; alert if missed for 15 min
NFR14: GPS verification success rate tracked per location per 7-day window; alert below 85%
NFR15: 200+ employees per tenant with <10% response time increase
NFR16: 100 concurrent tenants without cross-tenant performance impact
NFR17: <3s GPS clock-in under 10x burst load (validated via load test before launch)
NFR18: No single DB query >100ms at target scale (100 tenants, 2,000 employees)
NFR19: Employee-facing pages <200KB JS; total page <500KB
NFR20: Notification emails within 5 minutes; 500 emails/min burst; backlog alerts
NFR21: No planned deploys during 7-10am peak hours per tenant timezone
NFR22: Application continues with degraded functionality when Redis unavailable
NFR23: Email retry with exponential backoff (3 attempts/15 min); failed emails visible to Super Admin
NFR24: Preview links expire after 30 days, revokable, UUID v4 tokens
NFR25: Clock-in/out rate limited: 1 per 60 seconds per user per action
NFR26: Duplicate notification suppression within 15-minute cooldown window
NFR27: Max 3 concurrent sessions per user; fourth invalidates oldest
NFR28: Preview link access logged; alert at >10 unique IPs in 24h
NFR29: Timesheet validation pass (hours can't exceed shift, negative hours flagged, blocks export until reviewed)
NFR30: Audit log archived after 12 months to cold storage (queryable on request)
NFR31: Clock-in/out is the only offline-capable feature (localStorage retry queue)
NFR32: All non-clock operations require network connection
NFR33: Clear offline indicator for non-clock operations
NFR34: localStorage write verification before queuing; clear failure indicator if unavailable
NFR35: Dashboard displays last-updated timestamp on all polled data
NFR36: Stale-data indicator when data age exceeds 60 seconds
NFR37: Unambiguous date/time format with AM/PM; timezone per location
NFR38: Application UI and all user-facing content English-only

### Additional Requirements

**From Architecture:**

- AR1: Greenfield monorepo using pnpm workspaces + Turborepo with NestJS 11, Next.js 16, Prisma 7, PostgreSQL 16, Vitest
- AR2: Specific initialization sequence: pnpm init → nest new → create-next-app → shadcn init → prisma init → shared packages → wire configs
- AR3: Single VPS deployment (2 vCPU/4GB RAM) with Nginx reverse proxy; PM2 fork mode (cluster prohibited until distributed locking)
- AR4: JWT RS256 authentication with refresh token rotation; reused-token detection invalidates ALL sessions
- AR5: Custom JwtAuthGuard (no Passport.js); direct JWT verification
- AR6: Prisma Client Extensions for tenant_id auto-injection on every query
- AR7: Database-backed EmailJob queue with 10-second processing interval and Handlebars templates
- AR8: FileService abstraction: local filesystem in V1, cloud migration path for Growth phase
- AR9: Two-mode database seeding: minimal (Super Admin + settings) for all environments; development seed extends with sample data
- AR10: API response format standardization: direct objects for single entities, paginated/cursor-based for lists
- AR11: Dual base URL pattern: INTERNAL_API_URL for server components, NEXT_PUBLIC_API_URL for browser
- AR12: 12-15 NestJS modules following CRUD/Service/Utility archetypes
- AR13: Integration tests required for: auth, RBAC, clock-in, timesheets, tenant isolation
- AR14: Docker Compose for local dev (PostgreSQL 16 + Mailpit); Homebrew fallback path
- AR15: Pre-commit hooks via Husky + lint-staged (ESLint + Prettier on staged files)
- AR16: @nestjs/config with Zod env validation (fail-fast on startup)
- AR17: Swagger docs at /api/docs in development only
- AR18: Notification duplicate suppression (15-min window) + amendment coalescing (30-min window per employee)
- AR19: Clock-in timestamp tolerance check on replayed offline events; server records received_at
- AR20: Preview page: signed JWT tokens (purpose: preview, 7-day expiry), pure server component, zero JS
- AR21: CORS origin = exact frontend URL from env variable, no wildcard
- AR22: File upload security: MIME validation via magic bytes, sharp re-encode, 5MB limit, served via authenticated endpoint
- AR23: Computed timesheets snapshot break deduction rules at schedule publish time
- AR24: Background jobs in-process (no separate worker); four job types with different intervals
- AR25: React Hook Form + Zod resolver for all forms; shared-validators as single source of truth

**From UX Design Specification:**

- UX1: Mobile-first for employee pages; desktop-first for builder. Builder available at ≥768px (touch), full at ≥1024px (drag)
- UX2: Role color system with 3-channel identification (color + 2-letter short code + icon); WCAG AA contrast
- UX3: Shift card visual grammar: 8 states (Upcoming, Clock-In Available, In Progress, Completed, 86'd/Absent, Changed, Pending Sync, Sync Failed)
- UX4: 5 rendering contexts for shift data: grid cell, primary card, status row, list item, timesheet line
- UX5: Dual-view schedule builder: "By Person" (interactive, drag) + "By Day" (read-only V1, timetable with continuous blocks)
- UX6: QuickScheduleEdit: mobile (<768px) fallback for schedule changes (day list → shift list → form); not full creation
- UX7: StatusBoard: adaptive layout (<8 = single list, 8+ = three columns: On Time / Late / Missing); 30-second polling
- UX8: SituationCard: manager drill-down from StatusRow with actions (Call, Text, Log Manual Clock-In, Request Cover, Emergency Cover)
- UX9: PrimaryShiftCard: full-width with clock-in CTA at fixed bottom position, offline queue, sync status indicator
- UX10: CoverageImpactPanel: decision support for day-off approvals showing coverage ratio and available employees
- UX11: NotificationFeedItem: informational (auto-clear 48h) + actionable (persist until resolved); swipe-to-reveal on mobile
- UX12: DiffPreview: mandatory amendment review before publishing changes; per-employee change list
- UX13: Toast two-lane system: actionable lane (bottom, persist) + informational lane (upper, 5-second); max 2 visible
- UX14: Four-tier action hierarchy: Primary (coral filled) / Secondary (outlined) / Tertiary (text-only) / Ghost (contextual)
- UX15: Plus Jakarta Sans typography; semantic color tokens with dark mode (prefers-color-scheme); 4px spacing grid
- UX16: Skeleton loading after 100ms delay; dimensions match rendered content (CLS < 0.1)
- UX17: Keyboard shortcuts for builder: Ctrl+Z/Y (undo/redo), Delete, Ctrl+S, Enter, Escape
- UX18: WCAG 2.1 AA: 4.5:1 contrast, 44px touch targets (56px for primary CTA), reduced motion, screen reader support
- UX19: Performance budgets: employee home <100KB, consumption routes <150KB, builder <250KB (gzipped JS)
- UX20: Empty states formula: [What's missing] + [What will appear] + [CTA]. "Nothing here yet" forbidden.
- UX21: Zustand store for schedule builder with undo/redo history stack; persist to localStorage for draft recovery
- UX22: @dnd-kit for drag-and-drop with custom grid collision detection (desktop only, ~15KB)
- UX23: Responsive breakpoints: mobile (<640), tablet (640-1023), desktop (1024-1279), wide (≥1280)
- UX24: Sheets: right on desktop (480px max), bottom on mobile (85% max height); unsaved form data protection
- UX25: Business setup wizard ends at employee invitations; guides to "Build your first schedule"

### FR Coverage Map

| FR | Description | Epic |
|----|-------------|------|
| FR1 | Paint-mode drag-to-schedule | Epic 3 |
| FR2 | Assign employees and roles to shifts | Epic 3 |
| FR3 | Soft conflict warnings during scheduling | Epic 3 |
| FR4 | Copy schedule to recur | Epic 4 |
| FR5 | Share schedule to team (publish) | Epic 4 |
| FR6 | Unpublish schedule before period starts | Epic 4 |
| FR7 | Amend published schedule with diff preview | Epic 4 |
| FR8 | Viewed/pending status on shared schedule | Epic 4 |
| FR9 | Nudge owner when employees haven't viewed (48h) | Epic 4 |
| FR10 | Send reminder to individual unviewed employees | Epic 4 |
| FR11 | Weekly recurring availability preferences | Epic 5 |
| FR12 | Employee views assigned schedule + co-workers | Epic 5 |
| FR13 | One-tap clock-in with GPS geofence | Epic 6 |
| FR14 | One-tap clock-out | Epic 6 |
| FR15 | Manager logs/adjusts clock events | Epic 7 |
| FR16 | Auto-clock-out at shift end +1h, warning at +15m | Epic 7 |
| FR17 | Missing clock-in reminder at shift start +15m | Epic 7 |
| FR18 | Clear GPS failure feedback with guidance | Epic 6 |
| FR19 | Auto-compute timesheets from clock events | Epic 8 |
| FR20 | Configurable break deductions | Epic 8 |
| FR21 | Employee views own timesheet | Epic 8 |
| FR22 | Employee views clock event history with tags | Epic 8 |
| FR23 | Owner/Manager views team timesheets | Epic 8 |
| FR24 | Export timesheets as CSV | Epic 8 |
| FR25 | Ad hoc clock-in (unscheduled shift) | Epic 6 |
| FR26 | Employee requests day off | Epic 9 |
| FR27 | Manager approves/rejects day off with reason | Epic 9 |
| FR28 | Coverage impact before approval | Epic 9 |
| FR29 | Approved day off displays on schedule | Epic 9 |
| FR30 | Leave balance tracking per employee | Epic 9 |
| FR31 | 5-second undo toast on approval actions | Epic 9 |
| FR32 | Approval nudge at pending 24h | Epic 9 |
| FR33 | Escalate to Super Admin at pending 48h | Epic 9 |
| FR34 | Unified card-based approval feed | Epic 9 |
| FR35 | Invite employees by email | Epic 2 |
| FR36 | Read-only preview link for invitees | Epic 5 |
| FR37 | Account creation via invite link | Epic 2 |
| FR38 | Edit employee profiles | Epic 2 |
| FR39 | Archive employee (prevent last Super Admin) | Epic 2 |
| FR40 | Reactivate archived employee | Epic 2 |
| FR41 | Create/edit/delete roles | Epic 2 |
| FR42 | Assign roles to employees | Epic 2 |
| FR43 | Create/edit/delete departments | Epic 2 |
| FR44 | Assign manager to department | Epic 2 |
| FR45 | Create/manage groups with batch assignment | Epic 2 |
| FR46 | View employee invite status | Epic 2 |
| FR47 | Create/manage work locations + geofence | Epic 2 |
| FR48 | Resend expired invitation | Epic 2 |
| FR49 | Notify employees when schedule shared | Epic 4 |
| FR50 | Amendment notification chain | Epic 4 |
| FR51 | Notify employee of day off decision | Epic 9 |
| FR52 | Notify manager when new team member joins | Epic 10 |
| FR53 | Push notification for multiple missing employees | Epic 10 |
| FR54 | Notification when all employees clocked in | Epic 10 |
| FR55 | Dual-channel critical notifications | Epic 4 |
| FR56 | Team attendance status view | Epic 7 |
| FR57 | Manager dashboard scoped to department | Epic 7 |
| FR58 | Dashboard auto-refresh via polling | Epic 7 |
| FR59 | Drill down from status to employee detail | Epic 7 |
| FR60 | Login with email and password | Epic 1 |
| FR61 | Password reset via email | Epic 1 |
| FR62 | Set initial password via invite link | Epic 2 |
| FR63 | Role-based access control | Epic 1 |
| FR64 | Revoke active session | Epic 1 |
| FR65 | Append-only audit log | Epic 1 |
| FR66 | Business setup wizard | Epic 1 |
| FR67 | Configure scheduling cadence | Epic 1 |
| FR68 | Configure break deduction rules | Epic 1 |
| FR69 | Set usual publish day | Epic 1 |
| FR70 | Employee views pending/past day off requests | Epic 9 |

**All 70 FRs covered. Zero gaps.**

## Epic List

### Epic 1: Account & Business Setup
Owner can create a business, configure settings, manage authentication and access, and monitor system changes via audit log.
**FRs covered:** FR60, FR61, FR63, FR64, FR65, FR66, FR67, FR68, FR69
**Notes:**
- FR62 moved to Epic 2 to consolidate the employee invite/onboarding journey.
- **War Room Rec #1:** Split auth infrastructure (JWT, guards, tenant, seeding) from wizard UX (FR66/UX25) into separate stories — infrastructure first.
- **War Room Rec #6:** FR65 (audit log) should be the LAST story in this epic — it has zero user-facing value for the schedule builder workflow and shouldn't delay time-to-first-schedule.

### Epic 2: Team Management
Owner can build and manage their workforce — invite employees (including account creation via invite), define roles, create departments and groups, set up work locations.
**FRs covered:** FR35, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR48, FR62
**Note:** FR62 (set initial password via invite) consolidated here with FR37 (create account via invite) — same user journey. FR36 (preview link) moved to Epic 5 as an employee-facing access feature.

### Epic 3: Schedule Building
Owner/Manager can create weekly schedules with drag-to-schedule paint-mode, assign roles and locations, and see availability conflicts (consuming data from Epic 5).
**FRs covered:** FR1, FR2, FR3
**Notes:**
- Despite only 3 FRs, this is the most UX-complex epic — covers UX5 (dual-view builder), UX17 (keyboard shortcuts), UX21 (Zustand undo/redo), UX22 (@dnd-kit drag-and-drop), UX24 (sheet panels).
- FR11 (availability) moved to Epic 5 as employee self-service. FR4 (copy schedule) in Epic 4 as schedule management.
- **War Room Rec #2:** Plan for 6-8 stories despite only 3 FRs. The UX complexity (grid, drag-and-drop, paint mode, dual view, undo/redo, keyboard shortcuts, conflict visualization, sheet panels) drives story count far beyond FR count.

### Epic 4: Schedule Publishing & Communication
Owner/Manager can copy, publish, and amend schedules, track employee views, send reminders, and communicate changes with diff preview. Establishes dual-channel notification infrastructure.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR49, FR50, FR55
**Notes:**
- FR4 (copy schedule) is a schedule management action. FR55 (dual-channel notifications) established here as the first notification-heavy epic — infrastructure reused by Epics 7, 9, 10.
- **War Room Rec #3:** FR7 (amend published schedule with diff preview) is high-complexity — plan for 2-3 stories covering diff engine, preview UI, and notification chain separately.
- **War Room Rec #5:** FR55 (dual-channel notification infrastructure) should be the FIRST story in this epic — it unblocks all other notification-sending stories in this and later epics.

### Epic 5: Employee Schedule & Availability
Employees set weekly availability preferences, view their assigned schedule with co-workers, and invitees access schedules via preview link without creating an account.
**FRs covered:** FR11, FR12, FR36
**Notes:**
- FR11 (availability) is employee self-service — setting preferences is separate from the builder consuming them (Epic 3/FR3).
- User flow continuity: Epic 5 (view schedule) → Epic 6 (clock in) represents the employee's daily experience.
- **War Room Rec #4:** Build the PrimaryShiftCard (UX9) with FULL visual structure including clock-in CTA area, but disable/hide clock-in button until Epic 6 is implemented. Design for the complete employee experience, implement incrementally.

### Epic 6: Clock-In & Clock-Out
Employees record attendance with one tap, verified by GPS geofence, with offline support, clear GPS feedback, and ad hoc clock-in for unscheduled shifts.
**FRs covered:** FR13, FR14, FR18, FR25

### Epic 7: Attendance Monitoring & Management
Managers view real-time team attendance, drill down to employee details, log manual clock events, and system automates clock-out reminders and missing alerts.
**FRs covered:** FR15, FR16, FR17, FR56, FR57, FR58, FR59

### Epic 8: Timesheets & Payroll Export
System auto-computes timesheets from clock events with break deductions. Employees and managers view hours. Owners export CSV for payroll.
**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24

### Epic 9: Leave Management
Complete day-off lifecycle — employees request in 3 taps, managers approve with coverage context, system tracks balances and automates nudges.
**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR51, FR70

### Epic 10: Proactive Notifications
Managers receive contextual push notifications for team events — new joiners, missing employees, all-clear signals. Leverages dual-channel infrastructure from Epic 4.
**FRs covered:** FR52, FR53, FR54
**Note:** FR55 (dual-channel delivery) moved to Epic 4 where notification infrastructure is first established. This epic focuses on proactive/contextual notification triggers only.

---

## Dependency Graph

```
Epic 1 (Account & Business Setup)
  └── Epic 2 (Team Management) ← needs auth + invite flow (FR62)
       ├── Epic 5 (Employee Schedule & Availability) ← needs employees (availability + preview)
       └── Epic 3 (Schedule Building) ← needs employees, roles, locations; consumes Epic 5 availability
            ├── Epic 4 (Publishing & Communication) ← needs schedules; establishes notification infra (FR55)
            │    └── Epic 5 also needs published schedules for employee view
            ├── Epic 6 (Clock-In & Clock-Out) ← needs shifts + locations
            │    ├── Epic 7 (Attendance Monitoring) ← needs clock events
            │    └── Epic 8 (Timesheets) ← needs clock events
            └── Epic 9 (Leave Management) ← needs schedule for coverage; uses notification infra from Epic 4
Epic 10 (Proactive Notifications) ← enhances Epics 6, 7; uses notification infra from Epic 4
```

**Key dependency notes:**
- Epic 5 has a dual dependency: availability (needs Epic 2), schedule view (needs Epic 4). Availability can be built first.
- Epic 5 → Epic 6 represents the employee daily flow continuity (view schedule → clock in).
- Each epic is standalone — Epic 3 works without Epic 4, Epic 6 works without Epic 7/8.

---

## Epic 1: Account & Business Setup — Stories

### Story 1.1: Auth Infrastructure & Tenant Bootstrap

As a **developer**,
I want the authentication infrastructure, tenant model, and database seeding in place,
So that all subsequent features have a secure, tenant-scoped foundation.

**Acceptance Criteria:**

**Given** the API application starts up
**When** environment variables are loaded
**Then** Zod validation runs against all required env vars (AR16) and the app fails fast with clear errors if any are missing

**Given** the Prisma schema is migrated
**When** the database is ready
**Then** Employee, Tenant, RefreshToken, and Settings tables exist with tenant_id on all tenant-scoped tables

**Given** Prisma Client Extensions are configured (AR6)
**When** any database query executes within an authenticated request
**Then** tenant_id is automatically injected into all WHERE clauses and CREATE data

**Given** the seed script runs in minimal mode (AR9)
**When** seeding completes
**Then** a default tenant, Super Admin employee (admin@scheduler.local / Admin123!), and default Settings record exist

**Given** the login API endpoint receives valid credentials
**When** POST /auth/login is called with email and password
**Then** the system returns an RS256-signed JWT access token (15m expiry) and sets an httpOnly refresh token cookie (7d expiry), and the refresh token hash is stored in the database (AR4)

**Given** a valid JWT access token
**When** a request hits any protected endpoint via the custom JwtAuthGuard (AR5)
**Then** the token is verified, the employee and tenantId are injected into the request context

**Given** a refresh token is presented
**When** POST /auth/refresh is called
**Then** the old refresh token is invalidated, a new access + refresh token pair is issued (rotation), and if a previously-used refresh token is presented, ALL sessions for that user are invalidated (AR4 reuse detection)

### Story 1.2: Login & Registration UI

As a **business owner**,
I want to register my business and log in,
So that I can access the application and begin setting up my team.

**Acceptance Criteria:**

**Given** an unauthenticated user visits the app
**When** they navigate to the login page
**Then** they see an email/password form with a "Log in" button (primary action per UX14), a "Forgot password?" link, and a "Create a business" link

**Given** a user enters valid credentials on the login form
**When** they click "Log in"
**Then** the JWT tokens are stored, they are redirected to the dashboard, and the API client is configured with the access token

**Given** a user enters invalid credentials
**When** they click "Log in"
**Then** a clear error message appears ("Invalid email or password") without revealing whether the email exists

**Given** a new user clicks "Create a business"
**When** they fill out the registration form (business name, owner name, email, password)
**Then** a new tenant is created, the owner is created as Super Admin, JWT tokens are issued, and the user is redirected to the setup wizard (Story 1.3)

**Given** the registration form is submitted
**When** the email is already in use
**Then** a clear error message appears ("An account with this email already exists")

**Given** a Manager or Super Admin logs in
**When** they reach the dashboard
**Then** they see a contextual home page with: quick stats (team size, pending invites, active schedules), recent activity feed, and placeholder cards for upcoming features (attendance board, timesheets) with empty states per UX20 — ensuring managers have an actionable home base from day one

### Story 1.3: Business Setup Wizard

As a **business owner**,
I want a guided setup wizard after registration,
So that I can configure my scheduling preferences before inviting my team.

**Acceptance Criteria:**

**Given** the owner has just registered (or hasn't completed setup)
**When** they land on the wizard
**Then** they see a multi-step form with progress indicator showing: Scheduling → Break Rules → Publish Day → Done

**Given** the owner is on the Scheduling step
**When** they configure scheduling cadence (FR67)
**Then** they can select weekly, bi-weekly, or custom period length, and the selection is saved to Settings

**Given** the owner is on the Break Rules step
**When** they configure break deduction rules (FR68)
**Then** they can set rules per shift length (e.g., "30-min unpaid break for shifts over 6 hours"), and rules are saved to Settings

**Given** the owner is on the Publish Day step
**When** they set their usual publish day (FR69)
**Then** they can select a day of the week (e.g., "Thursday"), and this is saved to Settings and will be displayed to employees (per FR69)

**Given** the owner completes all wizard steps
**When** they click "Done" on the final step
**Then** Settings are marked as setup-complete, and they see a completion screen with two CTAs: "Invite Employees" (primary) and "Go to Dashboard" (secondary) per UX25

**Given** the wizard uses empty states
**When** any step has no prior configuration
**Then** empty states follow the formula: [What's missing] + [What will appear] + [CTA] (UX20)

### Story 1.4: Password Reset via Email

As a **user**,
I want to reset my password via email,
So that I can regain access if I forget my credentials.

**Acceptance Criteria:**

**Given** a user clicks "Forgot password?" on the login page
**When** they enter their email and submit
**Then** the system always responds with "If an account exists, a reset link has been sent" (no email enumeration)

**Given** a valid reset request
**When** the email is sent
**Then** it contains a secure token link (UUID v4, 1-hour expiry) and is delivered via the EmailJob queue (AR7) using a Handlebars template

**Given** the user clicks the reset link
**When** the token is valid and not expired
**Then** they see a "Set new password" form with password + confirmation fields

**Given** the user submits a new password
**When** the password meets requirements (min 8 chars, 1 uppercase, 1 number)
**Then** the password is updated, all existing refresh tokens are invalidated, and the user is redirected to login with a success message

**Given** the user clicks an expired or already-used reset link
**When** the token is invalid
**Then** they see an error message with a link to request a new reset

### Story 1.5: Role-Based Access Control

As a **Super Admin**,
I want the system to enforce role-based permissions,
So that employees can only access features appropriate to their role.

**Acceptance Criteria:**

**Given** the system has three roles: SUPER_ADMIN, MANAGER, EMPLOYEE
**When** any API endpoint is accessed
**Then** the RBAC guard checks the user's role against the endpoint's required role(s) and returns 403 Forbidden if unauthorized

**Given** a SUPER_ADMIN user
**When** they access any endpoint
**Then** they are granted access (Super Admin has full access to all features)

**Given** a MANAGER user
**When** they access management endpoints (schedules, team attendance, approvals)
**Then** they are granted access only to their department-scoped data

**Given** an EMPLOYEE user
**When** they access employee endpoints (my-schedule, clock-in, availability, day-off requests)
**Then** they are granted access, but denied access to management or admin endpoints

**Given** the frontend renders navigation
**When** a user is authenticated
**Then** sidebar and mobile nav items are shown/hidden based on the user's role (e.g., Employee doesn't see "Employees" management page)

**Given** a user's role is changed by a Super Admin
**When** the user's next API request is made
**Then** the new role permissions are enforced immediately (no cached stale role)

**Given** the integration test suite (AR13)
**When** RBAC is tested
**Then** verify: Employee cannot access /schedules CRUD, Manager can access department-scoped data only, Super Admin can access all endpoints, tenant isolation prevents cross-tenant data access

### Story 1.6: Session Management & Revocation

As a **Super Admin**,
I want to manage active sessions and enforce session limits,
So that I can maintain security and revoke compromised access.

**Acceptance Criteria:**

**Given** a user logs in
**When** they already have 3 active sessions (NFR27)
**Then** the oldest session's refresh token is automatically invalidated, and the new session proceeds

**Given** a Super Admin views employee details
**When** they see the session management section
**Then** they see a list of active sessions (device/browser info, last active timestamp) and a "Revoke" button per session (FR64)

**Given** a Super Admin clicks "Revoke" on a session
**When** the revocation is processed
**Then** the refresh token for that session is invalidated immediately, and the user's next API call with that session's access token will fail after the 15m access token expires

**Given** a Super Admin clicks "Revoke All Sessions"
**When** the revocation is processed
**Then** ALL refresh tokens for that employee are invalidated, forcing re-login on all devices

**Given** the system prevents archiving the last Super Admin (related FR39 in Epic 2)
**When** a session revocation would leave the tenant with no active Super Admin sessions
**Then** the revocation still proceeds (session ≠ account — the Super Admin can still log back in)

### Story 1.7: Settings Management UI

As a **Super Admin**,
I want to view and edit business settings after initial setup,
So that I can adjust scheduling preferences as my business evolves.

**Acceptance Criteria:**

**Given** a Super Admin navigates to the Settings page
**When** the page loads
**Then** they see the current configuration: scheduling cadence, break deduction rules, and usual publish day, with "Edit" controls

**Given** a Super Admin edits the scheduling cadence (FR67)
**When** they change from "weekly" to "bi-weekly" and save
**Then** the setting is updated, and new schedules will default to the new cadence

**Given** a Super Admin edits break deduction rules (FR68)
**When** they add/modify/remove a rule and save
**Then** the rules are updated and will apply to future timesheets (existing published schedules retain their snapshot per AR23)

**Given** a Super Admin edits the publish day (FR69)
**When** they change the day and save
**Then** the setting is updated, and employees see the new expected publish day on their schedule view

**Given** a non-Super Admin navigates to Settings
**When** the page loads
**Then** they see a read-only view of relevant settings (or are redirected based on role)

**Given** any authenticated user navigates to notification preferences within Settings
**When** they view the notification section
**Then** they can opt in/out of specific notification types (schedule published is mandatory and cannot be disabled), preventing notification fatigue as more epics add notification triggers

### Story 1.8: Audit Log

As a **Super Admin**,
I want an append-only audit log of all data modifications,
So that I can investigate disputes and maintain compliance.

**Acceptance Criteria:**

**Given** any data modification occurs in the system (create, update, delete)
**When** the operation completes
**Then** an audit log entry is created with: timestamp, userId, tenantId, action type, entity type, entity ID, before/after values (NFR1: immutable, no modification or deletion mechanism)

**Given** a Super Admin navigates to the Audit Log page
**When** the page loads
**Then** they see a paginated, reverse-chronological list of audit entries with filters for: date range, action type, entity type, and user

**Given** the audit log is queried
**When** filtering by a specific employee's actions
**Then** all modifications by that employee are shown, including what was changed (before → after diff)

**Given** audit log entries are older than 12 months (NFR30)
**When** the archival process runs
**Then** entries are moved to cold storage but remain queryable on request

**Given** any user (including Super Admin) attempts to modify or delete an audit entry
**When** the request is made
**Then** the system rejects it — no API endpoint exists for audit log modification (NFR1)

---

## Epic 2: Team Management — Stories

### Story 2.1: Employee Invitation Flow

As a **Super Admin**,
I want to invite employees by email and have them create their accounts via the invite link,
So that I can onboard my team without manual account creation.

**Acceptance Criteria:**

**Given** a Super Admin is on the Employees page
**When** they click "Invite Employee" and enter an email address
**Then** an invitation record is created with status "INVITED", and an email is sent via the EmailJob queue (AR7) containing a unique invite link (UUID v4 token)

**Given** an invited employee clicks the invite link
**When** the link is valid and not expired
**Then** they see an account creation form with fields: first name, last name, and password (email pre-filled from invitation) (FR37)

**Given** the invited employee submits the account creation form
**When** the password meets requirements and the form is valid
**Then** their Employee record is updated from INVITED to ACTIVE, password is hashed and stored, and they are automatically logged in and redirected to their dashboard (FR62)

**Given** an invitation link has expired (default 7 days)
**When** the invited employee clicks the link
**Then** they see an "Invitation expired" message with guidance to contact their admin

**Given** a Super Admin views an expired invitation
**When** they click "Resend Invitation" (FR48)
**Then** the old token is invalidated, a new invitation email is sent with a fresh token, and the invitation expiry resets

**Given** the Super Admin invites an email that already has an active account
**When** the invitation is submitted
**Then** the system rejects with "An employee with this email already exists"

### Story 2.2: Employee Profile Management

As a **Super Admin**,
I want to manage employee profiles, archive former employees, and track invitation status,
So that I can maintain an accurate workforce directory.

**Acceptance Criteria:**

**Given** a Super Admin navigates to the Employees page
**When** the page loads
**Then** they see a list of all employees with: name, email, role, department, and status badge (Invited / Active / Archived) (FR46)

**Given** a Super Admin clicks on an employee
**When** the profile detail view loads
**Then** they see all profile fields (name, email, phone, role, department, weekly hours cap) with "Edit" controls (FR38)

**Given** a Super Admin edits an employee's profile
**When** they change fields and save
**Then** the profile is updated, and the change is captured in the audit log

**Given** a Super Admin clicks "Archive" on an employee (FR39)
**When** confirmation is given
**Then** the employee's status changes to ARCHIVED, their active sessions are revoked, and they can no longer log in

**Given** a Super Admin attempts to archive the last Super Admin
**When** the archive action is triggered
**Then** the system rejects with "Cannot archive the last Super Admin" (FR39)

**Given** a Super Admin views an archived employee
**When** they click "Reactivate" (FR40)
**Then** the employee's status changes back to ACTIVE and they can log in again (a new invitation may be needed to reset password)

**Given** archived employees in the system
**When** 12 months have elapsed since archival (NFR2)
**Then** the profile is deleted and associated clock events/timesheets are anonymized

### Story 2.3: Roles CRUD & Assignment

As a **Super Admin**,
I want to create, edit, and delete roles with visual identifiers and assign them to employees,
So that shifts can be color-coded and employees have clear job functions.

**Acceptance Criteria:**

**Given** a Super Admin navigates to the Roles page
**When** the page loads
**Then** they see a card grid of existing roles, each showing: name, color swatch, 2-letter short code, and icon (UX2)

**Given** a Super Admin clicks "Create Role"
**When** they fill out the form (name, color picker, short code, icon)
**Then** the role is created with the 3-channel identification system: color + short code + icon (UX2), with WCAG AA contrast validation on the color

**Given** a Super Admin edits an existing role
**When** they change the name, color, or short code and save
**Then** the role is updated across all existing shift assignments (shifts reference role by ID)

**Given** a Super Admin deletes a role (FR41)
**When** they confirm deletion
**Then** the role is removed; employees previously assigned this role have their role cleared (set to null/unassigned)

**Given** a Super Admin is on the Employee profile or Roles page
**When** they assign a role to an employee (FR42)
**Then** the employee's primary role is updated and will appear as the default when scheduling that employee

**Given** the Roles page has no roles yet
**When** the page loads
**Then** the empty state follows UX20: "No roles created yet. Roles help color-code shifts and identify job functions." + "Create Role" CTA

### Story 2.4: Departments & Manager Assignment

As a **Super Admin**,
I want to create departments and assign managers to them,
So that the organization is structured and managers can see their team's data.

**Acceptance Criteria:**

**Given** a Super Admin navigates to the Departments page
**When** the page loads
**Then** they see a list of departments with: name, employee count, and assigned manager (if any)

**Given** a Super Admin clicks "Create Department"
**When** they enter a department name and optionally assign a manager
**Then** the department is created, and the assigned manager's role is set to MANAGER if not already

**Given** a Super Admin edits a department (FR43)
**When** they change the name or reassign the manager
**Then** the department is updated; the previous manager retains MANAGER role (role is independent of department assignment)

**Given** a Super Admin deletes a department (FR43)
**When** they confirm deletion
**Then** the department is removed, and employees in that department are set to unassigned (departmentId = null)

**Given** a Super Admin assigns a manager to a department (FR44)
**When** the manager is assigned
**Then** that manager's dashboard and data access (FR57) are scoped to employees in their department

**Given** the Departments page has no departments yet
**When** the page loads
**Then** the empty state follows UX20 formula with "Create Department" CTA

### Story 2.5: Groups & Batch Member Assignment

As an **Owner/Manager**,
I want to create groups and batch-assign employees,
So that I can organize teams for scheduling convenience beyond the department structure.

**Acceptance Criteria:**

**Given** an Owner/Manager navigates to the Groups page
**When** the page loads
**Then** they see a list of groups with: name, member count, and a preview of member avatars

**Given** an Owner/Manager clicks "Create Group"
**When** they enter a group name
**Then** the group is created and they are taken to the member assignment view

**Given** an Owner/Manager is assigning members to a group (FR45)
**When** they select multiple employees from a checkbox list and click "Add"
**Then** all selected employees are added to the group in a single batch operation

**Given** an Owner/Manager views a group
**When** they click "Manage Members"
**Then** they can add or remove members individually or in batch

**Given** an Owner/Manager edits a group
**When** they change the name or members and save
**Then** the group is updated

**Given** an Owner/Manager deletes a group
**When** they confirm deletion
**Then** the group is removed (employees are not affected — groups are organizational labels only)

### Story 2.6: Work Locations & Geofencing

As a **Super Admin**,
I want to create and manage work locations with geofence radius,
So that clock-in GPS verification can validate employee presence.

**Acceptance Criteria:**

**Given** a Super Admin navigates to the Locations page
**When** the page loads
**Then** they see a card grid of locations with: name, address, and geofence radius

**Given** a Super Admin clicks "Create Location" (FR47)
**When** they fill out the form (name, address, latitude, longitude, geofence radius in meters)
**Then** the location is created with a unique name per tenant

**Given** a Super Admin enters an address
**When** latitude/longitude fields are present
**Then** they can manually enter coordinates (V1), with the geofence radius defaulting to 100 meters

**Given** a Super Admin edits a location
**When** they change the address, coordinates, or geofence radius and save
**Then** the location is updated, and future clock-ins at this location use the new geofence

**Given** a Super Admin deletes a location
**When** shifts are assigned to this location
**Then** the system warns "X shifts reference this location" and requires confirmation before deletion

**Given** the Locations page has no locations yet
**When** the page loads
**Then** the empty state follows UX20: "No work locations yet. Locations enable GPS clock-in verification." + "Add Location" CTA

---

## Epic 3: Schedule Building — Stories

### Story 3.1: Schedule CRUD & List Page

As an **Owner/Manager**,
I want to create, view, edit, and delete schedules,
So that I can manage scheduling periods for my team.

**Acceptance Criteria:**

**Given** an Owner/Manager navigates to the Schedules page
**When** the page loads
**Then** they see a card grid of schedules showing: name, date range, status badge (DRAFT/PUBLISHED), shift count, and created by

**Given** an Owner/Manager clicks "Create Schedule"
**When** they fill out the dialog (name, start date, end date)
**Then** a new schedule is created with status DRAFT, and they are redirected to the schedule builder (Story 3.2)

**Given** the start date and end date are provided
**When** the schedule is created
**Then** the date range defaults to the configured scheduling cadence (FR67) but can be overridden

**Given** an Owner/Manager clicks on an existing DRAFT schedule
**When** the builder opens
**Then** they see the schedule grid with existing shifts (if any)

**Given** an Owner/Manager wants to edit schedule metadata
**When** they click "Edit" on the schedule toolbar
**Then** they can change the name, start date, or end date (only for DRAFT schedules)

**Given** an Owner/Manager wants to delete a schedule
**When** they click "Delete" and confirm
**Then** the schedule and all its shifts are permanently removed

**Given** the Schedules page has no schedules
**When** the page loads
**Then** empty state per UX20: "No schedules yet. Create your first schedule to start assigning shifts." + "Create Schedule" CTA

### Story 3.2: Schedule Grid Layout & Employee Rows

As an **Owner/Manager**,
I want to see a grid of employees × days for a schedule period,
So that I can visualize and plan shift assignments at a glance.

**Acceptance Criteria:**

**Given** an Owner/Manager opens a schedule in the builder
**When** the grid renders
**Then** they see a CSS Grid with employee names as rows (sticky left column, 180px) and days as columns (date + day name headers, sticky top)

**Given** the schedule has a 7-day period
**When** the grid renders
**Then** columns show each day with abbreviated day name (Mon, Tue...) and formatted date (e.g., "Jan 6")

**Given** employees have shifts in this schedule
**When** the grid renders
**Then** each employee row shows their name with initials avatar (first + last initial), sorted alphabetically by last name

**Given** a grid cell (employee × day intersection)
**When** shifts exist for that cell
**Then** shift blocks are rendered inside the cell showing role color bar, time range, and role short code (UX2, UX4 grid cell context)

**Given** the viewport is ≥1024px (desktop)
**When** the grid renders
**Then** full interactive mode is available with drag-and-drop capability (UX1)

**Given** the viewport is 768px-1023px (tablet)
**When** the grid renders
**Then** the grid is visible with tap-to-add functionality but drag-and-drop is disabled (UX1)

**Given** the grid has many employees
**When** the user scrolls horizontally
**Then** the employee name column remains sticky on the left, and the date header row remains sticky on top

**Given** the schedule builder initializes
**When** the component mounts
**Then** a Zustand store is created with: shifts state, undo/redo history stack (UX21), and localStorage persistence for draft recovery — establishing the state architecture before any shift CRUD operations (Stories 3.3, 3.4)

### Story 3.3: Shift Creation & Editing via Sheet Panel

As an **Owner/Manager**,
I want to create and edit shifts using a side panel,
So that I can assign employees to specific times, roles, and locations.

**Acceptance Criteria:**

**Given** an Owner/Manager clicks an empty grid cell
**When** the shift panel opens (right sheet on desktop, 480px max; bottom sheet on mobile, 85% max height — UX24)
**Then** the employee and date are pre-filled, and the form shows: role selector, location selector, start time, end time, and notes field

**Given** the shift form is filled out
**When** the Owner/Manager clicks "Save"
**Then** the shift is created via POST /shifts, the grid cell updates immediately to show the new shift block, and the panel closes

**Given** an Owner/Manager clicks an existing shift block
**When** the shift panel opens for editing
**Then** all fields are pre-populated with the shift's current values (FR2)

**Given** the shift is being edited
**When** the Owner/Manager changes fields and saves
**Then** the shift is updated via PATCH /shifts/:id and the grid reflects the changes

**Given** the Owner/Manager clicks "Delete" on a shift in the panel
**When** they confirm deletion
**Then** the shift is removed and the grid cell updates

**Given** the shift panel has unsaved changes
**When** the user attempts to close the panel (click outside, press Escape)
**Then** they see a confirmation: "Discard unsaved changes?" (UX24 unsaved form data protection)

**Given** the form uses shared validators (AR25)
**When** start time ≥ end time
**Then** validation error is shown: "End time must be after start time"

### Story 3.4: Drag-to-Schedule Paint Mode

As an **Owner/Manager**,
I want to select a role and drag across grid cells to create shifts in bulk,
So that I can quickly build schedules without clicking cell by cell.

**Acceptance Criteria:**

**Given** the schedule builder toolbar shows role options
**When** the Owner/Manager selects a role (with its color and short code visible)
**Then** the toolbar highlights the selected role and the cursor changes to indicate paint mode is active (FR1)

**Given** paint mode is active with a selected role
**When** the Owner/Manager clicks and drags across multiple cells (employee × day) on desktop (≥1024px)
**Then** shift blocks are created for each cell in the drag range using the selected role, with default time range from settings

**Given** @dnd-kit is initialized (UX22)
**When** drag interaction begins on the grid
**Then** custom grid collision detection identifies the target cells, and visual feedback (ghost blocks) shows where shifts will be placed (~15KB bundle for @dnd-kit)

**Given** paint mode creates multiple shifts
**When** the drag is released
**Then** all shifts are created via POST /shifts/bulk in a single batch request

**Given** a cell already has a shift
**When** the Owner/Manager drags over it in paint mode
**Then** the existing shift is skipped (no overwrite), and a visual indicator shows it was skipped

**Given** paint mode is active on tablet (768px-1023px)
**When** the user taps individual cells
**Then** each tap creates a shift with the selected role (tap-to-add, not drag — UX1)

**Given** the Owner/Manager wants to exit paint mode
**When** they press Escape or click the active role again in the toolbar
**Then** paint mode is deactivated and normal click-to-open-panel behavior resumes

**Given** shifts are created via paint mode drag
**When** Ctrl+Z is pressed (Story 3.6)
**Then** the entire paint batch is undone as a single operation (not individual shifts), because paint mode pushes one compound action to the undo stack

### Story 3.5: Conflict Detection & Visualization

As an **Owner/Manager**,
I want to see warnings when shifts conflict with employee availability, overlap, or exceed hours,
So that I can fix scheduling problems before publishing.

**Acceptance Criteria:**

**Given** a schedule has shifts assigned
**When** the builder loads or shifts change
**Then** the system calls GET /schedules/:id/conflicts and receives a list of conflict objects (FR3)

**Given** the conflict check returns overlapping shifts (OVERLAP type)
**When** two shifts for the same employee have overlapping time ranges
**Then** both shift blocks show a yellow warning triangle indicator, and hovering/tapping reveals: "{Employee} has overlapping shifts"

**Given** the conflict check returns availability violations (AVAILABILITY type)
**When** an employee is scheduled on a day they marked as unavailable (from Epic 5)
**Then** the affected shift block shows a warning indicator with message: "{Employee} is unavailable on {day}"

**Given** the conflict check returns hours cap exceeded (HOURS_CAP type)
**When** an employee's total scheduled hours exceed their weekly hours cap
**Then** the last shift block in the schedule shows a warning with: "{Employee} exceeds weekly hours cap ({actual}h / {cap}h)"

**Given** conflicts exist on the schedule
**When** the Owner/Manager clicks "View Conflicts" in the toolbar
**Then** a conflict panel (right sheet) opens listing all conflicts grouped by employee with clear descriptions

**Given** all conflict types are soft warnings (FR3)
**When** conflicts exist on a schedule
**Then** the system never blocks any action — scheduling, saving, or publishing can proceed despite warnings

### Story 3.6: Undo/Redo & Keyboard Shortcuts

As an **Owner/Manager**,
I want to undo and redo schedule changes and use keyboard shortcuts,
So that I can work efficiently and recover from mistakes.

**Acceptance Criteria:**

**Given** the schedule builder is open
**When** any shift is created, edited, or deleted
**Then** the action is pushed to the Zustand undo/redo history stack (UX21), and the state is persisted to localStorage for draft recovery

**Given** the Owner/Manager presses Ctrl+Z (UX17)
**When** there is undo history
**Then** the last action is reversed (shift restored/removed/reverted) and the grid updates immediately

**Given** the Owner/Manager presses Ctrl+Y (UX17)
**When** there is redo history
**Then** the previously undone action is re-applied

**Given** a shift block is selected/focused
**When** the Owner/Manager presses Delete (UX17)
**Then** the shift is removed and the action is added to undo history

**Given** the Owner/Manager presses Ctrl+S (UX17)
**When** there are unsaved changes
**Then** all pending changes are synced to the server, and a success toast appears in the informational lane (upper, 5-second — UX13)

**Given** the Owner/Manager presses Enter on a selected cell
**When** the cell is empty or has a shift
**Then** the shift panel opens (create or edit mode)

**Given** the Owner/Manager presses Escape (UX17)
**When** a panel or mode is active
**Then** the panel closes or paint mode deactivates

**Given** the browser crashes or is accidentally closed
**When** the Owner/Manager returns to the builder
**Then** the draft state is recovered from localStorage (UX21)

### Story 3.7: By Day View (Read-Only)

As an **Owner/Manager**,
I want to view the schedule organized by day in a timetable format,
So that I can see daily coverage at a glance with continuous time blocks.

**Acceptance Criteria:**

**Given** the schedule builder has a view toggle
**When** the Owner/Manager clicks "By Day" (UX5)
**Then** the view switches from the "By Person" grid to a timetable layout organized by day

**Given** the By Day view is active
**When** a day is displayed
**Then** it shows a vertical time axis with continuous blocks per employee, colored by role, showing employee name and time range

**Given** the By Day view renders shifts
**When** shifts overlap in time
**Then** they are shown side-by-side (not overlapping) so coverage is visually clear

**Given** the By Day view in V1 (UX5)
**When** the Owner/Manager interacts with it
**Then** the view is read-only — no editing, no drag, no click-to-create (interactive editing is "By Person" only in V1)

**Given** the Owner/Manager wants to edit a shift seen in By Day view
**When** they need to make changes
**Then** they switch back to "By Person" view using the toggle, where full editing is available

### Story 3.8: Mobile Redirect & QuickScheduleEdit

As a **user on a mobile device**,
I want appropriate access to schedule information based on my screen size,
So that I can view or make quick changes without a broken desktop experience.

**Acceptance Criteria:**

**Given** a user visits the schedule builder URL on a device <768px (UX1)
**When** the page loads
**Then** they are redirected to /my-schedule (employee view) instead of the builder

**Given** a Manager on a mobile device (<768px) needs to make schedule changes
**When** they access QuickScheduleEdit (UX6)
**Then** they see a simplified mobile flow: day list → shift list for selected day → tap shift to edit via form

**Given** QuickScheduleEdit is active
**When** the Manager selects a day
**Then** they see all shifts for that day with employee names, roles, and times

**Given** QuickScheduleEdit shows a shift
**When** the Manager taps it
**Then** a bottom sheet opens with the shift form (same as Story 3.3 but in bottom sheet format)

**Given** QuickScheduleEdit is a fallback (UX6)
**When** the Manager uses it
**Then** it supports editing existing shifts and basic creation, but NOT paint mode or drag-and-drop (those require ≥1024px)

---

## Epic 4: Schedule Publishing & Communication — Stories

### Story 4.1: Dual-Channel Notification Infrastructure

As a **system**,
I want a reliable dual-channel notification delivery system (in-app + email),
So that critical notifications reach employees through multiple channels.

**Acceptance Criteria:**

**Given** a notification needs to be sent
**When** the notification service is called with type, recipient, title, body, and link
**Then** an in-app notification record is created AND an email is queued via the EmailJob queue (AR7) using Handlebars templates

**Given** an email is queued
**When** the email processing interval runs (every 10 seconds — AR7)
**Then** the email is delivered within 5 minutes of creation (NFR20), supporting burst rate of 500 emails/min

**Given** a notification was sent to the same recipient
**When** a duplicate notification of the same type is triggered within 15 minutes (NFR26)
**Then** the duplicate is suppressed — no second in-app record or email is created

**Given** an email delivery fails
**When** the first attempt fails
**Then** the system retries with exponential backoff (3 attempts over 15 minutes — NFR23), and failed emails are visible to Super Admin

**Given** amendment notifications for the same employee
**When** multiple amendments occur within 30 minutes (AR18)
**Then** notifications are coalesced into a single notification summarizing all changes

**Given** the notification types include SCHEDULE_PUBLISHED, SCHEDULE_UNPUBLISHED, SCHEDULE_AMENDED, SCHEDULE_VIEW_REMINDER
**When** any of these types are created
**Then** both in-app and email channels are used (FR55 dual-channel for critical notifications)

**Given** notification frequency management
**When** computing whether to send a notification to a user
**Then** enforce a global per-user cap of max 5 notifications per hour (configurable in Settings), with priority ranking: actionable (approvals, schedule changes) > alerts (missing employees) > informational (all-clear, view reminders). Lower-priority notifications are deferred, not dropped.

**Given** notification emails use Handlebars templates (AR7)
**When** the email channel sends a notification
**Then** templates exist for all notification types: employee-invite, password-reset, schedule-published, schedule-amended, day-off-decision, view-reminder, missing-clock-in, and approval-nudge — each with consistent branding and clear call-to-action links

### Story 4.2: Publish & Unpublish Schedule

As an **Owner/Manager**,
I want to publish a schedule to share it with my team and unpublish if needed,
So that employees can see their assigned shifts and I can retract if changes are needed.

**Acceptance Criteria:**

**Given** a DRAFT schedule with shifts assigned
**When** the Owner/Manager clicks "Publish" (FR5)
**Then** the schedule status changes to PUBLISHED, publishedAt and publishedById are set, and break deduction rules are snapshotted (AR23)

**Given** a schedule is published
**When** the publish action completes
**Then** all employees with shifts in the schedule receive a dual-channel notification: "Schedule '{name}' has been published. Check your shifts." with link to /my-schedule (FR49)

**Given** a PUBLISHED schedule
**When** the schedule period has NOT yet started
**Then** the Owner can see an "Unpublish" button (FR6)

**Given** the Owner clicks "Unpublish"
**When** the schedule period is in the future
**Then** the schedule returns to DRAFT status, publishedAt/publishedById are cleared, and affected employees are notified via dual-channel

**Given** the Owner tries to unpublish
**When** the schedule period has already started
**Then** the system rejects with "Cannot unpublish a schedule that has already started" (FR6)

**Given** the schedule is published
**When** viewing the schedule in the builder
**Then** shifts are read-only unless the Owner amends (Story 4.6/4.7)

### Story 4.3: Copy Schedule to New Period

As an **Owner/Manager**,
I want to copy an existing schedule to a new date range,
So that I can reuse shift patterns without rebuilding from scratch each period.

**Acceptance Criteria:**

**Given** an Owner/Manager is on the schedule list or builder
**When** they click "Copy Schedule" (FR4)
**Then** a dialog opens with fields: new name (pre-filled as "{original name} — Copy"), new start date, new end date

**Given** the copy dialog is submitted
**When** the source schedule has shifts
**Then** a new DRAFT schedule is created with all shifts duplicated, dates offset by the difference between the original and new start dates

**Given** shifts are copied with date offset
**When** a shift's new date falls outside the new schedule's date range
**Then** that shift is excluded from the copy (only shifts within the new range are included)

**Given** the copy is complete
**When** the new schedule is created
**Then** the Owner/Manager is redirected to the new schedule's builder, and the original schedule is unchanged

**Given** the source schedule has employee assignments
**When** shifts are copied
**Then** employee, role, location, time, and notes are preserved; the new shifts get new IDs

### Story 4.4: View Tracking & Status

As an **Owner/Manager**,
I want to see which employees have viewed a published schedule,
So that I can ensure everyone is aware of their shifts.

**Acceptance Criteria:**

**Given** a published schedule
**When** the Owner/Manager views it in the builder
**Then** the toolbar shows an avatar stack with viewed count / total count (e.g., "3/8 viewed") (FR8)

**Given** the Owner/Manager clicks the view tracking indicator
**When** the tracking panel opens
**Then** they see two lists: "Viewed" (employees with timestamps) and "Pending" (employees who haven't viewed yet)

**Given** an employee opens their schedule view (Epic 5)
**When** the published schedule is displayed
**Then** the system records a ScheduleView entry with employeeId, scheduleId, and viewedAt timestamp

**Given** an employee has already viewed the schedule
**When** they view it again
**Then** the viewedAt timestamp is updated but no duplicate record is created

**Given** a schedule has just been published
**When** no employees have viewed it yet
**Then** the tracker shows "0/{total} viewed" with all employees in the "Pending" list

### Story 4.5: View Reminders & Nudges

As an **Owner/Manager**,
I want the system to nudge me when employees haven't viewed a schedule, and send reminders on my behalf,
So that I can ensure full team awareness without manual follow-up.

**Acceptance Criteria:**

**Given** a published schedule has been live for 48+ hours (FR9)
**When** employees haven't viewed it
**Then** the system sends a notification to the Owner: "{count} employees haven't viewed schedule '{name}' yet"

**Given** the 48-hour nudge
**When** it fires
**Then** reminderSentAt is recorded to prevent duplicate nudges for the same schedule

**Given** the Owner/Manager is viewing the "Pending" list in view tracking
**When** they click "Send Reminder" next to a specific employee (FR10)
**Then** a dual-channel notification is sent to that employee: "Reminder: Please review your schedule '{name}'" with link to /my-schedule

**Given** a reminder was already sent to an employee
**When** the Owner/Manager tries to send another
**Then** the duplicate suppression (NFR26, 15-min window) prevents double-sending, and the UI shows "Reminder sent recently"

**Given** a background job runs every 6 hours
**When** checking for unviewed schedules
**Then** it finds PUBLISHED schedules >48h old with unviewed employees and sends SCHEDULE_VIEW_REMINDER notifications

### Story 4.6: Amendment Diff Engine

As a **system**,
I want to detect and compute per-employee diffs when a published schedule is amended,
So that the amendment preview and notifications can show exactly what changed.

**Acceptance Criteria:**

**Given** a PUBLISHED schedule is being amended by the Owner/Manager
**When** shifts are added, edited, or removed
**Then** the system tracks all changes as a changeset: added shifts, modified shifts (before/after), and removed shifts

**Given** a changeset exists
**When** the diff engine processes it
**Then** it produces a per-employee diff: each affected employee gets a list of changes (e.g., "Monday 9am-5pm → 10am-6pm", "Tuesday shift removed", "Wednesday new shift added")

**Given** an employee has no changes in the amendment
**When** the diff is computed
**Then** that employee is excluded from the diff results

**Given** the diff engine computes changes
**When** multiple amendments are made before publishing
**Then** all changes are accumulated into a single diff per employee (not one diff per edit)

**Given** the changeset tracks modifications
**When** a shift's role, time, or location changes
**Then** the diff includes specific field changes (e.g., "Role changed from Server to Host", "Start time changed from 9:00 AM to 10:00 AM")

**Given** the amendment changeset relationship to undo/redo (Story 3.6)
**When** the diff is computed
**Then** the diff engine compares the published snapshot against the current persisted state — it is independent of the Zustand undo/redo history and computes changes on-demand at preview time, avoiding conflicts between the two systems

### Story 4.7: Amendment Preview UI & Publish

As an **Owner/Manager**,
I want to review all schedule changes before publishing amendments, and notify affected employees,
So that amendments are intentional and everyone knows what changed.

**Acceptance Criteria:**

**Given** a PUBLISHED schedule has pending amendments
**When** the Owner/Manager clicks "Publish Changes"
**Then** a DiffPreview panel opens (mandatory review before publishing — UX12) showing per-employee change summaries

**Given** the DiffPreview is displayed (FR7)
**When** it shows changes
**Then** each affected employee is listed with their specific changes: added/modified/removed shifts with before/after values

**Given** the Owner/Manager reviews the DiffPreview
**When** they click "Confirm & Publish Changes"
**Then** the amendments are applied, the schedule remains PUBLISHED, and the notification chain fires (FR50)

**Given** the amendment notification chain fires (FR50)
**When** changes are published
**Then** the manager receives notification first, then affected employees each receive a dual-channel notification with their specific diff: "Schedule '{name}' has been updated. Your changes: {employee-specific diff}"

**Given** amendment notifications for an employee
**When** multiple amendments occur within 30 minutes (AR18)
**Then** notifications are coalesced into a single message summarizing all changes

**Given** the Owner/Manager reviews the DiffPreview
**When** they click "Cancel" or press Escape
**Then** the preview closes, no changes are published, and they can continue editing

---

## Epic 5: Employee Schedule & Availability — Stories

### Story 5.1: Weekly Availability Preferences

As an **Employee**,
I want to set my weekly recurring availability preferences,
So that my manager sees soft warnings when scheduling me on days I'm unavailable.

**Acceptance Criteria:**

**Given** an Employee navigates to the Availability page
**When** the page loads
**Then** they see a 7-column weekly grid (Sun–Sat) with toggle controls for each day showing Available / Unavailable (FR11)

**Given** an Employee toggles a day to "Unavailable"
**When** they save
**Then** the availability record is updated via PUT /availability/:employeeId (transaction: delete all existing, create new entries)

**Given** an Employee sets availability
**When** the schedule builder (Epic 3) loads
**Then** shifts assigned to this employee on unavailable days trigger AVAILABILITY conflict warnings (FR3, Story 3.5)

**Given** a Manager/Admin views an employee's profile
**When** they access the availability section
**Then** they can view and edit that employee's availability on their behalf

**Given** an Employee has not set any availability
**When** the Availability page loads
**Then** all days default to "Available" with empty state guidance: "Set your availability to let your manager know which days work best for you."

**Given** availability is set as weekly recurring
**When** the same day comes each week
**Then** the preference applies to every occurrence (not date-specific, day-of-week-specific)

### Story 5.2: My Schedule View

As an **Employee**,
I want to view my assigned schedule for current and upcoming weeks,
So that I know when and where I work and who I'm working with.

**Acceptance Criteria:**

**Given** an Employee navigates to /my-schedule
**When** the page loads (mobile-first — UX1)
**Then** they see their current week's shifts as day-by-day card list, with week navigation (prev/next arrows)

**Given** shifts exist for a day
**When** the day section renders
**Then** each shift is displayed as a PrimaryShiftCard (UX9): full-width card with role color bar, time range, location, role name, and co-workers on the same shift (FR12)

**Given** the PrimaryShiftCard is rendered (War Room Rec #4)
**When** it displays
**Then** it includes the full visual structure with a clock-in CTA area at fixed bottom position, but the clock-in button is disabled/hidden with text "Clock-in available when your shift starts" (stub for Epic 6)

**Given** shift cards display co-workers (FR12)
**When** other employees have shifts at the same time/location
**Then** their names are shown on the card (e.g., "Working with: Sarah, Marcus")

**Given** the Employee views a published schedule
**When** the page loads
**Then** the system records a ScheduleView (POST /schedules/:id/views) to track that this employee has seen the schedule (feeds Story 4.4)

**Given** no published schedules exist for the employee
**When** /my-schedule loads
**Then** empty state per UX20: "No schedule published yet. Your manager usually publishes on {publishDay}." (FR69 publish day from settings)

**Given** the schedule JS bundle
**When** the page loads
**Then** total JS is under 200KB gzipped (NFR19), employee home under 100KB (UX19)

**Given** the PrimaryShiftCard displays shift states (UX3)
**When** rendering any shift
**Then** it supports all 8 visual states including Pending Sync and Sync Failed (visual placeholders for Epic 6's offline queue), ensuring no PrimaryShiftCard redesign is needed when Epic 6 ships

### Story 5.3: Schedule Preview Link

As an **invited employee (not yet registered)**,
I want to view my schedule via a preview link without creating an account,
So that I can see my shifts immediately after being invited.

**Acceptance Criteria:**

**Given** a Super Admin invites an employee (Story 2.1)
**When** the invitation email is sent
**Then** it includes a preview link: /preview/{token} where token is a signed JWT (purpose: preview, 7-day expiry — AR20)

**Given** an invitee clicks the preview link
**When** the token is valid and not expired
**Then** they see a read-only view of their assigned shifts (same layout as /my-schedule but without interactive features) rendered as a pure server component with zero client JS (AR20)

**Given** the preview page renders
**When** shifts are displayed
**Then** they show: date, time range, role, location — but NO edit, clock-in, or availability features

**Given** preview link tokens (NFR24)
**When** created
**Then** they use UUID v4 tokens, expire after 30 days, and are revokable by Super Admin

**Given** an invitee clicks an expired or revoked preview link
**When** the token is invalid
**Then** they see: "This preview link has expired. Contact your manager or create your account to view your schedule." with a link to the registration page

**Given** preview link access logging (NFR28)
**When** a preview link is accessed
**Then** the IP address and timestamp are logged, and an alert fires if >10 unique IPs access the same link in 24 hours

---

## Epic 6: Clock-In & Clock-Out — Stories

### Story 6.1: One-Tap Clock-In with GPS Geofence

As an **Employee**,
I want to clock in with one tap verified by GPS geofence,
So that my attendance is recorded accurately and effortlessly.

**Acceptance Criteria:**

**Given** an Employee's shift has a defined start time
**When** the current time is within 15 minutes before shift start (the Clock-In Available window)
**Then** the PrimaryShiftCard (UX9) transitions to "Clock-In Available" state (UX3), and the clock-in CTA at the fixed bottom position becomes enabled, showing "Clock In" as a primary coral filled button (UX14, 56px touch target — UX18)

**Given** the Employee taps "Clock In" (FR13)
**When** GPS permission is granted
**Then** the browser requests the device's current GPS coordinates and compares them against the shift's location geofence radius

**Given** GPS coordinates are within the geofence radius
**When** verification succeeds
**Then** a ClockEvent record is created with type CLOCK_IN, timestamp, GPS coordinates, and the shift transitions to "In Progress" state (UX3)

**Given** the clock-in completes successfully
**When** the UI updates
**Then** the card shows "In Progress" state with elapsed time, and the CTA changes to "Clock Out" (preparing for Story 6.2)

**Given** clock-in rate limiting (NFR25)
**When** an Employee attempts to clock in again within 60 seconds
**Then** the action is rejected with "Please wait before clocking in again"

**Given** the clock-in performance requirement (NFR17)
**When** under 10x burst load
**Then** the GPS verification + clock-in completes in <3 seconds

**Given** the clock-in architecture
**When** a clock event is created (online or offline)
**Then** it always flows through an event queue pattern: event → local queue → flush to server — online mode flushes immediately, offline mode (Story 6.4) defers flush until connectivity returns, ensuring identical code paths for both modes

### Story 6.2: One-Tap Clock-Out

As an **Employee**,
I want to clock out with one tap,
So that my shift end time is recorded accurately.

**Acceptance Criteria:**

**Given** an Employee is currently clocked in (shift in "In Progress" state)
**When** the PrimaryShiftCard renders
**Then** the CTA shows "Clock Out" as a primary button (FR14)

**Given** the Employee taps "Clock Out"
**When** the action is processed
**Then** a ClockEvent record is created with type CLOCK_OUT and timestamp, and the shift transitions to "Completed" state (UX3)

**Given** clock-out completes
**When** the card updates
**Then** it shows "Completed" state with total hours worked (e.g., "7h 45m")

**Given** clock-out rate limiting (NFR25)
**When** the Employee tries to clock out again within 60 seconds
**Then** the action is rejected with "Please wait before clocking out again"

**Given** an Employee doesn't clock out manually
**When** shift end time + 1 hour passes (FR16, handled in Epic 7)
**Then** the system auto-clocks them out (this AC references Epic 7 Story 7.2 for completeness)

### Story 6.3: GPS Failure Feedback & Guidance

As an **Employee**,
I want clear feedback when GPS verification fails,
So that I know what went wrong and how to fix it.

**Acceptance Criteria:**

**Given** the Employee taps "Clock In"
**When** GPS coordinates are outside the geofence radius (FR18)
**Then** a clear error message appears: "You appear to be outside your work location. Move closer to {locationName} and try again." with a map indicator showing their position relative to the geofence

**Given** GPS permission is denied by the browser
**When** the Employee taps "Clock In"
**Then** they see: "Location access is required for clock-in. Enable location services in your browser settings." with step-by-step guidance (FR18)

**Given** GPS is unavailable (timeout or device error)
**When** the Employee taps "Clock In"
**Then** they see: "Unable to determine your location. Ensure GPS is enabled and you're not in airplane mode. Try again in a moment."

**Given** GPS verification fails repeatedly
**When** the Employee has failed 3+ attempts
**Then** additional guidance appears: "Still having trouble? Contact your manager to log a manual clock-in." (connecting to Epic 7 Story 7.1)

**Given** GPS verification success rate tracking (NFR14)
**When** success rate per location drops below 85% over 7 days
**Then** an alert is generated for the Super Admin to review geofence radius settings

### Story 6.4: Offline Clock-In/Out Queue

As an **Employee**,
I want clock-in and clock-out to work even when I have no network connection,
So that my attendance is never lost due to connectivity issues.

**Acceptance Criteria:**

**Given** the Employee has no network connection (NFR31)
**When** they tap "Clock In" or "Clock Out"
**Then** the event is queued in localStorage with timestamp, GPS coordinates, and action type, and the shift card shows "Pending Sync" state (UX3)

**Given** localStorage write verification (NFR34)
**When** the queue write is attempted
**Then** the system verifies the write succeeded; if localStorage is unavailable, a clear failure indicator is shown

**Given** the device regains network connectivity
**When** the sync process runs
**Then** queued events are replayed to the server in order, and each event transitions from "Pending Sync" to the appropriate state

**Given** offline events are replayed (AR19)
**When** the server receives a replayed clock-in
**Then** the server performs a timestamp tolerance check (event timestamp vs. received_at) and records received_at alongside the event timestamp

**Given** a sync fails after network returns
**When** the server rejects the event
**Then** the shift card shows "Sync Failed" state (UX3) with a "Retry" button

**Given** the app is offline
**When** the Employee attempts non-clock operations (NFR32)
**Then** a clear offline indicator is shown: "You're offline. Clock-in/out still works, but other features require a connection." (NFR33)

### Story 6.5: Ad Hoc Clock-In (Unscheduled Shift)

As an **Employee**,
I want to clock in for work even when I don't have a scheduled shift,
So that my hours are tracked when I'm called in unexpectedly.

**Acceptance Criteria:**

**Given** an Employee has no shift scheduled for the current time
**When** they open /my-schedule
**Then** they see an "Ad Hoc Clock-In" button (secondary action style — UX14) (FR25)

**Given** the Employee taps "Ad Hoc Clock-In"
**When** GPS verification succeeds (same geofence check as Story 6.1)
**Then** a ClockEvent is created with type CLOCK_IN and flag isAdHoc = true, and the Employee sees a confirmation card showing "Unscheduled shift — clocked in at {time}"

**Given** an ad hoc clock-in occurs
**When** the event is recorded
**Then** the event is flagged for manager review with a notification: "{Employee} clocked in for an unscheduled shift at {location}" (feeds Epic 7)

**Given** the Employee is ad-hoc clocked in
**When** they tap "Clock Out"
**Then** the clock-out follows the same flow as Story 6.2, with the ad hoc flag preserved

**Given** ad hoc clock events
**When** timesheets are computed (Epic 8)
**Then** ad hoc hours are included but flagged separately for manager approval

---

## Epic 7: Attendance Monitoring & Management — Stories

### Story 7.1: Manager Clock Event Adjustments

As a **Manager**,
I want to log and adjust clock events for my team members,
So that I can correct missed or incorrect clock-ins/outs with full transparency.

**Acceptance Criteria:**

**Given** a Manager views an employee's attendance detail
**When** they click "Log Clock Event" or "Adjust" on an existing event (FR15)
**Then** a form opens with fields: event type (clock-in/clock-out), timestamp, and reason/notes

**Given** a Manager submits a manual clock event
**When** the event is saved
**Then** the ClockEvent is created with source = MANAGER_ADJUSTMENT, managerId tagged, and the adjustment is visible in the employee's clock history with the manager's name (FR15: transparent to all parties)

**Given** a Manager adjusts an existing clock event
**When** they change the timestamp
**Then** the original event is preserved (immutable), a new adjustment event is created referencing the original, and the adjustment shows "Adjusted by {Manager Name} at {timestamp}"

**Given** the Employee views their clock event history
**When** a manager adjustment exists
**Then** they see the adjustment with attribution tag: "Modified by {Manager Name}" (FR15: transparent to all parties)

**Given** a Manager logs a manual clock-in for an employee
**When** the employee had GPS failures (Story 6.3)
**Then** the manual event resolves the employee's attendance status from "Missing" to "On Time" or "Late" as appropriate

### Story 7.2: Auto-Clock-Out & Missing Clock-In Reminders

As a **system**,
I want to automatically remind employees of missing clock-ins and auto-clock-out employees who forget,
So that attendance records are complete without manual intervention.

**Acceptance Criteria:**

**Given** an employee has a shift starting now
**When** 15 minutes pass with no clock-in event (FR17)
**Then** the system sends a dual-channel notification to the employee: "Reminder: You haven't clocked in for your {time} shift at {location}"

**Given** an employee is clocked in
**When** shift end time + 15 minutes passes with no clock-out
**Then** the system sends a warning notification: "You're still clocked in. Don't forget to clock out!" (FR16)

**Given** an employee is still clocked in
**When** shift end time + 1 hour passes (FR16)
**Then** the system auto-creates a CLOCK_OUT event with timestamp = shift end time + 1 hour, source = AUTO_CLOCK_OUT, and the employee is notified: "You've been automatically clocked out"

**Given** the background job checks for missing clock events (AR24)
**When** it runs at its configured interval
**Then** it identifies all active shifts where clock-in is missing (+15m) or clock-out is overdue (+15m warning, +1h auto)

**Given** an employee has already clocked out
**When** the auto-clock-out job runs
**Then** that employee is skipped (no duplicate clock-out)

### Story 7.3: Team Attendance StatusBoard

As a **Manager**,
I want to see a real-time overview of my team's attendance status,
So that I can quickly identify who's on time, late, or missing.

**Acceptance Criteria:**

**Given** a Manager navigates to the Dashboard
**When** the StatusBoard loads (FR56)
**Then** it displays employees grouped by status: On Time (clocked in within shift start window), Late (clocked in after shift start + grace period), Missing (no clock-in for started shift)

**Given** the team has fewer than 8 employees on shift
**When** the StatusBoard renders (UX7)
**Then** it displays as a single list with status indicators

**Given** the team has 8+ employees on shift
**When** the StatusBoard renders (UX7)
**Then** it displays in three columns: On Time / Late / Missing

**Given** the Manager's dashboard scope (FR57)
**When** the StatusBoard loads
**Then** it only shows employees from the Manager's assigned department (Super Admin sees all)

**Given** the dashboard auto-refresh (FR58)
**When** data is displayed
**Then** it auto-refreshes via polling every 30 seconds (UX7), with a last-updated timestamp visible (NFR35)

**Given** data age exceeds 60 seconds (NFR36)
**When** a refresh fails or is delayed
**Then** a stale-data indicator is displayed: "Data may be outdated"

**Given** time display on the StatusBoard
**When** times are shown
**Then** they use unambiguous AM/PM format with timezone per location (NFR37)

### Story 7.4: Employee Drill-Down SituationCard

As a **Manager**,
I want to drill down from the attendance overview to see individual employee details with available actions,
So that I can quickly respond to attendance issues.

**Acceptance Criteria:**

**Given** a Manager taps/clicks an employee's StatusRow on the StatusBoard (FR59)
**When** the SituationCard opens (UX8)
**Then** it shows: employee name and photo, shift details (time, role, location), current status (On Time/Late/Missing), clock event timestamps, and action buttons

**Given** the SituationCard for a Missing employee (UX8)
**When** action buttons render
**Then** available actions include: Call (opens phone dialer), Text (opens SMS), Log Manual Clock-In (Story 7.1), Request Cover, Emergency Cover

**Given** the SituationCard for a Late employee
**When** action buttons render
**Then** available actions include: Call, Text, and a view of their clock-in time with lateness duration

**Given** the SituationCard for an On Time employee
**When** it renders
**Then** it shows their clock-in time and current shift progress (no corrective actions needed)

**Given** the Manager clicks "Log Manual Clock-In" from SituationCard
**When** the action is triggered
**Then** it opens the manual clock event form (Story 7.1) pre-filled with the employee and current time

---

## Epic 8: Timesheets & Payroll Export — Stories

### Story 8.1: Timesheet Auto-Computation

As a **system**,
I want to automatically compute timesheets from clock events with break deductions,
So that hours worked are accurately calculated without manual entry.

**Acceptance Criteria:**

**Given** an employee has clock-in and clock-out events for a shift
**When** the timesheet computation runs
**Then** gross hours are calculated as (clock-out time - clock-in time), and net hours are computed by applying break deduction rules (FR19, FR20)

**Given** break deduction rules are configured (FR68 from Epic 1)
**When** a shift meets the rule criteria (e.g., shift >6 hours)
**Then** the configured deduction is applied (e.g., 30-min unpaid break subtracted from gross hours)

**Given** break deduction rules are snapshotted at schedule publish time (AR23)
**When** the rules change after publishing
**Then** timesheets for already-published schedules use the snapshotted rules, not the current ones

**Given** timesheet validation (NFR29)
**When** computed hours exceed the scheduled shift duration
**Then** the timesheet entry is flagged for review ("Hours exceed scheduled shift")

**Given** timesheet validation (NFR29)
**When** computed hours are negative (e.g., clock-out before clock-in due to adjustment)
**Then** the entry is flagged: "Negative hours detected — review required"

**Given** an employee has manager-adjusted clock events (Story 7.1)
**When** the timesheet is computed
**Then** the adjusted timestamps are used for computation, and the entry notes the adjustment source

### Story 8.2: Employee Timesheet & Clock History View

As an **Employee**,
I want to view my computed timesheet and clock event history,
So that I can verify my hours and see who made any adjustments.

**Acceptance Criteria:**

**Given** an Employee navigates to their Timesheet page
**When** the page loads (FR21)
**Then** they see a period-based view showing: date, shift time, clock-in time, clock-out time, gross hours, break deduction, net hours per day

**Given** the timesheet displays a period total
**When** all days are computed
**Then** a summary shows: total gross hours, total deductions, total net hours for the period

**Given** an Employee clicks "Clock History" (FR22)
**When** the history view loads
**Then** they see a chronological list of all clock events with: timestamp, type (in/out), source (self/manager/auto), and attribution tags

**Given** a clock event has a manager attribution tag (FR22)
**When** it renders
**Then** it shows: "Adjusted by {Manager Name} on {date}" clearly distinguishing manual adjustments from employee-initiated events

**Given** an ad hoc clock event (Story 6.5)
**When** it appears in the history
**Then** it's tagged with "Unscheduled shift" label

### Story 8.3: Manager Team Timesheets View

As a **Manager/Owner**,
I want to view team timesheets per employee and period,
So that I can review hours worked and resolve flagged entries before payroll.

**Acceptance Criteria:**

**Given** a Manager/Owner navigates to Team Timesheets (FR23)
**When** the page loads
**Then** they see a table of employees with period totals: employee name, total hours, flagged entries count, and status (Clean / Needs Review)

**Given** the Manager clicks on an employee
**When** the detail view opens
**Then** they see the same day-by-day breakdown as the employee view (Story 8.2) plus the ability to resolve flags

**Given** a timesheet entry is flagged (NFR29)
**When** the Manager reviews it
**Then** they can mark it as "Reviewed" with an optional note, clearing the flag

**Given** the team timesheet scope
**When** a Manager views timesheets
**Then** they only see employees in their department (FR57 scoping); Super Admin sees all

**Given** a period selector
**When** the Manager changes the period
**Then** the view updates to show timesheets for the selected week/bi-week

### Story 8.4: CSV Payroll Export

As an **Owner/Manager**,
I want to export timesheets as CSV for payroll processing,
So that I can integrate with external payroll systems.

**Acceptance Criteria:**

**Given** an Owner/Manager is on the Team Timesheets page
**When** they click "Export CSV" (FR24)
**Then** a CSV file is generated containing: employee name, employee email, period dates, daily hours, total gross hours, total deductions, total net hours

**Given** the export includes flagged entries (NFR29)
**When** unresolved flags exist
**Then** the export is blocked with message: "{count} timesheet entries need review before export. Resolve flagged entries first."

**Given** all flags are resolved
**When** the export proceeds
**Then** the CSV downloads immediately with filename format: "timesheets-{period-start}-{period-end}.csv"

**Given** the CSV format
**When** it's opened in spreadsheet software
**Then** columns are properly delimited, dates use ISO format (YYYY-MM-DD), hours use decimal format (e.g., 7.75 not 7:45)

---

## Epic 9: Leave Management — Stories

### Story 9.1: Employee Day-Off Request

As an **Employee**,
I want to request a day off and view my pending and past requests,
So that I can manage my time off with minimal friction.

**Acceptance Criteria:**

**Given** an Employee navigates to their Day Off page or taps "Request Day Off" from /my-schedule
**When** the request form opens
**Then** they see: date picker, reason dropdown (Sick, Personal, Vacation, Other), optional notes field (FR26)

**Given** the Employee completes the form (3 taps: date → reason → submit)
**When** they submit the request
**Then** a LeaveRequest record is created with status PENDING, and the employee sees confirmation: "Day off requested for {date}"

**Given** an Employee views their Day Off page (FR70)
**When** the page loads
**Then** they see two sections: "Pending" (awaiting approval) and "Past" (approved/rejected) with status badges, dates, and reasons

**Given** a pending request exists
**When** the Employee views it
**Then** they can cancel the request if it hasn't been acted on

**Given** the request is for a date that already has a scheduled shift
**When** the request is submitted
**Then** the system notes the conflict but does NOT block the request (the manager sees the impact in Story 9.3)

### Story 9.2: Approval Feed & Decision Flow

As a **Manager/Owner**,
I want a unified feed of pending approvals where I can approve or reject with a reason,
So that I can efficiently manage team requests without switching between pages.

**Acceptance Criteria:**

**Given** a Manager/Owner navigates to Approvals (FR34)
**When** the page loads
**Then** they see a card-based feed of pending leave requests, sorted by submission date (oldest first), showing: employee name, date requested, reason, and days pending

**Given** the Manager clicks "Approve" on a request (FR27)
**When** the approval is processed
**Then** the request status changes to APPROVED, and a 5-second undo toast appears in the actionable lane (bottom, persists — UX13, FR31)

**Given** the Manager clicks "Reject" on a request (FR27)
**When** the rejection form opens
**Then** they must provide a reason (required field), and upon submission the request status changes to REJECTED with the reason stored

**Given** the 5-second undo toast is active (FR31)
**When** the Manager clicks "Undo" within 5 seconds
**Then** the approval/rejection is reversed, the request returns to PENDING, and a confirmation toast appears

**Given** the 5-second undo window expires
**When** 5 seconds pass without clicking "Undo"
**Then** the toast dismisses, the decision is final, and notifications fire (Story 9.5)

**Given** the approval feed scope
**When** a Manager views it
**Then** they see only requests from employees in their department; Super Admin sees all

### Story 9.3: Coverage Impact Panel

As a **Manager**,
I want to see the coverage impact before approving a day-off request,
So that I can make informed decisions about staffing.

**Acceptance Criteria:**

**Given** a Manager is reviewing a leave request
**When** they click "View Impact" or the CoverageImpactPanel auto-displays (UX10)
**Then** they see: the date's current coverage ratio (scheduled employees / typical staffing), list of employees already scheduled that day, and list of available employees who could cover

**Given** the CoverageImpactPanel shows coverage (FR28)
**When** approving the request would reduce coverage below a threshold
**Then** a warning is shown: "Approving this request leaves {n} of {total} positions covered on {date}"

**Given** the panel shows available employees
**When** the Manager needs to find coverage
**Then** they see employees who are: not scheduled that day, available per their availability preferences, and not on approved leave

**Given** the coverage impact is displayed
**When** the Manager makes their decision
**Then** they can approve or reject directly from the panel (integrates with Story 9.2)

### Story 9.4: Leave Balance Tracking

As a **system**,
I want to track leave balances per employee,
So that managers and employees can see remaining available days.

**Acceptance Criteria:**

**Given** an Employee has a configured leave allowance (FR30)
**When** they view their Day Off page
**Then** they see their balance: "{used} of {total} days used" with a visual progress bar

**Given** a leave request is approved
**When** the approval is finalized (after undo window)
**Then** the employee's used balance increments by 1 day

**Given** a leave request approval is undone (Story 9.2 undo)
**When** the undo is processed
**Then** the balance is decremented back

**Given** a Manager views an employee's profile or the approval feed
**When** they see a leave request
**Then** the employee's current balance is shown alongside the request for context

**Given** an employee's balance is fully used
**When** they submit a new request
**Then** the request is accepted but flagged: "This request exceeds your leave allowance" (soft warning, not blocking)

### Story 9.5: Day Off on Schedule & Employee Notification

As an **Employee**,
I want to see approved days off on the schedule and receive notification of my manager's decision,
So that I know my request outcome and the team sees my availability.

**Acceptance Criteria:**

**Given** a leave request is approved
**When** the schedule builder (Epic 3) renders that date (FR29)
**Then** the employee's cell shows "Day Off" badge alongside any existing shift (shift is NOT removed — FR29)

**Given** a leave request is approved
**When** the employee's /my-schedule (Epic 5) renders
**Then** that date shows a "Day Off — Approved" card in place of or alongside shift cards

**Given** a leave request decision is made (approve or reject)
**When** the undo window expires
**Then** the employee receives a dual-channel notification (FR51): approval → "Your day off on {date} has been approved!" / rejection → "Your day off request for {date} was declined. Reason: {reason}"

**Given** the notification includes a reason for rejection
**When** the employee views it
**Then** the manager's reason is clearly displayed

### Story 9.6: Approval Nudges & Escalation

As a **system**,
I want to send approval nudges and escalate overdue requests,
So that employees get timely responses to their leave requests.

**Acceptance Criteria:**

**Given** a leave request has been PENDING for 24+ hours (FR32)
**When** the background job runs
**Then** the assigned Manager receives a dual-channel notification: "Pending approval: {Employee} requested {date} off — submitted {hours}h ago"

**Given** a leave request has been PENDING for 48+ hours with no manager action (FR33)
**When** the background job runs
**Then** the request escalates to the Super Admin with notification: "Escalated: {Employee}'s day-off request pending {hours}h — {Manager} hasn't responded"

**Given** the escalation threshold (FR33)
**When** configurable in Settings
**Then** the 48-hour default can be changed by Super Admin

**Given** a nudge or escalation has been sent
**When** the same request is checked again
**Then** duplicate nudges are suppressed (track nudgeSentAt, escalatedAt to prevent re-sending)

---

## Epic 10: Proactive Notifications — Stories

### Story 10.0: Notification Feed Page

As a **user**,
I want a dedicated notifications page where I can view, manage, and act on my notifications,
So that I have a centralized place to stay informed about schedule changes, approvals, and team events.

**Acceptance Criteria:**

**Given** any authenticated user navigates to /notifications
**When** the page loads
**Then** they see a reverse-chronological feed of NotificationFeedItems (UX11) with unread count badge in the nav

**Given** the notification feed displays items (UX11)
**When** an informational notification (schedule published, all-clear, new member) is older than 48 hours
**Then** it auto-clears from the feed

**Given** an actionable notification (pending approval, missing clock-in reminder)
**When** the action hasn't been taken
**Then** it persists in the feed until resolved, with a clear CTA button (UX11)

**Given** a user is on mobile
**When** they interact with a notification
**Then** swipe-to-reveal actions are available: dismiss, mark as read (UX11)

**Given** the notification feed on desktop
**When** a user clicks a notification with a link
**Then** they are navigated to the relevant page (e.g., /my-schedule, /approvals)

**Given** the /notifications page has no notifications
**When** the page loads
**Then** empty state per UX20: "You're all caught up! Notifications about schedules, approvals, and team updates will appear here."

### Story 10.1: New Team Member Joined Notification

As a **Manager**,
I want to be notified when a new team member creates their account,
So that I can welcome them and ensure they're ready for their first shift.

**Acceptance Criteria:**

**Given** an invited employee creates their account (Story 2.1)
**When** the account creation completes
**Then** the department Manager receives a dual-channel notification (FR52): "New team member: {firstName} {lastName} has joined. Welcome them to the team!"

**Given** the new employee has no department assigned
**When** the account is created
**Then** the Super Admin receives the notification instead (no department = no manager)

**Given** the notification is sent
**When** the Manager views it in the notification feed
**Then** it appears as an informational notification (UX11) that auto-clears after 48 hours

### Story 10.2: Missing Employees Alert

As a **Manager**,
I want to receive a push notification when multiple employees are missing at shift start,
So that I can take immediate action to address staffing gaps.

**Acceptance Criteria:**

**Given** a shift start time has passed
**When** multiple employees (2+) haven't clocked in after the grace period (FR53)
**Then** the Manager receives a dual-channel notification: "Alert: {count} employees haven't clocked in for the {time} shift at {location}"

**Given** the missing employees alert
**When** the Manager taps/clicks the notification
**Then** they are taken to the StatusBoard (Story 7.3) filtered to show Missing employees

**Given** only one employee is missing
**When** the check runs
**Then** the individual missing clock-in reminder (Story 7.2/FR17) handles it — the FR53 multi-missing alert does NOT fire for a single employee

**Given** the background job checks for missing employees (AR24)
**When** it runs at its configured interval
**Then** it groups missing employees by shift start time and location to produce consolidated alerts

### Story 10.3: All-Clear Notification & Feed Management

As a **Manager**,
I want to receive notification when all scheduled employees have clocked in, and manage my notification feed,
So that I know my team is fully present and can keep my notifications organized.

**Acceptance Criteria:**

**Given** all employees scheduled for a shift time have clocked in (FR54)
**When** the last employee clocks in
**Then** the Manager receives a notification: "All clear: All {count} employees have clocked in for the {time} shift"

**Given** the all-clear notification
**When** it's displayed
**Then** it appears as informational (UX11) and auto-clears after 48 hours

**Given** the notification feed displays items (UX11)
**When** an informational notification is older than 48 hours
**Then** it auto-clears from the feed

**Given** an actionable notification (e.g., pending approval from Epic 9)
**When** the action hasn't been taken
**Then** it persists in the feed until resolved (UX11)

**Given** the notification feed on mobile
**When** the user swipes a notification
**Then** swipe-to-reveal actions are available: dismiss, mark read (UX11)

---

## Story Summary

| Epic | Title | Stories | FRs |
|------|-------|---------|-----|
| 1 | Account & Business Setup | 8 | 9 |
| 2 | Team Management | 6 | 14 |
| 3 | Schedule Building | 8 | 3 |
| 4 | Schedule Publishing & Communication | 7 | 10 |
| 5 | Employee Schedule & Availability | 3 | 3 |
| 6 | Clock-In & Clock-Out | 5 | 4 |
| 7 | Attendance Monitoring & Management | 4 | 7 |
| 8 | Timesheets & Payroll Export | 4 | 6 |
| 9 | Leave Management | 6 | 11 |
| 10 | Proactive Notifications | 4 | 3 |
| **Total** | | **55 stories** | **70 FRs** |

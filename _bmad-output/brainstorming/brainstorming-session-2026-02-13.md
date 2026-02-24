---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: [scheduling_application_prd_prd.md]
session_topic: 'Table-based roster/scheduling app with role assignments, lateness tracking, overtime management, leave requests, replacement public holiday leave — all with employer approval workflows'
session_goals: 'Brainstorm app design, feature implementation, UI layout, workflows, and edge cases'
selected_approach: 'AI-Recommended (Morphological Analysis + Role Playing)'
techniques_used: ['Morphological Analysis', 'Role Playing']
ideas_generated: 87
session_active: false
workflow_completed: true
context_file: 'scheduling_application_prd_prd.md'
---

# Brainstorming Session Results

**Facilitator:** Base
**Date:** 2026-02-13

## Session Overview

**Topic:** Building a table-based roster/scheduling app with role assignments, company-wide oversight, lateness tracking, overtime management, employee leave requests, and replacement public holiday leave — all requiring employer approval.

**Goals:** Generate ideas for app design, feature implementation, UI patterns, approval workflows, and edge case handling.

**Context:** Based on existing PRD (scheduling_application_prd_prd.md) with modifications — no hard-coded Malaysian labor regulations, fully customizable to employer needs.

### Core Feature Scope

1. **Roster Management** — Table/grid-based schedule view
2. **Role Assignments** — Assign roles (reception, cleaning, etc.) per shift
3. **Lateness Tracking** — Flag and record late arrivals
4. **Overtime Tracking** — Track and claim extra hours
5. **Leave Requests** — Employee-submitted, employer-approved
6. **Replacement Public Holiday Leave** — Earned by working holidays, employer-approved
7. **Employer Approval Workflows** — All employee actions require approval

### Session Setup

- **Technique 1:** Morphological Analysis — Systematically map every feature parameter and explore implementation options
- **Technique 2:** Role Playing — Pressure-test ideas from employer, employee, and admin perspectives

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Roster scheduling app with focus on practical product design and feature implementation

**Recommended Techniques:**

- **Morphological Analysis:** Systematically map all feature parameters (roster grid, roles, lateness, overtime, leave, replacement holidays, approvals) against implementation options to find optimal combinations
- **Role Playing:** Pressure-test the best ideas from employer, employee, and admin perspectives to catch usability gaps

**AI Rationale:** Well-defined feature scope with multiple design parameters per feature — Morphological Analysis ensures comprehensive coverage, Role Playing ensures human-centered validation

## Technique Execution Results

### Morphological Analysis

**Interactive Focus:** Systematically mapped every feature area through parameter-by-parameter exploration, covering grid layout, interaction models, data structures, workflows, and cross-feature collisions.

**Key Breakthroughs:**
- Paint mode scheduling — transforming roster planning into a visual, tactile experience
- Soft conflict warnings — warn but never block, trusting the employer
- Defaults + Override pattern — emerged as a universal design principle
- Information Surface, Not Rule Engine — the app's core philosophy crystallized

### Role Playing

**Building on Previous:** Pressure-tested all Morphological Analysis decisions from employer, employee, and admin perspectives.

**New Insights:**
- Card-based approval feed with swipe actions — borrowed from social media/email UX
- Split dashboard (stats + grid) — employer's first-glance needs
- One-tap OT claim from shift cell — minimum friction for tired employees
- Calendar-pick replacement leave — combining claim + leave request into one action
- Guided setup wizard — ordered dependency chain for first-time configuration

### Edge Cases & Scale Exploration

**Focus Areas:** Cross-feature collisions, year-end processes, data integrity, scalability

**Key Discoveries:**
- Lateness-OT auto-offset — automated fairness with transparent math
- Immutable past roster with employer master override — data integrity with escape hatch
- Year-end checklist — proactive rather than reactive annual reset
- Feature restraint — reusing existing patterns (change requests) instead of building new features (swaps)

### Creative Facilitation Narrative

The session revealed a remarkably consistent design philosophy from Base: employer-first configurability with maximum simplicity. Every decision reinforced a pattern of smart defaults, soft warnings, and employer override capability. The most innovative breakthrough was the emergence of the "Information Surface, Not Rule Engine" principle — the app warns, flags, and surfaces context but never blocks the employer from making their own decisions. Feature restraint was another strong theme — reusing the change request pattern instead of building a separate swap system, and combining schedule change + leave request for half-day leave instead of building a half-day feature.

## Complete Idea Inventory

### Theme 1: Roster Grid & Scheduling (9 ideas)

**[Roster #1]: Custom Role Visual System**
_Concept_: When employers create a role, they pick a color AND an icon from a library. The grid cells use that combo. With 10+ custom roles, color alone causes confusion — the icon acts as a secondary identifier.
_Novelty_: Most scheduler apps hard-code a few roles. A full visual identity per custom role scales better.

**[Roster #2]: Paint Mode Scheduling**
_Concept_: Manager selects a role from a toolbar, cursor changes to a "paint brush", then click-drags across time slots for one or multiple employees. Shift created instantly. Right-click or eraser tool to remove.
_Novelty_: Most scheduler apps use modals and forms. Paint mode turns roster planning into a visual, tactile experience.

**[Roster #3]: Soft Conflict Warnings**
_Concept_: Conflicts show as orange warning triangles on cells. Clicking the warning shows the reason. Manager can override, swap, or fix. A conflict counter badge in the toolbar shows total unresolved warnings.
_Novelty_: Most schedulers hard-block conflicts. Soft warnings respect manager authority while providing safety nets.

**[Roster #4]: Flexible Schedule Recurrence**
_Concept_: When saving a schedule, system asks: "How should this schedule repeat?" Options: one-time only, recurring weekly, or custom repeat for X weeks. Employer can edit any individual week without breaking the recurrence pattern — "this week only" override vs "this and all future weeks" change.
_Novelty_: First week is the hardest. After that, the roster builds itself. The employer only manages exceptions.

**[Roster #5]: Employee Self-Edit (Configurable)**
_Concept_: In employer settings, a toggle: "Allow employees to edit their own schedule." When enabled, employee changes appear as pending modifications in the employer's approval queue.
_Novelty_: Gives employees agency without giving up control. The toggle means conservative employers keep it locked, flexible employers open it up.

**[Roster #6]: Schedule Change Request Card**
_Concept_: When an employee proposes a schedule change, the boss gets a card: current shift, requested change, reason. Approve / Reject / Modify buttons. If approved, the roster auto-updates.
_Novelty_: Same card pattern as leave and OT requests. One consistent approval experience regardless of request type.

**[Roster #7]: No Swap Feature — Reuse Change Requests**
_Concept_: Instead of building a separate swap system, employees individually submit schedule change requests. The employer sees both cards and coordinates. No new UI, no new flow.
_Novelty_: Feature restraint. Reusing the existing change request pattern keeps the app simple.

**[Roster #8]: Explicit Shift Time Entry**
_Concept_: Shifts defined by Start Date + Start Time + End Date + End Time + Role + Recurrence. A Monday 10PM to Tuesday 6AM shift is simply: Start: Mon 10:00 PM, End: Tue 6:00 AM. Grid displays it on the start date's cell.
_Novelty_: Explicit start/end date+time handles any scenario — overnight, 24-hour shifts, multi-day assignments.

**[Roster #9]: Overnight Shift Indicator**
_Concept_: Shifts crossing midnight show a moon icon on the cell. On the next day's grid, a faded ghost cell shows "continued from overnight shift" so the employer sees that time slot is occupied. The shift is only editable from its start date cell.
_Novelty_: The employer sees coverage on both days without duplicate data. The ghost cell prevents accidental double-booking.

### Theme 2: Role & Organization Management (8 ideas)

**[Roles #1]: Lightweight Role Identity**
_Concept_: Role creation is a quick form — name, pick a color, pick an icon, auto-generated short code (editable). No operational overhead. Roles are visual labels, not complex configuration objects.
_Novelty_: Keeps the system approachable. Employers don't get bogged down configuring roles before they can start scheduling.

**[Roles #2]: Open Role Assignment**
_Concept_: Any employee can be assigned any role. Zero setup overhead for role-to-employee mapping. Manager's judgment is the only filter.
_Novelty_: Eliminates the admin burden of maintaining employee qualification matrices.

**[Roles #3]: Configurable Schedule Visibility**
_Concept_: In employer settings, a visibility toggle: "Employees can see: Own schedule only / Team schedule / Full company grid." Role names visibility is a separate toggle.
_Novelty_: Most schedulers pick one visibility model and hard-code it. Making it configurable respects every company culture.

**[Admin #8]: Employment Type Tags**
_Concept_: Simple tag field: Full-Time or Part-Time. Shows as a badge on the employee's profile. No automated rules attached — the tag is for the employer's reference.
_Novelty_: Information, not automation. Helps the employer without enforcing rules that might not match.

**[Admin #9]: Three-Layer Organization**
_Concept_: (1) Roles — required, what you do. (2) Departments — optional, where you belong. (3) Groups — temporary/project-based, what you're working on now. Groups are disposable — create, use, delete.
_Novelty_: Three layers serve three purposes with no overlap or confusion.

**[Admin #10]: Group Roster View**
_Concept_: When the employer creates a group, it gets its own filterable view on the roster grid. Group members' shifts still appear on the main grid — it's a filter, not a separate schedule.
_Novelty_: Groups don't create separate scheduling silos. They're a lens on the same data.

**[Edge #2]: Multi-Role Employees, Single-Role Shifts**
_Concept_: An employee's profile can have multiple roles tagged. When painting a shift, you assign ONE role. Two roles in one day = two separate shift cells. Employee capabilities are separate from shift assignments.
_Novelty_: Clean data model. Paint mode handles it naturally — paint one role in morning cells, switch, paint another in afternoon.

**[Edge #12]: Role Deletion with Unassigned Flag**
_Concept_: Employer deletes a role → system warns about affected shifts → confirms → role removed, future shifts show as "Unassigned" with grey indicator. Past shifts retain the deleted role name in history.
_Novelty_: No blocking, no forced workflow. Delete now, clean up at your pace.

### Theme 3: Attendance Tracking (5 ideas)

**[Lateness #1]: Manager-Reported Lateness**
_Concept_: Manager right-clicks/long-presses a shift cell → "Mark Late" → enters minutes late and optional note. Cell gets a red dot indicator. No clock-in infrastructure needed.
_Novelty_: Keeps the app lightweight. Manager is the single source of truth.

**[Lateness #2]: Lateness Record Structure**
_Concept_: Each lateness entry stores: minutes late, free-text note, date, employee, and the shift it's attached to. Shows on the employee's shift cell as a red indicator.
_Novelty_: Tied directly to the shift cell on the grid — not buried in a separate attendance module.

**[Lateness #3]: Multi-Layer Lateness Visibility**
_Concept_: Three views of the same data: (1) Red indicator on roster grid cell, (2) Employee profile tab with full lateness history, (3) Manager dashboard with trend summaries. All from one data entry point.
_Novelty_: One input action automatically populates three useful views. No duplicate data entry.

**[Edge #8]: Early Departure Tracking**
_Concept_: "Mark Early Departure" alongside "Mark Late" — enters time left and optional note. Cell gets an orange dot indicator. Records: left at 1PM (3 hours early), reason.
_Novelty_: Mirrors lateness exactly. Same interaction, same data structure, same multi-layer visibility.

**[Edge #9]: Unified Attendance Indicators**
_Concept_: Each shift cell can accumulate multiple indicators: red dot (late), orange dot (early departure), holiday flag, warning triangle. Tapping reveals all annotations. Dashboard tracks both.
_Novelty_: The shift cell becomes a rich data point showing planned vs actual in one glance.

### Theme 4: Overtime Management (5 ideas)

**[Overtime #1]: Employee-Initiated OT Claims**
_Concept_: Employee opens the app → "Submit Overtime Claim" → enters date, extra hours, reason. Claim lands in employer's approval queue. The employee is the source, the employer is the gatekeeper.
_Novelty_: Keeps the system simple and avoids disputes over auto-calculated hours.

**[Overtime #2]: Time-Based OT Claims**
_Concept_: Employee selects date, enters OT start time and end time, system auto-calculates total extra hours. Reason field explains why. Clear time boundaries — easy to verify.
_Novelty_: Auto-calculation from time inputs prevents rounding disputes.

**[Overtime #3]: Flexible OT Rate System**
_Concept_: Employer configures rate tiers (Normal Day: 1.5x, Rest Day: 2.0x, Holiday: 3.0x). When approving, system suggests matching tier rate but employer can override with any custom amount.
_Novelty_: Tiered defaults save time for 90% of cases. Custom override handles edge cases.

**[Employee #5]: Quick OT Claim from Schedule**
_Concept_: Employee taps their shift cell → "Claim Overtime" → pre-filled form with today's date and shift end time as OT start. Employee just enters end time and reason. Done in 15 seconds.
_Novelty_: Pre-filled from shift data. Employee only enters what the system doesn't know.

**[Edge #5]: Unscheduled OT Claim Warning**
_Concept_: When an employee submits OT for a date with no scheduled shift, the claim card shows: "No scheduled shift found for this date." Employer decides if it's legitimate.
_Novelty_: Doesn't punish last-minute schedule changes. Real businesses call people in unexpectedly.

### Theme 5: Leave Management (10 ideas)

**[Leave #1]: Preset + Custom Leave Types**
_Concept_: App ships with common defaults (Annual, Sick, Emergency, Unpaid). Employer can add new types, rename existing ones, remove unused ones. Zero-to-functional in minutes.
_Novelty_: No "one size fits all" and no "build everything yourself."

**[Leave #2]: Flexible Balance Management**
_Concept_: Per leave type, employer chooses: "Fixed" (manually set X days) or "Accrual" (configure rate, system auto-accumulates). Can mix models. Admin can manually adjust individual balances anytime.
_Novelty_: Most leave systems force one model. This lets each leave type match how it actually works.

**[Leave #3]: Context-Aware Leave Requests**
_Concept_: Employee selects leave type → picks dates → system shows: (1) balance check, (2) team conflict preview. Employee makes an informed decision before submitting.
_Novelty_: Combining balance and team calendar at the moment of submission prevents wasted requests.

**[Leave #4]: Dual Approval Interface**
_Concept_: Pending leave requests show as indicators on the roster grid — click to approve inline. Separately, the approval inbox lists all pending requests. Both update the same data.
_Novelty_: Two entry points, one source of truth. Manager doesn't have to leave the roster.

**[Leave #5]: Dual Notification on Decision**
_Concept_: When employer approves/rejects, employee receives in-app notification + email with details. Roster grid updates immediately. Non-negotiable notification — always both channels.
_Novelty_: Critical notifications should not be configurable. Some things just need to work.

**[Edge #1]: Half-Day via Schedule Change + Leave Request**
_Concept_: Employee submits schedule change (shorten shift) + leave request for freed-up time. Two existing features combine to handle half-day leave. No new feature needed.
_Novelty_: Zero new UI, zero new logic. Half-day leave is an emergent behavior from existing features.

**[Edge #11]: Zero Balance Auto-Convert to Unpaid Leave**
_Concept_: Employee submits with zero balance → system notifies: "This will be submitted as Unpaid Leave." Employee confirms. Approval card shows the auto-conversion context.
_Novelty_: No dead end for the employee. Smooth redirect with full transparency.

**[Edge #13]: Unscheduled Leave Request Warning**
_Concept_: Employee submits leave for a date with no shift → "No shift scheduled. Submit anyway?" Employer sees the context on the approval card.
_Novelty_: Prevents accidental submissions while respecting valid reasons.

**[Scale #9]: Duplicate Request Tolerance**
_Concept_: Overlapping leave requests are both accepted. Cards in the approval feed show a link indicator between related requests. Employer picks the right one.
_Novelty_: No dead ends. Employee doesn't need to withdraw the first request before submitting the correct one.

**[Cross #4]: Competing Leave Request Flagging**
_Concept_: Multiple employees requesting overlapping dates both get warning badges. Employer sees both with context: roles, balances, roster coverage impact.
_Novelty_: No algorithmic priority. The employer weighs factors the system can't.

### Theme 6: Public Holidays & Replacement Leave (8 ideas)

**[Holiday #1]: Recurring Holiday Calendar**
_Concept_: Employer adds holidays with name, date, and "repeats yearly" toggle. Recurring holidays auto-populate each new year. One-off holidays stay in their year. Editable anytime.
_Novelty_: Eliminates the annual chore of re-entering holidays. Set and forget with full override.

**[Holiday #2]: Auto-Flag + Manual Mark**
_Concept_: Shifts on public holiday dates auto-flag with a holiday indicator. Manager can also manually mark any shift as "worked on holiday" for edge cases. Both paths lead to replacement leave eligibility.
_Novelty_: Auto-detection handles obvious cases. Manual mark catches exceptions.

**[Holiday #3]: Claim-Based Replacement Leave**
_Concept_: System flags holiday shift → employee gets notified → submits replacement leave claim → employer approves/rejects. Same pattern as OT claims.
_Novelty_: Mirrors the OT claim flow exactly. One consistent pattern for all claims.

**[Holiday #4]: Flexible Replacement Leave Expiry**
_Concept_: Employer sets default expiry in settings. When approving a claim, expiry date is pre-filled but employer can change it. System notifies employee when approaching expiry.
_Novelty_: Handles both company policy and special circumstances without separate workflows.

**[Edge #3]: Holiday Impact Configuration**
_Concept_: Each holiday has a status: Closed (business shut), Business as Usual (normal ops, replacement leave eligible), Optional (employer decides per employee). Changeable anytime.
_Novelty_: Most schedulers treat holidays as automatic days off. Real businesses are messier.

**[Edge #4]: Holiday Calendar Edit Rights**
_Concept_: Full CRUD on any holiday. Delete national holidays, add company-specific ones, change status anytime. Full audit trail on changes.
_Novelty_: The holiday calendar is a living document, not a fixed reference.

**[Scale #6]: Recurring Shift Holiday Configuration**
_Concept_: Per recurring schedule, a toggle: "Skip Closed holidays." When on, recurring shifts auto-skip Closed holidays. Business as Usual holidays still generate shifts with holiday flag.
_Novelty_: Recurring schedule respects the holiday calendar automatically.

**[Scale #7]: Holiday-Leave Eligibility Configuration**
_Concept_: Each holiday has an additional property: "Eligible for replacement leave: Yes/No." Separates "is the business open?" from "does working earn replacement leave?"
_Novelty_: Two different business decisions most schedulers conflate.

### Theme 7: Approval System (6 ideas)

**[Approval #1]: Unified Approval Inbox with Filter Counters**
_Concept_: Single approval page with filter tabs: "All (6)" / "Leave (3)" / "OT (2)" / "Holiday (1)". Each tab shows pending count. Each row shows: employee name, type, dates/hours, reason, action buttons.
_Novelty_: One inbox, not three separate pages. Counters give instant priority awareness.

**[Approval #2]: Three-Action Approval with Modification**
_Concept_: Each pending item has: Approve (as-is), Reject (with mandatory reason), Modify + Approve (adjust hours/dates/amount then approve). Employee notified of modifications.
_Novelty_: Modify + Approve eliminates the "reject and resubmit" cycle.

**[Approval #3]: Dual Notification for Incoming Requests**
_Concept_: New request → employer receives in-app notification + email with preview and direct link to approval inbox. Tap the email link, land on the item, one tap to approve.
_Novelty_: Email deep-link means the employer can approve straight from their phone.

**[Navigation #2]: Card-Based Approval Feed**
_Concept_: Scrollable feed of cards. Each card shows: employee avatar/name, request type (color-coded), key details, action buttons. Filter tabs at top. Feels like a modern notification feed.
_Novelty_: One card = one decision. Employer can clear their queue in 30 seconds.

**[Navigation #3]: Swipe Actions on Cards**
_Concept_: Swipe right to approve, swipe left to reject. Tap to expand for details and modify option. Rejected swipe prompts for mandatory reason. Undo available for 5 seconds.
_Novelty_: Borrowed from email apps. Makes approval effortless on mobile.

**[Scale #10]: No Escalation — Requests Queue**
_Concept_: Pending requests have no timeout or escalation. They queue until the employer acts. Badge counter shows accumulated items. If it's urgent, the employee contacts the employer directly.
_Novelty_: Feature restraint. Simple queue handles the rare scenario without complex delegation systems.

### Theme 8: Employee Experience (8 ideas)

**[Employee #1]: Employee Home Screen**
_Concept_: Employee opens app → roster grid for current week, scoped by visibility setting. Their own shifts highlighted. Bottom navigation: Home / Requests / Notifications / Profile.
_Novelty_: Same grid component as employer, just scoped differently. One component, two contexts.

**[Employee #2]: Requests Hub**
_Concept_: Action center with buttons: Request Leave, Claim Overtime, Claim Replacement Leave. Below — history feed of all past requests with status badges: Pending (yellow), Approved (green), Rejected (red), Modified (blue).
_Novelty_: One place for all actions and all history.

**[Employee #3]: Notification Feed**
_Concept_: Chronological timeline: approvals, shift changes, OT decisions. Each notification links to the relevant item.
_Novelty_: Single timeline of everything that affects the employee.

**[Employee #5]: Quick OT Claim from Schedule**
_Concept_: Tap shift cell → "Claim Overtime" → pre-filled form with date and shift end time. Employee enters OT end time and reason. 15 seconds to submit.
_Novelty_: Pre-filled from shift data. Minimum friction.

**[Employee #6]: Calendar-Pick Replacement Leave Claim**
_Concept_: Employee taps "Claim Replacement Leave" → sees list of eligible holidays worked → selects one → calendar appears → taps desired day off → submit. Claim and leave request combined.
_Novelty_: One action instead of two steps. Fewer steps, faster resolution.

**[Employee #7]: Eligible Holiday List**
_Concept_: System auto-populates a list of holidays the employee worked but hasn't claimed. "You worked on: Christmas, New Year — 2 unclaimed."
_Novelty_: System does the bookkeeping. Employee never has to remember which holidays they worked.

**[Employee #8]: Welcome Screen for New Employees**
_Concept_: First login: "Welcome to [Company], [Name]! Your role: Cleaning. Your first shift: Monday 8AM-4PM." Three cards: View Schedule, Make Request, Notifications. Appears once.
_Novelty_: Immediately oriented. No confusion, no tutorial they'll skip.

**[Navigation #1]: Bottom Menu with Task Hub**
_Concept_: Bottom navigation: Home (dashboard + grid) / Approvals / Employees / Tasks / Menu (hamburger for settings, holidays, reports).
_Novelty_: Standard mobile navigation pattern with task management integration.

### Theme 9: Admin & Setup (10 ideas)

**[Admin #1]: Guided First-Time Setup Wizard**
_Concept_: Step-by-step: (1) Default leave counts, (2) Holiday calendar, (3) Employee names, (4) Leave types, (5) Employee roles. Progress bar, skippable, revisitable.
_Novelty_: No blank screen overwhelm. Dependency-ordered steps prevent errors.

**[Admin #2]: Smart Defaults on Setup**
_Concept_: Pre-filled values at every step. Leave counts pre-filled, leave types pre-created, holidays pre-populated. Admin reviews and tweaks rather than building from zero.
_Novelty_: Setup becomes "review and adjust" instead of "create everything." Under 10 minutes.

**[Admin #3]: Employee Onboarding Flow**
_Concept_: "+" button → single form: Details (name, email, phone, department) → Role (pick from existing, multi-select) → Leave Balance (default or custom per type) → Save → appears on roster grid.
_Novelty_: One continuous flow from "this person exists" to "they're on the schedule."

**[Admin #4]: Default vs Custom Leave per Employee**
_Concept_: Each leave type shows company default with a toggle. Flip to custom for individual adjustments. Standard employees take 5 seconds, special cases get individual numbers.
_Novelty_: Default/override pattern at the individual employee level.

**[Admin #5]: Employee Offboarding — Archive + Deactivate + Summary**
_Concept_: "Offboard Employee" → generates summary report (leave taken, OT claimed, lateness history) → admin reviews → confirms → deactivated + archived. Reactivatable.
_Novelty_: Three actions in one click. Summary eliminates manual report compilation at exit.

**[Admin #6]: Archive Section**
_Concept_: Dedicated "Archived Employees" section. Shows deactivated employees with offboarding date and summary. Searchable, read-only, reactivatable.
_Novelty_: Clean separation between active and historical. Active list stays lean, nothing is lost.

**[Admin #7]: Visual Analytics Dashboard**
_Concept_: Reports section with visual charts: OT summary, lateness overview, leave usage. All filterable by date range, employee, role, department. Live data — always current.
_Novelty_: Admin never builds a report. Answers are already there. Filter to drill down.

**[Admin #8]: Employment Type Tags**
_Concept_: Simple Full-Time / Part-Time tag. Informational only — no automated rules. Shows on profile and optionally on grid column header.
_Novelty_: Information without automation. Tag helps the employer without enforcing rules.

**[Admin #9]: Three-Layer Organization**
_Concept_: Roles (what you do) + Departments (where you belong) + Groups (temporary projects). Groups are disposable.
_Novelty_: Three layers, three purposes, no overlap.

**[Admin #10]: Group Roster View**
_Concept_: Groups get their own filterable view. Members still appear on the main grid. It's a filter, not a separate schedule.
_Novelty_: No scheduling silos. A lens on the same data.

### Theme 10: Year-End Processes (6 ideas)

**[YearEnd #1]: Annual Leave Balance Hard Reset**
_Concept_: January 1st — all leave balances reset to defaults. System auto-processes. Employer gets summary notification. Historical balances preserved in records.
_Novelty_: No complex carry-forward. Clean break with historical record for reporting.

**[YearEnd #2]: Replacement Leave Year-End Review**
_Concept_: During reset, replacement leave is separated. Review screen shows all outstanding cases. Employer can: Extend, Expire, or Convert to pay per case. Bulk actions available.
_Novelty_: Replacement leave is earned through work — deserves individual attention rather than silent expiry.

**[YearEnd #3]: Automatic Year-End Reset**
_Concept_: Midnight January 1st (or fiscal year start) — system auto-snapshots balances, resets all leave, flags replacement leave for review. No manual trigger.
_Novelty_: 95% hands-off, 5% employer judgment for replacement leave.

**[YearEnd #4]: Configurable Mid-Year Join Policy**
_Concept_: Setting: "New employee leave allocation: Full / Prorated." Prorated auto-calculates based on remaining months. Admin can still override per individual.
_Novelty_: Policy-level setting with individual override.

**[YearEnd #5]: Pending Request Year-End Review**
_Concept_: A week before year-end, system alerts: "3 pending requests span the reset. Review recommended." Shows each with current and post-reset balance. Employer decides.
_Novelty_: Proactive warning, not a surprise. Employer has time to clear the queue.

**[YearEnd #6]: Year-End Checklist**
_Concept_: Starting one month before fiscal year-end, a checklist card on the dashboard: review pending requests, review replacement leave, verify next year's defaults, reset date reminder. Guidance without enforcement.
_Novelty_: Year-end becomes a managed process, not a surprise event.

### Theme 11: System & Platform (7 ideas)

**[System #1]: Simple Email + Password Auth**
_Concept_: Admin creates account with email. System sends invite with temp password. Employee sets own password on first login. Standard forgot password flow.
_Novelty_: Simple for V1. No enterprise-grade auth overkill for teams under 100.

**[System #2]: Full Web + Native Mobile**
_Concept_: Web app and native mobile (iOS/Android) with identical feature sets. Same account, real-time sync. Grid adapts interaction model per device.
_Novelty_: Everything works everywhere. Platform adapts UX, not feature set.

**[System #3]: Responsive Grid Adaptation**
_Concept_: Desktop — full grid, paint mode with mouse, hover tooltips. Tablet — scrollable, tap to assign. Mobile — single employee column with swipe, or day-list alternative. Same data, device-fitted interaction.
_Novelty_: Dedicated mobile layout ensures actual usability rather than just a shrunken desktop grid.

**[System #4]: Mass Edit Mode**
_Concept_: Toggle "Mass Edit" across the app: roster grid (select multiple cells), approval feed (checkboxes), employee list (bulk update), leave balances (annual reset). Bottom toolbar: "X items selected — [Actions]."
_Novelty_: One consistent pattern. Not separate bulk features — a universal select-and-act mode.

**[System #5]: Mass Edit Safety**
_Concept_: Mass actions show confirmation summary before executing. Destructive actions get double confirmation. Undo available for 10 seconds.
_Novelty_: Power without danger. Speed of bulk actions with safety net.

**[System #6]: Global Search + Contextual Filters**
_Concept_: Search bar on every screen — type name, instant results, jump to profile/schedule. Every list and grid has own filter controls (role, department, date range, status). Search finds people, filters narrow data.
_Novelty_: Two tools, two jobs. No overloaded search bar.

**[System #7]: Dual-Access Settings**
_Concept_: Central Settings page with categorized tabs (Schedule, Roles & Departments, Leave, Overtime, Holidays, Employees, Notifications). Plus gear icons on relevant pages that deep-link to the right tab.
_Novelty_: Full review via central page. Quick tweaks via contextual gear. No hunting.

### Theme 12: Cross-Feature & Data Integrity (8 ideas)

**[Cross #1]: Context-Rich Collision Handling**
_Concept_: When features overlap, the system surfaces all relevant context to the employer. No auto-resolution. Full picture presented, employer decides.
_Novelty_: The app never makes business decisions. It's an information surface.

**[Cross #2]: Lateness-OT Auto-Offset**
_Concept_: OT claim on a day with lateness → system auto-deducts late minutes from OT hours. Displayed transparently: "OT: 2h, Late deduction: -30m, Net: 1h 30m." Employer can still modify.
_Novelty_: Automated fairness with full transparency. Employer retains override power.

**[Cross #3]: Leave-Roster Dual Warning with Approval Gate**
_Concept_: Warning when scheduling over approved leave AND when approving leave over an existing shift. Pending leave never affects the roster. Only approved leave triggers conflicts.
_Novelty_: Leave approval is the single trigger point. Pending requests don't pollute the roster.

**[Edge #6]: Immutable Past Roster**
_Concept_: Past shifts are read-only. Once a day ends, that day's roster locks at midnight. No edits, no deletions. Historical record is sacred.
_Novelty_: Clean audit trail by design. No post-hoc schedule tampering.

**[Edge #7]: Today Editable + Employer Override**
_Concept_: Current day freely editable until midnight. Past days locked. Employer/super admin has master override — can unlock any past day with mandatory reason and audit trail.
_Novelty_: Locks protect data for 99% of cases. Override exists for the 1% of genuine errors.

**[Scale #5]: Visual Merge for Back-to-Back Shifts**
_Concept_: Consecutive shifts display as one flowing block with a subtle divider line between roles. Two colors/icons separated by thin line. Data stays as separate records.
_Novelty_: Clean grid, accurate data. No tiny visual gaps that look like rendering errors.

**[Scale #8]: Consistent Soft Warning for Leave Conflicts**
_Concept_: Painting a shift on a day with approved leave triggers the standard orange warning triangle. Same pattern as every other conflict.
_Novelty_: Consistency — every conflict behaves the same way across the app.

**[Scale #3]: No Undo, Manual Reversal**
_Concept_: Every action is final. Confirmation dialogs are the safety net — prevent rather than cure. No undo system complexity.
_Novelty_: Strong confirmations are a better investment than undo systems.

### Theme 13: Scale & Navigation (4 ideas)

**[Scale #1]: Filtered Grid with Expandable View**
_Concept_: Grid opens filtered by default department/role. Filter bar shows active filter. Can switch or "Show All." Full view groups employees by department with collapsible sections. Remembers last filter.
_Novelty_: Starts manageable, scales on demand. Daily management of 10-15 people, full view for planning.

**[Scale #2]: Sticky Headers on Scroll**
_Concept_: Employee names stick to top (column headers), time slots stick to left (row headers) when scrolling. Pinch-to-zoom on mobile.
_Novelty_: Critical for usability. Without sticky headers, large grids become unusable.

**[Scale #4]: Offboarding Cascade with Preview**
_Concept_: Offboarding shows: "Will cancel 2 leave requests, 1 OT claim, remove 8 shifts." Notifications sent to affected managers about removed shifts. One-click with full visibility.
_Novelty_: No orphaned requests or ghost shifts. Managers notified about coverage gaps.

**[Scale #10]: No Escalation — Requests Queue**
_Concept_: No timeout, no delegation, no escalation. Requests wait. Badge counter shows accumulation. Urgent = employee contacts employer directly.
_Novelty_: Feature restraint. Simple queue over complex delegation system.

### Dashboard & Navigation (2 ideas)

**[Dashboard #1]: Roster-First Home Screen**
_Concept_: App opens to today's roster grid. Approval counter as badge in top nav. Quick-access for week/month views. The roster IS the dashboard.
_Novelty_: No wasted dashboard page. Roster is information-dense enough to serve as the dashboard.

**[Dashboard #2]: Split Dashboard — Stats + Grid**
_Concept_: Top: key statistics cards (headcount, pending approvals, late arrivals, upcoming holidays). Below: roster grid for today. Stats are compact, grid gets maximum space.
_Novelty_: 10-second overview + detailed grid. No separate pages.

## Core Design Principles

Seven principles that emerged organically and hold the entire app together:

1. **Employer-First Configuration** — Every rule has a default + override. The employer shapes the system to their business.
2. **Defaults + Override Pattern** — Smart defaults at every level, always overridable. Works at company level, leave type level, and individual employee level.
3. **Critical vs Configurable Notifications** — Approval decisions always notify via in-app + email (non-negotiable). Other notifications are configurable.
4. **Information Surface, Not Rule Engine** — The app warns, flags, highlights, and surfaces context — but never blocks the employer. Every conflict is a warning, not a wall.
5. **Smart Defaults, Transparent Math** — Auto-calculate the objective (OT hours, lateness offset). Surface the subjective (should I approve this?). Always show the working.
6. **Consistent Request Pattern** — Every employee action: Submit → Card in employer feed → Approve/Reject/Modify → Notify. One pattern for leave, OT, replacement leave, and schedule changes.
7. **Employer Master Override** — The employer is above the rules. They can override locked rosters, expired leave, and any system restriction. Every override is logged with an audit trail.

## V1 Implementation Roadmap

### Phase 1: Foundation
1. Auth system (email + password, invite flow)
2. Admin setup wizard (company config, leave defaults, holiday calendar)
3. Employee CRUD (add, edit, archive, deactivate, tags)
4. Role management (create roles with name, color, icon, code)
5. Department & group management
6. Settings architecture (categorized tabs + contextual gear icons)

### Phase 2: Core Scheduling
7. Roster grid (time slots x employees, custom intervals, filters)
8. Paint mode (select role, click-drag to assign)
9. Shift creation (start/end date+time, overnight support)
10. Recurring schedules (one-time, weekly, custom repeat)
11. Conflict warnings (soft orange triangles)
12. Sticky headers, filtered default view, responsive adaptation
13. Visual merge for back-to-back shifts
14. Overnight shift indicators (moon icon + ghost cells)
15. Real-time collaborative editing (WebSocket sync)

### Phase 3: Approval System
16. Unified approval inbox with filter counters
17. Card-based approval feed
18. Three-action approval (approve/reject/modify)
19. Swipe actions on cards (mobile)
20. Dual notifications (in-app + email)
21. Critical vs configurable notification tiers

### Phase 4: Leave Management
22. Leave types (preset + custom)
23. Leave balance system (fixed OR accrual)
24. Context-aware leave requests (balance + team conflicts)
25. Dual approval interface (grid + inbox)
26. Zero balance auto-convert to unpaid leave
27. Competing leave request flagging
28. Duplicate request tolerance
29. Unscheduled leave request warning

### Phase 5: Attendance Tracking
30. Mark Late (right-click/long-press, minutes + note)
31. Mark Early Departure (same pattern)
32. Unified attendance indicators on grid cells
33. Employee attendance history tab
34. Dashboard attendance trends

### Phase 6: Overtime
35. OT claim submission (start/end time, auto-calculate, reason)
36. Quick OT claim from shift cell (pre-filled)
37. Flexible rate tiers + custom override
38. Lateness-OT auto-offset with transparent math
39. Unscheduled OT claim warning

### Phase 7: Public Holidays & Replacement Leave
40. Holiday calendar (manual + recurring)
41. Holiday status (Closed / Business as Usual / Optional)
42. Replacement leave eligibility toggle per holiday
43. Auto-flag + manual mark
44. Claim-based replacement leave (calendar-pick)
45. Eligible holiday list for employees
46. Flexible expiry (default + per-claim override)
47. Recurring shift holiday skip configuration

### Phase 8: Employee Experience
48. Employee home screen (scoped grid)
49. Requests hub (submit + history)
50. Notification feed
51. Welcome screen for new employees
52. Employee self-edit (configurable, flows through approval)
53. Schedule change request cards
54. Bottom navigation

### Phase 9: Employer Dashboard & Reporting
55. Split dashboard (stats + grid)
56. Visual analytics (OT, lateness, leave charts)
57. Filterable by date, employee, role, department
58. Global search + contextual filters

### Phase 10: Data Integrity & Edge Cases
59. Immutable past roster (auto-lock at midnight)
60. Employer master override with audit trail
61. Leave-roster dual warning with approval gate
62. Context-rich collision handling
63. Offboarding cascade with preview
64. Mass edit mode with safety confirmations

### Phase 11: Year-End Processes
65. Automatic hard reset
66. Replacement leave year-end review
67. Pending request year-end warning
68. Year-end checklist on dashboard
69. Configurable mid-year join policy

### Phase 12: Platform
70. Web app (responsive, desktop-optimized)
71. Mobile app — iOS & Android
72. Real-time sync across all platforms

## Session Summary and Insights

**Key Achievements:**
- 87 ideas generated across 13 themes using Morphological Analysis and Role Playing
- 7 core design principles emerged organically from user decisions
- Complete V1 feature set defined with implementation roadmap
- Every feature tested against employer, employee, and admin perspectives
- 13+ edge cases resolved with consistent design patterns

**Session Highlights:**
- **User Creative Strengths:** Exceptionally consistent design philosophy. Every decision reinforced employer flexibility, simplicity, and trust. Strong instinct for feature restraint — choosing to reuse patterns over building new features.
- **AI Facilitation Approach:** Parameter-by-parameter exploration through Morphological Analysis, followed by persona-based pressure testing through Role Playing. Edge case exploration revealed data integrity rules.
- **Breakthrough Moments:** (1) Paint mode scheduling concept, (2) "Information Surface, Not Rule Engine" principle crystallizing, (3) Half-day leave via existing features instead of new feature, (4) Lateness-OT auto-offset as the only automated rule — everything else is employer-decided.
- **Energy Flow:** Consistently engaged throughout. Quick, decisive responses showing clear vision. Edge case exploration energized the session further.

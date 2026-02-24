---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-02-13.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'saas_web_app'
  domain: 'workforce_management_hrtech'
  complexity: 'medium'
  projectContext: 'greenfield'
---

# Product Requirements Document - SCHEDULER

**Author:** Basestaff
**Date:** 2026-02-19

## Executive Summary

> - **What:** A team coordination layer that unifies scheduling, attendance, and timesheets into one connected experience
> - **Who:** SMB owners and managers (5-50 employees) drowning in manual workforce logistics
> - **Why it wins:** The only product where one action ripples through everything — and employees don't need to download an app

The SMB workforce management segment represents an estimated multi-billion-dollar market growing at 9%+ annually, dominated by tools built for enterprise and scaled down — not built for SMBs from the ground up.

Every Sunday night, thousands of SMB owners sit down to plan next week's coverage — shuffling names in spreadsheets, texting staff across multiple sites, hoping the roster holds. When employees arrive, attendance is tracked on trust alone. Existing tools (Deputy, Homebase, When I Work, Connecteam) address pieces of this problem, but the integration remains architectural, not experiential — data flows between modules in the backend while users still navigate separate pages and workflows. Incumbents built feature-first on legacy architectures — retrofitting experiential integration requires rethinking their entire UX, creating a window for a purpose-built challenger.

SCHEDULER is a team coordination layer for SMBs (5-50 employees, scaling to 200+) that eliminates workforce friction by making scheduling, attendance, and timesheets one connected experience. Primary verticals: food & beverage, retail, cleaning services, and security — shift-based businesses where scheduling pain is acute and the workforce may not be desk-bound. The design philosophy is "information surface, not rule engine" — the system warns about overtime or scheduling conflicts but never blocks business decisions. Critical compliance boundaries (labor law, safety) are enforced; all other constraints surface as guidance. A single action visibly ripples through the system: an owner paints a schedule, employees get notified instantly, clock in via GPS-verified geofence, and timesheets generate automatically — no manual entry at any step. Managers can manually log clock events for exceptions — the system eliminates timesheets, not accountability.

The product is built around three principles: **speed** (designed for sub-3-second interactions across every role), **trust without surveillance** (employers get attendance proof without tracking employees), and **reduced friction through employee input** (availability and preferences flow into scheduling automatically, cutting complaints and no-shows).

> **Owner:** Paint next week's schedule in 4 minutes, then forget about it.
> **Manager:** Morning dashboard — everyone's status at a glance, approvals in 2 taps.
> **Employee:** Get notified, show up, tap clock-in. Done.

**North star metric: workforce logistics reduced from hours of weekly effort and constant mental overhead to minutes of confident, informed decisions.**

**Never fill out a timesheet again.** That's the V1 promise. Schedules created in minutes, attendance verified by location, timesheets generated automatically, leave managed end-to-end. Expense claims and shift swapping are explicit V2 features. Scheduling is the wedge — the owner's highest-frequency pain point. V1 scheduling is paint-mode; demand-first smart proposals come in the Growth phase. Claims (V2) introduce a blue ocean feature no competitor in this space offers, driving daily employee engagement beyond the weekly schedule check. Detailed scope, user stories, and technical requirements follow in subsequent sections.

### What Makes This Special

**The connected workflow is the moat.** Competitors offer scheduling, time tracking, and communication as separate modules behind different tabs. SCHEDULER makes the integration visible: clock-in turns a schedule tile green in real-time, managers operate from a single live dashboard — not a queue of approval pages. No single feature is defensible in isolation; the seamless experience across all of them creates switching cost — once schedules, attendance data, and leave history flow through one system, migration is painful. In Growth phase, expense claims auto-tag with shift context, adding a blue ocean feature that deepens this integration further. Accumulated scheduling history powers increasingly accurate smart-fill suggestions, compounding the advantage over time.

Supporting differentiators:

- **Zero-app adoption path.** The workforce this product serves — cleaners, baristas, retail staff, kitchen workers — may not download another app. SMS schedule notifications and QR-code clock-in at each location provide a complete employee experience without an app install. SMS delivery requires a third-party provider (e.g., Twilio). Employee adoption rate is tracked per account as a product metric.
- **Demand-first scheduling.** An enterprise concept brought downmarket with SMB simplicity. Instead of filling a blank grid, owners describe what they need and the system proposes qualified, available employees. Paint-mode enables rapid manual override; employees can claim open shifts directly (V2), reducing the manager bottleneck.
- **Privacy as a feature.** GPS location is captured only at clock-in/out moments using "while using" permissions. Employers see aggregated verification ("clocked in within geofence at 9:02"), never raw coordinates. Employees can view exactly what location data exists about them. The geofence isn't the innovation — eliminating timesheets is.

## Structured Reference

**Core Entities:** Employee, Schedule, Shift, Location, ClockEvent, Claim (V2), Notification, Department, Role, Group

> **Note:** Timesheets are computed views derived from ClockEvent data, not stored entities. Schedule is a container (e.g., "Week of Feb 24 — Location A") that holds multiple Shifts. Each Shift belongs to an Employee + Location with a time range. Entities listed here represent the domain model. Database schema, API resources, and UI surfaces may group or split these differently — architecture decisions are downstream of this PRD.
>
> **Location cardinality:** Each Location has a name, address, and geofence radius. Shifts belong to a Location. ClockEvents reference the Location where verification occurred. A business may have one or more Locations.

**User Roles & Capabilities:**
- Super Admin (Owner in V1 single-tenant): Full system access, schedule creation, settings, analytics, all approvals
- Manager: Department-scoped schedule management, attendance monitoring, leave approvals
- Employee: View own schedule, clock in/out, submit leave requests, set availability

> **Terminology:** "Owner" and "Super Admin" are used interchangeably throughout this PRD (single-tenant V1). "Employer" is avoided for consistency.

**V1 Feature Manifest:**
- Schedule Builder (paint-mode)
- Employee Availability Management
- GPS Geofenced Clock-In/Out
- Automatic Timesheet Generation (computed from ClockEvents)
- Live Attendance Dashboard (updates via 30-second polling)
- Leave Requests & Approvals (submit, approve/reject/modify, balance tracking)
- Unified Approval Inbox (card-based feed; filter tabs added when multiple approval types exist)
- Push Notifications (in-app + email for critical events)
- Employee & Role Management (CRUD)
- Department & Group Management
- Work Location Management (name, address, geofence radius per location)
- Business Setup Wizard (guided first-time configuration)
- Mobile-Responsive Web (all employee-facing features functional on mobile browsers)

**Growth Phase A Feature Manifest (Revenue & Retention):**
- Expense Claim Submission & Approval
- Overtime Claims with Rate Tiers
- Public Holiday Calendar & Replacement Leave
- Analytics Dashboard

**Growth Phase B Feature Manifest (Expansion & Reach):**
- Demand-First Smart Proposals
- Shift Swap Requests & Open Shift Broadcast
- SMS/WhatsApp Schedule Notifications (requires third-party provider, e.g., Twilio)
- QR Code Clock-In (app-free)
- Payroll Data Export

**Vision Feature Manifest:**
- Smart-Fill Scheduling (AI-powered, requires 6+ months of history data)
- Multi-Location Management
- Employee Retention Insights
- Team Communication Hub
- Mobile Native App (iOS & Android)
- API & Integrations
- White-Label / Multi-Tenant

**Design Principles:**
- Information surface, not rule engine (warn, don't block — except legal compliance)
- Sub-3-second interaction target
- Notification-driven UX
- Role-scoped views (each role sees only relevant actions)

## Project Classification

- **Project Type:** SaaS Web Application (with mobile companion planned)
- **Domain:** Workforce Management / HR Tech
- **Complexity:** Medium — standard CRUD foundation with targeted complexity in real-time elements (live dashboard, push notifications, GPS geofence verification) and multi-role access control (owner, manager, employee)
- **Project Context:** Greenfield — no existing codebase, clean architectural decisions

## Success Criteria

> Owner and employee success are interdependent: owners only save time if employees adopt (self-service reduces manager overhead). Employee adoption only happens if owners set up schedules (the app has no value without a schedule to check).

### V1 Success Criteria

#### User Success

**Owner/Manager Success:**
- 80% of new accounts create a schedule with 5+ shifts within their first session, without contacting support
- Median time from opening Schedule Builder to publishing a weekly schedule: under 10 minutes
- Leave approvals completed in under 5 seconds via notification — no portal navigation required
- Leave request submitted and manager notified in <10 seconds. 80% of leave decisions made within 24 hours (tracked, with nudge if overdue)
- Owner DAU/MAU ratio > 40% — the product is habitual, opened by reflex not reminder

**Employee Success (within 4 weeks of invitation):**
- Leave requests submitted in 3 taps
- Clock-in/out completed with one tap directly from the app — no separate devices or paperwork
- Schedule always known in advance — no more texting the manager
- The app becomes the primary source for schedule and leave information — reducing WhatsApp dependency for work logistics

#### Business Success

**6-Month Targets:**
- Total signup target: ~130-140 businesses over 6 months to net 100+ active (accounting for healthy early-stage churn). Acquisition rate: ~5 new businesses per week on average, requiring a go-to-market strategy defined outside this PRD
- 100+ businesses actively using the platform (at least 1 published schedule per week and >50% employee clock-in rate)
- 1,500-2,000 employee accounts active across all tenants
- Monthly churn below 3% after month 3
- Net Promoter Score > 50
- Product is completely free for V1. Monetization strategy to be defined by month 6 based on usage data and customer interviews

**Quality Signals:**
- Teams are happy — measured through low support ticket volume and high daily active usage
- Product becomes expectation-bound — employees default to the app for schedule, clock-in, and requests without being told
- New businesses operational within 1 day of signup
- 5+ accounts that would actively resist shutdown by month 2 — these are the product-market fit proof points and future case study sources

**Competitive Benchmarks:**
Deputy's average schedule creation takes ~15-20 minutes for a 20-person team (estimated from user reviews). Our <10 minute target represents a 2x improvement. Homebase's free tier has no reported adoption rate benchmark — our 50% employee adoption target sets a measurable standard competitors don't publicly track.

#### Technical Success

- **Uptime:** 99.9%+ availability, excluding scheduled maintenance windows. Unplanned downtime during peak hours (7-10am local time) is a P0 incident
- **Performance (non-GPS):** UI feedback in <200ms. Full server confirmation in <1 second for schedule loading, approvals, page navigation, and all non-GPS operations
- **Performance (GPS):** Clock-in tap shows immediate visual feedback. Location acquisition + geofence verification completes in <3 seconds
- **Data integrity:** Zero data loss. Clock events, schedules, and approval records are immutable once created. Audit trail on all modifications
- **Scalability:** Architecture supports 200+ employees per tenant without performance degradation
- **Security:** Zero critical security vulnerabilities in production. Annual penetration test. SOC 2 readiness by end of Year 1

**P0 Engineering Risk:** GPS reliability across mobile browsers (Android Chrome, iOS Safari) in low-signal environments is the highest technical risk in V1. Budget 20% additional time for GPS testing and fallback mechanisms. Test in real SMB locations (kitchens, basements, warehouses, outdoor sites) before launch.

#### Measurable Outcomes

**Primary Metrics — these five collectively measure the north star (workforce logistics from hours to minutes):**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Schedule publishing time** | **< 10 min median** | **Session analytics** |
| **Employee adoption** | **50% complete 1+ clock-in within 3 weeks** | **Clock-in events / invites** |
| **Business churn (post month 3)** | **< 3% monthly** | **Account + usage tracking** |
| **Businesses onboarded (6 mo)** | **100+ actively using** | **Account + usage tracking** |
| **App uptime** | **99.9%+ (peak hours = P0)** | **Infrastructure monitoring** |

**Supporting Metrics:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-session schedule creation | 80% create 5+ shifts, no support contact | Analytics + support tickets |
| First schedule guided flow completion | > 90% | Onboarding analytics |
| Setup wizard completion | 90% complete within 30 minutes | Onboarding funnel analytics |
| Recurring schedule setup | > 60% of accounts within 2 weeks | Onboarding analytics |
| Adoption intervention | Auto-nudge if <30% adoption after 2 weeks | Automated trigger |
| Daily active employees | > 60% of invited employees | Login + clock-in events |
| Owner DAU/MAU | > 40% | Usage analytics |
| Approval response time | < 5 seconds per action | In-app timing |
| Clock-in success rate | > 95% first-tap success | GPS verification logs |
| Net Promoter Score | > 50 | In-app survey |
| Monetization strategy defined | By month 6 | Usage data + customer interviews |
| Non-GPS interaction speed | < 1 second | Performance monitoring |
| GPS clock-in speed | < 3 seconds | Performance monitoring |

#### Red Lines (Failure Indicators)

| Red Line | Threshold | Response |
|----------|-----------|----------|
| Support tickets per account | > 3/month average | UX audit of pain points |
| Data breach or unauthorized access | Any occurrence | Incident response, disclosure, root cause fix |
| Timesheet computation error | Any occurrence affecting payroll data | P0 fix, manual correction, affected users notified |
| Employee adoption at 4 weeks | < 20% for any account | Manual outreach, potential product-market fit issue |
| Owner churn in month 1 | > 15% | Onboarding flow broken — investigate immediately |
| GPS clock-in success rate | < 85% in any account | P0 — GPS fallback mechanism, geofence tuning |
| First schedule guided flow completion | < 80% | UX audit of schedule builder onboarding |
| Core interaction p95 > 3 seconds (non-GPS) | Any sustained period | Performance investigation triggered |

### V2 Success Criteria (Post-MVP)

#### V2 User Success
- Expense claims submitted in under 15 seconds with receipt photo
- Claim status visible end-to-end: submitted → approved → processing → paid
- OT claims pre-filled from shift data, submitted in under 30 seconds

#### V2 Business Impact
- Claims feature drives 20% increase in employee DAU
- Overtime + holiday management reduces payroll disputes by >50% (user-reported)
- Growth Phase A features reduce monthly churn by additional 1%

#### V2 Technical
- Receipt OCR accuracy > 90% (auto-extracted amount, date, vendor)
- SMS/WhatsApp delivery rate > 90%
- QR code scan-to-clock-in completion in < 2 seconds

## Product Scope

### MVP — Minimum Viable Product

The smallest thing that proves the connected workflow thesis:

- **Schedule Builder** — Paint-mode scheduling with role assignment, conflict warnings, and recurrence
- **Employee Availability** — Employees set their available days/times, visible during scheduling
- **GPS Geofenced Clock-In/Out** — One-tap attendance verification, automatic timesheet computation
- **Live Attendance Dashboard** — Live view of who's here, who's late, who's missing (30-second polling updates)
- **Leave Requests & Approvals** — Submit, approve/reject/modify, balance tracking (included in MVP because leave approval is a core owner success signal)
- **Unified Approval Inbox** — Card-based feed for leave requests (filter tabs added when multiple approval types exist in Growth phase)
- **Push Notifications** — Schedule published, shift changes, approval decisions
- **Employee & Role CRUD** — Invite flow, role creation with color/icon, department assignment
- **Department & Group Management** — Organizational structure for filtering schedules and scoping manager access
- **Mobile-Responsive Web** — All employee-facing features fully functional on mobile browsers
- **Read-Only Schedule Link** — Invited employees can view their schedule via shared link without creating an account. Zero-friction first touch for adoption
- **Work Location Management** — Create locations with geofence radius for GPS verification
- **Business Setup Wizard** — Guided first-time configuration (business name, cadence, location, roles)
- **Role-Scoped Views** — Each role (owner, manager, employee) sees only relevant actions and data

> **Note:** Functional requirements (FR1-FR70) provide the complete capability contract for MVP scope. See the FR Traceability Map for explicit mappings between capability areas and their source sections.

**MVP validation question:** Does the owner spend less time on workforce logistics AND do employees adopt without being forced?

### Explicitly Excluded from MVP

- Overtime claims and rate tiers
- Expense claims and receipt capture
- Replacement leave / public holiday management
- Shift swap and open shift broadcast
- SMS/WhatsApp notifications (push only in MVP)
- QR code clock-in
- Analytics dashboard and reporting
- Payroll data export
- Smart-fill / demand-first proposals (paint-mode only in MVP)

### Growth Phase A (Revenue & Retention)

- **Expense Claims** — Receipt photo capture, auto-categorization, approval workflow, status tracking
- **Overtime Claims** — Time-based submission with rate tiers and lateness auto-offset
- **Public Holiday Calendar & Replacement Leave** — Holiday management with claim-based replacement leave
- **Analytics Dashboard** — OT summaries, lateness trends, leave usage charts

### Growth Phase B (Expansion & Reach)

- **Shift Swap / Open Shift Broadcast** — Employee-initiated shift changes, open shift claiming
- **Demand-First Smart Proposals** — System suggests qualified employees based on availability and history
- **SMS/WhatsApp Schedule Notifications** — Zero-app employee path
- **QR Code Clock-In** — Location-based, no app required
- **Payroll Data Export** — Hours, overtime, attendance as structured data for payroll systems

### Vision (Future)

- **Smart-Fill Scheduling** — Requires 6+ months of scheduling history to produce meaningful suggestions
- **Multi-Location Management** — Unlocked when customer base grows beyond single-location SMBs
- **Employee Retention Insights** — Requires attendance + scheduling correlation data over time
- **Team Communication Hub** — Replaces WhatsApp group entirely; depends on high employee adoption first
- **Mobile Native App** — iOS & Android with full feature parity; justified when mobile web usage exceeds 60%
- **API & Integrations** — POS systems, accounting software, payroll providers; driven by customer integration requests
- **White-Label / Multi-Tenant** — Franchise and agency support; requires architectural maturity

## User Journeys

> **Timing context:** The Executive Summary's "4 minutes" refers to steady-state recurring weeks. The success metric of "under 10 minutes" is the median across all schedule events including first-timers. First-time schedule creation takes ~15-20 minutes (guided); subsequent weeks take 2-4 minutes with recurring templates.

> **Manager role note:** Diana's journey applies to teams of ~10+ employees. Below that threshold, Rachel handles everything directly. The product works perfectly with zero managers assigned — the manager role is an optional scaling layer.

### Journey 1: Rachel — The Café Owner (Super Admin)

**Who she is:** Rachel owns a café with 12 employees across morning and evening shifts. Every Sunday she juggles a spreadsheet and a group chat to figure out next week's coverage. She spends 45 minutes building the schedule, then another 30 minutes texting it out and fielding "can I swap?" replies.

**Opening Scene — Setup (One-Time)**

Rachel signs up and hits the setup wizard. She names her business, picks her scheduling cadence (weekly works for her café — the cleaning company down the street does bi-weekly), creates her location with a geofence radius, and defines her roles: Barista, Kitchen, Floor. Each role gets a color. She invites her 12 employees by email — each gets a schedule preview link immediately and a full invite to create their account.

First-time schedule creation takes ~15-20 minutes with the guided flow. She drags across Monday 9-5 and assigns Sarah (Barista). Drags again for James (Kitchen). Conflict warnings appear as soft yellow badges — "Sarah has low availability on Wednesdays" — but never block her decisions. She fills the week, sets it to recur, and taps **"Share Schedule."**

The schedule card transforms: "12 notified." A row of employee avatars appears — colored means viewed, grey means pending. Rachel puts down her phone.

**Climax — First Monday Morning**

This is the moment that determines whether Rachel stays or churns. She pulls out her phone at 8:55am between coffee orders. The team status screen shows: Sarah — here. James — here. Marcus — pending. Six more green. She puts the phone away. By 9:10am, a quiet notification: "All 8 scheduled employees clocked in." She exhales. The system works.

She didn't sit at a computer watching a dashboard. She glanced at her phone for 10 seconds. If 3 people were missing, she'd have gotten a push notification she didn't have to seek out. The status screen is for investigation, not monitoring.

**Rising Action — The Weekly Rhythm**

Week 2: Rachel opens the recurring schedule. Two adjustments — Marcus can't do Thursday, Aisha covers. Drag, drop, share. 3 minutes. The schedule card shows "12 notified" again. By Tuesday, all 12 have viewed it.

Wednesday, 48 hours before the schedule period and 2 employees haven't viewed next week's schedule. Rachel gets a single notification: "2 team members haven't seen next week's schedule — [View who]." She taps, sees the names, taps "Remind" next to each. One action, not a workflow.

**Amendment Flow:** Rachel realizes she needs to change Marcus's Tuesday from 9-5 to 11-7. She edits the published schedule, sees a diff preview ("Marcus: ~~9:00-5:00~~ → 11:00-7:00"), and confirms. Diana (Marcus's manager) gets notified first. Then Marcus receives a clear notification with the change highlighted.

**Leave approval:** A notification appears — "Marcus requests Thursday off (personal)." Rachel sees coverage impact — who else is available that day. She approves with one tap. Marcus's shift shows "Day Off" instead of disappearing.

**Resolution — The Payroll Exhale (Monthly)**

End of month. Rachel opens the timesheet view. Every employee's hours are computed automatically from clock events — broken down by day, with break deductions applied per her settings (1-hour unpaid break for shifts over 6 hours). She downloads the totals and sends them to her bookkeeper. No manual compilation. No arguing about hours. No crumpled paper timesheets.

This is the **"never fill out a timesheet again"** promise delivered. It happens once a month, but it's the moment that makes Rachel tell other business owners about SCHEDULER.

**Adoption Monitoring:** Rachel's employee list shows two simple states: **Active** (has account, clocking in) and **Invited** (pending). The schedule card's viewed/pending avatars give her passive adoption visibility. She doesn't chase employees — the product nudges them.

**Settings she configured once and forgot:** Scheduling cadence (weekly), geofence radius, break deduction rules, her usual publish day (Sunday). The system tells employees "Rachel usually posts next week's schedule by Sunday."

---

### Journey 2: Diana — The Morning Shift Manager (Safety Net)

**Who she is:** Diana manages the morning crew at Rachel's café — 6 of the 12 employees. She's not the owner, but she's the one who catches problems before Rachel sees them. She handles the exceptions Rachel doesn't want to deal with.

**Opening Scene — The Morning Glance**

7:50am. Diana opens the app on her phone. She sees her team — not the whole café, just her 6. The status screen shows who's expected, who's clocked in, who's late. Four green, two pending. She knows Marcus is always cutting it close. The other pending is Aisha — first week.

By 8:05am, Marcus clocks in. One pending remains. Diana walks over to Aisha, who's in the kitchen but hasn't clocked in yet. "Open the app, tap the green button." Done.

**Rising Action — Handling Exceptions**

Diana's real value is the 3-4 times per week something doesn't go as planned:

- **Missed clock-in:** James started his shift but forgot to tap in. Diana opens his name, taps "Mark as arrived," confirms the time. The clock event appears on James's timesheet tagged "Logged by Diana (Manager)" — visible to James, Diana, and Rachel. Full transparency, no hidden edits.

- **Same-day coverage:** Sarah calls in sick at 7am. Diana sees the gap on her team status. She opens the schedule builder, finds an available employee for Sarah's shift, drags them in. The replacement gets notified immediately.

- **Leave approval:** Marcus requests next Friday off. Diana sees the request with coverage context — who else is scheduled that day, who's available. She approves. Marcus's Friday shift shows "Day Off."

- **Auto-clock-out:** Marcus forgot to clock out yesterday. The system already handled it — notification sent at shift end +15 minutes, auto-clock-out at shift end +1 hour tagged "System-generated." Diana reviews and adjusts the time if needed.

Diana notices patterns through daily use — Marcus has been late 3 times this week. She doesn't get an automated alert (that's Growth Phase A Analytics). She just notices from the daily status screen and has a conversation.

**Connection to Rachel:** When Rachel amends a schedule in Diana's department, Diana gets notified before the affected employees. She's never surprised by changes to her team. Diana extends Rachel's capacity — she's the safety net that lets Rachel manage 12 people without being in the weeds.

**New team member:** When Aisha creates her account, Diana gets a notification: "Aisha joined your team." On Aisha's first day, Diana is the human onboarding touchpoint — she walks Aisha through her first clock-in at the location.

---

### Journey 3: Marcus — The Daily Habit (Employee)

**Who he is:** Marcus is a barista at Rachel's café. He works 5 days a week, mostly morning shifts. Before SCHEDULER, he'd check the WhatsApp group for next week's schedule, sometimes miss a message, and occasionally show up on the wrong day.

**Opening Scene — Monday Morning**

Marcus opens the app. One screen. One card:

> **Today — Monday**
> 9:00 AM – 5:00 PM · Barista · Downtown Café
> Aisha and James are also working today.
>
> **[ I'm Here ]**

That's it. No menu to navigate, no tabs to figure out. His thumb is already over the button. He taps **"I'm here."** The app checks he's at the café — he doesn't know or care how. Green check. He's clocked in.

The card transforms. The button becomes a subtle timer counting his shift. The header changes from "Today" to "In Progress." Below it, a second card appears: his next shift (Wednesday 9-5). Marcus never wonders "when do I work next?" — it's always one glance away.

**The Habit Loop — Day 30**

Marcus's value isn't day 1. It's day 30, when checking the app is reflexive. His daily loop:
1. Open app → see today's shift → tap "I'm here" (morning, 5 seconds)
2. End of shift → tap "Done" (evening, 3 seconds)
3. Mid-week → toggle to "Next Week" to check upcoming schedule (30 seconds)

If Rachel hasn't shared next week's schedule yet, Marcus sees: "Rachel usually posts by Sunday." No anxiety, no need to text.

**Day Off Request**

Marcus wants next Thursday off. He taps "Request Day Off," picks Thursday, selects "Personal," adds an optional note, sends. Three taps. Diana gets a notification. Within a few hours, Marcus gets a notification back: "Approved — Thursday is your day off." His Thursday shift shows "Day Off" on the schedule.

If Diana rejects it: "Declined — short-staffed that day. Can you do Friday instead?" Marcus sees the reason. He can submit a new request for Friday or talk to Diana directly. No black-box rejections.

**Schedule Change — The Trust Moment**

Rachel changes Marcus's Tuesday from 9-5 to 11-7. Marcus gets a clear notification:

> "Your Tuesday shift changed: ~~9:00 – 5:00~~ → 11:00 – 7:00"

He sees exactly what changed. He doesn't need to re-check the full schedule or wonder if anything else moved. This notification is the most trust-sensitive moment in the product — if it's unclear, delayed, or missed, Marcus shows up at the wrong time and blames the app.

**The Timesheet He Never Fills Out**

End of pay period. Marcus checks his hours out of curiosity — they're all there. Computed from his clock-ins and clock-outs, break deductions applied automatically. He didn't fill out a single timesheet. He didn't argue about hours. The system tracked it all from the same button he taps every morning.

Marcus knows Rachel can see his status — on time, late, or missing. He's fine with that. It's better than being called to check in. The transparency goes both ways: if Diana manually logged a clock-in for him (because he forgot), it shows on his timesheet as "Logged by Diana." No hidden edits.

**What Marcus doesn't do:** He doesn't navigate a complex app. He doesn't manage a profile. He doesn't configure settings. His entire experience is: see shift → tap in → tap out → check next week → request days off. The employee home screen is the simplest page in the app — two queries, sub-200ms even on a slow connection.

---

### Journey 4: Aisha — The Zero-Friction New Hire (Onboarding)

**Who she is:** Aisha just got hired at Rachel's café. She starts next Monday. She's worked service jobs before — she's used to checking a WhatsApp group or a photo of a pinned schedule for her hours.

**Before Day One — The Preview**

Rachel adds Aisha to the system and selects "Invite." Aisha immediately receives a text or email with a link: "Here's your schedule at Downtown Café."

Aisha taps the link on her phone. A web page loads — no app install, no account needed. She sees:

> **Your Schedule — Downtown Café**
> Monday 8:00 AM – 4:00 PM · Barista
> Wednesday 8:00 AM – 4:00 PM · Barista
> Friday 9:00 AM – 3:00 PM · Barista

At the top, a soft banner: "Create your account to clock in and request days off — takes 30 seconds."

Aisha screenshots the schedule. She now knows when she works before her first day. Zero friction.

**Account Creation — Day One**

Aisha arrives Monday morning. Diana greets her: "Open the link again and create your account — you'll need it to clock in." Aisha taps the banner, sets a password, done. One screen. She's active.

The app asks to use her location. She taps "Allow." Diana says: "Now tap 'I'm here.'" Green check. First clock-in complete.

Diana gets a notification: "Aisha joined your team."

**The Stuck-at-Preview Variant**

Not all employees convert on day one. Some plateau at the preview link — they can see their schedule, which solves their immediate need. They don't create an account because the preview "works fine."

These employees can't clock in through the app. Diana marks them as arrived manually until they convert. The preview page continues showing the soft banner. Rachel's employee list shows them as "Invited" — she doesn't chase them, but she can see the gap.

The most common conversion trigger: the first time they need to request a day off. That requires an account. The preview page can't submit requests.

For employees without smartphones at work (rare, but real in kitchens and cleaning crews), Diana's manual clock-in is the V1 solution. QR code clock-in (Growth Phase B) addresses this more fully.

---

### Journey Requirements Summary

> **Note:** These journey-derived requirements are the source material for the Functional Requirements section (FR1-FR70). See the FR Traceability Map after the FR section for explicit mappings.

**Schedule Builder:**
- Paint-mode (drag-to-schedule) with role assignment and soft conflict warnings
- Flexible scheduling cadence (weekly default, configurable in setup)
- Recurring templates with quick adjustments
- Unpublish available anytime before schedule period starts
- Schedule card as live status: viewed/pending employee avatars
- 48-hour unviewed nudge with one-tap remind per employee
- Schedule amendment with diff preview → manager notified first → employee notified second

**Attendance & Clock Events:**
- One-tap clock-in ("I'm here" button) with GPS as default verification
- GPS is the default method, never a blocker — manual fallback always available
- Manual "mark as arrived" by manager (tagged with manager name, transparent to all parties)
- Auto-clock-out: notification at shift end +15 min, auto at +1 hour with "System-generated" flag
- Configurable break auto-deduction in company settings (e.g., "1-hour unpaid break for shifts over 6 hours")

**Employee Home Screen:**
- "Today + Next" view: current/upcoming shift card with clock-in button
- Shift card state transformation: Upcoming → Clock In → In Progress (timer) → Completed
- This Week / Next Week toggle for schedule browsing
- If next week not yet shared: "Rachel usually posts by Sunday"
- Co-workers on same shift listed as ambient context (not a separate roster page)
- Sub-200ms load target — simplest page in the app (two queries)

**Day Off (Leave) Management:**
- Request in 3 taps: pick date → pick reason → send
- Approval with coverage impact visibility for manager
- Rejection includes reason and alternative suggestion
- Approved days show "Day Off" on schedule (shift not removed)
- 5-second undo toast on approval actions (prevents accidental swipe-approves on mobile)

**Onboarding & Adoption:**
- Schedule preview link (read-only, no account required) as zero-friction first touch
- Persistent soft banner on preview page: "Create your account to clock in and request days off"
- Clock-in as primary conversion trigger (day one), leave as secondary trigger
- Email invite → one-screen account creation (set password)
- Manager notified when new team member creates account
- Manager walks new employee through first clock-in on location
- Two invite states only: Invited / Active
- Employee list shows adoption status; schedule card shows viewed/pending

**Notifications:**
- Schedule shared → employees notified
- Schedule amended → manager notified first → affected employees notified with clear diff
- Clock-in missing at shift start → employee reminded
- Auto-clock-out triggered → employee informed
- Day off decision → employee notified with reason
- New team member joined → manager notified
- 48-hour unviewed schedule → owner nudged
- Multiple employees missing at shift start → owner push notification (proactive alert)

**Team Status (Dashboard):**
- Owner/manager sees status: On Time / Late / Missing (not exact timestamps on overview)
- Detailed view has timestamps (needed for timesheets)
- Designed for 10-second phone glance, not desktop real-time monitoring
- Push notification for problems; screen for investigation

**Timesheets:**
- Auto-computed from clock events with break deductions applied
- Manual clock events tagged with who logged them
- Monthly payroll export — download totals for bookkeeper

**Settings (configured once):**
- Scheduling cadence (weekly/bi-weekly/custom)
- Geofence radius per location
- Break deduction rules per shift length
- Owner's usual publish day (shown to employees as expectation)

### User-Facing Language Guide

> Journeys use product terminology for precision. User-facing UI should follow this mapping:

| Internal Term | User-Facing Language |
|---------------|---------------------|
| Publish schedule | Share schedule / Send to team |
| Dashboard | Team status / Morning check |
| Department-scoped | My team |
| Manual clock-in / clock event | Mark as arrived / Log attendance |
| GPS-verified geofence | The app checks you're at work |
| Leave request / leave balance | Day off request / Days off remaining |
| Paint-mode | Drag-to-schedule |
| Read-only schedule link | Schedule preview link |
| Shift card state transformation | The card updates as your day progresses |

## Innovation & Competitive Position

### The Core Architectural Insight

SCHEDULER's genuine innovation is not a feature — it's a data model decision. **Schedule, attendance, and timesheet are one entity at three points in time:**

```
PLANNED (Schedule)  →  ACTUAL (Clock Event)  →  COMPUTED (Timesheet)
        Person + Time + Location at three temporal stages
```

Existing tools inherited a three-module architecture from enterprise HR systems built when these genuinely were separate systems (paper schedules, hardware time clocks, spreadsheet timesheets). They model schedules, clock events, and timesheets as three separate data domains with integration logic between them.

SCHEDULER models a shift as a single entity with state transitions. At the application architecture level (API design and frontend state), one endpoint returns a shift with its current state and all associated data. One UI component renders a shift tile that updates in real-time as state changes. This unified model makes single-surface UX an inevitable consequence of the architecture, not a design overlay.

> **Honest scope of advantage:** This is an application architecture advantage (API + frontend), not a database schema difference. Incumbents would need to rebuild their API layer and frontend architecture to replicate it — estimated 6-12 months for a well-resourced team. It is not a multi-year structural moat.

### What This Produces

- **Single-surface UX:** The schedule view IS the attendance view IS the timesheet source. No modules to switch between, no tabs to navigate. The user sees one surface that updates as reality unfolds.
- **Real-time shift status:** A clock-in updates the shift's state, which the UI already has open. No cross-module event propagation needed.
- **Zero-input timesheets:** Hours are a computation on the same entity, not a data transfer between systems.
- **Faster development velocity:** Changes to the unified model propagate naturally. No coordination across three separate module teams.

### Competitive Positioning (Honest Assessment)

**Where SCHEDULER leads:**

| Dimension | Gap vs. Closest Competitor |
|-----------|---------------------------|
| UX integration (single-surface) | +2-3 points vs. all competitors. No incumbent has this. |
| Employee adoption friction | +2 vs. Homebase (closest). Graduated funnel: preview → need → account. |
| Greenfield execution speed | Temporary: 6-12 month window to establish switching cost. |

**Where competitors lead or match:**

| Dimension | Reality |
|-----------|---------|
| Scheduling speed | Table stakes. Homebase and When I Work already competitive. |
| Timesheet computation | Deputy and Homebase already compute from clock events. |
| Data-driven features | Deputy has auto-scheduling and demand forecasting — years ahead. |
| Warn vs. block philosophy | Homebase has similar practical approach with different defaults. |

**Where no one leads yet:**
- GPS clock-in, push notifications, drag-and-drop scheduling — commoditized features across the segment.

### Long-Term Defensibility

The architectural advantage is temporary (6-12 months). Long-term defensibility comes from standard SaaS dynamics, honestly stated:

1. **Switching cost:** Once 100+ businesses have schedules, clock events, leave balances, and employee data in SCHEDULER, migration is painful regardless of competitor UX improvements.
2. **Customer relationships:** SMBs don't switch tools for marginal improvements. They switch when the current tool fails them. If SCHEDULER works, inertia keeps them.
3. **Iteration velocity:** If the unified architecture makes development faster (one model, not three with sync), SCHEDULER ships features faster than competitors refactoring legacy code. The greenfield advantage compounds into velocity advantage.
4. **Scheduling data accumulation:** Every week of scheduling data improves recurring templates and (in Growth phase) powers smart-fill suggestions. 6+ months of history creates compounding value — but Deputy has a multi-year head start on data-driven features.

### Validation Approach

The innovation thesis is validated if:
- **Schedule → attendance → timesheet flows as one experience** in user testing (no "where do I find my timesheet?" support tickets)
- **First-session schedule creation under 10 minutes** without support (the UX simplicity produces measurable speed)
- **50% employee adoption within 3 weeks** (the low-friction funnel converts)
- **Zero "module switching" complaints** in user feedback (the single-surface is invisible — users don't notice it because there's nothing to notice)

### Risk: What If the Innovation Doesn't Matter?

If users don't perceive single-surface UX as meaningfully better than Deputy's tabbed modules, SCHEDULER is a late entrant with fewer features competing on "it's simpler." The fallback position:
- **SMB-first positioning still holds.** Deputy is overbuilt for a 12-person café. Simplicity is a value proposition even without architectural innovation.
- **Price competition.** A simpler product should be cheaper to build and maintain. Free tier for micro-businesses (≤5 employees) that competitors don't match.
- **Pivot to vertical specialization.** If horizontal SMB is too competitive, narrow to one vertical (food & beverage, cleaning services) and build deep domain features competitors won't justify.

## SaaS Web Application Requirements

### Pricing Model

The product is **completely free for V1.** No subscription tiers, no feature gating, no usage limits. Monetization strategy will be defined by month 6 based on usage patterns, customer feedback, and willingness-to-pay interviews. Infrastructure cost is ~$40-60/month — not a constraint.

### Architecture Overview

**Type:** Multi-page application (server-rendered) with client-side interactivity where needed.

**Stack:** Next.js App Router (server components + selective client hydration). Server-first rendering for fast initial loads. Client-side interactivity for schedule builder, live status updates, and form interactions.

**Tenancy Model:**
- V1: Single-tenant architecture with `tenant_id` on all database tables for future multi-tenancy readiness
- Prisma middleware auto-injects tenant_id filter on every query — developers never write tenant-scoped queries manually
- Tenant ID extracted from authenticated user's JWT claims, never from request parameters
- Code review policy: raw SQL without tenant scoping is a blocking review finding
- Migration to schema-per-tenant or database-per-tenant possible later by changing middleware, not application code

### Architecture Decision Records

**ADR-001: Rendering Strategy → Hybrid (Next.js App Router)**
- Server components by default for fast initial loads and minimal client JS
- Client components explicitly opted-in for: schedule builder grid, live attendance status, interactive forms, notification feed, approval inbox
- Preview link page is a pure server component shipping zero JavaScript
- Consistent with user's MPA intent (fast, server-first) while enabling required interactivity

**ADR-002: Real-Time Updates → Polling (30-second interval)**
- Update frequency is low (~20 clock events per day for a 12-person team)
- 30-second polling on team status page; 60-second polling on schedule card viewed/pending count
- Polling pauses when browser tab is hidden (Page Visibility API)
- API response shape is transport-agnostic — SSE can replace polling in Growth phase without frontend changes

**ADR-003: Tenant Isolation → Shared Database with tenant_id**
- Single PostgreSQL instance, single deployment, lowest infrastructure cost
- Prisma middleware enforces tenant scoping — no raw queries without explicit tenant filtering
- All tables include tenant_id from day one (future-proofing)
- Appropriate for target scale: 100 businesses, ~2,000 employees, ~5GB data in year one

**ADR-004: Offline Clock-In → Optimistic UI with localStorage Retry**
- GPS coordinates captured at moment of tap, not at retry time
- UI shows immediate success (optimistic); API call queued in localStorage if offline
- On reconnect, retry with original payload (original timestamp and GPS)
- Failed geofence verification after retry: flagged for manager review AND employee notified ("Your clock-in couldn't be verified — your manager has been notified")
- Schedule viewing does NOT work offline in V1 (no Service Worker caching)

**ADR-005: Schedule Builder → Custom React + CSS Grid**
- Core product interaction — must match exact UX vision with no library opinions
- Pointer events for cross-platform support (mouse + touch)
- V1 scope: paint-create + assign + conflict warnings + recurring copy + keyboard navigation
- Post-launch (weeks 2-3): resize, move, copy-day, bulk-edit
- Must explicitly implement: ARIA grid role, keyboard navigation (arrow keys, Enter, Escape), screen reader announcements
- Desktop-primary. Tablet touch support. Phone shows read-only schedule view (builder not functional on small screens)

### RBAC Permission Matrix

| Capability | Super Admin (Owner) | Manager | Employee |
|-----------|:---:|:---:|:---:|
| Create/edit schedules (all departments) | Yes | — | — |
| Create/edit schedules (own department) | Yes | Yes | — |
| Share schedule to team | Yes | Yes | — |
| Unpublish schedule | Yes | — | — |
| View all employees | Yes | — | — |
| View department employees | Yes | Yes | — |
| Invite/archive employees | Yes | — | — |
| Assign roles to employees | Yes | — | — |
| Create/edit roles | Yes | — | — |
| Create/edit departments | Yes | — | — |
| Assign department managers | Yes | — | — |
| Create/edit groups | Yes | Yes | — |
| Approve/reject day off requests | Yes | Yes (own dept) | — |
| Mark employee as arrived (manual clock-in) | Yes | Yes (own dept) | — |
| View attendance status (all) | Yes | — | — |
| View attendance status (own dept) | Yes | Yes | — |
| View/export timesheets | Yes | Yes (own dept) | — |
| Clock in/out (self) | — | Yes | Yes |
| View own schedule | — | Yes | Yes |
| View own timesheet | — | Yes | Yes |
| Request day off | — | Yes | Yes |
| Set availability | — | Yes | Yes |
| View schedule preview (unauthenticated) | — | — | Via link |
| Company settings | Yes | — | — |
| View audit log | Yes | — | — |

> Manager permissions scoped to assigned department. No department = no management permissions. Super Admin has all permissions regardless.

### Browser Support

| Browser | Version | Priority | Notes |
|---------|---------|----------|-------|
| Chrome (Android) | Latest 2 | **P0** | Primary employee clock-in. GPS critical. |
| Safari (iOS) | Latest 2 | **P0** | Primary employee clock-in. GPS critical. |
| Chrome (Desktop) | Latest 2 | P1 | Owner/manager scheduling and dashboard |
| Safari (Desktop) | Latest 2 | P1 | Owner/manager on Mac |
| Firefox (Desktop) | Latest 2 | P2 | Secondary desktop browser |
| Edge (Desktop) | Latest 2 | P2 | Chromium-based |

No legacy browser support. No polyfills for deprecated APIs.

### Responsive Design

- **Mobile-first** for employee pages (clock-in, schedule view, day off requests)
- **Desktop-optimized** for owner/manager pages (schedule builder, team status, settings)
- **Breakpoints:** Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)
- **Schedule builder:** Desktop-primary with tablet touch support. Not functional on phone — phone users see read-only schedule view
- **Bottom navigation** on mobile; sidebar navigation on desktop

### Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | Server-rendered pages |
| Largest Contentful Paint | < 2.5s | Schedule view with shift tiles |
| Time to Interactive | < 3.0s | Employee home screen tappable fast |
| UI feedback | < 200ms | Button presses, form interactions |
| Server response (non-GPS) | < 1s | API calls for schedules, approvals, navigation |
| GPS clock-in (end-to-end) | < 3s | Location acquisition + verification + confirmation |
| Employee home screen | < 200ms | Two queries, server component |
| Core Web Vitals (CLS) | < 0.1 | No layout shift on schedule tiles |

### SEO Strategy

- **Marketing/landing pages:** Full SEO (meta tags, structured data, OpenGraph, sitemap)
- **Schedule preview links:** OG meta tags for social sharing preview. Not indexed (`noindex`).
- **Authenticated app pages:** `noindex, nofollow`. No SEO investment.

### Accessibility (WCAG 2.1 AA)

**P0 — Ships with V1:**
- Color contrast 4.5:1 on all text and interactive elements
- Touch targets ≥44px on all buttons (clock-in button full-width on mobile)
- Keyboard navigation on schedule builder grid (arrow keys, Enter, Escape)
- Form labels, error announcements, focus management on modals
- Semantic HTML throughout. Radix UI primitives for accessible dialogs/dropdowns
- Automated axe-core checks in CI pipeline
- Manual keyboard-navigation pass on 4 critical flows (login, schedule builder, clock-in, day off request)

**P1 — Within 30 days post-launch:**
- Full screen reader testing and ARIA optimization
- Skip navigation links
- High contrast mode support
- `prefers-reduced-motion` respect
- ARIA live regions for real-time status updates

### Security Requirements

**Authentication (P0 — launch):**
- Refresh tokens in httpOnly cookies (Secure, SameSite=Strict). Access tokens in memory only (never persisted).
- Password reset: UUID v4 token, single-use, 1-hour expiry, 3 requests per email per hour
- Invite tokens: UUID, single-use, 7-day expiry, revokable by admin
- Session revocation on employee archive (delete refresh token hash immediately)
- Identical error messages for wrong password vs. unknown email (prevent enumeration)
- Minimum password strength for Super Admin (12+ chars)

**Authentication (P1 — within 30 days):**
- Login audit trail (success/failure, IP, user agent)
- 5 failed logins → 15-minute lockout + Super Admin alert
- MFA for Super Admin (flagged as V1 security gap — Growth phase delivery)

**Authorization (P0):**
- Tenant ID from JWT claims only, never from request parameters
- Department scoping enforced at service layer, not UI
- Role assignment restricted to Super Admin-only endpoint
- API returns only requesting user's own data for employee role (never filter on client)
- Zod DTO validation, whitelist fields, strip unknown parameters

**GPS Data (P0):**
- Store verification result (WITHIN_GEOFENCE, OUTSIDE_GEOFENCE, GPS_UNAVAILABLE) on clock event table, NOT raw coordinates
- Raw coordinates in separate `location_verification` table, Super Admin access only
- Employees see own verification results, never raw coordinates
- Managers see status (On Time / Late / Missing), never coordinates or verification details

**GPS Data (P1):**
- Raw coordinates auto-deleted after 90 days. Verification results retained with clock events.
- Privacy disclosure during GPS permission + accessible in app settings
- Location data deleted on employee archive (raw immediately, results after 12 months)
- Mock location detection (Android): flag for manager review, never reject

**API Security (P0):**
- SameSite=Strict cookies for CSRF protection
- Content-Security-Policy header
- Request body size limit (1MB)
- Clock events append-only. Adjustments reference originals with actor ID.
- Audit log immutable — no DELETE endpoint

**API Security (P1):**
- CSRF tokens on state-changing endpoints (belt-and-suspenders)
- Rate limiting: auth endpoints (10/min), clock-in (per tenant+user), global (100/min)

### Infrastructure

- **Database:** Managed PostgreSQL with automated daily backups, 30-day retention, point-in-time recovery
- **Cache/Sessions:** Redis (small instance, rate limiting + session storage)
- **Hosting:** Platform with zero-downtime deploys (Vercel, Railway, or equivalent)
- **Email:** Transactional SMTP provider (Mailgun, SES, or equivalent)
- **Estimated cost:** ~$40-60/month for 100 businesses, 2,000 employees
- **Uptime target:** 99.9%+ achievable with managed services + zero-downtime deploys + health monitoring

### Background Jobs

| Job | Trigger | Frequency |
|-----|---------|-----------|
| Unviewed schedule nudge | 48 hours after schedule shared, employees with no `viewed_at` | Check hourly |
| Auto-clock-out | Active shift past end time + 1 hour with no clock-out | Check every 15 minutes |
| Missing clock-in reminder | Shift start + 15 minutes, no clock-in event | Check every 5 minutes |
| Leave approval nudge | Pending leave request older than 24 hours | Check hourly |

### Employee Availability Data Model

- Employees set weekly recurring availability (available/unavailable per day + optional time range)
- Surfaced in schedule builder as soft conflict warning when scheduling during unavailable times
- Owner/manager can override with warning — consistent with "information surface, not rule engine"
- Availability is a preference, not a constraint — the system never blocks based on availability

### Approval Feed (V1)

- Card-based feed showing pending leave requests
- Swipe-to-approve on mobile, button click on desktop
- 5-second undo toast on approval actions (prevents accidental swipe-approves)
- Single approval type in V1 (day off requests). Architecture supports additional types (expense claims, shift swaps) in Growth phase
- No filter tabs until multiple approval types exist

### V1 Integration Boundaries

| Integration | Status | Notes |
|-------------|--------|-------|
| Email (SMTP) | **Included** | Invites, notifications, password reset |
| Browser Geolocation API | **Included** | GPS clock-in verification |
| Third-party OAuth | Excluded | Growth phase consideration |
| Payroll export | Excluded | Growth Phase B |
| Calendar sync | Excluded | Not V1 |
| SMS/WhatsApp | Excluded | Growth Phase B |
| Payment/billing | Excluded | Product is free |

### Implementation Phasing

| Component | V1 Launch | Post-Launch (Weeks 2-3) | Post-Launch (30 Days) |
|-----------|-----------|------------------------|----------------------|
| Schedule builder | Paint-create, assign, recurring copy, keyboard nav | Resize, move, copy-day, bulk-edit | — |
| Security | All P0 items | — | All P1 items |
| Accessibility | P0 (contrast, touch targets, keyboard, semantic HTML, axe-core CI) | — | P1 (screen reader, reduced motion, ARIA live regions) |
| Preview link | Pure server component, zero JS, OG meta tags | — | — |
| CSV timesheet export | Basic CSV download | — | Formatted export with period summaries |

## Project Scoping & Development Phases

### MVP Strategy

**Approach:** Incremental launch, not big bang. Ship in progressive milestones where each milestone is independently usable. Get real users on the scheduling module while clock-in and leave management are still being built.

**Team:** Solo developer. This shapes every scoping decision — no parallel workstreams, no feature negotiations between team members. One person, one priority at a time.

**Guiding question for every feature:** "Does this need to exist for Rachel to create a schedule, for Marcus to clock in, and for timesheets to compute automatically?" If no, it ships later.

### Development Phases

#### Phase 1: Foundation (Weeks 1-4)

*Auth, employee management, basic structure. Not user-facing yet.*

- Authentication (login, password reset, invite flow with set-password)
- Employee CRUD with role assignment
- Role management (name, color, icon, short code)
- Department management with manager assignment
- Group management with member assignment
- Work location management (name, address, geofence radius per location)
- Company settings (scheduling cadence, geofence radius, break deduction rules: 30min / 1h / 2h unpaid configurable)
- Web shell (dashboard layout, sidebar nav desktop, bottom nav mobile, responsive breakpoints)
- Notification infrastructure (in-app + email for critical events)
- Audit log (append-only, Super Admin access)
- Business setup wizard (guided first-time configuration)
- Prisma schema with tenant_id on all tables, seed data

**Milestone:** Owner can sign up, complete guided setup (business name, location, roles), log in, create employees, define roles and departments, manage locations, and configure settings. Invite emails send. Not yet usable for end users.

#### Phase 2: The Schedule (Weeks 5-8)

*First testable milestone. Rachel can schedule her team.*

- Schedule builder (paint-create + assign employee + assign role + soft conflict warnings)
- Recurring schedule copy ("copy last week")
- Employee availability (weekly recurring pattern, surfaced as soft warnings in builder)
- Share schedule to team (push notification to all assigned employees)
- Schedule preview link (pure server component, zero JS, OG meta tags)
- Schedule card with viewed/pending avatar stack (viewedAt timestamp on employee-schedule junction)
- Unpublish (available before schedule period starts)
- Schedule amendment with diff preview → manager notified first → employee notified
- 48-hour unviewed schedule nudge (background job)
- Keyboard navigation on schedule builder grid

**Milestone:** Rachel creates and shares a weekly schedule. Employees view their shifts via preview link or app. This is testable with real café/retail teams. **First real users onboarded here** — even without clock-in, this replaces the spreadsheet + WhatsApp workflow.

#### Phase 3: Clock-In & Timesheets (Weeks 9-12)

*The connected workflow comes alive. "Never fill out a timesheet again" is real.*

- GPS geofenced clock-in/out ("I'm here" / "Done" button)
- Optimistic UI with localStorage retry queue (GPS captured at tap time)
- Employee home screen: Today + Next card with shift state transformation
- This Week / Next Week toggle
- Co-workers on same shift (ambient context on shift card)
- "Rachel usually posts by Sunday" message when next week not shared
- Live attendance dashboard (30-second polling, status: On Time / Late / Missing)
- Manual "mark as arrived" by manager (tagged, transparent to all)
- Auto-clock-out background job (notification at +15 min, auto at +1 hour, system-generated flag)
- Missing clock-in reminder (background job, +15 min after shift start)
- Auto-computed timesheets with configurable break deductions
- CSV timesheet export (basic download for bookkeeper)
- Geofence verification result stored (not raw coordinates)
- Employee notified if geofence verification fails on retry

**Milestone:** The full connected workflow is live — schedule → clock-in → timesheet. Rachel sees attendance on her dashboard. Marcus taps one button. Timesheets compute automatically. **This is the V1 launch milestone.**

#### Phase 4: Leave & Approvals (Weeks 13-15)

*Complete the V1 feature set.*

- Day off request (3-tap flow: pick date → reason → send)
- Approval feed (card-based, single type, swipe-to-approve mobile)
- 5-second undo toast on approvals
- Leave balance tracking
- "Day Off" marking on schedule (shift not removed)
- Leave approval nudge (background job, 24 hours pending)
- Manager sees coverage impact before approving
- Rejection with reason and alternative suggestion

**Milestone:** Full V1 MVP complete. All four journeys (Rachel, Diana, Marcus, Aisha) are fully supported.

#### Post-Launch Polish (Weeks 16-18)

- Schedule builder: resize, move, copy-day, bulk-edit
- P1 security items (login audit trail, lockout, rate limiting)
- P1 accessibility (screen reader, reduced motion, ARIA live regions)
- Performance tuning based on real usage data
- Bug fixes from user feedback
- Formatted timesheet export with period summaries

### First-User Strategy

| Milestone | When | Who Uses It | What They Get |
|-----------|------|-------------|---------------|
| Phase 2 complete | Week 8 | 2-3 friendly businesses | Schedule creation + preview links. Replaces spreadsheet + WhatsApp. |
| Phase 3 complete | Week 12 | 5-10 businesses | Full connected workflow. Clock-in + auto timesheets. **V1 launch.** |
| Phase 4 complete | Week 15 | 20+ businesses | Leave management. Full MVP. Begin broader onboarding. |
| Post-launch polish | Week 18 | 50+ businesses | Refined UX, hardened security, improved schedule builder. |

### Risk Mitigation (Solo Developer)

**Technical Risk — GPS Reliability:**
The highest-risk component. Budget 30% extra time in Phase 3 for GPS testing across devices and environments (kitchens, basements, outdoor sites). Test on real phones in real locations before launching clock-in to users. Have the manual "mark as arrived" fallback solid before shipping GPS.

**Market Risk — Will People Use It?:**
Get Phase 2 (schedule only) in front of 2-3 real businesses by week 8. Their feedback shapes Phases 3-4. If scheduling alone doesn't excite them, the connected workflow thesis may need adjustment before investing in clock-in.

**Resource Risk — Solo Point of Failure:**
- Keep the codebase simple. No premature abstractions.
- Automated tests on critical paths: schedule creation, clock-in, timesheet computation, auth flows
- Don't over-architect for scale you don't have. One database, one deployment, one Prisma client.
- If you're blocked on one phase, don't context-switch — finish the current phase first.

**Scope Creep Risk:**
Rule: nothing enters the current phase that isn't already defined. New ideas go to a "Future Ideas" list. Review the list only between phases, never during.

## Functional Requirements

> 70 capabilities organized by area. Each FR states WHAT the system does, not HOW. Business rules are noted in italics on the parent FR they constrain.

### Scheduling

- FR1: Owner/Manager can create shifts using drag-to-schedule (paint-mode)
- FR2: Owner/Manager can assign employees and roles to shifts
- FR3: System displays soft conflict warnings during scheduling (availability conflicts, overlapping shifts)
- FR4: Owner/Manager can copy a schedule to recur in subsequent periods
- FR5: Owner/Manager can share a completed schedule to the team
- FR6: Owner can unpublish a schedule before the schedule period starts
- FR7: Owner/Manager can amend a published schedule with diff preview
- FR8: Owner/Manager can see which employees have viewed a shared schedule (viewed/pending status)
- FR9: System nudges the owner when employees haven't viewed a schedule after 48 hours
- FR10: Owner can send a reminder to individual employees who haven't viewed the schedule
- FR11: Employees can set weekly recurring availability preferences, surfaced as soft warnings in the schedule builder
- FR12: Employees can view their assigned schedule (current and upcoming weeks), including co-workers on the same shift

### Attendance & Timesheets

- FR13: Employee can clock in with one tap, verified via GPS geofence
- FR14: Employee can clock out with one tap
- FR15: Manager can log and adjust clock events for their team (tagged with manager name, transparent to all parties)
- FR16: System auto-clocks-out employees at shift end +1 hour, with warning notification at +15 minutes
- FR17: System sends missing clock-in reminder at shift start +15 minutes
- FR18: Employee receives clear feedback when GPS verification fails, with guidance on next steps
- FR19: System auto-computes timesheets from clock events
- FR20: System applies configurable break deductions to computed timesheets
- FR21: Employee can view their own computed timesheet
- FR22: Employee can view their clock-in/out event history with attribution tags
- FR23: Owner/Manager can view team timesheets per employee and period
- FR24: Owner/Manager can export timesheets as CSV
- FR25: Employee can clock in for an unscheduled shift (ad hoc); flagged for manager review

### Leave Management & Approvals

- FR26: Employee can request a day off (pick date, reason, optional note)
- FR27: Manager/Owner can approve or reject a day off request with reason
- FR28: Manager sees coverage impact before approving a day off request
- FR29: Approved days display as "Day Off" on the schedule (shift not removed)
- FR30: System tracks leave balance per employee
- FR31: Approval actions include 5-second undo toast to prevent accidental actions
- FR32: System sends approval nudge when a leave request is pending more than 24 hours
- FR33: Pending approvals escalate to Super Admin after 48 hours with no manager action (configurable in settings)
- FR34: Manager/Owner can view and act on pending approvals in a unified card-based feed

### Employee & Organization Management

- FR35: Super Admin can invite employees by email
- FR36: Invited employees can view their schedule via read-only preview link without creating an account
- FR37: Invited employees can create their account (set password) via invite link
- FR38: Super Admin can edit employee profiles
- FR39: Super Admin can archive an employee (revokes access immediately). *System prevents archiving the last active Super Admin.*
- FR40: Super Admin can reactivate an archived employee
- FR41: Super Admin can create, edit, and delete roles (name, color, icon, short code). *Deletion warns of affected employees; they retain permissions until reassigned.*
- FR42: Super Admin can assign roles to employees
- FR43: Super Admin can create, edit, and delete departments. *Deletion sets affected employees to unassigned; department manager reverts to employee role.*
- FR44: Super Admin can assign a manager to a department
- FR45: Owner/Manager can create and manage groups with batch member assignment
- FR46: Owner/Manager can view employee invite status (Invited / Active)
- FR47: Super Admin can create and manage work locations (name, address, geofence radius)
- FR48: Super Admin can resend an expired employee invitation

### Notifications & Alerts

- FR49: Employees are notified when a schedule is shared
- FR50: Schedule amendments trigger a notification chain: manager notified first, then affected employees with clear diff
- FR51: Employee is notified of day off decision (approval with confirmation, rejection with reason)
- FR52: Manager is notified when a new team member creates their account
- FR53: Owner/Manager receives push notification when multiple employees are missing at shift start
- FR54: Owner/Manager receives notification when all scheduled employees for a period have clocked in
- FR55: All critical notifications are delivered via dual channel (in-app and email)

### Dashboard & Monitoring

- FR56: Owner/Manager can view team attendance status (On Time / Late / Missing)
- FR57: Manager's dashboard view is scoped to their assigned department
- FR58: Dashboard auto-refreshes via polling
- FR59: Owner/Manager can drill down from status overview to individual employee detail

### Account & Authentication

- FR60: Users can log in with email and password
- FR61: Users can reset their password via email link
- FR62: Invited employees can set their initial password via invite link
- FR63: System enforces role-based access control (Super Admin, Manager, Employee)
- FR64: Super Admin can revoke an employee's active session
- FR65: System maintains an append-only audit log of all data modifications (Super Admin access only)
- FR66: Owner can create a new business account and complete guided setup (business name, scheduling cadence, location, geofence, initial roles)

### Settings & Configuration

- FR67: Super Admin can configure scheduling cadence (weekly, bi-weekly, custom). *Changes apply to future schedule periods only.*
- FR68: Super Admin can configure break deduction rules per shift length. *Changes apply to future schedule periods only.*
- FR69: Super Admin can set the owner's usual publish day (displayed to employees when next schedule is not yet shared)
- FR70: Employee can view their pending and past day off requests with current status (pending, approved, rejected)

### FR Traceability Map

> Maps each capability area to its source in the PRD — ensuring every FR traces to a documented user need.

| Capability Area | FRs | Primary Source Sections |
|----------------|-----|----------------------|
| Scheduling | FR1-FR12 | Journey 1 (Rachel), Journey Requirements: Schedule Builder |
| Attendance & Timesheets | FR13-FR25 | Journey 3 (Marcus), Journey 2 (Diana), Journey Requirements: Attendance & Clock Events |
| Leave Management & Approvals | FR26-FR34, FR70 | Journey 3 (Marcus): Day Off Request, Journey 1 (Rachel): Leave Approval, Journey Requirements: Day Off Management |
| Employee & Organization Management | FR35-FR48 | Journey 1 (Rachel): Setup, Journey 4 (Aisha): Onboarding, Journey Requirements: Onboarding & Adoption |
| Notifications & Alerts | FR49-FR55 | Journey Requirements: Notifications, All Journeys |
| Dashboard & Monitoring | FR56-FR59 | Journey 1 (Rachel): First Monday, Journey 2 (Diana): Morning Glance |
| Account & Authentication | FR60-FR66 | Journey 4 (Aisha): Account Creation, Journey 1 (Rachel): Setup, Success Criteria: Technical |
| Settings & Configuration | FR67-FR69 | Journey 1 (Rachel): Settings, Journey Requirements: Settings |

## Non-Functional Requirements

> Quality attributes that specify HOW WELL the system performs. Performance targets, security requirements, accessibility, and browser support are already defined in the SaaS Web Application Requirements section. This section covers additional quality attributes not addressed there.

### Data Retention, Privacy & Backup

- NFR1: Audit log entries are immutable — no modification or deletion mechanism exists. Entries may be relocated to archival storage but never altered or purged.
- NFR2: Archived employee profiles are retained for 12 months, then permanently deleted. Associated clock events and timesheet records are anonymized (employee name replaced with opaque ID) and retained for bookkeeping continuity.
- NFR3: All personally identifiable information is encrypted at rest in the database.
- NFR4: Database backups follow a 30-day rolling retention window. PII deleted from live data may persist in backups until the containing backup expires. This 30-day lag is the accepted privacy trade-off for disaster recovery capability.
- NFR5: **Recovery Point Objective (RPO):** Maximum 1 hour of data loss. Achieved via managed PostgreSQL continuous archiving with point-in-time recovery.
- NFR6: **Recovery Time Objective (RTO):** 4 hours during business hours (8am-10pm), 8 hours overnight. Managed PostgreSQL hosting provides automated failover for common failure modes; RTO applies to manual recovery scenarios.
- NFR7: Backup restoration tested at least once before V1 launch and quarterly thereafter.

> **Regulatory note:** V1 targets domestic markets with no explicit GDPR/CCPA compliance. If UK/EU users are onboarded, a data processing assessment should be conducted and this section updated with applicable retention, consent, and data subject rights requirements before those users are active.

### Observability & Monitoring

- NFR8: Application exposes a health endpoint returning service status, database connectivity, and Redis connectivity. Used by uptime monitoring.
- NFR9: Uptime monitoring checks at 1-minute intervals; on-call alert triggered within 2 minutes of detected downtime.
- NFR10: Error tracking captures unhandled exceptions with stack trace, user context (role, tenant), and request metadata. No raw PII in error logs.
- NFR11: Structured logging on all API requests: timestamp, method, path, HTTP status, duration, user ID, tenant ID. No passwords, tokens, or GPS coordinates in logs.
- NFR12: Alert thresholds — API error rate >5% sustained over 5 minutes; p95 response time >3 seconds sustained over 5 minutes; database connection pool exhaustion.
- NFR13: Background job runner emits a heartbeat every 5 minutes to a health check endpoint. If no heartbeat received for 15 minutes, P1 alert triggers. Each job type logs last execution time; if any job hasn't executed within 2x its expected interval, alert triggers.
- NFR14: GPS verification success rate tracked per location per rolling 7-day window. When success rate drops below 85% for any location, Super Admin receives alert with recommendation to adjust geofence radius.

### Performance & Scalability

- NFR15: System supports 200+ employees per tenant with <10% increase in response times versus a 20-employee tenant.
- NFR16: System supports 100 concurrent tenants on shared infrastructure without cross-tenant performance impact.
- NFR17: System maintains <3-second GPS clock-in target under 10x burst load (10 concurrent clock-in requests per second sustained for 5 minutes). Validated via load test before V1 launch.
- NFR18: No single database query exceeds 100ms at target scale (100 tenants, 2,000 employees).
- NFR19: Employee-facing pages (home screen, clock-in, schedule view) deliver <200KB of JavaScript on initial load. Total page weight <500KB including assets.

### Reliability & Resilience

- NFR20: Schedule and amendment notification emails delivered within 5 minutes of trigger event. Email infrastructure supports burst of 500 emails per minute. Queue backlog >100 pending emails triggers alert.
- NFR21: No planned deployments during 7-10am in any time zone where >20% of active tenants operate. Deploy window determined weekly based on tenant distribution. Unplanned downtime during any tenant's peak hours escalates to P0 regardless of duration.
- NFR22: When Redis is unavailable, the application continues serving requests with degraded functionality: rate limiting falls back to in-memory per-instance limits, session validation falls back to database-only checks. Redis unavailability triggers P1 alert. Application never crashes due to Redis failure.
- NFR23: Email delivery failures retry with exponential backoff (3 attempts over 15 minutes). Failed emails after retries are queued with "pending" status visible to Super Admin. Invite and password reset links remain valid during email outage — Super Admin can copy the direct link from the employee management screen as a manual fallback. Email provider downtime >15 minutes triggers P1 alert.

### Security & Abuse Prevention

- NFR24: Schedule preview links expire after 30 days (renewable on next schedule share). Super Admin can revoke any active preview link. Preview links use unguessable tokens (UUID v4 minimum).
- NFR25: Clock-in and clock-out rate-limited independently: maximum 1 clock-in per user per 60 seconds, maximum 1 clock-out per user per 60 seconds. Duplicate events within the window are silently dropped. This is P0 (launch).
- NFR26: Duplicate notifications of the same type to the same recipient are suppressed within a 15-minute cooldown window. In-app notifications update in place; duplicate emails are not sent.
- NFR27: Maximum 3 concurrent active sessions per user. Fourth login invalidates the oldest session. Polling requests from invalidated sessions return 401 and stop polling.
- NFR28: Preview link access is logged (IP, timestamp, user agent). Super Admin can view access logs for any preview link. Access from >10 unique IPs within 24 hours triggers an alert to the Super Admin.

### Data Integrity

- NFR29: Computed timesheets include a validation pass: total hours cannot exceed shift duration, break deductions cannot exceed configurable maximum, negative hours flag as anomaly. Any validation failure triggers an alert and prevents CSV export until reviewed.
- NFR30: Audit log entries older than 12 months are archived to cold storage (queryable on request, not instant). Active audit log maintains a rolling 12-month window for real-time queries. Archived entries remain immutable and encrypted.

### Offline Behavior

- NFR31: Clock-in/out is the only offline-capable feature. Optimistic UI with localStorage retry queue; GPS captured at tap time, retried with original payload on reconnect.
- NFR32: Schedule viewing, leave requests, approvals, and all other operations require a network connection.
- NFR33: When network is unavailable for non-clock-in operations, the UI displays a clear offline indicator rather than failing silently or showing stale forms.
- NFR34: Before writing to localStorage retry queue, the application verifies write capability. If localStorage is unavailable or full, the clock-in attempt requires an active network connection. If both localStorage and network are unavailable, the UI clearly indicates the clock-in was NOT recorded (no false optimistic success). Employee is prompted to retry when connected.

### UI Quality & Usability

- NFR35: Dashboard displays a last-updated timestamp on all polled data.
- NFR36: When polling fails or data age exceeds 60 seconds, dashboard displays a visible stale-data indicator that persists until fresh data loads successfully.
- NFR37: All dates display in unambiguous format (e.g., "Mon, 3 Feb" or with month name). All times display with AM/PM suffix. No numeric-only date formats (no "02/03" or "03/02"). Time zone is set per location and displayed on schedule and clock events.

### Language

- NFR38: Application UI, notifications, emails, and all user-facing content are English-only. No internationalization framework is required.

---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prd.md', 'ux-design-specification.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-19'
project_name: 'SCHEDULER'
user_name: 'Basestaff'
date: '2026-02-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

70 capabilities across 8 domains. The system is fundamentally a **workforce coordination layer** — not a standalone scheduler, time tracker, or HRIS. The architecture must reflect the unified nature: schedule creation flows into attendance tracking flows into timesheet computation flows into approvals, all operating on the same core entity (the person-time-place commitment).

Key architectural groupings:
- **Schedule lifecycle** (FR1-12): Builder with paint-mode, recurring templates, amendment diffs, share/unpublish, availability warnings. Desktop-primary creation surface with mobile read-only/edit fallback.
- **Attendance pipeline** (FR13-25): GPS-verified clock-in/out, manual override by managers, auto-clock-out, computed timesheets with configurable break deductions, CSV export. Offline-capable clock-in with localStorage queue.
- **Approval workflow** (FR26-34): Leave requests with coverage impact, card-based approval feed, undo toast, escalation after 48h. Architecture must support additional approval types in Growth phase (expense claims, shift swaps).
- **Organization management** (FR35-48): Employee CRUD with invite flow, role/department/group management, work location management with geofence config. Invite produces preview link (unauthenticated schedule view).
- **Notifications** (FR49-55): 8 types spanning all domains. Dual-channel (in-app + email for critical). Amendment chain: manager notified first, then employees. Batched notifications for multi-employee events.
- **Dashboard** (FR56-59): Polling-based team status (30s interval), department-scoped for managers, drill-down to situation cards.
- **Authentication** (FR60-66): JWT with refresh tokens, invite flow (set-password), session revocation on archive, audit log.
- **Settings** (FR67-69): Scheduling cadence, break deduction rules, publish day expectation. Settings changes apply to future periods only.

**Non-Functional Requirements:**

38 NFRs that directly shape architecture:

- **Data integrity:** Immutable audit log (NFR1, NFR30) — append-only, 12-month active window, cold archive. Clock events append-only with adjustment references. Timesheet validation pass prevents export of anomalous data (NFR29).
- **Performance & scale:** 200+ employees/tenant (NFR15), 100 concurrent tenants (NFR16), <100ms DB queries (NFR18), <200KB JS on employee pages (NFR19). GPS clock-in <3s under 10x burst (NFR17).
- **Reliability:** Application continues serving when Redis is unavailable (NFR22) — V1 achieves this inherently by not using Redis. Email retry with exponential backoff (NFR23). Deploy window restrictions during peak hours (NFR21).
- **Security:** Clock-in rate limiting 1/60s per user (NFR25), 3 concurrent sessions per user (NFR27), preview link expiry and access logging (NFR24, NFR28), duplicate notification suppression within 15-min cooldown (NFR26).
- **Observability:** Health endpoint (NFR8), 1-min uptime checks (NFR9), structured request logging (NFR11), alert thresholds for error rate, p95 latency, and connection pool (NFR12), background job heartbeat (NFR13), GPS success rate per location (NFR14).
- **Offline:** Clock-in only (NFR31). All other operations require network (NFR32). Clear offline indicator (NFR33). localStorage write verification before queuing (NFR34).
- **Privacy:** PII encrypted at rest (NFR3). Raw GPS coordinates auto-deleted after 90 days. Archived employee data anonymized after 12 months (NFR2).

**Scale & Complexity:**

- Primary domain: Full-stack web application (SaaS)
- Complexity level: Medium-High
- Estimated architectural components: ~12-15 modules (auth, employee, role, department, group, location, schedule, clock-event, timesheet, notification, approval, audit-log, settings, background-jobs)
- Target scale: 100 tenants, 2,000 employees, ~5GB data/year
- Solo developer — architecture must favor simplicity and convention over abstraction

### Architectural Decisions from Context Analysis

Decisions established during context analysis (ADR-C series). These shape all subsequent architectural steps:

**ADR-C1: Backend Framework → NestJS**
NestJS for the API backend, Next.js App Router for the frontend. Two apps in a monorepo. NestJS provides: dependency injection, guards, interceptors, module boundaries, Swagger generation — essential for 70 FRs with cross-cutting concerns (tenant isolation, RBAC, audit logging). Next.js server components fetch from NestJS API over localhost/internal network.

**ADR-C2: Unified Entity → Separate Tables, Unified API**
`Shift` table (schedule data) + `ClockEvent` table (append-only attendance). Timesheets are computed queries joining both. The API returns `ShiftWithStatus` shapes that include current state derived from clock events. The "unified entity" is an API-level and UI-level concept, not a database schema. Service layer composes via `ShiftService.getWithStatus()`.

**ADR-C3: Deployment Model → Modular Monolith**
One NestJS app with well-defined module boundaries. One PostgreSQL database. No Redis in V1 (see WR-10). One deployment. ~12-15 modules with service-layer boundaries. Background jobs in-process. No message queues or separate workers. Modules communicate via injected services, not HTTP or events.

**ADR-C4: API Design → View-Specific Endpoints (Phased)**
Phase 1: standard CRUD endpoints only. Phase 2+: add view-specific endpoints per consumption surface (employee home, team status, builder). Each view endpoint = one request returning the complete shape for its component tree. Service composition at controller level, not frontend stitching. Controllers map domain objects to view DTOs.

**ADR-C5: Shared Validation → Zod Single Source of Truth**
`shared-validators` package in monorepo with Zod schemas used by both frontend and backend. NestJS uses custom Zod validation pipe instead of class-validator. `nestjs-zod` for Swagger integration. `shared-types` package for enums and non-validation types. Types inferred from Zod schemas.

**ADR-C6: Authentication → JWT + Session Table**
JWT access token (15min, in-memory only) + refresh token (7 days, httpOnly cookie with SameSite=Strict, hash in `Session` table). Silent refresh on 401. Session table enables 3-session limit (NFR27) and force-logout. Refresh token rotation on every use — new token issued, old invalidated. Reused-token detection invalidates ALL sessions (likely theft). RS256 asymmetric signing for JWT.

**ADR-C7: Notification Architecture → Internal Service Pattern**
`NotificationService.create({ type, recipientId, entityId, metadata })` called by all modules. Notification table with type, recipient, entity reference, metadata. Email dispatch via database-backed `EmailJob` queue (10-second processing interval, retry with exponential backoff). In-app notifications created synchronously for instant UI feedback. Duplicate suppression via type+recipient+entity within 15-minute window. Amendment notifications coalesce within 30-minute window per employee.

### Technical Constraints & Dependencies

**Confirmed Technology Stack:**
- **Backend:** NestJS (modular monolith, in-process background jobs)
- **Frontend:** Next.js 14 App Router (server components + selective client hydration)
- **Database:** PostgreSQL (managed, with automated backups)
- **ORM:** Prisma with tenant_id auto-injection via Client Extensions (`$extends`)
- **Validation:** Zod schemas in shared package, `nestjs-zod` for Swagger
- **Auth:** JWT (RS256) with refresh token rotation, Session table
- **UI Framework:** Tailwind CSS + Radix UI (shadcn/ui pattern)
- **Builder State:** Zustand with undo/redo for ScheduleGrid; lighter local state for QuickScheduleEdit
- **Server State:** React Query for data fetching, polling, caching
- **DnD:** `@dnd-kit` (~15KB) for schedule builder
- **Gestures:** `@use-gesture/react` (~5KB) for notification swipe
- **Monorepo:** pnpm workspaces (no Turborepo in V1)
- **Email:** Database-backed `EmailJob` queue, transactional SMTP provider
- **File Storage:** Local filesystem via `FileService` abstraction, served via authenticated API
- **No Redis in V1** — in-memory rate limiting, database session validation

**Constraints from PRD:**
- Greenfield — no legacy code
- Solo developer — sequential phase delivery
- Free V1 — ~$40-60/month infrastructure budget (lower without Redis)
- Polling at 30-second intervals, not WebSocket
- Shared database with tenant_id, not schema-per-tenant
- English-only (NFR38) — no i18n framework
- No native mobile app, third-party OAuth, SMS/WhatsApp, or payments in V1

**From UX Spec:**
- CSS custom properties for token architecture — dark mode tokens defined day one, activation deferred to post-launch
- Tiered JS budgets: employee home <100KB, consumption <150KB, builder <250KB (gzipped)
- Server-rendered preview page (zero JavaScript, `font-display: optional`)
- Route-based code splitting — builder lazy-loaded
- "By Day" timetable view cut from V1 — replaced by coverage summary table

**Security Architecture:**
- CORS origin = exact frontend URL from environment variable, no wildcard
- `X-Frame-Options: DENY` on all responses
- `SameSite=Strict` on all cookies
- Content-Security-Policy header
- Zod string schemas for all user-facing names: max length, no HTML tags
- `dangerouslySetInnerHTML` banned in code review
- Email templates use auto-escaping templating engine
- Post-login redirect: relative paths only, validated against prefix whitelist
- Email deep links constructed server-side from `APP_URL` + database entity IDs
- Password reset: async dispatch, identical responses for valid/invalid emails (timing-safe)
- File uploads: server-side MIME validation via magic bytes, re-encode via `sharp`, 5MB limit, served via authenticated endpoint outside web root
- New device login triggers notification to account holder

**Offline & Sync:**
- Clock-in: localStorage queue with `syncStatus` indicator, GPS captured at tap time
- Server-side timestamp tolerance check on replayed events — `received_at` recorded, flag anomalies where `received_at - tapped_at > tolerance`
- localStorage draft for schedule builder is convenience, not trust boundary — server validates all data on publish

### Cross-Cutting Concerns Identified

1. **Tenant isolation** — `tenant_id` on every table, Prisma Client Extensions (`$extends`) for auto-injection, JWT-sourced tenant context (RS256 signed). Affects every module.

2. **RBAC with department scoping** — Three system roles (Super Admin, Manager, Employee). Manager access scoped to assigned department at service layer (explicit query filtering in service methods, not a Prisma extension). Integration tests for cross-department access on every endpoint. Affects every controller.

3. **Audit logging** — Business-event level, not raw database mutations. ~15 auditable event types: employee created/archived/reactivated, role CRUD, department modified, schedule published/amended, manual clock-in logged, leave approved/rejected/withdrawn, settings changed, session revoked. Each entry: actor, action, entity type, entity ID, human-readable summary, JSON diff where relevant. Schedule building logs the publish/amend event, not individual shift CRUD.

4. **Notification generation** — Internal `NotificationService.create()` called by all modules. Two categories: Critical (always on, both channels) and Informational (on by default, two user toggles for in-app and email). 8 V1 types. Duplicate suppression (15-min window), amendment coalescing (30-min window per employee). Architecture supports per-type granularity in Growth phase.

5. **Optimistic UI + offline resilience** — Clock-in uses localStorage queue with `syncStatus` indicator. All other mutations use optimistic UI with server confirmation. Consistent error handling and retry patterns (3 attempts, exponential backoff).

6. **Polling-based real-time** — Status board (30s), notification count (30s), schedule card viewed count (60s). Transport-agnostic API shape enables future SSE migration. Polling pauses on hidden tabs (Page Visibility API).

7. **Computed views** — Timesheets computed from clock events + snapshotted break rules (break deduction rules captured on Schedule record at publish time). NFR29 validation pass before CSV export. Timesheet export includes attribution column (GPS / Manual by [Name] / System). Flags high manual clock-in rates per manager-employee pair.

8. **Background job reliability** — Four job types with different intervals (5-60 min). In-process (no separate worker). Absolute time windows with idempotency checks (existence of prior output record). Each job logs completion + item count to structured log. Single-instance V1 — document: horizontal scaling requires distributed locking before running jobs on multiple instances.

9. **File management** — `FileService` abstraction. V1: local filesystem + authenticated API endpoint with `Cache-Control` for browser caching. IC documents: Super Admin access only. Growth phase: migrate to cloud storage (S3/R2). Upload security: MIME validation, `sharp` re-encode, 5MB limit.

10. **Email dispatch** — Database-backed `EmailJob` table. Background job processes every 10 seconds. Retry with exponential backoff (3 attempts over 15 minutes). Failed emails visible to Super Admin. `NotificationService` is sole writer to email queue.

### Accepted V1 Risks

| Risk | Mitigation | Growth Phase Resolution |
|------|-----------|----------------------|
| GPS spoofing (mock location apps) | GPS is advisory, not security control. Pattern indicators surface anomalies. | QR code clock-in, device attestation in native app |
| localStorage clock-in tampering | Timestamp tolerance check, `received_at` flagging, server-side validation | Native app with device attestation |
| Audit log tampering by developer | Application layer enforces append-only, no DELETE endpoint | pg_audit or append-only external log sink |
| Invite link interception | Activation timestamps visible, resend capability, access revocation | Optional invite PIN via separate channel |
| Dark mode not shipping | Token architecture defined for both modes from day one | Post-launch activation via `prefers-color-scheme` media query |
| "By Day" timetable view absent | Coverage summary table provides gap visibility | Full timetable view post-launch |
| No Redis | In-memory rate limiting accurate for single instance | Redis for shared rate limiting on horizontal scaling |

### V1 Scope Adjustments from AE

Decisions that modify or clarify PRD/UX spec scope for architectural simplicity:

- **Dark mode:** Tokens defined, activation deferred to post-launch (WR-1)
- **Setup wizard:** Frontend-only stepper on existing CRUD, build last in Phase 1 (WR-2)
- **"By Day" view:** Cut from V1, replaced by coverage summary table (WR-8)
- **QuickScheduleEdit state:** Lighter local state, not shared Zustand store (WR-4)
- **Notification preferences:** Two-category model (Critical/Informational), not per-type (WR-6)
- **Audit log:** Business events (~15 types), not raw DB mutations (WR-7)
- **Redis:** Dropped from V1 (WR-10)
- **Turborepo:** Deferred, pnpm workspaces only (WR-11)
- **Observability:** Minimal viable stack at launch, incremental enhancement (WR-12)
- **Preview caching:** No CDN, server-render every request (WR-13)

### Testing Strategy

**Tier 1 — Integration tests (non-negotiable):**
- Auth: login, refresh, logout, password reset, invite flow, session revocation, refresh token rotation
- RBAC: every endpoint with Super Admin, Manager (own dept), Manager (other dept), Employee — verify 200/403
- Clock-in/out: create event, offline queue replay, timestamp tolerance, rate limiting, auto-clock-out
- Timesheet computation: scheduled vs actual, break deductions with snapshotted rules, edge cases
- Tenant isolation: no cross-tenant data leakage on every query path

**Tier 2 — Unit tests (should have):**
- Notification type routing, duplicate suppression, coalescing
- Schedule conflict detection
- Leave balance calculation
- Coverage impact computation
- Timesheet validation pass (NFR29)

**Tier 3 — Smoke tests (nice to have):**
- Every endpoint returns expected status code
- Frontend builds without errors
- Database migrations run cleanly

**E2E:** One Playwright test for the clock-in flow. No snapshot tests or visual regression in V1.

### Observability Stack (V1 Launch)

- Health endpoint (`/health`) — DB connectivity status
- Structured JSON logging on all API requests (timestamp, method, path, status, duration, userId, tenantId)
- Unhandled exception handler with stack trace + request context
- External uptime monitor (free tier, 5-minute checks)
- Sentry (free tier, post-launch week 1) for error tracking with context

## Starter Template Evaluation

### Evaluation Summary

Existing NestJS + Next.js monorepo starters were evaluated and rejected — all conflict with one or more of our decisions (Prisma Client Extensions, Zod-only validation, custom JwtAuthGuard, shadcn/ui, pnpm workspaces). The recommended approach is **Official CLIs + Manual Monorepo Scaffolding**.

### Initialization Sequence

1. `pnpm init` at root, configure `pnpm-workspace.yaml`
2. `nest new apps/api --strict --skip-git --package-manager pnpm` (NestJS 11, SWC compiler)
3. `npx create-next-app@latest apps/web` (Next.js 16, App Router, Tailwind, Turbopack)
4. `npx shadcn@latest init` inside `apps/web` (Radix UI primitives)
5. `npx prisma init` inside `apps/api` (Prisma 7 with driver adapters)
6. Create `packages/shared-types/` and `packages/shared-validators/` manually
7. Wire workspace references, TypeScript configs, and `transpilePackages`

### Version Decisions

| Technology | Version | Notes |
|-----------|---------|-------|
| NestJS | 11.x | SWC compiler, Express v5, JSON logging native |
| Next.js | 16.x | Turbopack dev mode, App Router |
| Prisma | 7.x | Driver adapters required (`@prisma/adapter-pg` + `pg`). Fallback to 6.x if stability issues. |
| Node.js | 22 LTS | Required by NestJS 11 |
| PostgreSQL | 16 | Via Docker or Homebrew |
| Vitest | Latest | 3-4x faster than Jest. Validate NestJS `@nestjs/testing` compat; fallback Jest for API only. |
| pnpm | 9.x | Workspace protocol for monorepo |

### Architectural Decisions from Starter Evaluation

**ADR-S1: Authentication → Custom JwtAuthGuard (No Passport.js)**
Custom `JwtAuthGuard` with `@nestjs/jwt` for token verification. No Passport.js dependency in V1. Simpler mental model: one guard, one strategy, direct JWT verification. Growth phase: add Passport.js only if third-party OAuth required.

**ADR-S2: Email Templates → Handlebars (.hbs)**
Handlebars `.hbs` template files for transactional emails. Auto-escaping by default (prevents XSS in email). Templates live in `apps/api/src/templates/`. `@nestjs/mailer` with Handlebars adapter. Supports layouts for consistent email chrome.

**ADR-S3: Configuration → @nestjs/config with Zod Env Validation**
`@nestjs/config` module with `ConfigService`. Zod schema validates ALL environment variables on startup (fail-fast). Multi-level: root `.env` (shared), `apps/api/.env` (API secrets), `apps/web/.env.local` (public vars). Type-safe config access via `ConfigService.get<T>()`.

**ADR-S4: API Response Format → Standardized Shapes**
- Single entities: direct data object `{ id, name, ... }`
- Lists: `{ data: [...], meta: { total, page, limit, totalPages } }`
- Two pagination styles: offset-based (default for CRUD), cursor-based (for feeds/notifications)
- Errors: `{ statusCode, error, message, details?: { field, message }[] }`

**ADR-S5: Database Seeding → Two-Mode Strategy**
- Minimal seed: Super Admin account (bcrypt hashed) + default `CompanySettings`. Runs in all environments.
- Development seed: extends minimal with sample roles, departments, employees, groups. Runs only in development.
- Both idempotent via upsert. Seed script checks `NODE_ENV`.

**ADR-S6: Monorepo Scripts → Standardized Commands**
Root `package.json` scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:reset`, `db:studio`. Each delegates to appropriate workspace app via `pnpm --filter`.

### Self-Consistency Corrections (SC Series)

Corrections applied to resolve contradictions between Step 2 decisions and Step 3 implementation:

- **SC-1:** All "Prisma middleware" references → **Prisma Client Extensions** (`$extends`). Middleware deprecated in Prisma 5+.
- **SC-2:** Audit logging via **explicit `AuditService.log()` calls**, not interceptor. Interceptor captures raw HTTP (contradicts WR-7 business-event decision). ~15 event types logged at service-layer call sites.
- **SC-3:** ADR-C1 (NestJS + Next.js two-app split) **supersedes PRD ADR-001** (single Next.js app). Documented as intentional divergence.
- **SC-4:** Tenant isolation via **Prisma Client Extension** (automatic, every query). Department scoping via **service-layer filtering** (explicit, Manager queries only). Two separate mechanisms.
- **SC-5:** Next.js auth middleware **excludes preview routes** (`/preview/*`) from redirect logic.
- **SC-6:** `@nestjs/schedule` added to dependencies for in-process background jobs (4 job types, 5-60 min intervals).
- **SC-7:** `font-display: swap` globally. `font-display: optional` on preview page layout only (per UX spec zero-JS requirement).
- **SC-8:** `sharp` added to API dependencies for server-side image re-encoding on upload.
- **SC-9:** Three named throttlers: global (100/min), auth (10/min), clock-in (1/60s per user). `@nestjs/throttler` with in-memory store.
- **SC-10:** Notification preferences stored as two booleans on `Employee` table (`notifyInApp`, `notifyEmail`). Growth phase: separate `NotificationPreference` table for per-type granularity.

### Development Environment

**Docker path (recommended):**
`docker-compose.yml` with PostgreSQL 16 + Mailpit (email testing UI on port 8025).

**Homebrew path (alternative):**
`brew install postgresql@16` + `brew services start postgresql@16`. Mailpit via `brew install mailpit`.

No Redis in V1. Both paths produce identical development environments.

### TypeScript Configuration Strategy (WR-S1)

- Root `tsconfig.base.json`: shared `compilerOptions` (target, strict, esModuleInterop, paths for `@scheduler/*`)
- `apps/api/tsconfig.json`: extends root, adds NestJS-specific options (decorators, emitDecoratorMetadata)
- `apps/web/tsconfig.json`: extends root, adds Next.js-specific options (jsx, plugins)
- Shared packages: no build step. `"main"` and `"types"` in `package.json` point to `src/index.ts` (consumed as TypeScript source)
- Next.js resolves via `transpilePackages: ['@scheduler/shared-types', '@scheduler/shared-validators']`
- NestJS resolves via pnpm workspace protocol + TypeScript `paths`
- Vitest resolves via `vite-tsconfig-paths` plugin

### Environment Variable Strategy (WR-S2)

| File | Scope | Variables | Validation |
|------|-------|-----------|------------|
| `.env` (root) | Shared | `DATABASE_URL`, `NODE_ENV` | Referenced by docker-compose |
| `apps/api/.env` | API only | `JWT_*`, `SMTP_*`, `APP_URL`, `CORS_ORIGIN` | Zod schema on startup (fail-fast) |
| `apps/web/.env.local` | Web only | `NEXT_PUBLIC_API_URL` | `src/lib/env.ts` validates at build time |

Root `.env.example` documents ALL variables with descriptions.

### Error Handling Contract (WR-S3)

Global `HttpExceptionFilter` normalizes all NestJS exceptions into:
```
{ statusCode: number, error: string, message: string, details?: { field: string, message: string }[] }
```
- `details` present only on 400/422 validation errors (from Zod pipe)
- Frontend `api-client` extracts `message` for toast, `details` for form field errors
- No raw NestJS error shapes leak to the client

### Migration Workflow (WR-S4)

- Development: `pnpm db:migrate` → `prisma migrate dev` (creates + applies migration)
- Production: `pnpm db:deploy` → `prisma migrate deploy` (applies existing migrations only)
- Reset: `pnpm db:reset` → drops + recreates + seeds (development only)
- Migration files committed to git. Seed runs after migration in development.

### Reference Module Pattern (WR-S5)

Employee module serves as the **reference implementation** for all subsequent modules. Includes: module, controller, service, DTOs (Zod-inferred), integration tests, RBAC checks. Copy-adapt for ~12 modules. No custom code generators in V1.

### Dev Server Orchestration (WR-S6)

Root `pnpm dev` runs both apps in parallel via `concurrently`:
- API: `nest start --watch` (SWC, detects shared package changes via pnpm links)
- Web: `next dev --turbopack` (re-compiles `transpilePackages` on change)
- Shared packages have no build step — consumed as TypeScript source
- **Verify watch propagation during scaffolding** — if NestJS doesn't detect shared package changes, add explicit watch paths

### Git Hooks & Code Quality (WR-S7)

- `husky` for git hooks, `lint-staged` for targeted linting
- Pre-commit: ESLint + Prettier on staged files only (<5s target)
- No pre-push hooks in V1 (CI catches issues)
- Single ESLint config at root with per-app overrides
- No TypeScript type-checking in pre-commit (too slow — CI's job)

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
All critical decisions have been made — no blockers remain for implementation.

**Deferred Decisions (Growth Phase):**
- Redis integration (distributed rate limiting, session caching)
- PM2 cluster mode (requires distributed locking for background jobs)
- Cloud storage migration (S3/R2 via FileService abstraction)
- Per-notification-type preferences (separate table)
- Blue-green deployment
- CDN for preview pages

### Data Architecture

**ADR-D1: Entity Lifecycle → Status Field Pattern**
Status field on all first-class entities: `Employee: ACTIVE | ARCHIVED | INVITED`, `Role: ACTIVE | ARCHIVED`, `Department: ACTIVE | ARCHIVED`, `Group: ACTIVE | ARCHIVED`. Hard delete only for join-table rows (`GroupMember`, `EmployeeRole` assignments). Prisma Client Extension can auto-filter `status: ACTIVE` on reads with opt-out for historical queries. Preserves audit log referential integrity and historical data consistency.

**Enum Strategy (Hybrid):**
- Native PostgreSQL enums for stable values: `SystemRole`, `EmploymentType`, `EmployeeStatus`
- String columns with Zod validation for evolving values: `NotificationType`, `AuditAction`
- Rule: if adding a value requires only a code deploy → string + Zod. If enforced at DB level → native enum.

**JSON Columns (Hybrid):**
- `jsonb` for truly schemaless data: notification metadata, audit log diffs, break rule snapshots on Schedule
- Normalized tables for structured relational data: all core entities
- `jsonb` columns validated at application layer via Zod before write

**Timestamps:**
- All timestamps stored in UTC at database level
- `createdAt` / `updatedAt` on every table (Prisma `@default(now())` and `@updatedAt`)
- Clock events: `tappedAt` (client-reported), `receivedAt` (server-recorded), `adjustedAt` (if manually corrected)

### API & Communication Patterns

**ADR-D2: URL Convention → /api/v1 with Flat + Nested Hybrid**
- Nested for tight ownership: `/employees/:id/roles`, `/groups/:id/members`
- Flat for cross-cutting: `/notifications`, `/audit-logs`, `/files`
- All routes under `/api/v1/` prefix. Plural nouns, kebab-case for multi-word resources.
- No API versioning beyond `v1` prefix until breaking changes needed.

**Swagger Organization:**
Tags by module (`Auth`, `Employees`, `Roles`, `Departments`, `Groups`, `Notifications`, `Settings`, `Audit Log`). `nestjs-zod` auto-generates schemas from Zod. Bearer auth in Swagger UI. Available at `/api/docs` in development only.

**File Upload:**
`POST /api/v1/files/upload` — multipart form data via `@nestjs/platform-express` built-in `FileInterceptor` (wraps multer internally, Express v5 compatible). `sharp` re-encodes images. `FileService.save()` writes to disk. `GET /api/v1/files/:id` — authenticated, `Cache-Control: private, max-age=86400`. Single endpoint, `type` field distinguishes purpose (avatar, document).

### Frontend Architecture

**Route Group Structure:**
```
app/
├── (auth)/          — login, forgot-password, reset-password, set-password
├── (dashboard)/     — all authenticated pages (sidebar layout)
└── preview/         — unauthenticated preview pages (minimal layout, no JS)
```

**Server vs Client Component Boundary (WR-D1):**
Client components with React Query for all authenticated data fetching. Server components for layout shells, SEO metadata, and the unauthenticated preview page. Server components do NOT hold JWT access tokens (tokens are in-memory browser-only per ADR-C6). Preview page uses signed token in URL — no auth cookie needed.

**ADR-D3: Form Handling → React Hook Form + Zod Resolver**
`@hookform/resolvers/zod` with schemas from `@scheduler/shared-validators`. Uncontrolled mode for standard CRUD forms (performance). Controlled mode for complex interactions (schedule builder). Single validation source of truth — no frontend/backend drift.

**Toast & Notification UI:**
`sonner` (~4KB) for toast notifications. Optimistic mutation feedback. Undo toast for destructive actions (5s window). In-app notification feed is a separate component (not toasts).

**React Query Cache Strategy (WR-D3):**
Three-layer mutation flow: (1) Optimistic update — UI updates immediately. (2) Mutation response — server returns updated entity, cache updated via `onSuccess`. (3) Background refetch — `invalidateQueries` catches server-side side effects. Polling continues independently as safety net.

### Infrastructure & Deployment

**ADR-D4: Production Hosting → Single VPS with Nginx Reverse Proxy**
Single VPS (2 vCPU / 4GB RAM, ~$24/month). Nginx: `/api/*` → NestJS (port 3001), `/*` → Next.js (port 3000). Managed PostgreSQL (~$15/month) or self-hosted. Total: ~$39-50/month.

**ADR-D5: Server-Side Fetching → Dual Base URL Pattern**
Server components fetch via `INTERNAL_API_URL` (`http://localhost:3001`) — direct, no Nginx hop. Browser client components fetch via `NEXT_PUBLIC_API_URL` — through Nginx. API client detects environment (`typeof window === 'undefined'`) and selects base URL.

**ADR-D6: Process Management → PM2 Fork Mode**
PM2 in fork mode only for V1. One NestJS process, one Next.js process. Auto-restart on crash, log rotation. **Cluster mode prohibited** until distributed locking implemented for background jobs.

**Security Header Ownership (WR-D4):**
- **Nginx:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, TLS, request size limits (5MB)
- **NestJS:** `Content-Security-Policy` (via Helmet), `CORS` (app-specific origins)
- **Next.js:** Preview page CSP (stricter — no scripts)

**Database Connection Pooling (WR-D5):**
Only NestJS connects to PostgreSQL. Prisma pool size: 10 connections. Next.js fetches via API only (never direct DB). Leaves headroom for backups and Prisma Studio.

**Preview Page Architecture (WR-D2):**
`GET /api/v1/preview/:token` — validates signed time-limited token, returns scoped schedule data. Next.js server component renders pure HTML. Token: JWT with `sub: employeeId, purpose: preview, exp: 7d`. Own throttler (30 req/min per IP). Zero JavaScript shipped.

**Deployment Runbook (WR-D6):**
1. `git pull` latest code
2. `pnpm install` (dependency changes)
3. `pnpm build` both apps
4. `pnpm db:deploy` (pending migrations — additive only)
5. `pm2 reload ecosystem.config.js` (graceful restart)
6. Health check (`curl /api/health`)
7. Rollback: `pm2 reload` with previous build. Migrations are additive — old code works with new schema.

**Testing Database (WR-D7):**
Separate `scheduler_test` database. `prisma migrate deploy` before suite. Transaction wrapping per test (rollback after — fast, no leakage). Truncate for constraint-specific tests. Vitest `globalSetup` handles migration.

**Backup Strategy:**
Managed PostgreSQL: provider handles daily backups with PITR. Self-hosted: `pg_dump` cron daily, 30-day retention. Anonymization job is idempotent — safe after restore.

### Decision Cross-Reference

**Self-Consistency Corrections (SC-D Series):**
- **SC-D1:** Role and Department use status fields (not hard delete) — audit log references preserved
- **SC-D2:** Hybrid enum strategy verified consistent with Prisma 7
- **SC-D3:** Tenant Extension intercepts ALL Prisma operations including `count()`
- **SC-D4:** Use `@nestjs/platform-express` built-in `FileInterceptor` — don't install multer separately
- **SC-D5:** `sonner` (4KB) within JS budget — 19KB total for core client libraries
- **SC-D6:** PM2 fork mode only — cluster mode contradicts single-instance background jobs
- **SC-D7:** Dual fetch path — server direct (`INTERNAL_API_URL`), browser via Nginx (`NEXT_PUBLIC_API_URL`)
- **SC-D8:** 30-day backup retention within 12-month anonymization window — acceptable

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming:**
- Tables: PascalCase in Prisma schema (`Employee`, `ClockEvent`), mapped to snake_case in PostgreSQL via `@@map("clock_events")`
- Columns: camelCase in Prisma (`firstName`), mapped to snake_case in PostgreSQL via `@map("first_name")`
- Foreign keys: `{entity}Id` in Prisma (`departmentId`), `{entity}_id` in PostgreSQL
- Indexes: `idx_{table}_{columns}` (e.g., `idx_employees_tenant_id_email`)
- Unique constraints: `uq_{table}_{columns}`

**API Naming:**
- Endpoints: plural nouns, kebab-case (`/api/v1/audit-logs`, `/api/v1/clock-events`)
- Route params: `:id` (Express style)
- Query params: camelCase (`?departmentId=1&pageSize=20`)
- Headers: standard HTTP headers only, no custom `X-` headers in V1

**Code Naming:**
- Files: kebab-case (`employee.service.ts`, `create-employee.dto.ts`, `jwt-auth.guard.ts`)
- Classes: PascalCase (`EmployeeService`, `JwtAuthGuard`)
- Functions/methods: camelCase (`findAllByDepartment`, `createNotification`)
- Variables: camelCase (`tenantId`, `isArchived`)
- Constants: UPPER_SNAKE_CASE (`MAX_SESSIONS`, `REFRESH_TOKEN_EXPIRY`)
- Enums: PascalCase name, UPPER_SNAKE_CASE values (`SystemRole.SUPER_ADMIN`)
- React components: PascalCase files (`EmployeeCard.tsx`), PascalCase names
- React hooks: kebab-case files (`use-employees.ts`), `use` prefix (`useEmployees`)

### Structure Patterns

**Backend (NestJS) Module Structure:**
```
apps/api/src/modules/{module}/
├── {module}.module.ts
├── {module}.controller.ts
├── {module}.service.ts
├── dto/
│   ├── create-{module}.dto.ts
│   └── update-{module}.dto.ts
├── entities/
└── __tests__/
    ├── {module}.controller.spec.ts
    └── {module}.service.spec.ts
```

**Frontend Component Structure:**
```
apps/web/src/
├── app/                # Route pages only — minimal logic
├── components/
│   ├── ui/             # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── layout/         # Sidebar, Header, BottomNav
│   └── {feature}/      # Feature-specific (EmployeeCard, RoleGrid)
├── hooks/              # Custom hooks (use-employees.ts)
├── lib/                # Utilities (api-client.ts, auth.ts, utils.ts)
├── stores/             # Zustand stores (auth-store.ts)
└── providers/          # React context providers
```

**Tests:** Co-located in `__tests__/` directories within each module (backend) or alongside components (frontend `.test.tsx`).

### Format Patterns

**API Responses:**
- Single entity: `{ id, name, email, ... }` (direct, no wrapper)
- Paginated list: `{ data: [...], meta: { total, page, limit, totalPages } }`
- Cursor-based list: `{ data: [...], meta: { nextCursor, hasMore } }`
- Error: `{ statusCode, error, message, details?: { field, message }[] }`
- Empty success (DELETE/action): `204 No Content`

**Date/Time in API:**
- All dates as ISO 8601 strings (`2026-02-19T14:30:00.000Z`)
- Always UTC — frontend converts to local time for display
- Duration in minutes (integer) — not hours, not ISO duration

**JSON Field Naming:**
- camelCase in all JSON payloads (request and response)
- Prisma serializes camelCase by default
- Zod schemas use camelCase keys

**HTTP Status Codes:**
| Code | Usage |
|------|-------|
| `200` | Successful GET, PATCH |
| `201` | Successful POST (entity created) |
| `204` | Successful DELETE or action with no response body |
| `400` | Validation error (Zod), malformed request |
| `401` | Unauthenticated (missing/invalid token) |
| `403` | Unauthorized (valid token, insufficient role) |
| `404` | Entity not found |
| `409` | Conflict (duplicate email, schedule overlap) |
| `422` | Business logic rejection (cannot archive last Super Admin) |
| `429` | Rate limited |

### Communication Patterns

**No Event System in V1:**
Modules communicate via injected services (ADR-C3). No event bus, no pub/sub. `NotificationService.create()` called directly by owning service. Growth phase: consider NestJS `EventEmitter2` if cross-module decoupling needed.

**Logging:**
- Structured JSON logs (NestJS 11 native)
- Levels: `error` (unhandled exceptions, failed jobs), `warn` (rate limiting, anomalies), `log` (request lifecycle, job completion), `debug` (development only)
- Every log entry includes: `timestamp`, `level`, `context` (module name), `message`
- Request logs include: `method`, `path`, `statusCode`, `duration`, `userId`, `tenantId`
- Background job logs include: `jobName`, `itemsProcessed`, `duration`
- **Never log:** passwords, tokens, PII, full request bodies

### Process Patterns

**Error Handling (Backend):**
- Services throw NestJS `HttpException` subclasses (`NotFoundException`, `ForbiddenException`, `ConflictException`)
- Global `HttpExceptionFilter` normalizes all exceptions to `ApiErrorResponse` shape
- Unhandled exceptions → `500` with generic message (stack trace logged, never sent to client)
- Business logic errors use `UnprocessableEntityException` (422) with descriptive message

**Error Handling (Frontend):**
- API client interceptor catches `401` → triggers silent refresh → retries original request
- Failed refresh → redirect to login, clear auth store
- `4xx` errors → toast with `message` from response, form fields highlighted from `details`
- `5xx` errors → generic "Something went wrong" toast
- Network errors → "Connection lost" indicator (persistent until resolved)

**Loading States:**
- React Query handles loading via `isPending` / `isFetching` flags
- Skeleton components for initial page load (not spinners)
- Inline spinners for mutations (button loading state)
- No global loading bar in V1
- Naming: `isPending` (initial load), `isFetching` (background refetch), `isSubmitting` (form mutation)

**Optimistic Updates:**
- React Query `onMutate` for optimistic cache updates
- `onError` rolls back to previous cache state
- `onSettled` invalidates queries for fresh server data
- Applied to: status toggles, mark-as-read, quick edits
- NOT applied to: entity creation (wait for server ID), file uploads

**Retry Pattern:**
- API client: 3 retries with exponential backoff (1s, 2s, 4s) for `5xx` and network errors only
- Never retry `4xx` errors (client error, won't change)
- Background jobs: 3 retries with exponential backoff (configured per job)
- Offline clock-in queue: retry on reconnection, no timeout

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow the naming conventions exactly — no variations (e.g., never `user_id` in TypeScript, never `userId` in PostgreSQL)
2. Use the Employee module as the reference implementation for new modules
3. Place all validation schemas in `@scheduler/shared-validators`, never duplicate in frontend or backend
4. Return API responses in the standardized format — no custom wrappers
5. Use `AuditService.log()` for business events, never implement audit logging via interceptor or decorator
6. Apply tenant isolation via Prisma Client Extension — never manually add `WHERE tenant_id =` in queries
7. Handle errors via `HttpException` subclasses — never return raw error objects

**Anti-Patterns (Never Do):**
- Create a `utils.ts` catch-all file — use descriptive names (`date-utils.ts`, `validation-helpers.ts`)
- Import from `@prisma/client` directly in controllers — always go through the service layer
- Use `any` type — use `unknown` and narrow, or define proper types
- Store derived state in the database — compute timesheets from clock events + shifts
- Add `console.log` — use NestJS `Logger` service
- Catch exceptions silently — always log or re-throw
- Hard-code configuration values — use `ConfigService`

## Project Structure & Boundaries

### Complete Project Directory Structure

```
SCHEDULER/
├── .github/
│   └── workflows/
│       └── ci.yml                          # Lint, typecheck, test, build
├── .husky/
│   └── pre-commit                          # lint-staged trigger
├── .env.example                            # ALL variables documented (single source of truth)
├── .env                                    # Shared: DATABASE_URL, NODE_ENV
├── .gitignore
├── .npmrc                                  # shamefully-hoist=false, strict-peer-dependencies=true
├── .prettierrc
├── .prettierignore
├── eslint.config.js                        # Flat config, per-app overrides
├── docker-compose.yml                      # DEVELOPMENT ONLY — PostgreSQL 16 + Mailpit
├── package.json                            # Root scripts: dev, build, test, lint, typecheck, db:*
├── pnpm-workspace.yaml                     # apps/*, packages/*
├── tsconfig.base.json                      # Shared compilerOptions, @scheduler/* paths
├── ecosystem.config.js                     # PRODUCTION ONLY — PM2 fork mode config
│
├── packages/
│   ├── shared-types/
│   │   ├── package.json                    # @scheduler/shared-types
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                    # Barrel export
│   │       ├── enums.ts                    # SystemRole, EmploymentType, EmployeeStatus, NotificationType, AuditAction, ScheduleVisibility
│   │       ├── api.ts                      # ApiErrorResponse, PaginatedResponse<T>, CursorResponse<T>
│   │       ├── auth.ts                     # LoginResponse, TokenPayload, RefreshPayload
│   │       └── constants.ts               # MAX_SESSIONS, REFRESH_TOKEN_EXPIRY, RATE_LIMITS
│   │
│   └── shared-validators/
│       ├── package.json                    # @scheduler/shared-validators
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                    # Barrel export
│           ├── auth.ts                     # loginSchema, forgotPasswordSchema, resetPasswordSchema, setPasswordSchema
│           ├── employee.ts                 # createEmployeeSchema, updateEmployeeSchema
│           ├── role.ts                     # createRoleSchema, updateRoleSchema
│           ├── department.ts               # createDepartmentSchema, updateDepartmentSchema
│           ├── group.ts                    # createGroupSchema, updateGroupSchema, manageMembersSchema
│           ├── location.ts                 # createLocationSchema, updateLocationSchema
│           ├── settings.ts                 # updateSettingsSchema
│           ├── notification.ts             # notificationPrefsSchema
│           ├── schedule.ts                 # Phase 2 stub — schemas defined, not imported by Phase 1 code
│           ├── clock-event.ts              # Phase 2 stub
│           ├── leave.ts                    # Phase 3 stub
│           └── common.ts                   # paginationSchema, idParamSchema, dateRangeSchema
│
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json                   # Extends root, decorators, emitDecoratorMetadata
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json                   # SWC compiler config
│   │   ├── vitest.config.ts                # vite-tsconfig-paths, test DB setup
│   │   ├── .env                            # API-specific: JWT_*, SMTP_*, APP_URL, CORS_ORIGIN
│   │   ├── .env.example
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # All models with @@map, tenant_id, status fields
│   │   │   ├── migrations/                # Committed migration files
│   │   │   └── seed.ts                    # Two-mode: minimal + development
│   │   │
│   │   ├── src/
│   │   │   ├── main.ts                    # Bootstrap, Swagger, global pipes/filters
│   │   │   ├── app.module.ts              # Root module, imports all feature modules
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── app.config.ts          # Port, CORS origin, app URL
│   │   │   │   ├── auth.config.ts         # JWT secrets, token expiry, session limits
│   │   │   │   ├── database.config.ts     # Database URL, pool size
│   │   │   │   ├── mail.config.ts         # SMTP host, port, credentials
│   │   │   │   └── env.validation.ts      # Zod schema for all env vars, fail-fast
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts    # @CurrentUser() — extracts user from verified JWT
│   │   │   │   │   ├── roles.decorator.ts           # @Roles(SystemRole.SUPER_ADMIN)
│   │   │   │   │   └── tenant-id.decorator.ts       # @TenantId() — extracts tenantId from verified JWT
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts     # Global → ApiErrorResponse shape
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts            # Custom JWT verification, sets request.user
│   │   │   │   │   └── roles.guard.ts               # RBAC check against @Roles metadata
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── logging.interceptor.ts       # Structured request logging
│   │   │   │   ├── pipes/
│   │   │   │   │   └── zod-validation.pipe.ts       # Zod → NestJS validation pipe
│   │   │   │   └── prisma/
│   │   │   │       ├── prisma.module.ts             # Global Prisma module
│   │   │   │       ├── prisma.service.ts            # PrismaClient + forTenant(tenantId) method
│   │   │   │       └── prisma.extension.ts          # Tenant isolation Extension ($extends)
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   │
│   │   │   │   │  # ── CRUD MODULES (follow Employee reference pattern) ──
│   │   │   │   │
│   │   │   │   ├── employee/                        # REFERENCE MODULE
│   │   │   │   │   ├── employee.module.ts
│   │   │   │   │   ├── employee.controller.ts       # CRUD + archive/reactivate + role assignment
│   │   │   │   │   ├── employee.service.ts          # Business logic, dept scoping for Managers
│   │   │   │   │   ├── dto.ts                       # Zod-inferred types (CreateEmployeeDto, UpdateEmployeeDto)
│   │   │   │   │   └── __tests__/
│   │   │   │   │       ├── employee.controller.spec.ts
│   │   │   │   │       └── employee.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── role/
│   │   │   │   │   ├── role.module.ts
│   │   │   │   │   ├── role.controller.ts
│   │   │   │   │   ├── role.service.ts
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── department/
│   │   │   │   │   ├── department.module.ts
│   │   │   │   │   ├── department.controller.ts
│   │   │   │   │   ├── department.service.ts
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── group/
│   │   │   │   │   ├── group.module.ts
│   │   │   │   │   ├── group.controller.ts
│   │   │   │   │   ├── group.service.ts
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── location/
│   │   │   │   │   ├── location.module.ts
│   │   │   │   │   ├── location.controller.ts       # CRUD + geofence config
│   │   │   │   │   ├── location.service.ts
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   │  # ── SERVICE MODULES (injected by others, read-only or no controller) ──
│   │   │   │   │
│   │   │   │   ├── notification/
│   │   │   │   │   ├── notification.module.ts
│   │   │   │   │   ├── notification.controller.ts   # List, unread count, mark read (read-only API)
│   │   │   │   │   ├── notification.service.ts      # create() — called by other modules, not via API
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── audit-log/
│   │   │   │   │   ├── audit-log.module.ts
│   │   │   │   │   ├── audit-log.controller.ts      # List only (filtered, Super Admin)
│   │   │   │   │   ├── audit-log.service.ts         # AuditService.log() — called by other modules
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── mail/
│   │   │   │   │   ├── mail.module.ts
│   │   │   │   │   ├── mail.service.ts              # Email dispatch via @nestjs/mailer
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── settings/
│   │   │   │   │   ├── settings.module.ts
│   │   │   │   │   ├── settings.controller.ts       # GET/PATCH (singleton per tenant)
│   │   │   │   │   ├── settings.service.ts
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── jobs.module.ts
│   │   │   │   │   ├── jobs.service.ts              # @nestjs/schedule, running flags
│   │   │   │   │   ├── handlers/
│   │   │   │   │   │   ├── email-processor.job.ts   # 10s interval, optimistic record locking
│   │   │   │   │   │   ├── auto-clock-out.job.ts    # 5 min (Phase 2)
│   │   │   │   │   │   ├── escalation.job.ts        # 60 min (Phase 3)
│   │   │   │   │   │   └── cleanup.job.ts           # 60 min, GPS purge, anonymization
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   │  # ── UTILITY MODULES (unique structure, don't follow templates) ──
│   │   │   │   │
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts           # login, refresh, logout, forgot/reset/set-password
│   │   │   │   │   ├── auth.service.ts              # JWT, session mgmt, password hashing
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── file/
│   │   │   │   │   ├── file.module.ts
│   │   │   │   │   ├── file.controller.ts           # Upload (multer disk) + serve (authenticated)
│   │   │   │   │   ├── file.service.ts              # FileService abstraction (local FS)
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── preview/
│   │   │   │   │   ├── preview.module.ts
│   │   │   │   │   ├── preview.controller.ts        # GET /preview/:token (unauthenticated, own throttler)
│   │   │   │   │   ├── preview.service.ts           # Token validation, scoped data fetch
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   └── health/
│   │   │   │       └── health.controller.ts         # GET /api/health — DB connectivity
│   │   │   │
│   │   │   └── templates/
│   │   │       ├── layouts/
│   │   │       │   └── main.hbs                     # Email layout chrome
│   │   │       ├── invite.hbs
│   │   │       ├── password-reset.hbs
│   │   │       ├── schedule-published.hbs
│   │   │       ├── schedule-amended.hbs
│   │   │       ├── leave-status.hbs
│   │   │       ├── shift-reminder.hbs
│   │   │       └── new-device-login.hbs
│   │   │
│   │   ├── test/
│   │   │   ├── setup.ts                             # Vitest globalSetup — migrate test DB
│   │   │   ├── helpers.ts                           # Transaction wrapping, auth helpers
│   │   │   └── fixtures/                            # Factory functions with overrides
│   │   │
│   │   └── uploads/
│   │       ├── .gitkeep
│   │       └── tmp/                                 # Multer disk storage temp directory
│   │
│   └── web/
│       ├── package.json
│       ├── tsconfig.json                            # Extends root, jsx, Next.js plugin
│       ├── next.config.ts                           # transpilePackages, headers, rewrites
│       ├── tailwind.config.ts                       # Design tokens, custom theme
│       ├── postcss.config.js
│       ├── components.json                          # shadcn/ui config
│       ├── vitest.config.ts
│       ├── .env.local                               # NEXT_PUBLIC_API_URL
│       ├── .env.example
│       │
│       └── src/
│           ├── app/
│           │   ├── globals.css                      # Tailwind directives, CSS custom properties
│           │   ├── layout.tsx                        # Root layout (providers, fonts)
│           │   │
│           │   ├── (auth)/
│           │   │   ├── layout.tsx                    # Centered card layout
│           │   │   ├── login/page.tsx
│           │   │   ├── forgot-password/page.tsx
│           │   │   ├── reset-password/page.tsx
│           │   │   └── set-password/page.tsx         # Invite flow
│           │   │
│           │   ├── (dashboard)/
│           │   │   ├── layout.tsx                    # Sidebar + Header + BottomNav + AuthGuard
│           │   │   ├── dashboard/page.tsx            # Empty state (Phase 2)
│           │   │   ├── employees/
│           │   │   │   ├── page.tsx                  # List — thin shell
│           │   │   │   ├── new/page.tsx              # Create form
│           │   │   │   └── [id]/page.tsx             # Detail (tabbed profile)
│           │   │   ├── roles/page.tsx                # Card grid
│           │   │   ├── departments/page.tsx          # Table
│           │   │   ├── groups/page.tsx               # Card list + member management
│           │   │   ├── locations/page.tsx            # Location management
│           │   │   ├── notifications/page.tsx        # Feed
│           │   │   ├── settings/page.tsx             # Tabbed page
│           │   │   ├── schedule/page.tsx             # Empty state (Phase 2)
│           │   │   ├── attendance/page.tsx           # Empty state (Phase 2)
│           │   │   └── leave/page.tsx                # Empty state (Phase 3)
│           │   │
│           │   └── preview/
│           │       └── [token]/page.tsx              # Server-rendered, zero JS
│           │
│           ├── components/
│           │   ├── ui/                               # shadcn/ui primitives (barrel export allowed)
│           │   │   ├── index.ts                      # Re-exports all ui primitives
│           │   │   ├── button.tsx
│           │   │   ├── dialog.tsx
│           │   │   ├── input.tsx
│           │   │   ├── select.tsx
│           │   │   ├── table.tsx
│           │   │   ├── card.tsx
│           │   │   ├── badge.tsx
│           │   │   ├── avatar.tsx
│           │   │   ├── toast.tsx                     # sonner wrapper
│           │   │   ├── skeleton.tsx
│           │   │   ├── dropdown-menu.tsx
│           │   │   ├── tabs.tsx
│           │   │   ├── form.tsx                      # React Hook Form integration
│           │   │   ├── search-input.tsx              # Debounced search with clear
│           │   │   ├── date-picker.tsx               # shadcn date picker wrapper
│           │   │   ├── color-picker.tsx              # Predefined palette for roles
│           │   │   ├── multi-select.tsx              # Employee/member multi-select with search
│           │   │   └── confirm-dialog.tsx            # Destructive action confirmation
│           │   ├── layout/
│           │   │   ├── Sidebar.tsx
│           │   │   ├── Header.tsx
│           │   │   ├── BottomNav.tsx
│           │   │   ├── PageHeader.tsx
│           │   │   ├── EmptyState.tsx
│           │   │   └── AuthGuard.tsx                 # Init: check refresh cookie, resolve auth state
│           │   ├── employees/
│           │   │   ├── EmployeeTable.tsx
│           │   │   ├── EmployeeCard.tsx
│           │   │   ├── EmployeeForm.tsx
│           │   │   ├── EmployeeProfile.tsx
│           │   │   └── EmployeeFilters.tsx
│           │   ├── roles/
│           │   │   ├── RoleCard.tsx
│           │   │   └── RoleForm.tsx
│           │   ├── departments/
│           │   │   ├── DepartmentTable.tsx
│           │   │   └── DepartmentForm.tsx
│           │   ├── groups/
│           │   │   ├── GroupCard.tsx
│           │   │   ├── GroupForm.tsx
│           │   │   └── MemberPicker.tsx
│           │   ├── locations/
│           │   │   ├── LocationTable.tsx
│           │   │   └── LocationForm.tsx
│           │   ├── notifications/
│           │   │   ├── NotificationFeed.tsx
│           │   │   └── NotificationItem.tsx
│           │   └── settings/
│           │       ├── ScheduleSettings.tsx
│           │       └── EmployeeSettings.tsx
│           │
│           ├── hooks/                                # Flat directory, one file per domain
│           │   ├── use-auth.ts                       # Login, logout, refresh, current user
│           │   ├── use-employees.ts                  # All employee queries + mutations
│           │   ├── use-roles.ts
│           │   ├── use-departments.ts
│           │   ├── use-groups.ts
│           │   ├── use-locations.ts
│           │   ├── use-notifications.ts              # Feed, unread count, mark read
│           │   └── use-settings.ts
│           │
│           ├── lib/                                  # App infrastructure (3+ feature rule)
│           │   ├── api-client.ts                     # Axios, JWT interceptor, refresh lock, dual base URL
│           │   ├── env.ts                            # NEXT_PUBLIC_* validation at build time
│           │   ├── utils.ts                          # cn() helper, date formatting (max ~10 functions)
│           │   └── query-keys.ts                     # React Query key factories (mandatory, no inline keys)
│           │
│           ├── stores/
│           │   └── auth-store.ts                     # Zustand: user, role, tokens (in-memory), all auth logic
│           │
│           ├── providers/
│           │   └── QueryProvider.tsx                  # React Query client config
│           │
│           ├── test-utils/                           # Test infrastructure
│           │   ├── render.tsx                         # Custom render with QueryClientProvider
│           │   ├── mocks.ts                          # Mock API client, mock auth store
│           │   └── factories.ts                      # Frontend test data factories
│           │
│           └── middleware.ts                          # Auth redirects (exclude /preview/*)
│
└── ecosystem.config.js                               # PM2 fork mode (production only)
```

### Module Archetypes

**1. CRUD Module** (employee, role, department, group, location):
Full controller with POST/GET/PATCH/DELETE, service with business logic, dto.ts with Zod-inferred types, integration tests. Department scoping for Manager role in service layer. Copy from Employee reference module.

**2. Service Module** (notification, audit-log, mail, settings, jobs):
Primarily a service injected by other modules. Controller is read-only or absent. `create()` / `log()` methods called internally, not via API POST. Settings is a singleton per tenant (GET/PATCH only).

**3. Utility Module** (auth, health, file, preview, prisma):
Unique structure per module. Don't force into a template. Auth has login/refresh/logout flow. File has upload/serve. Preview is unauthenticated with own throttler. Health is a single endpoint. Build from scratch per requirements.

### Architectural Boundaries

**API Boundaries:**
- All client requests enter through Nginx → NestJS controllers
- Controllers: validate input (Zod pipe) → check auth (JwtAuthGuard) → check roles (RolesGuard) → call service
- Controllers never access Prisma directly
- Services call `this.prisma.forTenant(tenantId)` — tenant_id injected per request, not at construction
- Cross-module: Service A injects Service B (e.g., EmployeeService injects NotificationService)
- NotificationService accepts all data as parameters — never queries back to the calling module (prevents circular deps)

**Module Dependencies (no cycles):**
```
prisma ← (global, injected everywhere)
auth ← (standalone)
health ← (standalone)
mail ← notification
audit-log ← employee, role, department, group, location, settings, auth
notification ← employee, auth, (Phase 2: schedule, leave)
employee → auth, notification, audit-log, mail, file
role → audit-log
department → audit-log
group → audit-log
location → audit-log
settings → audit-log
preview → (reads schedule data, validates own tokens)
jobs → notification, mail, employee, (Phase 2: clock-event, schedule)
file ← employee (avatar upload)
```

**Frontend Boundaries:**
- Pages (`app/`) are thin shells (~30 lines) — delegate to components
- Components own visual rendering and event handling
- Hooks own data fetching (React Query) and expose loading/error states
- `api-client.ts` is the sole HTTP interface — no raw `fetch` calls
- `auth-store.ts` is the sole source of auth state (tokens, user, all auth logic)
- No barrel exports except `components/ui/index.ts`
- Direct imports everywhere: `import { useEmployees } from '@/hooks/use-employees'`

**Data Boundaries:**
- Prisma Client Extension auto-injects `tenant_id` on ALL operations (findMany, findUnique, count, update, delete)
- Services add department scoping for Manager role (explicit WHERE clause in service methods)
- Controllers never construct database queries
- DTOs (Zod-inferred types in `dto.ts`) define the contract between controller and service

### Requirements to Structure Mapping

| Domain (FR Range) | API Module | Archetype | Frontend Route | Components | Hook |
|---|---|---|---|---|---|
| Auth (FR60-66) | `modules/auth/` | Utility | `(auth)/*` | — | `use-auth` |
| Employees (FR35-42) | `modules/employee/` | CRUD | `(dashboard)/employees/*` | `employees/*` | `use-employees` |
| Roles (FR43-44) | `modules/role/` | CRUD | `(dashboard)/roles` | `roles/*` | `use-roles` |
| Departments (FR45-46) | `modules/department/` | CRUD | `(dashboard)/departments` | `departments/*` | `use-departments` |
| Groups (FR47-48) | `modules/group/` | CRUD | `(dashboard)/groups` | `groups/*` | `use-groups` |
| Locations (FR35-48) | `modules/location/` | CRUD | `(dashboard)/locations` | `locations/*` | `use-locations` |
| Notifications (FR49-55) | `modules/notification/` | Service | `(dashboard)/notifications` | `notifications/*` | `use-notifications` |
| Settings (FR67-69) | `modules/settings/` | Service | `(dashboard)/settings` | `settings/*` | `use-settings` |
| Audit Log | `modules/audit-log/` | Service | (Super Admin view) | — | — |
| Schedule (FR1-12) | Phase 2 | — | Empty state | — | — |
| Attendance (FR13-25) | Phase 2 | — | Empty state | — | — |
| Leave (FR26-34) | Phase 3 | — | Empty state | — | — |
| Dashboard (FR56-59) | Phase 2 | — | Empty state | — | — |

**Cross-Cutting → Location:**

| Concern | File(s) |
|---|---|
| Tenant isolation | `common/prisma/prisma.extension.ts` + `prisma.service.ts` (`forTenant()`) |
| JWT auth | `common/guards/jwt-auth.guard.ts` |
| RBAC | `common/guards/roles.guard.ts` + `common/decorators/roles.decorator.ts` |
| Audit logging | `modules/audit-log/audit-log.service.ts` (injected by consumers) |
| Notifications | `modules/notification/notification.service.ts` (injected by consumers) |
| Validation | `common/pipes/zod-validation.pipe.ts` + `@scheduler/shared-validators` |
| Error normalization | `common/filters/http-exception.filter.ts` |
| Request logging | `common/interceptors/logging.interceptor.ts` |
| Background jobs | `modules/jobs/handlers/*.job.ts` (running flag + optimistic locking) |
| Email dispatch | `modules/mail/mail.service.ts` + `modules/jobs/handlers/email-processor.job.ts` |
| File management | `modules/file/file.service.ts` (multer disk storage) |

### Critical Implementation Patterns

**Tenant Isolation (FM-1):**
```
// PrismaService provides per-request tenant scoping
const db = this.prisma.forTenant(tenantId);
const employees = await db.employee.findMany({ ... });
// Extension auto-adds WHERE tenant_id = tenantId
```
Never apply tenant Extension at PrismaClient construction. Always per-request via `forTenant()`.

**Auth Token Refresh Lock (FM-6):**
`api-client.ts` implements a refresh lock. When 401 received: check if refresh in progress → if yes, queue request → if no, start refresh. Only ONE refresh request in flight at a time. All queued requests retry with the new token.

**Cron Job Overlap Prevention (FM-10):**
Every job handler: `isRunning` flag checked at start, set in try/finally. Email processor additionally uses optimistic record locking (`PROCESSING` status on EmailJob rows).

**Query Key Factory (SC-P5):**
```
// query-keys.ts — ALL keys defined here, no inline keys ever
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id) => [...employeeKeys.details(), id] as const,
}
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All 19 ADRs verified compatible. NestJS 11 + Prisma 7 + Next.js 16 + PostgreSQL 16 — no version conflicts. JWT RS256 + custom guard + Session table — internally consistent. PM2 fork mode + @nestjs/schedule — compatible for single-instance V1. No contradictory decisions across ADR-C, ADR-S, ADR-D, SC, WR, CR, FM, CP series.

**Pattern Consistency:** Naming conventions consistent across all layers (snake_case DB → camelCase TypeScript → kebab-case files → PascalCase components). API response shapes aligned end-to-end from backend HttpExceptionFilter through frontend error handling. Three module archetypes match actual module inventory.

**Structure Alignment:** Project tree reflects all corrections — no tenant middleware (FM-8), auth consolidated in Zustand (CP-P3), AuthGuard in layout (CP-P4), single dto.ts per module (CR-1), no entities directory (CR-2). Module dependencies verified acyclic.

### Requirements Coverage Validation

**Functional Requirements:** 70 FRs across 8 domains. Phase 1 modules (auth, employee, role, department, group, location, notification, settings, audit-log) fully architecturally supported. Phase 2 (schedule, attendance, dashboard) and Phase 3 (leave/approvals) have architectural decisions made (data model, offline pattern, break rule snapshot, polling) — implementation deferred with empty state placeholders.

**Non-Functional Requirements:** 38 NFRs verified. Data integrity (append-only audit, timesheet validation), performance (Prisma pool, JS budgets), reliability (no Redis inherent, email retry, PM2 restart), security (3 throttlers, session limit, refresh rotation), observability (health, logging, Sentry), offline (localStorage queue, syncStatus), privacy (encryption at rest, GPS purge job, anonymization job) — all architecturally addressed.

### Implementation Readiness Validation

**Decision Completeness:** 19 formal ADRs with trade-offs and rationale. 28 self-consistency corrections resolving contradictions. 10 failure modes prevented. Technology versions verified via web search. All critical patterns include concrete code examples.

**Structure Completeness:** ~120 files/directories specified in complete project tree. Every module has defined archetype and clear responsibility. Frontend routes, components, hooks, and utilities fully mapped. Backend modules, services, controllers, and job handlers placed.

**Pattern Completeness:** 5 naming categories with examples. 3 module archetypes. Error handling end-to-end. Loading states, optimistic updates, retry patterns. 7 enforcement rules + 7 anti-patterns. Query key factory pattern. Tenant isolation pattern. Refresh lock pattern. Cron overlap prevention pattern.

### Gap Analysis Results

**No critical gaps remain.** All gaps resolved during 14 AE rounds:
- Location module added (SC-P1)
- Preview module added (SC-P2)
- Tenant middleware removed — security fix (FM-8)
- PM2 cluster mode prohibited — correctness fix (SC-D6)
- Auth state consolidated — no sync bugs (CP-P3)
- Module archetypes defined — agent clarity (CP-P2)

**Minor gaps (acceptable for V1):**
- No formal database indexing strategy — optimize reactively via query monitoring
- No API versioning beyond `/v1` prefix — sufficient until breaking changes
- No log aggregation — structured JSON + Sentry sufficient at V1 scale
- No load testing plan — acceptable for 100-tenant target

### Architecture Completeness Checklist

**Requirements Analysis:**
- [x] 70 FRs analyzed and mapped to architectural components
- [x] 38 NFRs analyzed with architectural solutions
- [x] Scale assessed (100 tenants, 2,000 employees, ~5GB/year)
- [x] 10 cross-cutting concerns identified and addressed
- [x] 7 accepted V1 risks documented with growth-phase resolutions

**Architectural Decisions:**
- [x] 19 formal ADRs with trade-offs (ADR-C1-7, ADR-S1-6, ADR-D1-6)
- [x] Technology stack fully specified with verified versions
- [x] Security architecture comprehensive (13 measures)
- [x] Offline/sync strategy defined
- [x] Background job reliability patterns specified

**Implementation Patterns:**
- [x] Naming conventions for DB, API, code, files, components
- [x] 3 module archetypes defined (CRUD, Service, Utility)
- [x] Error handling end-to-end (backend → API response → frontend toast/form)
- [x] Loading states, optimistic updates, retry patterns
- [x] 7 enforcement rules + 7 anti-patterns

**Project Structure:**
- [x] Complete directory tree (~120 entries)
- [x] Module boundaries and dependency graph (no cycles)
- [x] Requirements-to-structure mapping table
- [x] Cross-cutting concerns-to-file mapping table
- [x] Critical implementation patterns with code examples

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: HIGH**

14 AE rounds across 6 methods produced 60+ findings — all integrated. Self-consistency validated at every step. Failure modes analyzed proactively. No unresolved contradictions.

**Key Strengths:**
1. Single source of truth patterns — Zod (validation), Zustand (auth state), query-keys.ts (cache keys)
2. Clear module archetypes prevent AI agent confusion across 14 modules
3. Per-request tenant isolation pattern prevents the most critical security failure mode
4. Comprehensive error handling contract from database to toast notification
5. Three-tier testing strategy with transaction-wrapped integration tests

**Areas for Future Enhancement:**
- Database indexing strategy (reactive, post-launch monitoring)
- API versioning beyond v1 (when breaking changes needed)
- Log aggregation and alerting (Growth phase)
- Load testing (pre-launch or post-launch week 1)
- Containerization for horizontal scaling (Growth phase)
- Redis integration for distributed rate limiting and session caching (Growth phase)

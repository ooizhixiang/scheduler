# Story 1.1: Auth Infrastructure & Tenant Bootstrap

Status: ready-for-dev

## Story

As a **developer**,
I want the authentication infrastructure, tenant model, and database seeding in place,
So that all subsequent features have a secure, tenant-scoped foundation.

## Acceptance Criteria

1. **Given** the API application starts up
   **When** environment variables are loaded
   **Then** Zod validation runs against all required env vars (AR16) and the app fails fast with clear errors if any are missing

2. **Given** the Prisma schema is migrated
   **When** the database is ready
   **Then** Employee, Tenant, RefreshToken, and Settings tables exist with tenant_id on all tenant-scoped tables

3. **Given** Prisma Client Extensions are configured (AR6)
   **When** any database query executes within an authenticated request
   **Then** tenant_id is automatically injected into all WHERE clauses and CREATE data

4. **Given** the seed script runs in minimal mode (AR9)
   **When** seeding completes
   **Then** a default tenant, Super Admin employee (admin@scheduler.local / Admin123!), and default Settings record exist

5. **Given** the login API endpoint receives valid credentials
   **When** POST /auth/login is called with email and password
   **Then** the system returns an RS256-signed JWT access token (15m expiry) and sets an httpOnly refresh token cookie (7d expiry), and the refresh token hash is stored in the database (AR4)

6. **Given** a valid JWT access token
   **When** a request hits any protected endpoint via the custom JwtAuthGuard (AR5)
   **Then** the token is verified, the employee and tenantId are injected into the request context

7. **Given** a refresh token is presented
   **When** POST /auth/refresh is called
   **Then** the old refresh token is invalidated, a new access + refresh token pair is issued (rotation), and if a previously-used refresh token is presented, ALL sessions for that user are invalidated (AR4 reuse detection)

## Tasks / Subtasks

### Task 1: Zod Environment Validation (AC: #1)
- [ ] 1.1 Create `apps/api/src/config/env.validation.ts` with Zod schema for all required env vars. For JWT key fields, add a Zod `.transform()` that handles both base64 and escaped-newline formats: `z.string().min(1).transform(val => val.startsWith('base64:') ? Buffer.from(val.slice(7), 'base64').toString('utf8') : val.replace(/\\n/g, '\n'))` — this prevents PEM parsing failures at runtime. Follow the `.transform()` with a `.refine()` that verifies the decoded value contains `-----BEGIN` and `-----END` markers: `.refine(val => val.includes('-----BEGIN') && val.includes('-----END'), { message: 'Value must be a valid PEM-encoded key' })`. This catches malformed base64, wrong env var copy-paste, and truncated keys at startup rather than at first auth request.
- [ ] 1.2 Integrate into `ConfigModule.forRoot()` with `validate` option in `app.module.ts`
- [ ] 1.3 Verify app crashes with clear error if required vars missing (test manually)

### Task 2: Prisma Schema Verification (AC: #2)
- [ ] 2.1 Verify existing schema has Employee, CompanySettings, RefreshToken (or Session) tables with `tenantId`
- [ ] 2.2 Create Session model: id, userId, refreshTokenHash, expiresAt, revokedAt, ipAddress, userAgent, createdAt. Migrate existing `refreshTokenHash` from Employee model to a Session row for the Super Admin seed user. Then remove `refreshTokenHash` column from Employee model.
- [ ] 2.3 Add `@@index([userId])` on Session table for fast lookup. Also add `@@index([refreshTokenHash])` for O(1) token lookup during refresh (without this, every refresh request table-scans). Set `onDelete: Cascade` on the Session → Employee relation so that when an employee is deleted, all their sessions are automatically cleaned up (prevents orphaned session rows).
- [ ] 2.4 Run `npx prisma migrate dev` to apply any changes, then `npx prisma generate`

### Task 3: Prisma Client Extensions for Tenant Isolation (AC: #3)
- [ ] 3.1 Create `apps/api/src/modules/prisma/prisma.extension.ts` with tenant auto-injection extension. The extension MUST hook ALL query methods: `findMany`, `findFirst`, `findUnique`, `findUniqueOrThrow`, `findFirstOrThrow`, `create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate`, `groupBy`. Missing any method means unscoped queries. Test with `include` and nested `select` to verify tenant scoping propagates to relations. **WARNING:** `$transaction` must use the `forTenant()`-extended client — if you pass the base `PrismaService` to `$transaction([...])` the interactive transaction client inside the callback will NOT have the extension applied. Always use `const tx = this.prisma.forTenant(tenantId)` and then `tx.$transaction(...)`. **WARNING:** `$queryRaw` and `$executeRaw` completely bypass Prisma Client Extensions — any raw SQL must include `WHERE tenant_id = $1` manually. Add a code comment in the extension file documenting this limitation.
- [ ] 3.2 Add `forTenant(tenantId: string)` method to PrismaService
- [ ] 3.3 Update ALL existing services to use `this.prisma.forTenant(tenantId)` instead of raw `this.prisma`. **Complete service file inventory that MUST be updated:**
  - `modules/auth/auth.service.ts`
  - `modules/employee/employee.service.ts`
  - `modules/role/role.service.ts`
  - `modules/department/department.service.ts`
  - `modules/group/group.service.ts`
  - `modules/notification/notification.service.ts`
  - `modules/settings/settings.service.ts`
  - `modules/audit-log/audit-log.service.ts`
  - `modules/location/location.service.ts`
  - `modules/availability/availability.service.ts`
  - `modules/schedule/schedule.service.ts`
  - `modules/schedule/shift.service.ts` (if exists)
  - `modules/schedule/conflict.service.ts` (if exists)
  - Any other service file that injects PrismaService — grep for `private prisma: PrismaService` to find all
- [ ] 3.4 Write integration test: create two tenants, create employee in tenant A, query from tenant B context — must return empty/404. Cover all existing service modules (employee, role, department, group, notification, settings). This is the primary enforcement mechanism for tenant isolation correctness.

### Task 4: Database Seeding (AC: #4)
- [ ] 4.1 Verify/create `apps/api/prisma/seed.ts` with idempotent upserts
- [ ] 4.2 Minimal seed: default tenant `00000000-0000-0000-0000-000000000001`, Super Admin `admin@scheduler.local` / `Admin123!` (bcrypt hashed), default CompanySettings
- [ ] 4.3 Development seed: sample roles, departments, employees (only if NODE_ENV=development)
- [ ] 4.4 Test idempotency: run seed twice, verify no duplicates

### Task 5: JWT RS256 Authentication (AC: #5, #6)

**WARNING — All auth methods that touch refresh tokens must be updated for Session table:**
The following methods in `auth.service.ts` reference `refreshTokenHash` or tokens and ALL must migrate from Employee-field to Session-table pattern: `login()`, `register()`, `refresh()`, `logout()`, `setPassword()`, `resetPassword()`, and any archive/revoke handlers. Missing any creates a partial migration where some flows write to the old location.
- [ ] 5.1 Generate RS256 key pair: `openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048` then `openssl rsa -pubout -in private.pem -out public.pem`. Store as base64-encoded single-line in .env (e.g. `JWT_PRIVATE_KEY=base64:...`) and decode at runtime, OR use `\n` literal escaping for PEM newlines. Document the chosen format in .env.example.
- [ ] 5.2 Add `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` to env vars and Zod schema
- [ ] 5.3 Update auth.service.ts to sign with RS256 private key, verify with public key
- [ ] 5.4 Rewrite JwtAuthGuard WITHOUT Passport.js. Move employee existence check and ARCHIVED status validation from `jwt.strategy.ts` INTO the new guard. The guard must: (a) check for `@Public()` decorator via Reflector — if present, skip auth and return true, (b) extract token from Authorization header, (c) verify RS256 signature with public key, (d) query employee by sub claim and verify status !== ARCHIVED, (e) inject employee + tenantId into request context. **Error handling must return distinct messages for frontend differentiation:** missing Authorization header → 401 `{ message: 'No authentication token provided' }`; malformed/invalid signature → 401 `{ message: 'Invalid token' }`; expired token → 401 `{ message: 'Token expired' }` (frontend uses this to trigger refresh); employee not found or ARCHIVED → 401 `{ message: 'Account unavailable' }`. Wrap `jwtService.verifyAsync()` in try/catch and check `error.name === 'TokenExpiredError'` to distinguish expired from invalid. After rewriting, verify ALL public endpoints still work without auth: POST /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password, /auth/set-password, GET /health. Delete `jwt.strategy.ts` only AFTER confirming the guard replicates all its validation logic AND public endpoints pass.
- [ ] 5.5 Set refresh token as httpOnly cookie (SameSite=Strict, Secure in prod)
- [ ] 5.6 Store bcrypt hash of refresh token in database (never raw token)
- [ ] 5.7 Prevent timing attacks on login: if email not found, still run `bcrypt.compare(password, DUMMY_HASH)` before returning generic error. This ensures identical response time for valid vs invalid emails, preventing email enumeration via timing side-channel.

### Task 6: Refresh Token Rotation with Reuse Detection (AC: #7)
- [ ] 6.1 On refresh: invalidate old token hash, issue new token pair, store new hash
- [ ] 6.2 Implement reuse detection: if a previously-used token is presented, invalidate ALL sessions for that user
- [ ] 6.3 Enforce max 3 concurrent sessions (NFR27): on login, if 3+ exist, delete oldest
- [ ] 6.4 Session revocation on employee archive: delete all refresh token hashes
- [ ] 6.5 Concurrent refresh grace period: when a refresh token is used, don't immediately hard-delete the old session — set `revokedAt = now()` but keep the row for 10 seconds. If the same old token arrives again within the grace window (concurrent tab refresh race), return the same new token pair instead of triggering reuse detection. After 10s, treat it as genuine reuse.
- [ ] 6.6 On logout (`POST /auth/logout`), call `res.clearCookie('refreshToken', { path: '/api/auth' })` to remove the httpOnly cookie. The `path` option MUST match the path used when setting the cookie — a mismatch silently fails to clear. Verify the Set-Cookie path on login/refresh matches the clearCookie path on logout.
- [ ] 6.7 Cookie path consistency: set the refresh token cookie with `path: '/api/auth'` (not `/`) to prevent the cookie from being sent on every API request. This limits cookie transmission to only the auth endpoints that need it.

### Task 7: Frontend Auth Client Updates

**BREAKING API CONTRACT CHANGE:** The refresh endpoint previously returned the refresh token in the JSON response body. Now it sets an httpOnly cookie instead. The frontend MUST be updated:
- The login response will still contain `accessToken` in the body but `refreshToken` moves to a Set-Cookie header
- The refresh endpoint (`POST /auth/refresh`) no longer needs a token in the request body — the browser sends the cookie automatically when `withCredentials: true` (Axios) or `credentials: 'include'` (fetch)
- The Zustand store should NO LONGER store `refreshToken` at all — it's managed entirely by the browser cookie jar

- [ ] 7.1 Verify Zustand `partialize` function in auth-store.ts excludes `accessToken` and `refreshToken` from localStorage persistence. Only `employee` profile data and `isAuthenticated` flag should persist. Access token must live in a memory-only variable outside the persisted store partition. Remove `refreshToken` from the store entirely — it is now an httpOnly cookie.
- [ ] 7.2 Ensure Axios client has `withCredentials: true` set on the instance (or per-request for auth endpoints) so the browser sends the httpOnly refresh cookie automatically
- [ ] 7.3 Update the 401 interceptor: the refresh call should POST to `/auth/refresh` with NO body (cookie sent automatically). On success, extract the new `accessToken` from the response body, update the in-memory token, and retry queued requests. Ensure only ONE refresh in flight at a time (refresh lock pattern).
- [ ] 7.4 Update login handler: extract `accessToken` from response body, do NOT read `refreshToken` from body (it arrives as Set-Cookie). Store only accessToken in memory and employee profile in Zustand.
- [ ] 7.5 localStorage migration: Phase 1 users may have `refreshToken` persisted in Zustand's localStorage partition. On app init (auth-store hydration), detect and delete the stale `refreshToken` key from the persisted state. Add a one-time migration in the Zustand `onRehydrateStorage` callback: if `state.refreshToken` exists, delete it and force re-persist. Without this, old tokens sit in localStorage indefinitely (XSS-extractable even though no longer functional).
- [ ] 7.6 Verify the NestJS CORS configuration includes `credentials: true` — without this, the browser will reject Set-Cookie headers on cross-origin responses and never store the httpOnly cookie. Check `main.ts` CORS setup: `app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true })`.

## Dev Notes

### What Already Exists (Phase 1 Foundation)

The following is ALREADY BUILT and should be verified/upgraded, not rebuilt:

**Backend (apps/api/src/):**
- `modules/auth/` — auth.module.ts, auth.service.ts, auth.controller.ts, jwt.strategy.ts, mail.service.ts, dto/index.ts
- `modules/prisma/` — prisma.module.ts (@Global), prisma.service.ts
- `modules/employee/` — Full CRUD with invite flow
- `modules/notification/` — @Global notification service
- `modules/audit-log/` — @Global audit log service
- `modules/settings/` — Company settings with auto-create
- `common/guards/` — jwt-auth.guard.ts (extends AuthGuard('jwt')), roles.guard.ts
- `common/decorators/` — @CurrentUser, @TenantId, @Roles, @Public
- `common/interceptors/` — TransformInterceptor wraps responses in `{ success, data, timestamp }`
- `common/filters/` — AllExceptionsFilter returns `{ success: false, error: { code, message, details? } }`
- `main.ts` — helmet, CORS, global prefix 'api', ValidationPipe, Swagger at /api/docs, port 3001

**Frontend (apps/web/src/):**
- `stores/auth-store.ts` — Zustand with persist (accessToken, refreshToken, employee, isAuthenticated)
- `lib/api-client.ts` — Axios with request interceptor (auth header) and response interceptor (401 refresh)
- `hooks/use-auth.ts` — useAuth hook with redirect to /login
- `app/(auth)/login/page.tsx` — Login form with react-hook-form + zod
- `app/(auth)/forgot-password/`, `reset-password/`, `set-password/` pages
- `middleware.ts` — public path check, root redirect to /dashboard

**Shared Packages:**
- `packages/shared-types/src/` — enums.ts (SystemRole, EmployeeStatus, etc.), auth.ts (LoginRequest, JwtPayload), constants.ts
- `packages/shared-validators/src/` — auth.schema.ts (passwordSchema, loginSchema), employee.schema.ts, etc.

**Prisma Schema (apps/api/prisma/schema.prisma):**
- Employee model with: id, tenantId, email, passwordHash, firstName, lastName, systemRole, status, refreshTokenHash, inviteToken, inviteExpiresAt, resetToken, resetExpiresAt, lastLoginAt
- CompanySettings, Role, Department, Group, Notification, AuditLog, Location, Schedule, Shift, Availability, ScheduleView
- Enums: SystemRole (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE), EmployeeStatus (INVITED, ACTIVE, ARCHIVED), etc.

### Known Gaps Between Existing Code and Architecture Spec

**CRITICAL GAPS TO FIX:**

1. **JWT Algorithm**: Current code uses `JWT_SECRET` (HS256 symmetric). Architecture requires RS256 (asymmetric) with separate public/private keys. Must migrate to RS256.

2. **Passport.js Dependency**: Current code uses `passport-jwt` and `@nestjs/passport`. ADR-S1 mandates custom JwtAuthGuard WITHOUT Passport.js. Should remove Passport dependency and implement direct JWT verification with `@nestjs/jwt`.

3. **Tenant Isolation via Prisma Extensions**: Current code queries with explicit `tenantId` in WHERE clauses but does NOT use Prisma Client Extensions for auto-injection (AR6/FM-1). Must implement `forTenant()` pattern.

4. **Zod Env Validation**: Current code uses basic `@nestjs/config` with `.get()` and defaults. Architecture requires Zod schema validation on startup with fail-fast (AR16/ADR-S3).

5. **Session Table**: Current code stores `refreshTokenHash` directly on the Employee model. Architecture specifies a separate Session table for multi-session tracking (max 3 sessions per user, NFR27). Need Session model.

6. **Reuse Detection**: No evidence of refresh token reuse detection (invalidate ALL sessions if old token reused). Must implement.

7. **httpOnly Cookie for Refresh Token**: Verify refresh token is set as httpOnly cookie with SameSite=Strict, not returned in JSON body.

**MINOR GAPS (verify, may already be handled):**
- Refresh token rotation (may exist but needs verification)
- Session revocation on employee archive
- Rate limiting on auth endpoints (10/min per ADR — @nestjs/throttler is installed)

### Architecture Compliance

**Tech Stack Versions (verify installed):**
- NestJS 11.x, Next.js (14.x currently installed — architecture says 16.x but use what's installed)
- Prisma 7.x (verify — architecture specifies driver adapters: `@prisma/adapter-pg` + `pg`)
- PostgreSQL 16, Node.js 22 LTS
- pnpm 9.x (use `npx pnpm@9.15.0`)

**Auth Architecture (ADR-C6 + ADR-S1):**
- RS256 asymmetric JWT signing
- Access token: 15min, in-memory only
- Refresh token: 7 days, httpOnly cookie, SameSite=Strict, bcrypt hash in Session table
- Custom JwtAuthGuard (no Passport.js)
- Refresh token rotation on every use
- Reuse detection: old token → invalidate ALL sessions
- Max 3 concurrent sessions per user (NFR27)

**Tenant Architecture (ADR-C1 + AR6 + FM-1):**
- Shared database with tenant_id on every table
- Prisma Client Extensions via `forTenant(tenantId)` per-request
- NEVER apply extension at PrismaClient construction time
- tenant_id sourced from JWT claims only, never from request parameters
- Default tenant: `00000000-0000-0000-0000-000000000001`

**API Patterns (ADR-S4):**
- Response wrapper: `{ success, data, timestamp }` (already via TransformInterceptor)
- Error format: `{ success: false, error: { code, message, details? } }` (already via AllExceptionsFilter)
- Route prefix: `/api` (already set)
- Swagger at `/api/docs` (already set)

**Security (ADR-C6 + NFRs):**
- CORS: exact frontend URL only, no wildcard (verify CORS_ORIGIN)
- Helmet for security headers (already applied)
- Rate limiting: auth endpoints 10/min, global 100/min (verify throttler config)
- Identical error messages for login: "Invalid email or password" (prevent enumeration)
- Password: min 8 chars, 1 uppercase, 1 number (from shared-validators passwordSchema)

### Library & Framework Requirements

**Must Use:**
- `@nestjs/jwt` — for JWT sign/verify (RS256)
- `@nestjs/config` — with Zod validate function
- `bcryptjs` or `bcrypt` — password and refresh token hashing (cost factor 12)
- `zod` — env validation schema
- `uuid` — for invite/reset tokens (already used)

**Must NOT Use:**
- `passport` / `passport-jwt` / `@nestjs/passport` — Remove in favor of direct JWT verification (ADR-S1)
- No middleware for tenant isolation — Use Prisma Client Extensions only (FM-8)

**Existing Dependencies (already in package.json):**
- @nestjs/common, @nestjs/core, @nestjs/config, @nestjs/jwt, @nestjs/passport, @nestjs/swagger, @nestjs/throttler
- @prisma/client, prisma, bcrypt, class-validator, class-transformer, helmet, nodemailer, zod
- axios, react-hook-form, @hookform/resolvers, zustand, @tanstack/react-query (frontend)

### File Structure Requirements

**Files to CREATE:**
```
apps/api/src/config/env.validation.ts          # Zod env schema + validate function
apps/api/src/modules/prisma/prisma.extension.ts # Tenant auto-injection extension
```

**Files to MODIFY:**
```
apps/api/src/app.module.ts                     # ConfigModule validate option, remove PassportModule
apps/api/src/modules/prisma/prisma.service.ts  # Add forTenant() method
apps/api/src/modules/auth/auth.service.ts      # RS256, Session table, reuse detection, timing-safe login
apps/api/src/modules/auth/auth.module.ts       # Remove PassportModule, update JwtModule config
apps/api/src/common/guards/jwt-auth.guard.ts   # Direct JWT verify (remove Passport extends), add employee+ARCHIVED validation
apps/api/prisma/schema.prisma                  # Add Session model, remove refreshTokenHash from Employee
apps/api/prisma/seed.ts                        # Verify/update minimal + dev seeds
apps/api/.env                                  # Add JWT_PRIVATE_KEY, JWT_PUBLIC_KEY (base64 or escaped PEM)
.env.example                                   # Document all required vars with format notes
apps/web/src/stores/auth-store.ts              # Verify partialize excludes tokens from persistence
```

**Files to DELETE (after migration):**
```
apps/api/src/modules/auth/jwt.strategy.ts      # Passport JWT strategy — logic moved to JwtAuthGuard
```

**Files to VERIFY (no changes expected):**
```
apps/api/src/common/decorators/               # @CurrentUser, @TenantId, @Roles, @Public
apps/api/src/common/interceptors/             # TransformInterceptor
apps/api/src/common/filters/                  # AllExceptionsFilter
apps/web/src/stores/auth-store.ts             # Zustand auth store
apps/web/src/lib/api-client.ts                # Axios interceptors
apps/web/src/hooks/use-auth.ts                # useAuth hook
```

### Testing Requirements

**Manual Verification (DB not available on this machine):**
1. `npx pnpm@9.15.0 turbo typecheck` — all packages compile without errors. **CRITICAL:** Always use `turbo` commands (not `pnpm --filter`-specific builds) to ensure shared packages rebuild first. If you modified `shared-types` or `shared-validators`, the web app build will fail unless turbo handles the dependency order.
2. `npx pnpm@9.15.0 turbo build` — full build succeeds (both API and web)
3. When DB available: run migrations, seed, verify data
4. Test login flow: valid credentials → tokens returned
5. Test refresh flow: old token invalidated, new pair issued
6. Test reuse detection: replay old refresh token → all sessions killed
7. Test session limit: login 4 times → oldest session invalidated
8. Test env validation: remove required var → app crashes with clear error

**Integration Tests to Write (AR13):**
- Auth login success/failure (including timing-safe response for invalid emails)
- Token refresh rotation
- Reuse detection invalidation (replay old token → all sessions killed)
- Session limit enforcement (4th login invalidates oldest)
- Tenant isolation: for EVERY service module (employee, role, department, group, notification, settings), verify that querying from tenant B context returns zero results for tenant A data. This is the critical safety net for the forTenant() migration.

### RBAC Matrix Reference

| Capability | SUPER_ADMIN | ADMIN | MANAGER | EMPLOYEE |
|-----------|:-----------:|:-----:|:-------:|:--------:|
| All system access | Yes | — | — | — |
| Create/edit schedules (all) | Yes | — | — | — |
| Create/edit schedules (own dept) | Yes | — | Yes | — |
| Share/publish schedule | Yes | — | Yes | — |
| Unpublish schedule | Yes | — | — | — |
| View all employees | Yes | Yes | — | — |
| View department employees | Yes | Yes | Yes | — |
| Invite/archive employees | Yes | Yes | — | — |
| Manage roles/departments | Yes | — | — | — |
| Manage groups | Yes | — | Yes | — |
| Approve day off requests | Yes | — | Yes (dept) | — |
| View all attendance | Yes | — | — | — |
| View dept attendance | Yes | — | Yes | — |
| View/export timesheets | Yes | — | Yes (dept) | — |
| Clock in/out (self) | — | — | Yes | Yes |
| View own schedule | — | — | Yes | Yes |
| View own timesheet | — | — | Yes | Yes |
| Request day off | — | — | Yes | Yes |
| Set availability | — | — | Yes | Yes |
| View audit log | Yes | — | — | — |
| Company settings | Yes | — | — | — |

### Project Structure Notes

- Alignment: Story follows existing NestJS module pattern (module → service → controller → dto)
- All changes are additive or modifications to existing files — no new modules needed
- Tenant extension is the biggest structural change — adds a new file and modifies PrismaService
- RS256 migration changes auth internals but keeps the same API contract

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — ADR-C6 (Auth), ADR-S1 (Custom Guard), ADR-S3 (Config), AR6 (Prisma Extensions)]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR60-FR69, NFR27, Security Requirements]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Auth UX patterns]
- [Source: apps/api/src/modules/auth/ — Existing auth implementation]
- [Source: apps/api/prisma/schema.prisma — Existing database schema]
- [Source: apps/api/src/common/ — Existing guards, decorators, interceptors]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### Change Log
- 2026-02-23: Story created by create-story workflow with comprehensive analysis of existing Phase 1 codebase

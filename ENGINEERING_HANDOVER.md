# BuildOS — Engineering Handover Document

**Repository:** uptipro/BuildOS (fork of [ivukpong/BuildOS](https://github.com/ivukpong/BuildOS))
**Live frontend:** build-os-six.vercel.app (the fork's own deployment; the upstream repo's `main.ts` CORS allowlist also hardcodes `build-os-delta.vercel.app` and `buildos-dev-suite.vercel.app` as additional trusted origins — see §4.1)
**Prepared:** July 29, 2026
**Primary stack:** NestJS + Prisma/PostgreSQL backend, React + TypeScript frontend

**Source basis:** direct inspection of the cloned repository — source code, Prisma schema, git history, and configuration files — not the repository's own internal status reports, several of which are demonstrably stale (see §11). This revision was produced by re-verifying every specific, countable claim in the prior version of this document against the repository at its current commit, using targeted greps and direct file reads rather than re-running the repo's own audit scripts.

> This is a from-source technical handover. Every specific claim below (endpoint counts, RBAC coverage, test files, model counts) was independently re-counted against the actual repository at the commit checked out during preparation. Two corrections from the prior revision of this document are called out explicitly where found, because they affected this document's own headline conclusions — see the change note at the end of §6 and §11.

---

## Table of Contents

1. Executive Summary
2. Repository Layout
3. Tech Stack
4. System Architecture
5. Data Model
6. Authentication & Authorization — read this section carefully
7. API Surface & Conventions
8. Notable Subsystems
9. Environment Variables
10. Running Locally, Testing, and Deployment
11. Known Gaps, Risks, and Technical Debt (prioritized)
12. First-Week Checklist for an Incoming Engineer
13. Where to Go Deeper

---

## 1. Executive Summary

BuildOS is an enterprise construction ERP: a multi-tenant, multi-module business suite (comparable in shape to Google Workspace or Zoho, where each themed module is its own "app" inside one product) covering Construction/Project Management, Finance, Procurement, HR, Employee Self-Service (ESS), Storefront, and Admin.

- **Tenancy:** company-scoped. The first user to sign up becomes that company's Admin/Owner; all other data hangs off a company through its owning entities.
- **Roles referenced in code and UI:** Admin (owner), Construction Manager, Accountant, Store Manager, HR Manager, Employee — plus a separate, generic app-assignment claim (`assignedApps`) used for module-level gating. _(Not re-verified role-by-role in this revision; carried over from the prior pass.)_
- **Scale, re-verified by direct count in this revision:**

  | Metric                                                    | Prior doc claimed          | Actual (re-counted)                                             |
  | --------------------------------------------------------- | -------------------------- | --------------------------------------------------------------- |
  | Prisma models                                             | 105                        | **105** ✓                                                       |
  | Backend feature modules (imported in `app.module.ts`)     | 63                         | **66**                                                          |
  | Controllers                                               | 67                         | **67** ✓                                                        |
  | REST endpoint handlers (`@Get/@Post/@Put/@Patch/@Delete`) | ~585                       | **585** ✓ (exact)                                               |
  | Frontend page components (8 module folders)               | 181                        | **180** (admin folder has 22, not 23)                           |
  | Frontend API-client files (`src/app/api/`)                | 59                         | **60**                                                          |
  | Migrations                                                | 16 (latest `add_org_unit`) | **17** (latest `20260728130000_reconcile_employee_role_column`) |

  Two frontend pages sit directly under `src/app/pages/` outside any of the 8 module folders and aren't counted in the 180 above: `AppLauncherPage.tsx` (the post-login app-switcher landing page) and `UnauthorizedPage.tsx`.

The single most important thing in this document is **§6 (Authentication & Authorization)**: the frontend's route-protection layer is unused, and most backend routes carry no role/permission check beyond "is logged in." Read that section before treating any part of the system as access-controlled — but also read the correction note at the end of it: the prior revision of this document got the mechanics of the backend's role-guard wrong in a way that matters if you're about to add coverage to a route.

The second most important thing is **§11**: this repository contains many internally-generated "completion" and "audit" reports describing an earlier, in-progress state of the codebase, and they are no longer accurate. That same risk applies recursively — the prior version of _this_ document was itself about three weeks and roughly a dozen commits stale by the time anyone read it (see the note at the top of §11). Treat any handover document, including this one, as accurate only as of its stated commit, and check `git log -1` before relying on anything time-sensitive in it.

---

## 2. Repository Layout

The repository holds two independently-versioned applications side by side (separate `package.json` / `tsconfig` at root and under `server/`), plus a Playwright e2e suite and a large set of generated documentation artifacts at the root.

```
/                                   Vite + React 18 frontend (root package.json, vite.config.ts)
├── src/app/
│   ├── App.tsx, routes.tsx         React Router 7 (data mode) route tree
│   ├── layouts/                    RootLayout / AuthLayout / AppLayout
│   ├── components/                 AppHeader, Sidebar, ProtectedRoute (unused — see §6)
│   ├── utils/routeProtection.ts    A second unused layer wrapping ProtectedRoute with
│   │                               per-module role defaults (see §6.1) — also not wired in
│   ├── pages/<module>/             180 page components across 8 module folders:
│   │                               admin(22) auth(5) construction(54) ess(12)
│   │                               finance(26) hr(26) procurement(20) storefront(15)
│   │                               (+ 2 more directly under pages/: AppLauncherPage, UnauthorizedPage)
│   ├── api/                        60 files — one per backend resource; thin fetch
│   │                               wrappers around api/client.ts
│   ├── store/useAuth.ts            Zustand auth store (isAuthenticated, hasRole, ...)
│   └── utils/authSession.ts        Access/refresh token storage (localStorage) + silent
│                                   refresh-on-401
├── server/                         NestJS 10 backend (separate package.json/tsconfig)
│   ├── src/<module>/               66 feature modules / 67 controllers, one folder per domain
│   │                               resource (see §5, §7)
│   ├── prisma/schema.prisma        105 models, ~1,990+ lines
│   ├── prisma/seed*.ts             Reference data + demo/construction seed scripts
│   ├── test/                       jest-e2e.json, setup.ts only (see §10, §11.3)
│   └── Dockerfile                  Multi-stage build → Railway deploy target
├── e2e/                             Playwright specs: debug, employees, fixes, integration, wiring
├── docs/*.docx                     Per-module user guides (Admin, Construction, Finance,
│                                   HR, Procurement, ESS, Storefront, Dashboard, General)
├── BuildOS.postman_collection.json Manual/exploratory API collection
├── BuildOS-Process-Flowcharts.{pdf,docx}, *.drawio  Process diagrams
└── *_AUDIT.md, *_SUMMARY.md, *_REPORT.md  Historical dev-process reports — several
                                          dated June 5, 2026 and stale; see §11
```

> Root `README.md` is a leftover Vite/Figma export stub ("Follow Markdown Instructions") and is unrelated to BuildOS. `BUILDOS_README.md` is the real product/architecture overview and should be read first.

> **What changed since the prior handover:** `e2e/` gained two spec files — `fixes.spec.ts` (a fix-verification suite covering Finance-module wiring) and `wiring.spec.ts` (a cross-module smoke suite hitting all 7 apps plus an HR→Admin onboarding integration check). Two backend migrations were added: `add_employee_user_link` (Employee ↔ User relation) and `reconcile_employee_role_column` (re-adds a column an earlier migration dropped without ever reinstating it — see §5). `src/app/pages/admin/AdminEmailSettingsPage.tsx`, an orphaned page never referenced by `routes.tsx`, was removed as dead code; the real, routed Email Configuration page is `EmailConfigPage.tsx`, which is fully backend-wired (see §8.3). `vercel.json` gained a SPA fallback rewrite (`{ "source": "/(.*)" , "destination": "/index.html" }`) — without it, any hard refresh or direct link to a client-side route 404'd at Vercel's edge before React Router ever loaded; this was actively broken on the live deployment until fixed.

---

## 3. Tech Stack

| Layer          | Choice                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | React 18.3, TypeScript, React Router 7 (data mode), Tailwind CSS 4, Radix UI + shadcn-style components, MUI (partial, alongside Radix), Vite 6, Zustand, Recharts |
| Backend        | NestJS 10, TypeScript, class-validator / class-transformer, Passport-JWT, Helmet                                                                                  |
| Database       | PostgreSQL via Prisma ORM 5.22 — 105 models, 17 migrations in this snapshot                                                                                       |
| Cache / Queue  | Redis (ioredis) — optional; BullMQ for background email delivery; everything degrades gracefully if Redis is unset                                                |
| Rate limiting  | `@nestjs/throttler`; Redis-backed storage when configured, in-memory otherwise                                                                                    |
| Email          | Resend SDK, via a queued (`MailQueueService`) or direct (`EmailService.sendNow`) send path depending on Redis availability                                        |
| Testing (real) | Jest — 4 backend unit specs; Playwright — 5 frontend e2e specs (see §11.3 for the discrepancy with the repo's own test-coverage claims)                           |
| Hosting        | Backend → Railway (Dockerfile-based); Frontend → Vercel                                                                                                           |

---

## 4. System Architecture

### 4.1 Backend — single NestJS modular monolith

**66 feature modules** are imported in `server/src/app.module.ts`'s `imports: [...]` array (67 `*.module.ts` files exist on disk total, including `app.module.ts` itself), each generally following the same `*.module.ts` / `*.controller.ts` / `*.service.ts` triad, backing **67 controllers**. Notable groupings:

- **Core domain:** projects, employees, departments, suppliers, purchase-orders, materials, expenses, income, budgets, payments
- **HR / Payroll:** human-resources, hr-extras (payroll pipeline), leave-requests, leave-types, claims, claim-types, job-roles, workforce-allocation
- **Construction extras:** construction-tasks, construction-issues, construction-baselines, construction-calendars, construction-settings, daily-reports, delays, quality-ncrs, hse-records, earned-value-records
- **Procurement:** procurement-requests, material-resources, equipment / equipment-resources, vendors, contractors
- **Platform services:** auth, audit-log, notifications, workflows (generic approval-routing engine), integrations (outbound webhooks), reports (report builder), app-catalog, admin-extras, finance-extras, resource-planning, document-folders/document-files, communications, stakeholders, visitor-logs, org-units, clusters

**585 `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete` handlers** were counted across the 67 controllers (240 GET, 135 POST, 47 PUT, 70 PATCH, 93 DELETE) — matching the figure cited in the prior revision of this document exactly, and well past the "65 endpoint" figure cited in the repository's own older internal status docs (see §11).

**Bootstrap (`server/src/main.ts`):**

- Global prefix `/api`; Helmet; 10 MB JSON/urlencoded body limit; global `ValidationPipe({ transform: true, whitelist: true })`.
- A compatibility middleware silently rewrites legacy path prefixes (`/api/admin-extras` → `/api/admin`, `/api/finance-extras` → `/api`, `/api/hr-extras` → `/api`, and their non-`/api` equivalents) — evidence of an in-flight endpoint-renaming migration (see §11.9).
- **CORS is a hybrid, not purely hardcoded** (a correction from the prior revision, which described it as fully hardcoded): the primary allowed origin is `process.env.FRONTEND_URL` (falling back to `http://localhost:5173`), so pointing the backend at a new frontend deployment is an env-var change, not a code change. On top of that, two literal origins (`https://build-os-delta.vercel.app`, `https://buildos-dev-suite.vercel.app`) and two regex patterns (`/^https:\/\/buildos[-a-z0-9]*\.vercel\.app$/i`, `/^https:\/\/build-os[-a-z0-9]*\.vercel\.app$/i`, matching any Vercel preview URL) are hardcoded in source. Adding a _non-Vercel, non-FRONTEND_URL_ origin still requires a code change and redeploy.

### 4.2 Frontend — multi-app shell over one React Router tree

A single Vite/React app renders eight themed "sub-apps" (Construction, Finance, Procurement, HR, ESS, Storefront, Admin, plus Auth) sharing common layouts:

- **RootLayout** — outer shell, no logic beyond an `<Outlet />`.
- **AuthLayout** — wraps signup/login/verify pages.
- **AppLayout** — wraps every authenticated page. Re-verified in this revision: it does perform a real client-side session check (calls `hasValidAuthSession()`/`ensureValidAccessToken()` on mount, on a 60-second interval, and on `visibilitychange`; redirects to `/auth/login` and clears the session if invalid; gates rendering with `if (!ready) return null` until that check resolves). It also nests context providers — `ChangelogProvider → HRConfigProvider → ResourceProvider → TaskProvider → RolesProvider → NumberingProvider` — around the `<Outlet />`. _(This corrects the prior revision, which said AppLayout "performs no authentication check at all" — it does check session validity; what it does **not** do is check role or permission, which is the actual gap. See §6.1.)_
- Each module has its own themed layout (e.g. `ConstructionLayout`) and color: Construction=blue, Finance=green, Procurement=purple, HR=orange, ESS=indigo.

### 4.3 Multi-tenancy model

Companies register as the primary organizational unit; the first user becomes the Company Admin (Owner); all subsequent users and data are scoped to that company through the owning entities in the schema (Project, Employee, Department, etc. all ultimately trace back to a company via User/CompanyProfile). There is no separate "tenant" table with its own isolation layer enforced at the ORM/query level — scoping is application-level, via filters in each service, not database-level (e.g. no Postgres row-level security observed).

---

## 5. Data Model

`server/prisma/schema.prisma` — PostgreSQL, **105 models** (re-counted, exact), **17 migrations** in this snapshot (latest: `20260728130000_reconcile_employee_role_column`). The models map roughly one-for-one onto the module list in §4.1.

| Domain Area                     | Representative Models (count)                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company / Identity / Access     | Project, Department, User, UserRole, Permission, AppRole, CompanyProfile, Director, OrgUnit, SystemSetting, BankName, UserPasswordHistory (12)                                                                                                                                                                                                                                                              |
| HR & Workforce                  | Employee, JobRole, WorkforceAllocation, HumanResource, SalaryBand, EmployeeBank, AttendanceRecord, PayrollPeriod, PayrollRun, PayrollEntry, Payslip, Appraisal, LeaveType, LeaveRequest, ClaimType, Claim, Holiday (17)                                                                                                                                                                                     |
| Finance & Accounting            | Expense, Income, Budget, Payment, Transaction, JournalEntry, JournalLine, ChartAccount, BankAccount, TaxConfig, FundingAllocation, FundingRelease, Disbursement (13)                                                                                                                                                                                                                                        |
| Procurement & Materials         | Supplier, SupplierMaterial, PurchaseOrder, POItem, Material, Store, StoreItem, StockMovement, StockTransfer, MaterialRequest, MaterialReturn, PurchaseRequest, PurchaseInvoice, SentRFQ, ReceivedQuote, MaterialResource, EquipmentResource, Equipment, Vendor, Contractor (20)                                                                                                                             |
| Construction / Project Delivery | ProjectDocument, ConstructionApproval, Timeline, ProjectPhase, ProjectSetup, Cluster, ConstructionIssue, ChangeRequest, ProjectDelay, Stakeholder, VisitorLog, QualityNcr, HseRecord, CommunicationLog, DailyReport, DocumentFolder, DocumentFile, EarnedValueRecord, ConstructionBaseline, ConstructionCalendar, ConstructionSetting, ConstructionTask, ResourcePlan, ResourceAllocation, Task, Issue (26) |
| Approval Workflow Engine        | ApprovalWorkflow, ApprovalNode, ApprovalRule, WorkflowInstance, ApprovalRequest (5)                                                                                                                                                                                                                                                                                                                         |
| Notifications & Integrations    | Notification, NotificationRule, NotificationPreference, NotificationTemplate, Webhook, WebhookDelivery (6)                                                                                                                                                                                                                                                                                                  |
| Reporting & Audit               | ReportDefinition, ReportRun, AuditLog, ActivityRecord (4)                                                                                                                                                                                                                                                                                                                                                   |
| Compliance & Uploaded Documents | ComplianceDocumentType, DocumentUpload (2)                                                                                                                                                                                                                                                                                                                                                                  |

> **New since the prior handover:** `Employee` now has a nullable, unique `userId` FK to `User` (migration `add_employee_user_link`), so an onboarded employee can be linked to a real login account. Employee-creation reuses the existing Admin "invite user" pipeline (`AdminExtrasService.inviteUser`) to create that linked account and send the welcome email — see §8.3.
>
> A pre-existing migration-history bug was also found and fixed here: `20260626000000_reconcile_drifted_schema` dropped `Employee.role` and never re-added it, even though `schema.prisma` has declared `role String?` ever since (and the employees service and seed script both read/write it). The production database almost certainly has this column from an out-of-band fix, since employee creation visibly works there — but a fresh database built from migration history alone (a new environment, CI, disaster recovery) would fail on `prisma migrate deploy && prisma db seed`. Migration `reconcile_employee_role_column` (`ADD COLUMN IF NOT EXISTS`, so it's a no-op anywhere the column already exists) fixes this.

### 5.1 Seeding

- `prisma/seed.ts` — core reference + demo data; includes a full-table `$executeRawUnsafe` truncate helper; also seeds the bootstrap admin user (`SEED_ADMIN_EMAIL`, default `admin@buildos.ng`)
- `prisma/seed-construction.ts` / `seed-construction-run.ts` — construction-module demo data
- `prisma/seed-reference.ts` — lookup/reference tables
- `prisma/cleanup-dummy-data.ts` — strips demo data without touching schema

---

## 6. Authentication & Authorization — read this section carefully

This is the highest-priority section in the document. The underlying conclusion — that the system currently has materially less access control enforced than its code structure suggests at a glance — still holds, but two of the specific findings supporting it were mis-described in the prior revision of this document. Both corrections are below, in place.

### 6.1 Frontend route protection exists in code but is not used anywhere (conclusion holds; supporting detail corrected)

`src/app/components/ProtectedRoute.tsx` implements a real access-control component: it reads `useAuth()` (`isAuthenticated`, `hasRole`, `hasPermission`) and redirects to `/login` when unauthenticated or `/unauthorized` when a required role/permission is missing.

- **Correction:** the prior revision claimed a repo-wide grep for "ProtectedRoute" returns exactly one match (its own definition). That's wrong — there's a second file, `src/app/utils/routeProtection.ts`, which imports `ProtectedRoute` and builds a full per-module protection scheme on top of it: `withProtection()` wraps a component in `<ProtectedRoute>`, `applyModuleProtection(routes, moduleName)` applies that wrapper across a route list, and `moduleProtectionDefaults` hardcodes required roles per app (e.g. `admin: { requiredRoles: ['admin'] }`, `finance: { requiredRoles: ['admin', 'finance-manager', 'team-lead'] }`). This is a more complete, ready-to-use authorization layer than the prior revision implied.
- **The conclusion still holds, though:** neither `ProtectedRoute` nor `routeProtection.ts`'s `applyModuleProtection` is imported by `routes.tsx` or `App.tsx` (re-confirmed by grep in this revision). `AppLayout.tsx` — the layout every authenticated app page renders inside — does perform a session-validity check (see §4.2, itself a correction to the prior revision) but no role/permission check.

> **Practical effect:** the frontend has a session-validity gate (redirects to login if the token is missing/invalid/expired) but no role- or permission-based gate — any logged-in user of any role can render any app page's UI, regardless of which apps are assigned to them. Two full implementations of that missing gate already exist in the codebase (`ProtectedRoute.tsx` and `routeProtection.ts`); neither is wired in. The real access boundary today is the API — which makes §6.2/§6.3 below the load-bearing control.

### 6.2 Backend authentication (`server/src/auth/auth.service.ts`)

- Signup issues a JWT access token (`JWT_SECRET`, default 15m) and a refresh token (`JWT_REFRESH_SECRET`, default 60m). The refresh token is stored bcrypt-hashed on the User row — the raw token is never persisted.
- Logout / password reset sets a Redis revocation marker (`userRevokedAt:<id>`) so already-issued access tokens are rejected before natural expiry — but only when Redis is configured. Without Redis, there is no way to invalidate an already-issued access token before it expires.
- Password policy: minimum 8 characters, must include a letter, a number, and a symbol; the last 3 password hashes are checked to block reuse (`UserPasswordHistory`).
- Invite-based activation (`activateInvite`) and JWT-based password-reset links (30-minute expiry) are implemented and functional.
- **`verifyEmail()` accepts any syntactically valid 6-digit code** — re-verified verbatim in this revision:
  ```ts
  async verifyEmail(token: string) {
      // Accept any 6-digit numeric token; production would check a stored OTP
      if (!token || !/^\d{6}$/.test(token)) {
          throw new UnauthorizedException('Invalid verification code');
      }
      return { verified: true };
  }
  ```
  It does not check a stored, issued, or expiring OTP. Treat email verification as a UI-only gate today.
- Frontend token handling (`src/app/utils/authSession.ts` + `src/app/api/client.ts`): tokens are decoded client-side to check expiry, refreshed silently on a 401 with a single retry, then the session is cleared and the user is forced to log in again. Tokens are stored in `localStorage` (not httpOnly cookies) — re-confirmed in this revision — see §11.5.

### 6.3 Backend authorization: two guards, not one (corrected)

`JwtAuthGuard` (`server/src/auth/jwt-auth.guard.ts`) is registered globally as an `APP_GUARD`, alongside `ThrottlerGuard`:

```ts
{ provide: APP_GUARD, useClass: ThrottlerGuard },
{ provide: APP_GUARD, useClass: JwtAuthGuard },
```

Every route requires a valid JWT unless marked `@Public()`.

> **Correction — this is the most important fix in this revision.** The prior version of this document claimed that role/permission enforcement happens entirely inside `JwtAuthGuard` via `Reflector` metadata, and that a second class, `RolesGuard` (`server/src/auth/roles.guard.ts`), "is not registered globally and was not found wired via `@UseGuards` anywhere in the controllers — it appears to be dead code." **That's factually wrong.** `RolesGuard` is actively applied via `@UseGuards(RolesGuard)` on 13 controllers — the _same_ 13 that carry `@Roles`/`@Permissions`/`@RequireApp` decorators (`tasks`, `resource-allocation`, `workflow`, `audit-log`, `payroll` (hr-extras), `leave-requests`, `webhook`, `admin-public`, `approvals-public`, `system-config`, `admin-extras`, `timeline` (construction-extras), `notification`). It is `RolesGuard`, applied per-controller, that actually reads and enforces those decorators — not a Reflector check baked into `JwtAuthGuard` itself. If you're adding role coverage to one of the 54 currently-open controllers listed in §7.2, the pattern to copy is: add `@UseGuards(RolesGuard)` to the controller class _and_ `@Roles(...)`/`@Permissions(...)` to the handler — one without the other does nothing.

Four decorators, read via `Reflector` metadata by whichever guard is actually applied, add further checks only where a controller/handler explicitly carries them:

| Decorator                     | Effect                                                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@Public()`                   | Skips authentication entirely for this route.                                                                                                                                                                                                                   |
| `@Roles('admin', ...)`        | Payload's role/roles claim must intersect with the listed roles.                                                                                                                                                                                                |
| `@Permissions('perm', ...)`   | Payload's permissions claim must be a superset of the listed permissions.                                                                                                                                                                                       |
| `@RequireApp('finance', ...)` | Payload's `assignedApps` claim must intersect with the listed apps. Bypassed entirely for role admin/super-admin/superadmin, and bypassed for any token issued before the `assignedApps` claim existed (explicit backward-compatibility carve-out in the code). |

**Verified coverage (re-counted, unchanged from the prior revision's headline number, exact this time):** of 67 controllers, only 13 apply any of `@Roles` / `@Permissions` / `@RequireApp` at all — the same 13 listed above. The remaining 54 controllers require only a valid JWT — any authenticated user of any role can call every handler in them. The full controller-by-controller table is in §7.2.

### 6.4 Audit logging

`AuditLogMiddleware` (`server/src/audit-log/audit-log.middleware.ts`) is applied globally to every route except `auth/*` (see `server/src/audit-log/audit-log.module.ts`'s `configure()` method). For every non-GET request that returns a 2xx/3xx status, it asynchronously records the acting user (from the JWT payload's `sub` claim), the inferred entity (last path segment), the inferred action (CREATE/UPDATE/DELETE from HTTP verb), and a truncated (500-char) copy of the response body, via `AuditLogService` — fire-and-forget, so a logging failure never blocks the response.

---

## 7. API Surface & Conventions

### 7.1 Frontend ⇄ backend contract

- Base URL: `VITE_API_URL`, defaulting to `http://localhost:3001/api`.
- `src/app/api/client.ts` centralizes fetch, bearer-token injection, one-retry-on-401 refresh, and error-message extraction. All 60 per-resource files in `src/app/api/` sit on top of it — new resources should follow the same thin-wrapper pattern.
- Response envelope is inconsistent across controllers: some return `{ success, data }`, some return `{ data, total }` (paginated), some return the raw payload or array directly. The client ships `unwrapApiResult()` and `toApiArray()` specifically to paper over this — use them for any new API file rather than assuming a shape.
- There is no generated OpenAPI/Swagger spec (`@nestjs/swagger` is not a dependency, re-confirmed). `BuildOS.postman_collection.json` is the closest thing to living API documentation.

### 7.2 Controller-by-controller RBAC decorator coverage (re-verified, full list)

"Yes" means the controller has `@UseGuards(RolesGuard)` _and_ applies `@Roles`/`@Permissions`/`@RequireApp` to at least one handler (not necessarily all of them — check the individual handler before assuming full coverage). "No" means only `JwtAuthGuard`'s baseline authentication applies; any authenticated user can call every handler.

| Controller (module folder)            | Has `@Roles`/`@Permissions`/`@RequireApp`? |
| ------------------------------------- | ------------------------------------------ |
| activity-history                      | No                                         |
| admin-extras                          | **Yes**                                    |
| admin-extras (public)                 | **Yes**                                    |
| approvals-public                      | **Yes**                                    |
| system-config                         | **Yes**                                    |
| app-catalog                           | No                                         |
| audit-log                             | **Yes**                                    |
| auth                                  | No (self-service endpoints)                |
| budgets                               | No                                         |
| change-requests                       | No                                         |
| claim-types                           | No                                         |
| claims                                | No                                         |
| clusters                              | No                                         |
| communications                        | No                                         |
| compliance-documents                  | No                                         |
| construction-baselines                | No                                         |
| construction-calendars                | No                                         |
| construction-extras                   | No                                         |
| construction-extras/timeline          | **Yes**                                    |
| construction-issues                   | No                                         |
| construction-settings                 | No                                         |
| construction-tasks                    | No                                         |
| contractors                           | No                                         |
| daily-reports                         | No                                         |
| delays                                | No                                         |
| departments                           | No                                         |
| disbursements                         | No                                         |
| document-files                        | No                                         |
| document-folders                      | No                                         |
| earned-value-records                  | No                                         |
| employees                             | No                                         |
| equipment-resources                   | No                                         |
| equipment                             | No                                         |
| expenses                              | No                                         |
| finance-extras                        | No                                         |
| funding-allocations                   | No                                         |
| funding-releases                      | No                                         |
| health                                | No                                         |
| hr-extras                             | No                                         |
| hr-extras/payroll                     | **Yes**                                    |
| hse-records                           | No                                         |
| human-resources                       | No                                         |
| income                                | No                                         |
| integrations/webhook                  | **Yes**                                    |
| job-roles                             | No                                         |
| leave-requests                        | **Yes**                                    |
| leave-types                           | No                                         |
| material-resources                    | No                                         |
| materials                             | No                                         |
| notifications                         | **Yes**                                    |
| org-units                             | No                                         |
| payments                              | No                                         |
| procurement-requests                  | No                                         |
| project-setup                         | No                                         |
| projects                              | No                                         |
| purchase-orders                       | No                                         |
| quality-ncrs                          | No                                         |
| reports                               | No                                         |
| resource-planning/resource-allocation | **Yes**                                    |
| resource-planning                     | No                                         |
| stakeholders                          | No                                         |
| suppliers                             | No                                         |
| tasks                                 | **Yes**                                    |
| vendors                               | No                                         |
| visitor-logs                          | No                                         |
| workflows/workflow                    | **Yes**                                    |
| workforce-allocation                  | No                                         |

---

## 8. Notable Subsystems (worth reading before modifying)

### 8.1 Approval workflow engine (`workflows/workflow-engine.service.ts`)

A generic, entity-agnostic multi-step approval engine, not tied to any one module:

- `createWorkflowInstance(workflowId, entityType, entityId, initiatedBy, context)` — loads an `ApprovalWorkflow` with its ordered `ApprovalNode`s, creates a `WorkflowInstance`, and opens the first `ApprovalRequest`.
- `approveNode` / `rejectNode` — advance or terminate the instance.
- `delegateApproval` — reassigns a pending request to another approver with an audit trail.
- `handleEscalation` — reassigns to an escalation target (e.g. on timeout).
- `getOverdueApprovals(hoursOverdue)` and `getWorkflowStats(workflowId)` — operational visibility.

_(Not independently re-verified line-by-line in this revision; carried over from the prior pass.)_

### 8.2 Payroll pipeline (`server/src/hr-extras/`)

Payroll is split across five focused services rather than one god-service: `payroll-validation.service.ts` (8 discrete validators), `payroll-tax.service.ts` (Nigerian progressive income-tax, ₦392,200/month tax-free allowance hardcoded from 2024 figures), `payroll-deductions.service.ts`, `payroll-orchestration.service.ts` (`processPayroll`, `getEmployeePayrollHistory`, `forecastPayroll`), and `payslip-generation.service.ts`. _(Not independently re-verified line-by-line in this revision; carried over from the prior pass.)_

### 8.3 Notifications, webhooks, email configuration, and reporting

- `notifications/notification.service.ts` — rule-based triggering, per-user inbox, preferences, a `NotificationTemplate` CRUD pair (`getNotificationTemplates`/`saveNotificationTemplate`) that is **not** the mechanism behind Admin's Email Configuration page (see below — don't confuse the two), and retention-based cleanup.
- **Email Configuration is a separate, more complete system, backed by `admin-extras.service.ts`, not the `NotificationTemplate` model.** The routed frontend page is `src/app/pages/admin/EmailConfigPage.tsx` (`/apps/admin/email-config`), which is fully wired to `GET/POST/PATCH/DELETE /admin/email-config` and `GET /admin/email-config/variables`. Configs persist as a JSON array inside the generic `SystemSetting` key/value table (not their own Prisma model). `getEmailTemplateVariables()` derives the available `{{variable}}` palette dynamically from the Prisma DMMF (every scalar field of the relevant model), rather than a hardcoded list. `composeTemplatedEmail(trigger, vars)` renders a configured template's subject/text/html/cc for a given trigger and returns `null` if the admin hasn't configured one, so callers can fall back to a built-in default. It's already called from the employee/user "New User Created" invite flow in `admin-extras.service.ts` (`sendInviteEmail`), which sends via `MailQueueService` (queued through BullMQ when Redis is available, synchronous otherwise). **Employee onboarding now reuses this exact pipeline:** `EmployeesService.create()` calls `AdminExtrasService.inviteUser()` to create the linked `User` account and send the (admin-configurable) welcome email, rather than duplicating that logic — failures here (e.g. no email provider configured) surface as a non-fatal `onboardingWarning` on the create response rather than failing employee creation.
- `integrations/webhook.service.ts` — webhook CRUD, event-triggered delivery with history and manual retry, plus named sync stubs for external HR/accounting/payroll systems — worth checking how complete these integrations actually are before relying on them.
- `reports/report-builder.service.ts` — `generateFinancialSummary`, `generateHRSummary`, `generateProjectStatus`, `generateProcurementReport`, plus `generateCustomReport` and `scheduleReport`.

### 8.4 Infrastructure services designed to degrade gracefully

Re-verified in this revision: `redis/redis.config.ts`'s `getRedisConfig()` returns `{ enabled: false, keyPrefix }` when neither `REDIS_URL` nor `REDIS_HOST` is set, and every Redis-backed feature (cache, BullMQ queue, distributed rate limiting, token revocation) falls back to an in-memory or inline equivalent rather than failing. `cache/cache.service.ts` wraps every operation in try/catch. `queue/mail-queue.service.ts` enqueues via BullMQ when available, otherwise sends inline through `EmailService.sendNow`.

### 8.5 `admin-extras.service.ts` — a large, broad-scope service

Re-measured in this revision: **~105 KB, 85 async methods** in one class (prior revision said "~108 KB, 85 async methods" — the method count was exact, the size was slightly over). Covers store levels/thresholds, general settings, process catalog, process workflows, user invites, user/role CRUD, approvals, and (per §8.3) email configuration. It works, but its breadth makes it the single hardest file in the codebase to safely review or modify — see §11.6 for a suggested decomposition.

---

## 9. Environment Variables

### 9.1 Frontend (`.env.example`, repo root)

| Variable                 | In `.env.example`?                       | Purpose                                                 | Default / fallback          |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------- | --------------------------- |
| `VITE_GA_MEASUREMENT_ID` | Yes (only var present)                   | Google Analytics measurement ID.                        | empty                       |
| `VITE_API_URL`           | Read in code, absent from `.env.example` | Backend base URL used by every `src/app/api/*.ts` file. | `http://localhost:3001/api` |

### 9.2 Backend (`server/.env.example`)

| Variable                                                        | Required?            | Purpose                                                                                                | Default / fallback                      |
| --------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `DATABASE_URL`                                                  | Yes                  | Postgres connection string (Prisma).                                                                   | —                                       |
| `PORT`                                                          | No                   | HTTP port.                                                                                             | 8080 (`main.ts`)                        |
| `NODE_ENV`                                                      | No                   | development / production.                                                                              | development                             |
| `FRONTEND_URL`                                                  | No                   | Drives the primary CORS origin + email links (see §4.1).                                               | `http://localhost:5173`                 |
| `JWT_SECRET`                                                    | Recommended          | Access-token signing secret.                                                                           | insecure hardcoded fallback             |
| `JWT_REFRESH_SECRET`                                            | Recommended          | Refresh-token signing secret.                                                                          | insecure hardcoded fallback             |
| `JWT_ACCESS_EXPIRES_IN`                                         | No                   | Access token TTL.                                                                                      | 15m                                     |
| `JWT_REFRESH_EXPIRES_IN`                                        | No                   | Refresh token TTL.                                                                                     | 60m                                     |
| `SEED_ADMIN_EMAIL`                                              | No                   | Bootstrap admin auto-granted all apps.                                                                 | admin@buildos.ng                        |
| `EMAIL_PROVIDER`                                                | No                   | Currently only "resend" is implemented.                                                                | resend                                  |
| `EMAIL_FROM`                                                    | No                   | From header for outbound mail.                                                                         | BuildOS <noreply@buildos.ng>            |
| `RESEND_API_KEY`                                                | Yes (for real email) | Resend API key.                                                                                        | empty                                   |
| `REDIS_URL` / `REDIS_HOST`(+`PORT`/`USERNAME`/`PASSWORD`/`TLS`) | No                   | Enables cache, BullMQ, distributed throttling, token revocation. Fully optional — degrades gracefully. | unset (commented out in `.env.example`) |
| `REDIS_KEY_PREFIX`                                              | No                   | Namespace for Redis keys.                                                                              | buildos:                                |

---

## 10. Running Locally, Testing, and Deployment

### 10.1 Local development

```bash
# Backend
cd server
npm install
npm run prisma:generate
npm run prisma:migrate      # or prisma:deploy against an existing DB
npm run start:dev           # runs prisma:deploy then nest start --watch, on :8080 (via PORT)

# Frontend
npm install                 # from repo root
npm run dev                 # Vite dev server, :5173
```

Seed data (from `server/`): `npm run prisma:seed` for reference + demo data; `ts-node prisma/seed-construction-run.ts` for construction-module demo data; `ts-node prisma/cleanup-dummy-data.ts` to strip demo rows later.

> If you're setting up a fresh database rather than pointing at an existing one, run migrations before seeding — `prisma migrate deploy` then `prisma db seed` — and expect it to work end-to-end now that the `Employee.role` migration gap (§5) is fixed. Before that fix, a fresh `prisma migrate deploy && npm run prisma:seed` would fail partway through seeding with `PrismaClientKnownRequestError: The column Employee.role does not exist in the current database`.

### 10.2 Testing — what actually exists (re-verified; still contradicts the repo's own docs — see §11.3)

| Suite                      | Files that actually exist                                                                                                                                   | Command                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Backend unit (Jest)        | `redis.service.spec.ts`, `jwt-auth.guard.spec.ts`, `cache.service.spec.ts`, `mail-queue.service.spec.ts`                                                    | `npm test` / `npm run test:unit`                           |
| Backend integration (Jest) | None found — `server/test/` contains only `jest-e2e.json` and `setup.ts`, not the payroll/leave/workflow/e2e integration specs described in `TEST_GUIDE.md` | `npm run test:integration` (would currently match nothing) |
| Frontend e2e (Playwright)  | `e2e/debug.spec.ts`, `e2e/employees.spec.ts`, `e2e/fixes.spec.ts`, `e2e/integration.spec.ts`, `e2e/wiring.spec.ts`                                          | `npx playwright test`                                      |

> `playwright.config.ts` assumes both dev servers are already running (`reuseExistingServer: true`, base URL `http://localhost:5173`) rather than starting them itself — start frontend + backend manually first, or point `BUILDOS_API`/baseURL env overrides at a disposable local database if you don't want test runs touching real data (several of the e2e specs create and delete real records through the live API).

### 10.3 Deployment

- **Backend → Railway.** `railway.json` points at `server/Dockerfile`: multi-stage build (`npm ci` → `prisma generate` → `nest build`), then a slim `node:20-alpine` runtime image with the generated Prisma client copied over. Health check: `GET /api`. Start command: `node dist/main`.
- **Frontend → Vercel** (`vercel.json`; region pinned to `fra1`). Silent GitHub integration, no build overrides beyond Vite defaults. **`vercel.json` now includes a SPA fallback rewrite** (`{ "source": "/(.*)", "destination": "/index.html" }`) — this was missing until this revision and meant any hard refresh or directly-shared link to a client-side route (e.g. `/apps/hr/employees`) returned a static 404 from Vercel's edge before React Router ever got a chance to handle it. If you're troubleshooting a "404 on refresh" report on a Vercel-hosted single-page app, this is the first thing to check.
- CORS on the backend for any _non_-Vercel, non-`FRONTEND_URL` frontend domain must still be manually extended in source (see §4.1).

---

## 11. Known Gaps, Risks, and Technical Debt (prioritized)

Every item below was verified directly against the source in this repository during preparation of this revision. Several correct earlier findings in the prior version of this document — noted inline.

> **Meta-finding, new in this revision:** the prior version of this document described itself as current as of a commit that, by the time it was read, was already roughly a dozen commits and several days behind the repository's actual `HEAD`. It's own stated purpose was to be more trustworthy than the repo's stale internal audit docs (§11.11 below) — but it was subject to the identical failure mode. Treat every handover/audit document, including this one, as a snapshot pinned to a specific commit, not a live view — check `git log -1` before trusting anything time-sensitive in it.

### 1. Frontend route protection is built but not wired in (verified — highest-impact finding; supporting detail corrected this revision)

See §6.1 in full. Two complete implementations of role/permission-based route gating exist (`ProtectedRoute.tsx` and `routeProtection.ts`'s `applyModuleProtection`); neither is imported by `routes.tsx` or `App.tsx`. `AppLayout.tsx` does check session validity (a correction to the prior revision, which said it performs no auth check at all) but not role/permission — so the practical gap is narrower than "anyone can render any page while fully logged out," and is instead "any logged-in user of any role can render any app page's UI regardless of assigned apps."

### 2. Backend authorization is opt-in per route, and most routes opt out (verified; mechanism corrected this revision)

Of 67 controllers, only 13 apply `@UseGuards(RolesGuard)` together with `@Roles`/`@Permissions`/`@RequireApp` (see the full table in §7.2 and the correction in §6.3). The remaining 54 — including `employees`, `projects`, `purchase-orders`, `expenses`, `payments`, `suppliers`, `materials`, `construction-tasks`, `construction-issues`, `quality-ncrs`, `hse-records`, and most others — accept any authenticated user regardless of role. **`RolesGuard` is not dead code** (the prior revision's claim); it's the actual enforcement mechanism for the 13 controllers that use it, and is the pattern to replicate when adding coverage elsewhere.

### 3. The repository's own test-coverage claims do not match what exists (verified, unchanged)

`server/TEST_GUIDE.md` and `PROJECT_COMPLETION_SUMMARY.md` both describe "90+ integration tests" across four suites (`test/payroll.integration.spec.ts`, `test/leave.integration.spec.ts`, `test/workflow.integration.spec.ts`, `test/e2e.workflow.spec.ts`) plus a `test/test.utils.ts` factory file, with claimed 80-85%+ coverage per module. **None of those five files exist anywhere in the repository** (re-confirmed by whole-repo search in this revision). The only real automated backend tests are the 4 unit spec files in §10.2; on the frontend, 5 Playwright specs now exist (was 3 as of the prior revision — `fixes.spec.ts` and `wiring.spec.ts` are new). Treat any coverage or "tests passing" claim from the repo's internal docs as unverified until you've confirmed the file exists and runs.

### 4. Email verification (OTP) is a stub (verified, unchanged)

See §6.2 for the exact code.

### 5. Auth tokens are stored in localStorage, not httpOnly cookies (verified, unchanged)

See §6.2.

### 6. "God service" files (verified, size re-measured)

`admin-extras.service.ts` is ~105 KB with 85 async methods in a single class (§8.5). `finance-extras` and `construction-extras` follow a similar (smaller-scale) pattern. A natural refactor target is splitting each into the sub-domains it already implicitly has (e.g. `UserManagementService`, `ApprovalsService`, `ProcessCatalogService`, and now also an `EmailConfigService` given §8.3's finding that email configuration lives here too).

### 7. Response envelope is inconsistent across the API (verified, unchanged)

See §7.1.

### 8. CORS allowlist is partially hardcoded in source (verified; severity softened this revision)

The prior revision said this required a code change for "any new frontend origin" — that's true for a new non-Vercel domain, but the primary origin (`FRONTEND_URL`) is env-var driven, so pointing the same deployment at a new domain doesn't require a code change. See §4.1 for the exact allowlist.

### 9. Legacy path-prefix rewrite middleware still in place (verified, unchanged)

`main.ts` silently rewrites `/api/admin-extras` → `/api/admin`, `/api/finance-extras` → `/api`, and `/api/hr-extras` → `/api` (and their non-`/api` equivalents). Confirm the frontend is fully on the new prefixes, then remove the rewrite and the legacy names.

### 10. Root `README.md` is a stale scaffold artifact (verified, unchanged)

See §2.

### 11. The repo's internal status docs are stale relative to the schema/code (verified, unchanged — and see the meta-finding at the top of this section)

Multiple root-level docs (`MISALIGNMENT_AUDIT_SUMMARY.md`, `COMPREHENSIVE_MISALIGNMENT_AUDIT.md`, `ALL_47_MISALIGNMENTS.md`, `BUILD_AND_VERIFICATION_REPORT.md`, `SERVICE_FIX_ROADMAP.md`, `PROJECT_COMPLETION_SUMMARY.md`) are dated June 5, 2026 and describe a mid-refactor state — e.g. "WorkflowInstance / ApprovalRequest / NotificationPreference / NotificationTemplate models are missing and block the build." All four models exist in the current schema. Do not use these documents as a current-state reference — use them only as historical context, and verify anything they claim against the live code before acting on it.

### 12. Backend build

Re-verified in this revision (in an unrestricted environment, unlike the prior revision's authoring sandbox): `cd server && pnpm exec nest build` completes cleanly with exit code 0, and `pnpm exec vite build` from the repo root also completes cleanly. Both were re-confirmed multiple times during the session that produced this revision, including after the `Employee.role`/`Employee.userId` schema changes described in §5.

---

## 12. First-Week Checklist for an Incoming Engineer

- Run `cd server && pnpm install && pnpm exec prisma generate && pnpm exec nest build` and confirm it's clean — now independently confirmed as of this revision (§11.12), but re-confirm in your own environment before trusting anything else.
- Read `BUILDOS_README.md`, then this document's §6 (Auth) and §11 (Gaps) in full before touching authentication, authorization, or any endpoint that handles another company's data.
- Decide, with the team, whether to wire `ProtectedRoute`/`routeProtection.ts` back in (§11.1) or formally retire both — right now they're neither used nor deleted.
- Pick 2-3 of the 54 undecorated controllers (§7.2) that handle the most sensitive data (payments, expenses, employees are good starting candidates) and add `@UseGuards(RolesGuard)` + `@Roles`/`@Permissions` as a first concrete PR — see §6.3 for the exact pattern the 13 covered controllers already use.
- If you need to trust "tests pass" for a module, first confirm the test file actually exists (§11.3) — don't rely on `TEST_GUIDE.md` or `PROJECT_COMPLETION_SUMMARY.md`'s claims.
- If you're touching password reset, invites, or login: note that `JWT_SECRET` / `JWT_REFRESH_SECRET` both fall back to a hardcoded insecure default string if unset — confirm real secrets are set in every deployed environment.
- If you're setting up a fresh database (new environment, CI, local-from-scratch): run migrations then seed, and expect it to work now (§5, §10.1) — this previously failed partway through seeding before this revision's `reconcile_employee_role_column` migration.
- Before trusting _any_ handover or audit document in this repository, including this one: check `git log -1` and compare against the commit the document says it was prepared against (§11, meta-finding).

---

## 13. Where to Go Deeper

- `BUILDOS_README.md` — product/UX architecture (apps, workflows, design system)
- `server/TEST_GUIDE.md` — describes an intended test-suite structure; cross-check against §11.3 before trusting it
- `docs/BuildOS_*_Module_Guide_v1.0.docx` — per-module end-user guides
- `BuildOS-Process-Flowcharts.pdf` / `.drawio` — cross-module process flows
- `BuildOS.postman_collection.json` — closest thing to API documentation today
- `server/prisma/schema.prisma` — source of truth for the data model
- `e2e/wiring.spec.ts` — new in this revision; a repeatable cross-module smoke check across all 7 apps plus the HR→Admin employee-onboarding integration

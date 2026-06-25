# HARPAZO-OWAS National Reporting Platform
# Comprehensive Implementation Plan
**Version:** 1.0  
**Date:** June 2026  
**Author:** Architect Agent (Claude Sonnet)  
**Status:** Final — Approved for Coding Agents

---

## Table of Contents

1. [Phase Breakdown](#1-phase-breakdown)
2. [API Route Map](#2-api-route-map)
3. [Component Tree](#3-component-tree)
4. [Zustand Store Design](#4-zustand-store-design)
5. [Aggregation Algorithm](#5-aggregation-algorithm)
6. [KPI Calculation Algorithm](#6-kpi-calculation-algorithm)
7. [Cron Job Schedule](#7-cron-job-schedule)
8. [WhatsApp Bot State Machine](#8-whatsapp-bot-state-machine)
9. [Shepherd Tag Algorithm](#9-shepherd-tag-algorithm)
10. [Risk Log](#10-risk-log)

---

## 1. Phase Breakdown

### Already Built (Pre-Phase 1 Baseline)

The following files exist and must NOT be overwritten — only extended:

| File | Status |
|------|--------|
| `src/lib/db.ts` | Complete — Mongoose singleton |
| `src/lib/auth.ts` | Complete — NextAuth v5 credentials |
| `src/middleware.ts` | Complete — Role-based route guard |
| `src/lib/api-helpers.ts` | Complete — withAuth, logAudit, ok, err |
| `src/lib/models/User.ts` | Stub — needs field verification |
| `src/lib/models/Organization.ts` | Stub |
| `src/lib/models/Soul.ts` | Stub |
| `src/lib/models/ShepherdReport.ts` | Stub |
| `src/lib/models/BranchReport.ts` | Stub |
| `src/lib/models/DistrictReport.ts` | Stub |
| `src/lib/models/ZonalReport.ts` | Stub |
| `src/lib/models/NationalReport.ts` | Stub |
| `src/lib/models/KpiScore.ts` | Stub |
| `src/lib/models/Notification.ts` | Stub |
| `src/lib/models/AuditLog.ts` | Stub |
| `src/lib/schemas/auth.ts` | Complete |
| `src/lib/schemas/reports.ts` | Complete |
| `src/app/api/auth/[...nextauth]/route.ts` | Complete |
| `src/app/api/users/route.ts` | Stub |
| `src/app/api/organizations/route.ts` | Stub |
| `src/app/api/reports/shepherd/route.ts` | Stub |
| `src/components/layout/sidebar.tsx` | Stub |
| `src/components/layout/header.tsx` | Stub |
| `src/app/(auth)/login/page.tsx` | Stub |
| `src/app/(dashboard)/dashboard/page.tsx` | Stub |

---

### Phase 1 — Foundation & Data Layer (Weeks 1–3)

**Goal:** Harden all models, complete authentication, scaffold org management, and establish Zustand + React Query infrastructure.

**Deliverables:**

#### 1A: Model Hardening

Review and complete all 11 Mongoose model stubs. Add indexes, virtuals, and pre-save hooks.

Files to complete:
- `src/lib/models/User.ts` — Add index on `email`, `whatsappPhone`, `shepherdTag`, `organizationRef`; add `isActive` default; add pre-save bcrypt hook
- `src/lib/models/Organization.ts` — Add compound index on `(type, parentId)`, add `ancestorIds: [ObjectId]` array for fast subtree queries; add `targetSouls: Number`
- `src/lib/models/Soul.ts` — Add index on `(branchId, status)`, `(assignedShepherdId)`, `(lastContactDate)` for inactivity cron
- `src/lib/models/ShepherdReport.ts` — Add unique compound index on `(shepherdId, weekEnding)` to prevent duplicate submissions
- `src/lib/models/BranchReport.ts` — Add unique compound index on `(branchId, weekEnding)`, add index on `(districtId, weekEnding)`, add index on `(zoneId, weekEnding)`
- `src/lib/models/DistrictReport.ts` — Add unique compound index on `(districtId, reportingWeek)`, add `invalidatedAt` field for cache invalidation
- `src/lib/models/ZonalReport.ts` — Add unique compound index on `(zoneId, reportingWeek)`
- `src/lib/models/NationalReport.ts` — Add unique compound index on `(period.month, period.year)`
- `src/lib/models/KpiScore.ts` — Add unique compound index on `(entityId, period.month, period.year)`
- `src/lib/models/Notification.ts` — Add index on `(recipientId, status)`, TTL index on `sentAt` (90-day retention)
- `src/lib/models/AuditLog.ts` — Add index on `(userId, timestamp)`, TTL index on `timestamp` (365-day retention)

New model to create:
- `src/lib/models/MissionField.ts` — GOWAS outreach zones per branch
- `src/lib/models/SipEnrollment.ts` — SIP cohort enrollment tracking per soul

#### 1B: Types System

Files to create:
- `src/types/index.ts` — Re-export all domain types
- `src/types/auth.ts` — Session user type extending NextAuth
- `src/types/organization.ts` — IOrganization, IOrgTree, OrgLevel enum
- `src/types/user.ts` — IUser, UserRole enum, IUserWithOrg
- `src/types/soul.ts` — ISoul, IntegrationStage, SoulStatus
- `src/types/reports.ts` — IShepherdReport, IBranchReport, IDistrictReport, IZonalReport, INationalReport
- `src/types/kpi.ts` — IKpiScore, KpiMetric, KpiBreakdown
- `src/types/notification.ts` — INotification, NotificationType, NotificationChannel
- `src/types/whatsapp.ts` — WaInboundMessage, WaOutboundPayload, WaConversationState

#### 1C: Utility Libraries

Files to create:
- `src/lib/mailer.ts` — Nodemailer singleton + sendMail wrapper + all HTML email templates
- `src/lib/whatsapp.ts` — sendWhatsAppTemplate, sendWhatsAppSession, verifyWebhookSignature
- `src/lib/logger.ts` — Pino structured logger with log levels
- `src/lib/date-utils.ts` — getWeekEnding (returns Sunday date), getReportingWeek, isLate, formatWeekRange
- `src/lib/pdf.ts` — PDF generation utilities using @react-pdf/renderer
- `src/lib/cloudinary.ts` — Certificate upload/retrieve wrapper
- `src/lib/validators.ts` — Shared Zod schema extensions (phone, objectId, weekDate)

#### 1D: Auth System Completion

Files to complete/create:
- `src/app/(auth)/login/page.tsx` — Complete the login form with React Hook Form + Zod
- `src/app/(auth)/magic-link/page.tsx` — Magic link request + confirmation pages
- `src/app/(auth)/forgot-password/page.tsx` — Password reset request page
- `src/app/(auth)/reset-password/[token]/page.tsx` — New password form
- `src/app/api/auth/magic-link/route.ts` — Generate + email magic link token
- `src/app/api/auth/reset-password/route.ts` — Password reset token validation + update

#### 1E: Organization Management API

Files to complete/create:
- `src/app/api/organizations/route.ts` — GET (list with filters), POST (create)
- `src/app/api/organizations/[id]/route.ts` — GET (single), PATCH (update), DELETE (soft-delete)
- `src/app/api/organizations/[id]/children/route.ts` — GET subtree
- `src/app/api/organizations/tree/route.ts` — GET full hierarchy as nested tree
- `src/lib/schemas/organization.ts` — Complete Zod schemas for org CRUD

#### 1F: User Management API

Files to complete/create:
- `src/app/api/users/route.ts` — GET (list with role/org filters), POST (create + send welcome email)
- `src/app/api/users/[id]/route.ts` — GET, PATCH (update role/org/status), DELETE (deactivate)
- `src/app/api/users/[id]/reset-password/route.ts` — Admin-triggered password reset
- `src/lib/schemas/user.ts` — Zod schemas for user CRUD

#### 1G: Global State Infrastructure

Files to create:
- `src/stores/auth-store.ts` — Session-derived user state
- `src/stores/ui-store.ts` — Sidebar open/closed, active nav item, modal states
- `src/stores/notification-store.ts` — In-app notification bell + badge
- `src/lib/query-client.ts` — React Query singleton configuration (stale times, retry logic)
- `src/components/providers.tsx` — QueryClientProvider + Zustand hydration wrapper (already exists as stub — complete it)

#### 1H: Dashboard Layout Completion

Files to complete/create:
- `src/components/layout/sidebar.tsx` — Full sidebar with role-aware nav items
- `src/components/layout/header.tsx` — User menu, notification bell, breadcrumbs
- `src/app/(dashboard)/layout.tsx` — Sidebar + header layout wrapper
- `src/components/layout/breadcrumbs.tsx` — Dynamic breadcrumb component
- `src/components/layout/notification-dropdown.tsx` — Notification bell dropdown

---

### Phase 2 — Core Reporting System (Weeks 4–7)

**Goal:** Complete all 5 report levels — submission forms, aggregation logic, and the district/zonal/national auto-compiled views.

#### 2A: Flight Shepherd Report

Files to create:
- `src/app/api/reports/shepherd/route.ts` — Complete (GET: list by shepherd/week, POST: submit)
- `src/app/api/reports/shepherd/[id]/route.ts` — GET single, PATCH (draft update), POST submit
- `src/app/(dashboard)/shepherd/report/page.tsx` — Shepherd weekly report form
- `src/app/(dashboard)/shepherd/converts/page.tsx` — My converts list with status update
- `src/app/(dashboard)/shepherd/dashboard/page.tsx` — Shepherd home with summary cards
- `src/components/forms/ShepherdReportForm.tsx` — React Hook Form + Zod validated form
- `src/components/forms/ConvertStatusCard.tsx` — Individual convert status update card

#### 2B: Branch Report

Files to create:
- `src/app/api/reports/branch/route.ts` — GET (list for branch), POST (create/draft)
- `src/app/api/reports/branch/[id]/route.ts` — GET, PATCH (update draft), POST /submit (lock)
- `src/app/api/reports/branch/[id]/preview/route.ts` — GET aggregation preview before submit
- `src/app/(dashboard)/branch/report/new/page.tsx` — 9-section branch report wizard
- `src/app/(dashboard)/branch/report/[id]/page.tsx` — View submitted/draft report
- `src/app/(dashboard)/branch/dashboard/page.tsx` — Branch coordinator home
- `src/app/(dashboard)/branch/shepherds/page.tsx` — Shepherd management table
- `src/app/(dashboard)/branch/souls/page.tsx` — Convert list with filters
- `src/app/(dashboard)/branch/souls/new/page.tsx` — Add new soul/convert
- `src/components/forms/BranchReportWizard.tsx` — Multi-step form with section navigation
- `src/components/forms/SoulRegistrationForm.tsx` — New convert registration

#### 2C: District Report (Auto-Aggregated)

Files to create:
- `src/app/api/reports/district/route.ts` — GET (trigger aggregation + return), POST /submit
- `src/app/api/reports/district/[id]/route.ts` — GET single compiled report
- `src/app/(dashboard)/district/dashboard/page.tsx` — District home with branch grid
- `src/app/(dashboard)/district/report/page.tsx` — Review aggregated report + submit
- `src/app/(dashboard)/district/branches/page.tsx` — Branch compliance table
- `src/lib/aggregation/district-aggregator.ts` — Core aggregation engine (see Section 5)
- `src/components/reports/DistrictReportView.tsx` — Read-only aggregate display
- `src/components/reports/BranchComplianceGrid.tsx` — Traffic-light compliance grid

#### 2D: Zonal Report (Auto-Aggregated)

Files to create:
- `src/app/api/reports/zone/route.ts` — GET (trigger aggregation), POST /submit
- `src/app/api/reports/zone/[id]/route.ts` — GET single
- `src/app/(dashboard)/zone/dashboard/page.tsx` — Zonal home with district grid
- `src/app/(dashboard)/zone/report/page.tsx` — Aggregated zonal report + submit
- `src/lib/aggregation/zonal-aggregator.ts` — Zonal aggregation engine
- `src/components/reports/ZonalReportView.tsx` — Zonal aggregate display

#### 2E: National Report (Auto-Aggregated)

Files to create:
- `src/app/api/reports/national/route.ts` — GET (current month aggregate), POST /compile
- `src/app/api/reports/national/[id]/route.ts` — GET historical
- `src/app/(dashboard)/national/dashboard/page.tsx` — National command center
- `src/app/(dashboard)/national/report/page.tsx` — Monthly national report
- `src/lib/aggregation/national-aggregator.ts` — National aggregation engine

#### 2F: Report History & Read Views

Files to create:
- `src/app/(dashboard)/reports/history/page.tsx` — Filterable report history (all roles scoped)
- `src/app/(dashboard)/reports/[type]/[id]/page.tsx` — Unified report detail view
- `src/components/reports/ReportStatusBadge.tsx` — Status pill (draft/submitted/approved/late)
- `src/components/reports/ReportTimeline.tsx` — Submission chain for a given week

---

### Phase 3 — Soul Tracking, FIA & SML Certification (Weeks 8–11)

**Goal:** Complete convert lifecycle tracking, FIA pipeline, and SML certificate generation.

#### 3A: Soul (Convert) Management

Files to create:
- `src/app/api/souls/route.ts` — GET (list with filters), POST (create + auto-assign tag)
- `src/app/api/souls/[id]/route.ts` — GET, PATCH (update status/stage), DELETE (archive)
- `src/app/api/souls/[id]/notes/route.ts` — POST add note, GET note history
- `src/app/api/souls/[id]/contact/route.ts` — POST log contact date (updates lastContactDate)
- `src/lib/tag-assignment.ts` — Shepherd tag auto-assignment logic (see Section 9)
- `src/lib/schemas/soul.ts` — Extended soul Zod schemas

#### 3B: FIA Pipeline

Files to create:
- `src/app/api/souls/[id]/fia/route.ts` — PATCH update any FIA stage date
- `src/app/(dashboard)/branch/fia/page.tsx` — FIA pipeline overview (funnel view)
- `src/components/souls/SoulPipeline.tsx` — Visual pipeline funnel component
- `src/components/souls/FiaStageTracker.tsx` — Horizontal stepper for soul's FIA stage
- `src/components/souls/ConvertCard.tsx` — Individual convert card with inline status update

#### 3C: SIP Enrollment & Tracking

Files to create:
- `src/app/api/sip/route.ts` — GET enrollments, POST enroll (with prerequisite check)
- `src/app/api/sip/[enrollmentId]/route.ts` — PATCH mark completed, GET details
- `src/app/(dashboard)/trainer/dashboard/page.tsx` — Chief Trainer home
- `src/app/(dashboard)/trainer/sip/page.tsx` — SIP enrollment management
- `src/app/(dashboard)/trainer/sip/[level]/page.tsx` — SIP 101/102/103 cohort view
- `src/lib/sip-prerequisites.ts` — Prerequisite validation logic

#### 3D: SML Certification

Files to create:
- `src/app/api/sml/route.ts` — GET registry, POST certify (triggers cert generation)
- `src/app/api/sml/[soulId]/certificate/route.ts` — GET certificate URL, POST regenerate
- `src/app/(dashboard)/trainer/sml/page.tsx` — SML certification workflow
- `src/app/(dashboard)/zone/sml-registry/page.tsx` — Zonal SML registry view
- `src/lib/certificate-generator.ts` — @react-pdf/renderer SML certificate PDF
- `src/components/trainer/SmlCertificatePreview.tsx` — Preview before generation
- `src/components/trainer/SipProgressTable.tsx` — Tabular SIP progress by member

---

### Phase 4 — Analytics, WhatsApp & Export (Weeks 12–15)

**Goal:** KPI scoring engine, national dashboards with charts, WhatsApp bot, and all export functions.

#### 4A: KPI Engine

Files to create:
- `src/lib/kpi/calculator.ts` — KPI score calculation functions (see Section 6)
- `src/lib/kpi/benchmarks.ts` — Target values per level for normalization
- `src/app/api/kpi/route.ts` — GET current month scores (scoped by role)
- `src/app/api/kpi/[entityId]/route.ts` — GET score history (6 months)
- `src/app/api/kpi/leaderboard/route.ts` — GET top-3 per level
- `src/app/(dashboard)/kpi/page.tsx` — KPI scorecard page (all roles)
- `src/components/kpi/KpiScorecard.tsx` — Score breakdown with weighted bars
- `src/components/kpi/KpiLeaderboard.tsx` — Top-3 entities ranking
- `src/components/kpi/KpiTrendChart.tsx` — 6-month history line chart

#### 4B: Dashboards & Analytics

Files to create:
- `src/app/(dashboard)/dashboard/page.tsx` — Complete role-aware dashboard home
- `src/components/dashboard/SevenMillionProgress.tsx` — Progress ring toward 7M
- `src/components/dashboard/SoulsWonTrend.tsx` — Weekly trend line chart (Recharts)
- `src/components/dashboard/ConvertFunnel.tsx` — Won → SML pipeline funnel
- `src/components/dashboard/BranchHeatmap.tsx` — Compliance heatmap grid
- `src/components/dashboard/NationalSummaryCards.tsx` — Top-level metric cards
- `src/components/dashboard/ZonePerformanceGrid.tsx` — Zone-by-zone comparison
- `src/components/charts/WeeklyBarChart.tsx` — Reusable weekly bar chart wrapper
- `src/components/charts/RetentionGauge.tsx` — Circular gauge for retention rate

#### 4C: WhatsApp Bot

Files to create:
- `src/app/api/whatsapp/webhook/route.ts` — GET (verify), POST (message handler)
- `src/lib/whatsapp/session-store.ts` — In-memory + DB conversation state store
- `src/lib/whatsapp/router.ts` — Route inbound messages to correct handler
- `src/lib/whatsapp/handlers/shepherd-report.ts` — Parse + validate shepherd report
- `src/lib/whatsapp/handlers/convert-query.ts` — "MY CONVERTS" query handler
- `src/lib/whatsapp/handlers/branch-status.ts` — "STATUS" handler for coordinators
- `src/lib/whatsapp/handlers/unknown-number.ts` — Unregistered number handler
- `src/lib/whatsapp/parser.ts` — Regex-based report field extractor
- `src/lib/whatsapp/templates.ts` — Template name constants + component builders
- `src/app/(dashboard)/admin/whatsapp/page.tsx` — WA config + message log

#### 4D: Notification System

Files to create:
- `src/app/api/notifications/route.ts` — GET user's notifications (paginated)
- `src/app/api/notifications/[id]/read/route.ts` — PATCH mark read
- `src/app/api/notifications/read-all/route.ts` — PATCH mark all read
- `src/lib/notifications/dispatcher.ts` — Route notification to email/WA/in-app
- `src/lib/notifications/email-templates.ts` — All HTML email templates
- `src/lib/notifications/wa-templates.ts` — WhatsApp template component builders
- `src/components/layout/notification-dropdown.tsx` — Complete notification panel

#### 4E: Cron Jobs

Files to create:
- `src/app/api/cron/shepherd-reminder/route.ts` — Friday 6pm cron
- `src/app/api/cron/shepherd-escalation/route.ts` — Saturday 8pm cron
- `src/app/api/cron/branch-reminder/route.ts` — Sunday 6pm cron
- `src/app/api/cron/branch-escalation/route.ts` — Sunday 9pm cron
- `src/app/api/cron/district-reminder/route.ts` — Monday 6pm cron
- `src/app/api/cron/zone-reminder/route.ts` — Tuesday 6pm cron
- `src/app/api/cron/monthly-compile/route.ts` — Last day of month 11pm cron
- `src/app/api/cron/inactivity-check/route.ts` — Monday 9am cron
- `src/app/api/cron/national-digest/route.ts` — Sunday 10pm cron
- `vercel.json` — Cron schedule configuration

#### 4F: Export System

Files to create:
- `src/app/api/export/report/[type]/[id]/route.ts` — Export any report as PDF
- `src/app/api/export/souls/route.ts` — Export convert list as CSV/Excel
- `src/app/api/export/kpi/[entityId]/route.ts` — Export KPI scorecard PDF
- `src/app/api/export/sml-registry/[zoneId]/route.ts` — Export SML registry Excel
- `src/lib/export/pdf-renderer.ts` — PDF generation using @react-pdf/renderer
- `src/lib/export/excel-builder.ts` — XLSX export builder
- `src/components/export/ExportButton.tsx` — Reusable export button with format picker

---

### Phase 5 — Admin, Testing & Security (Weeks 16–18)

**Goal:** Complete admin panel, write full test suite, security hardening.

#### 5A: Admin Panel

Files to create:
- `src/app/(dashboard)/admin/dashboard/page.tsx` — System overview for super_admin
- `src/app/(dashboard)/admin/users/page.tsx` — User management table
- `src/app/(dashboard)/admin/users/new/page.tsx` — Create user form
- `src/app/(dashboard)/admin/users/[id]/page.tsx` — Edit user
- `src/app/(dashboard)/admin/organizations/page.tsx` — Org hierarchy manager
- `src/app/(dashboard)/admin/organizations/new/page.tsx` — Create org entity
- `src/app/(dashboard)/admin/audit-log/page.tsx` — Audit trail viewer (filterable)
- `src/app/(dashboard)/admin/notifications/page.tsx` — Notification config + send history
- `src/app/(dashboard)/admin/system/page.tsx` — System health, DB stats, cron status
- `src/components/admin/UserTable.tsx` — Data table with role/org filters
- `src/components/admin/OrgTreeEditor.tsx` — Hierarchical org tree editor
- `src/components/admin/AuditLogTable.tsx` — Paginated audit log with filters

#### 5B: Unit Tests

Files to create:
- `tests/unit/tag-assignment.test.ts` — Shepherd tag generation edge cases
- `tests/unit/kpi-calculator.test.ts` — All 8 KPI metric formulas
- `tests/unit/aggregation.test.ts` — 5-level aggregation correctness
- `tests/unit/report-validation.test.ts` — Zod schema validation edge cases
- `tests/unit/whatsapp-parser.test.ts` — Report text parsing regex tests
- `tests/unit/date-utils.test.ts` — Week boundary calculations
- `tests/unit/notification-dispatcher.test.ts` — Channel routing logic

#### 5C: Integration Tests

Files to create:
- `tests/integration/auth.test.ts` — Login, magic link, password reset
- `tests/integration/shepherd-report.test.ts` — Full shepherd report lifecycle
- `tests/integration/branch-report.test.ts` — Branch report + aggregation
- `tests/integration/soul-assignment.test.ts` — Soul creation → tag assignment → notification
- `tests/integration/kpi-cron.test.ts` — Monthly KPI compilation

#### 5D: E2E Tests

Files to create:
- `tests/e2e/auth-flow.spec.ts` — Login → dashboard routing per role
- `tests/e2e/reporting-chain.spec.ts` — Full flow: shepherd → branch → district → zone
- `tests/e2e/soul-journey.spec.ts` — Convert registration → SML certification
- `tests/e2e/whatsapp-bot.spec.ts` — Simulated WhatsApp submission flow

#### 5E: Security Hardening

- Rate limiting middleware: `src/middleware.ts` — extend with IP-based rate limiting for /api/whatsapp
- CSRF protection: Verify Next.js default CSRF token on all state-mutating forms
- Input sanitization: Add DOMPurify for any user-supplied HTML (testimonies, challenges fields)
- Helmet headers: Configure `next.config.js` security headers
- API key rotation: Document rotation procedure for WA access token in `docs/ops-runbook.md`

---

### Phase 6 — Launch Preparation (Weeks 19–20)

**Goal:** Seed data, production deployment, training materials, go-live.

Files to create:
- `scripts/seed.ts` — Seed realistic data: 1 zone, 3 districts, 9 branches, ~30 shepherds, ~180 souls
- `scripts/create-super-admin.ts` — One-time admin bootstrap script
- `scripts/migrate-org-tree.ts` — Bulk import existing LFF org structure from CSV
- `docs/ops-runbook.md` — Deployment, environment variables, DB maintenance
- `docs/user-training-guide.md` — Role-specific how-to guide

---

## 2. API Route Map

All routes return `{ success: boolean, data?: T, error?: string }`. All routes except webhook require a valid NextAuth session unless marked PUBLIC.

### 2.1 Authentication

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| POST | `/api/auth/[...nextauth]` | PUBLIC | credentials / magic-link | session JWT |
| POST | `/api/auth/magic-link` | PUBLIC | `{ email }` | 200 if user found |
| POST | `/api/auth/forgot-password` | PUBLIC | `{ email }` | 200 always (security) |
| POST | `/api/auth/reset-password` | PUBLIC | `{ token, newPassword }` | 200 or 400 |

### 2.2 Users

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/users` | branch_coordinator+ | `?role&orgId&page&limit` | `{ users[], total }` |
| POST | `/api/users` | branch_coordinator+ | UserCreateInput | `{ user }` |
| GET | `/api/users/[id]` | branch_coordinator+ | — | `{ user }` |
| PATCH | `/api/users/[id]` | branch_coordinator+ | UserUpdateInput | `{ user }` |
| DELETE | `/api/users/[id]` | super_admin | — | 204 |
| POST | `/api/users/[id]/reset-password` | super_admin | — | 200 |

### 2.3 Organizations

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/organizations` | any | `?type&parentId&page` | `{ orgs[], total }` |
| POST | `/api/organizations` | super_admin | OrgCreateInput | `{ org }` |
| GET | `/api/organizations/[id]` | any | — | `{ org }` |
| PATCH | `/api/organizations/[id]` | super_admin | OrgUpdateInput | `{ org }` |
| DELETE | `/api/organizations/[id]` | super_admin | — | 204 |
| GET | `/api/organizations/[id]/children` | any | `?depth=1` | `{ children[] }` |
| GET | `/api/organizations/tree` | national_coordinator+ | — | `{ tree }` (nested) |

### 2.4 Souls (Converts)

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/souls` | flight_shepherd+ | `?branchId&shepherdId&status&page` | `{ souls[], total }` |
| POST | `/api/souls` | mission_field_coordinator+ | SoulCreateInput | `{ soul, assignedTag }` |
| GET | `/api/souls/[id]` | flight_shepherd+ | — | `{ soul }` (scoped) |
| PATCH | `/api/souls/[id]` | flight_shepherd+ | SoulUpdateInput | `{ soul }` |
| POST | `/api/souls/[id]/notes` | flight_shepherd+ | `{ text }` | `{ note }` |
| POST | `/api/souls/[id]/contact` | flight_shepherd+ | `{ contactDate }` | `{ soul }` |
| PATCH | `/api/souls/[id]/fia` | chief_trainer+ | FiaUpdateInput | `{ soul }` |
| GET | `/api/souls/[id]/timeline` | branch_coordinator+ | — | `{ timeline[] }` |

### 2.5 Reports — Flight Shepherd (Level 1)

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/reports/shepherd` | flight_shepherd+ | `?weekEnding&shepherdId` | `{ reports[] }` |
| POST | `/api/reports/shepherd` | flight_shepherd | ShepherdReportInput | `{ report }` |
| GET | `/api/reports/shepherd/[id]` | flight_shepherd+ | — | `{ report }` |
| PATCH | `/api/reports/shepherd/[id]` | flight_shepherd | ShepherdReportInput (partial) | `{ report }` |
| POST | `/api/reports/shepherd/[id]/submit` | flight_shepherd | — | `{ report }` |

### 2.6 Reports — Branch (Level 2)

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/reports/branch` | branch_coordinator+ | `?weekEnding&branchId&status` | `{ reports[] }` |
| POST | `/api/reports/branch` | branch_coordinator | BranchReportInput | `{ report }` (draft) |
| GET | `/api/reports/branch/[id]` | branch_coordinator+ | — | `{ report }` |
| PATCH | `/api/reports/branch/[id]` | branch_coordinator | BranchReportInput (partial) | `{ report }` |
| POST | `/api/reports/branch/[id]/submit` | branch_coordinator | — | `{ report }` (locked) |
| GET | `/api/reports/branch/[id]/preview` | branch_coordinator | — | `{ preview }` (aggregate) |

### 2.7 Reports — District (Level 3)

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/reports/district` | district_coordinator+ | `?reportingWeek&districtId` | `{ report }` (auto-compiled) |
| GET | `/api/reports/district/[id]` | district_coordinator+ | — | `{ report }` |
| POST | `/api/reports/district/[id]/submit` | district_coordinator | `{ challenges, topBranches[] }` | `{ report }` (locked) |
| POST | `/api/reports/district/compile` | district_coordinator+ | `{ districtId, weekEnding }` | `{ report }` (triggered compile) |

### 2.8 Reports — Zone (Level 4)

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/reports/zone` | zonal_coordinator+ | `?reportingWeek&zoneId` | `{ report }` (auto-compiled) |
| GET | `/api/reports/zone/[id]` | zonal_coordinator+ | — | `{ report }` |
| POST | `/api/reports/zone/[id]/submit` | zonal_coordinator | `{ testimonies, challenges, topDistricts[] }` | `{ report }` |
| POST | `/api/reports/zone/compile` | zonal_coordinator+ | `{ zoneId, weekEnding }` | `{ report }` |

### 2.9 Reports — National (Level 5)

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/reports/national` | national_coordinator+ | `?month&year` | `{ report }` |
| GET | `/api/reports/national/[id]` | national_coordinator+ | — | `{ report }` |
| POST | `/api/reports/national/compile` | national_coordinator | `{ month, year }` | `{ report }` |
| PATCH | `/api/reports/national/[id]` | national_coordinator | `{ testimonies, recommendations }` | `{ report }` |
| POST | `/api/reports/national/[id]/approve` | national_coordinator | — | `{ report }` |

### 2.10 KPI

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/kpi` | branch_coordinator+ | `?entityId&entityType&month&year` | `{ score }` |
| GET | `/api/kpi/[entityId]/history` | branch_coordinator+ | `?months=6` | `{ scores[] }` |
| GET | `/api/kpi/leaderboard` | district_coordinator+ | `?parentId&parentType&month&year` | `{ top3[] }` |
| POST | `/api/kpi/compute` | super_admin | `{ entityId, entityType, month, year }` | `{ score }` |

### 2.11 SIP / SML

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/sip` | chief_trainer+ | `?branchId&level&status` | `{ enrollments[] }` |
| POST | `/api/sip` | chief_trainer | `{ soulId, level: 101\|102\|103 }` | `{ enrollment }` |
| PATCH | `/api/sip/[id]/complete` | chief_trainer | `{ completedDate }` | `{ enrollment }` |
| POST | `/api/sml/certify` | chief_trainer | `{ soulId }` | `{ soul, certificateUrl }` |
| GET | `/api/sml/registry` | zonal_coordinator+ | `?zoneId&districtId&branchId` | `{ members[] }` |
| GET | `/api/sml/[soulId]/certificate` | branch_coordinator+ | — | `{ certificateUrl }` |

### 2.12 Notifications

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/notifications` | any | `?status&page&limit=20` | `{ notifications[], unreadCount }` |
| PATCH | `/api/notifications/[id]/read` | any | — | 204 |
| PATCH | `/api/notifications/read-all` | any | — | 204 |
| POST | `/api/notifications/send` | super_admin | `{ recipientId, type, channel, body }` | `{ notification }` |

### 2.13 WhatsApp Webhook

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/whatsapp/webhook` | PUBLIC | `?hub.mode&hub.verify_token&hub.challenge` | challenge string |
| POST | `/api/whatsapp/webhook` | Signature | Meta webhook payload | 200 always |
| GET | `/api/whatsapp/messages` | super_admin | `?phone&page` | `{ messages[] }` |

### 2.14 Export

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/export/report/branch/[id]` | branch_coordinator+ | — | PDF blob |
| GET | `/api/export/report/district/[id]` | district_coordinator+ | — | PDF blob |
| GET | `/api/export/report/zone/[id]` | zonal_coordinator+ | — | PDF blob |
| GET | `/api/export/report/national/[id]` | national_coordinator+ | — | PDF blob |
| GET | `/api/export/souls` | branch_coordinator+ | `?branchId&status&format=csv\|xlsx` | CSV or XLSX blob |
| GET | `/api/export/kpi/[entityId]` | branch_coordinator+ | `?month&year` | PDF blob |
| GET | `/api/export/sml-registry/[zoneId]` | zonal_coordinator+ | — | XLSX blob |

### 2.15 Cron Jobs (internal — secured by CRON_SECRET header)

| Method | Path | Trigger | Description |
|--------|------|---------|-------------|
| GET | `/api/cron/shepherd-reminder` | Friday 18:00 | Remind outstanding shepherds |
| GET | `/api/cron/shepherd-escalation` | Saturday 20:00 | Escalate to branch coord |
| GET | `/api/cron/branch-reminder` | Sunday 18:00 | Remind outstanding branches |
| GET | `/api/cron/branch-escalation` | Sunday 21:00 | Escalate to district coord |
| GET | `/api/cron/district-reminder` | Monday 18:00 | Remind outstanding districts |
| GET | `/api/cron/zone-reminder` | Tuesday 18:00 | Remind outstanding zones |
| GET | `/api/cron/monthly-compile` | Last day of month 23:00 | Compile KPI + national report |
| GET | `/api/cron/inactivity-check` | Monday 09:00 | Flag inactive converts |
| GET | `/api/cron/national-digest` | Sunday 22:00 | Weekly digest to national desk |

### 2.16 Admin

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| GET | `/api/admin/audit-log` | super_admin | `?userId&action&from&to&page` | `{ logs[], total }` |
| GET | `/api/admin/system/stats` | super_admin | — | `{ dbStats, userCount, reportCount }` |
| POST | `/api/admin/reports/[id]/unlock` | super_admin | `{ reason }` | `{ report }` |

---

## 3. Component Tree

### 3.1 Application Layout

```
<RootLayout>                        (src/app/layout.tsx)
  <Providers>                       (QueryClient + Zustand hydration)
    <Toaster />
    {children}
```

```
<AuthLayout>                        (src/app/(auth)/layout.tsx)
  <LoginPage />                     (src/app/(auth)/login/page.tsx)
  <MagicLinkPage />
  <ForgotPasswordPage />
  <ResetPasswordPage />
```

```
<DashboardLayout>                   (src/app/(dashboard)/layout.tsx)
  <Sidebar>
    <SidebarLogo />
    <SidebarNav>                    (role-filtered nav items)
      <SidebarNavItem />            (link + icon + active state)
    </SidebarNav>
    <SidebarUser />                 (avatar + name + logout)
  </Sidebar>
  <main>
    <Header>
      <Breadcrumbs />
      <NotificationBell>
        <NotificationDropdown>
          <NotificationItem />      (per notification)
        </NotificationDropdown>
      </NotificationBell>
      <UserMenu />
    </Header>
    {children}                      (page content)
  </main>
```

### 3.2 National Dashboard

```
<NationalDashboard>
  <NationalSummaryCards>
    <StatCard label="Total Souls Won" />
    <StatCard label="Branches Reporting" />
    <StatCard label="Retention Rate" />
    <StatCard label="7M Progress %" />
  </NationalSummaryCards>
  <SevenMillionProgress>
    <ProgressRing current={} target={7000000} />
    <ProgressLabel />
  </SevenMillionProgress>
  <div class="grid-2">
    <SoulsWonTrend>               (Recharts LineChart — 12 weeks)
      <Legend />
      <XAxis weekLabel />
      <YAxis />
      <Line dataKey="soulsWon" />
    </SoulsWonTrend>
    <ConvertFunnel>               (Recharts FunnelChart)
      <FunnelEntry label="Won" />
      <FunnelEntry label="Shepherd Assigned" />
      <FunnelEntry label="Family Class" />
      <FunnelEntry label="SIP Enrolled" />
      <FunnelEntry label="SML Certified" />
    </ConvertFunnel>
  </div>
  <ZoneComplianceGrid>            (grid of zone cards)
    <ZoneCard>
      <ZoneStatusBadge />
      <ZoneMetrics />
    </ZoneCard>
  </ZoneComplianceGrid>
  <KpiLeaderboard level="zone" />
</NationalDashboard>
```

### 3.3 Branch Dashboard

```
<BranchDashboard>
  <BranchSummaryCards>
    <StatCard label="This Week Souls Won" />
    <StatCard label="Active Converts" />
    <StatCard label="Shepherds Active" />
    <StatCard label="Report Status" />     (traffic light pill)
  </BranchSummaryCards>
  <div class="grid-2">
    <ShepherdComplianceList>
      <ShepherdRow tag="YM-Tag1" submitted={true} />
      <ShepherdRow tag="YM-Tag2" submitted={false} overdue />
    </ShepherdComplianceList>
    <ConvertPipelineMini>           (mini funnel for branch)
    </ConvertPipelineMini>
  </div>
  <RecentReports>
    <ReportCard weekEnding={} status="submitted" />
  </RecentReports>
  <QuickActions>
    <Button>New Weekly Report</Button>
    <Button>Add New Convert</Button>
    <Button>View KPI Score</Button>
  </QuickActions>
</BranchDashboard>
```

### 3.4 Branch Report Wizard

```
<BranchReportWizard>
  <WizardProgress steps={9} current={step} />
  <WizardStep index={1} title="GOWAS">
    <GowasSection>
      <NumberField label="Participants" name="gowas.participants" />
      <NumberField label="Souls Reached" name="gowas.soulsReached" />
      <NumberField label="Souls Won" name="gowas.soulsWon" />
                  {/* validated: soulsWon <= soulsReached */}
      <NumberField label="First Timers" name="gowas.firstTimers" />
    </GowasSection>
  </WizardStep>
  <WizardStep index={2} title="Follow-Up">
    <FollowUpSection autoPopulated={true} />
  </WizardStep>
  <WizardStep index={3} title="FIA">
    <FiaSection>
      <FiaActivityRow label="Family Class" name="fia.familyClass" />
      <FiaActivityRow label="Responsibility Class" name="fia.responsibilityClass" />
      <FiaActivityRow label="Sorting Out" name="fia.sortingOut" />
      <FiaActivityRow label="HSOS" name="fia.hsos" />
      <FiaActivityRow label="ZIBI" name="fia.zibi" />
    </FiaSection>
  </WizardStep>
  <WizardStep index={4} title="Baptism">
    <BaptismSection />
  </WizardStep>
  <WizardStep index={5} title="Flight Shepherds">
    <ShepherdCountsSection autoFilled={true} />
  </WizardStep>
  <WizardStep index={6} title="Evangelism Explosion">
    <EESection />
  </WizardStep>
  <WizardStep index={7} title="HST">
    <HSTSection />
  </WizardStep>
  <WizardStep index={8} title="Testimonies">
    <TextareaField name="testimonies" />
  </WizardStep>
  <WizardStep index={9} title="Preview & Submit">
    <BranchReportPreview />
    <SubmitButton />
  </WizardStep>
  <WizardNav onBack={} onNext={} />
</BranchReportWizard>
```

### 3.5 Shepherd Dashboard

```
<ShepherdDashboard>
  <ShepherdSummaryCards>
    <StatCard label="Assigned Converts" />
    <StatCard label="Active" />
    <StatCard label="Inactive" />
    <StatCard label="Report Status" />
  </ShepherdSummaryCards>
  <ConvertList>
    <ConvertCard>
      <ConvertName />
      <ConvertStatus />             (Active / Inactive / Backslidden)
      <ConvertStage />              (FIA progress pill)
      <DaysSinceContact />          (flagged red if > 14)
      <UpdateStatusButton />
      <LogContactButton />
    </ConvertCard>
  </ConvertList>
  <WeeklyReportButton>
    {submitted ? <ReportSubmittedBadge /> : <SubmitReportCTA />}
  </WeeklyReportButton>
</ShepherdDashboard>
```

### 3.6 KPI Scorecard View

```
<KpiScorecard>
  <ScoreHeader>
    <EntityName />
    <TotalScore large />           (e.g., 78/100)
    <MonthPicker />
  </ScoreHeader>
  <ScoreBreakdownList>
    <ScoreRow metric="Souls Won" raw={} weighted={} maxWeight={30} />
    <ScoreRow metric="Retention" raw={} weighted={} maxWeight={20} />
    <ScoreRow metric="FIA Progress" raw={} weighted={} maxWeight={15} />
    <ScoreRow metric="Baptism" raw={} weighted={} maxWeight={10} />
    <ScoreRow metric="Flight Shepherd System" raw={} weighted={} maxWeight={10} />
    <ScoreRow metric="Evangelism Explosion" raw={} weighted={} maxWeight={5} />
    <ScoreRow metric="HST Readiness" raw={} weighted={} maxWeight={5} />
    <ScoreRow metric="Reporting Compliance" raw={} weighted={} maxWeight={5} />
  </ScoreBreakdownList>
  <KpiTrendChart months={6} />
  <RankBadge rank={} outOf={} />
  <ExportButton format="pdf" />
</KpiScorecard>
```

### 3.7 Admin Panel

```
<AdminDashboard>
  <AdminSummaryCards>
    <StatCard label="Total Users" />
    <StatCard label="Active Branches" />
    <StatCard label="Reports This Week" />
    <StatCard label="System Health" />
  </AdminSummaryCards>
  <TabNav>
    <Tab>Users</Tab>
    <Tab>Organizations</Tab>
    <Tab>Audit Log</Tab>
    <Tab>System</Tab>
  </TabNav>
  <UserTable>
    <UserRow>
      <UserAvatar /> <UserName /> <UserRole /> <UserOrg />
      <UserStatus /> <ActionMenu />
    </UserRow>
    <Pagination />
  </UserTable>
</AdminDashboard>
```

---

## 4. Zustand Store Design

All stores use the pattern: `create<State>()(devtools(persist(immer())))` where persistence is needed, or `create<State>()(devtools(immer()))` for session-only state.

### 4.1 Auth Store (`src/stores/auth-store.ts`)

```typescript
interface AuthState {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    organizationId: string
    organizationLevel: OrgLevel
    organizationName: string
    shepherdTag?: string
  } | null
  isLoading: boolean
  // Actions
  setUser: (user: AuthState['user']) => void
  clearUser: () => void
}

// Hydrated from NextAuth session on DashboardLayout mount
// NOT persisted to localStorage (session is the source of truth)
```

### 4.2 UI Store (`src/stores/ui-store.ts`)

```typescript
interface UiState {
  sidebarOpen: boolean
  activeModal: string | null
  modalData: Record<string, unknown> | null
  reportDrafts: Record<string, Partial<BranchReportInput>> // branchId → draft
  // Actions
  toggleSidebar: () => void
  openModal: (id: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  saveDraft: (key: string, data: Partial<BranchReportInput>) => void
  clearDraft: (key: string) => void
}

// sidebarOpen: persisted to localStorage
// reportDrafts: persisted to localStorage (offline resilience)
// activeModal: session only (not persisted)
```

### 4.3 Notification Store (`src/stores/notification-store.ts`)

```typescript
interface NotificationState {
  notifications: INotification[]
  unreadCount: number
  isDropdownOpen: boolean
  lastFetchedAt: Date | null
  // Actions
  setNotifications: (notifs: INotification[]) => void
  addNotification: (notif: INotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setUnreadCount: (count: number) => void
  toggleDropdown: () => void
}

// Polling: React Query polls /api/notifications?status=unread every 30 seconds
// Zustand acts as local cache between polls
// NOT persisted (always freshly fetched on login)
```

### 4.4 Report Wizard Store (`src/stores/report-wizard-store.ts`)

```typescript
interface ReportWizardState {
  currentStep: number
  totalSteps: number
  formData: Partial<BranchReportInput>
  isSubmitting: boolean
  submitError: string | null
  reportId: string | null  // set after draft created
  isLocked: boolean        // true after submit
  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateFormData: (section: keyof BranchReportInput, data: unknown) => void
  setReportId: (id: string) => void
  lockReport: () => void
  resetWizard: () => void
}

// Persisted to localStorage under key: `report-wizard-${branchId}-${weekEnding}`
// On mount: check for saved draft and restore
```

### 4.5 Organization Cache Store (`src/stores/org-store.ts`)

```typescript
interface OrgState {
  orgTree: IOrgTree | null
  orgMap: Record<string, IOrganization>
  lastLoadedAt: Date | null
  // Actions
  setOrgTree: (tree: IOrgTree) => void
  getOrgById: (id: string) => IOrganization | undefined
  getChildrenOf: (parentId: string) => IOrganization[]
}

// Populated once on first dashboard load via React Query
// Stale time: 10 minutes (orgs change rarely)
// Persisted: sessionStorage (cleared on tab close)
```

### 4.6 WhatsApp Session Store (`src/lib/whatsapp/session-store.ts`)

```typescript
// This is NOT a Zustand store — it lives server-side.
// Uses an in-memory Map + MongoDB fallback for conversation state.

interface WaSession {
  phone: string
  userId: string
  state: WaBotState  // See Section 8
  context: {
    weekEnding?: string
    reportData?: Partial<ShepherdReportInput>
    lastMessageAt: Date
  }
}

// Map key: phone number (E.164)
// TTL: 24 hours (cleared by cleanup cron)
// Fallback: stored in notifications collection with type='wa_session'
```

---

## 5. Aggregation Algorithm

### Overview

The platform uses **Aggregation-on-Read with Write-Through Cache**:

1. Lower level submits a report → triggers upward cache invalidation
2. Higher level requests their report → system checks for cached aggregate
3. If cache is stale or missing → run MongoDB aggregation pipeline → store result
4. Higher level coordinator reviews and can "submit" (lock) the cached aggregate

### 5.1 District Report Aggregation

**Trigger:** Branch submits their weekly report OR district coordinator calls GET /api/reports/district

```typescript
// src/lib/aggregation/district-aggregator.ts

async function compileDistrictReport(
  districtId: string,
  weekEnding: Date
): Promise<IDistrictReport> {

  await connectDB()

  // Step 1: Find all active branches in this district
  const branches = await Organization.find({
    type: 'branch',
    parentId: districtId,
    isActive: true
  }).lean()

  const branchIds = branches.map(b => b._id)
  const totalBranches = branchIds.length

  // Step 2: Find all submitted branch reports for this week
  const submittedReports = await BranchReport.find({
    branchId: { $in: branchIds },
    weekEnding: {
      $gte: startOfDay(weekEnding),
      $lte: endOfDay(weekEnding)
    },
    status: { $in: ['submitted', 'approved'] }
  }).lean()

  const branchesReporting = submittedReports.length
  const branchesOutstanding = totalBranches - branchesReporting

  // Step 3: Aggregate numerics using MongoDB $group pipeline
  const pipeline = [
    {
      $match: {
        branchId: { $in: branchIds },
        weekEnding: { $gte: startOfDay(weekEnding), $lte: endOfDay(weekEnding) },
        status: { $in: ['submitted', 'approved'] }
      }
    },
    {
      $group: {
        _id: null,
        // GOWAS
        participants:            { $sum: '$gowas.participants' },
        soulsReached:            { $sum: '$gowas.soulsReached' },
        soulsWon:                { $sum: '$gowas.soulsWon' },
        firstTimers:             { $sum: '$gowas.firstTimers' },
        // Follow-Up
        newConverts:             { $sum: '$followUp.newConverts' },
        assignedToShepherds:     { $sum: '$followUp.assignedToShepherds' },
        activeConverts:          { $sum: '$followUp.active' },
        inactiveConverts:        { $sum: '$followUp.inactive' },
        // FIA
        fcEnrolled:              { $sum: '$fia.familyClass.enrolled' },
        fcCompleted:             { $sum: '$fia.familyClass.completed' },
        rcEnrolled:              { $sum: '$fia.responsibilityClass.enrolled' },
        rcCompleted:             { $sum: '$fia.responsibilityClass.completed' },
        soEnrolled:              { $sum: '$fia.sortingOut.enrolled' },
        soCompleted:             { $sum: '$fia.sortingOut.completed' },
        hsosEnrolled:            { $sum: '$fia.hsos.enrolled' },
        hsosCompleted:           { $sum: '$fia.hsos.completed' },
        zibiEnrolled:            { $sum: '$fia.zibi.enrolled' },
        zibiCompleted:           { $sum: '$fia.zibi.completed' },
        // Baptism
        baptized:                { $sum: '$baptism.baptized' },
        awaitingBaptism:         { $sum: '$baptism.awaitingBaptism' },
        // Shepherd Counts
        shepherdYm:              { $sum: '$flightShepherds.ym' },
        shepherdYf:              { $sum: '$flightShepherds.yf' },
        shepherdM:               { $sum: '$flightShepherds.m' },
        shepherdW:               { $sum: '$flightShepherds.w' },
        shepherdTotal:           { $sum: '$flightShepherds.totalActive' },
        // EE
        eeTrained:               { $sum: '$evangelismExplosion.trained' },
        eeOngoing:               { $sum: '$evangelismExplosion.ongoing' },
      }
    }
  ]

  const [aggregated] = await BranchReport.aggregate(pipeline)

  // Step 4: Compute HST status distribution
  const hstCounts = await BranchReport.aggregate([
    { $match: { branchId: { $in: branchIds }, weekEnding: { $gte: startOfDay(weekEnding), $lte: endOfDay(weekEnding) }, status: { $in: ['submitted', 'approved'] } } },
    { $group: { _id: '$hst.status', count: { $sum: 1 } } }
  ])
  // Returns: [{ _id: 'ready', count: 5 }, { _id: 'ongoing', count: 2 }, ...]

  // Step 5: Identify outstanding branches (names/codes)
  const submittedBranchIds = new Set(submittedReports.map(r => r.branchId.toString()))
  const outstandingBranches = branches
    .filter(b => !submittedBranchIds.has(b._id.toString()))
    .map(b => ({ id: b._id, name: b.name, code: b.code }))

  // Step 6: Upsert district report cache
  const districtReport = await DistrictReport.findOneAndUpdate(
    { districtId, reportingWeek: startOfDay(weekEnding) },
    {
      $set: {
        branchesReporting,
        branchesOutstanding,
        outstandingBranches,
        aggregated: mapAggregatedToShape(aggregated),
        hstDistribution: hstCounts,
        compiledAt: new Date(),
        status: 'auto_compiled',
        invalidatedAt: null
      }
    },
    { upsert: true, new: true }
  )

  return districtReport
}

// Helper: structured aggregated shape
function mapAggregatedToShape(raw: Record<string, number>) {
  return {
    gowas: {
      participants: raw.participants ?? 0,
      soulsReached: raw.soulsReached ?? 0,
      soulsWon: raw.soulsWon ?? 0,
      firstTimers: raw.firstTimers ?? 0
    },
    followUp: {
      newConverts: raw.newConverts ?? 0,
      assignedToShepherds: raw.assignedToShepherds ?? 0,
      active: raw.activeConverts ?? 0,
      inactive: raw.inactiveConverts ?? 0
    },
    fia: {
      familyClass: { enrolled: raw.fcEnrolled ?? 0, completed: raw.fcCompleted ?? 0 },
      responsibilityClass: { enrolled: raw.rcEnrolled ?? 0, completed: raw.rcCompleted ?? 0 },
      sortingOut: { enrolled: raw.soEnrolled ?? 0, completed: raw.soCompleted ?? 0 },
      hsos: { enrolled: raw.hsosEnrolled ?? 0, completed: raw.hsosCompleted ?? 0 },
      zibi: { enrolled: raw.zibiEnrolled ?? 0, completed: raw.zibiCompleted ?? 0 }
    },
    baptism: { baptized: raw.baptized ?? 0, awaitingBaptism: raw.awaitingBaptism ?? 0 },
    flightShepherds: {
      ym: raw.shepherdYm ?? 0,
      yf: raw.shepherdYf ?? 0,
      m: raw.shepherdM ?? 0,
      w: raw.shepherdW ?? 0,
      totalActive: raw.shepherdTotal ?? 0
    },
    evangelismExplosion: {
      trained: raw.eeTrained ?? 0,
      ongoing: raw.eeOngoing ?? 0
    }
  }
}
```

### 5.2 Zonal Report Aggregation

**Trigger:** District submits their report OR zonal coordinator requests their report

```typescript
// src/lib/aggregation/zonal-aggregator.ts

async function compileZonalReport(zoneId: string, weekEnding: Date): Promise<IZonalReport> {

  // Step 1: Find all districts in this zone
  const districts = await Organization.find({
    type: 'district',
    parentId: zoneId,
    isActive: true
  }).lean()

  const districtIds = districts.map(d => d._id)

  // Step 2: Query district_reports for this week
  const submittedDistrictReports = await DistrictReport.find({
    districtId: { $in: districtIds },
    reportingWeek: { $gte: startOfDay(weekEnding), $lte: endOfDay(weekEnding) },
    status: { $in: ['submitted', 'approved'] }
  }).lean()

  const districtsReporting = submittedDistrictReports.length
  const districtsOutstanding = districtIds.length - districtsReporting

  // Step 3: Sum district aggregated fields (reuse mapAggregatedToShape pattern)
  const zonalAggregated = sumAggregatedFields(
    submittedDistrictReports.map(r => r.aggregated)
  )

  // Step 4: Add branch-level counts (sum from district reports)
  const branchesReporting = submittedDistrictReports.reduce(
    (sum, d) => sum + d.branchesReporting, 0
  )
  const branchesOutstanding = submittedDistrictReports.reduce(
    (sum, d) => sum + d.branchesOutstanding, 0
  )

  // Step 5: Upsert zonal report cache
  return ZonalReport.findOneAndUpdate(
    { zoneId, reportingWeek: startOfDay(weekEnding) },
    {
      $set: {
        districtsReporting,
        districtsOutstanding,
        branchesReporting,
        branchesOutstanding,
        aggregated: zonalAggregated,
        compiledAt: new Date(),
        status: 'auto_compiled',
        invalidatedAt: null
      }
    },
    { upsert: true, new: true }
  )
}

// Generic recursive field summer
function sumAggregatedFields(aggregatedArray: IReportAggregated[]): IReportAggregated {
  const sum = (key: string) =>
    aggregatedArray.reduce((acc, r) => acc + (getNestedValue(r, key) ?? 0), 0)

  return {
    gowas: {
      participants: sum('gowas.participants'),
      soulsReached: sum('gowas.soulsReached'),
      soulsWon: sum('gowas.soulsWon'),
      firstTimers: sum('gowas.firstTimers')
    },
    followUp: {
      newConverts: sum('followUp.newConverts'),
      assignedToShepherds: sum('followUp.assignedToShepherds'),
      active: sum('followUp.active'),
      inactive: sum('followUp.inactive')
    },
    fia: {
      familyClass: { enrolled: sum('fia.familyClass.enrolled'), completed: sum('fia.familyClass.completed') },
      responsibilityClass: { enrolled: sum('fia.responsibilityClass.enrolled'), completed: sum('fia.responsibilityClass.completed') },
      sortingOut: { enrolled: sum('fia.sortingOut.enrolled'), completed: sum('fia.sortingOut.completed') },
      hsos: { enrolled: sum('fia.hsos.enrolled'), completed: sum('fia.hsos.completed') },
      zibi: { enrolled: sum('fia.zibi.enrolled'), completed: sum('fia.zibi.completed') }
    },
    baptism: { baptized: sum('baptism.baptized'), awaitingBaptism: sum('baptism.awaitingBaptism') },
    flightShepherds: {
      ym: sum('flightShepherds.ym'),
      yf: sum('flightShepherds.yf'),
      m: sum('flightShepherds.m'),
      w: sum('flightShepherds.w'),
      totalActive: sum('flightShepherds.totalActive')
    },
    evangelismExplosion: { trained: sum('evangelismExplosion.trained'), ongoing: sum('evangelismExplosion.ongoing') }
  }
}
```

### 5.3 National Report Aggregation (Monthly)

**Trigger:** Cron job on last day of month OR national coordinator calls POST /api/reports/national/compile

```typescript
// src/lib/aggregation/national-aggregator.ts

async function compileNationalReport(month: number, year: number): Promise<INationalReport> {

  // Step 1: Get all weeks in the month
  const weeksInMonth = getWeeksInMonth(month, year)
  // Returns array of weekEnding dates (all Sundays in the month)

  // Step 2: Find all submitted zonal reports for all weeks in this month
  const zonalReports = await ZonalReport.find({
    reportingWeek: { $in: weeksInMonth },
    status: { $in: ['submitted', 'approved'] }
  }).lean()

  // Step 3: Aggregate all zonal report fields
  const nationalAggregated = sumAggregatedFields(
    zonalReports.map(r => r.aggregated)
  )

  // Step 4: Compute running total of souls won (cumulative, not just this month)
  const cumulativeSoulsWon = await Soul.countDocuments({
    status: { $in: ['active', 'inactive', 'backslidden', 'sml_certified'] }
  })

  const sevenMillionProgress = {
    currentTotal: cumulativeSoulsWon,
    target: 7_000_000,
    percentage: parseFloat(((cumulativeSoulsWon / 7_000_000) * 100).toFixed(2))
  }

  // Step 5: Count org entities
  const [zonesCount, districtsCount, branchesCount, regionsCount] = await Promise.all([
    Organization.countDocuments({ type: 'zone', isActive: true }),
    Organization.countDocuments({ type: 'district', isActive: true }),
    Organization.countDocuments({ type: 'branch', isActive: true }),
    Organization.countDocuments({ type: 'region', isActive: true })
  ])

  // Step 6: Compute top zones (by souls won)
  const topZonesByMonth = zonalReports
    .reduce((acc: Record<string, number>, r) => {
      const zoneId = r.zoneId.toString()
      acc[zoneId] = (acc[zoneId] ?? 0) + r.aggregated.gowas.soulsWon
      return acc
    }, {})

  const topZones = Object.entries(topZonesByMonth)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([zoneId, soulsWon]) => ({ zoneId: new mongoose.Types.ObjectId(zoneId), soulsWon }))

  // Step 7: Upsert national report
  return NationalReport.findOneAndUpdate(
    { 'period.month': month, 'period.year': year },
    {
      $set: {
        period: { month, year },
        zonesCount, districtsCount, branchesCount, regionsCount,
        aggregated: nationalAggregated,
        sevenMillionProgress,
        topZones,
        compiledAt: new Date(),
        status: 'auto_compiled'
      }
    },
    { upsert: true, new: true }
  )
}
```

### 5.4 Cache Invalidation

When a branch report is submitted, invalidate all upstream caches:

```typescript
// Called at end of POST /api/reports/branch/[id]/submit

async function invalidateUpstreamCaches(branchId: string, weekEnding: Date) {
  const branch = await Organization.findById(branchId).lean()
  if (!branch) return

  const districtId = branch.parentId
  const district = await Organization.findById(districtId).lean()
  const zoneId = district?.parentId

  // Mark district cache as invalidated
  await DistrictReport.updateOne(
    { districtId, reportingWeek: startOfDay(weekEnding) },
    { $set: { invalidatedAt: new Date(), status: 'stale' } }
  )

  // Mark zonal cache as invalidated
  if (zoneId) {
    await ZonalReport.updateOne(
      { zoneId, reportingWeek: startOfDay(weekEnding) },
      { $set: { invalidatedAt: new Date(), status: 'stale' } }
    )
  }

  // National report: mark current month as stale (recompute on next request)
  const month = weekEnding.getMonth() + 1
  const year = weekEnding.getFullYear()
  await NationalReport.updateOne(
    { 'period.month': month, 'period.year': year },
    { $set: { status: 'stale' } }
  )
}
```

### 5.5 Idempotency Guard

All aggregation functions include a check to prevent double-submission:

```typescript
// In POST /api/reports/branch/[id]/submit

const existing = await BranchReport.findOne({
  branchId,
  weekEnding: { $gte: startOfDay(weekEnding), $lte: endOfDay(weekEnding) },
  status: 'submitted'
})
if (existing) {
  return err('Report already submitted for this week', 409)
}
```

---

## 6. KPI Calculation Algorithm

KPI is computed monthly per entity (branch, district, zone). Each metric produces a raw score (0–100) which is then multiplied by its weight to produce the weighted score. Total = sum of all weighted scores (0–100).

### 6.1 Benchmark Values (Configurable in DB)

```typescript
// src/lib/kpi/benchmarks.ts

const BRANCH_BENCHMARKS = {
  soulsWon: {
    target: 80,           // souls won per month to score 100
  },
  retention: {
    target: 0.80,         // 80% retention rate = 100 score
  },
  fiaProgress: {
    target: 1.0,          // 100% of new converts enrolled in Family Class
  },
  baptism: {
    target: 0.30,         // 30% of souls won baptized within month
  },
  flightShepherdSystem: {
    targetRatio: 0.10,    // 1 active shepherd per 10 souls won → 100 score
    targetSubmissionRate: 1.0  // 100% shepherd report submission = 100
  },
  evangelismExplosion: {
    target: 10,           // 10 EE-trained members per month = 100
  },
  hstReadiness: {
    // ready = 100, ongoing = 60, about_to_start = 20, none = 0
  },
  reportingCompliance: {
    target: 1.0,          // submitted on time (not late) = 100
  }
}
```

### 6.2 Per-Metric Calculation

All raw scores are clamped to [0, 100] before weighting.

#### Metric 1: Souls Won (Weight: 30%)

```
rawScore = min(100, (soulsWon / monthlyTarget) × 100)

Where:
  soulsWon     = sum of branch_reports.gowas.soulsWon for all weeks in month
  monthlyTarget = BRANCH_BENCHMARKS.soulsWon.target (default: 80)

weightedScore = rawScore × 0.30
```

**Implementation:**
```typescript
function calcSoulsWonScore(soulsWon: number, target = 80): KpiMetricResult {
  const raw = Math.min(100, Math.round((soulsWon / target) * 100))
  return { raw, weighted: parseFloat((raw * 0.30).toFixed(2)) }
}
```

#### Metric 2: Retention Rate (Weight: 20%)

```
retentionRate = activeConverts / totalAssignedConverts

rawScore = min(100, (retentionRate / targetRetentionRate) × 100)

Where:
  activeConverts      = souls.count({ branchId, status: 'active' })
  totalAssignedConverts = souls.count({ branchId, status: { $in: ['active','inactive','backslidden'] } })
  targetRetentionRate = 0.80 (80%)

weightedScore = rawScore × 0.20
```

**Implementation:**
```typescript
function calcRetentionScore(
  activeConverts: number,
  totalConverts: number,
  targetRate = 0.80
): KpiMetricResult {
  if (totalConverts === 0) return { raw: 0, weighted: 0 }
  const rate = activeConverts / totalConverts
  const raw = Math.min(100, Math.round((rate / targetRate) * 100))
  return { raw, weighted: parseFloat((raw * 0.20).toFixed(2)) }
}
```

#### Metric 3: FIA Progress (Weight: 15%)

```
fiaProgressRate = soulsEnrolledInFamilyClass / newSoulsWonThisMonth

rawScore = min(100, (fiaProgressRate / targetRate) × 100)

Where:
  soulsEnrolledInFamilyClass = sum of branch_reports.fia.familyClass.enrolled for all weeks in month
  newSoulsWonThisMonth       = sum of branch_reports.followUp.newConverts for month
  targetRate                 = 1.0 (100% of new converts should enroll)

weightedScore = rawScore × 0.15

Note: If newSoulsWonThisMonth = 0, assign rawScore = 100 (nothing to enroll)
```

**Implementation:**
```typescript
function calcFiaProgressScore(
  familyClassEnrolled: number,
  newConvertsThisMonth: number
): KpiMetricResult {
  if (newConvertsThisMonth === 0) return { raw: 100, weighted: 15 }
  const rate = familyClassEnrolled / newConvertsThisMonth
  const raw = Math.min(100, Math.round(rate * 100))
  return { raw, weighted: parseFloat((raw * 0.15).toFixed(2)) }
}
```

#### Metric 4: Baptism (Weight: 10%)

```
baptismRate = baptizedThisMonth / soulsWonThisMonth

rawScore = min(100, (baptismRate / targetBaptismRate) × 100)

Where:
  baptizedThisMonth  = sum of branch_reports.baptism.baptized for all weeks in month
  soulsWonThisMonth  = sum of branch_reports.gowas.soulsWon for all weeks in month
  targetBaptismRate  = 0.30 (30%)

weightedScore = rawScore × 0.10

Note: Cap at 100. If soulsWon = 0, score = 100.
```

**Implementation:**
```typescript
function calcBaptismScore(
  baptized: number,
  soulsWon: number,
  targetRate = 0.30
): KpiMetricResult {
  if (soulsWon === 0) return { raw: 100, weighted: 10 }
  const rate = baptized / soulsWon
  const raw = Math.min(100, Math.round((rate / targetRate) * 100))
  return { raw, weighted: parseFloat((raw * 0.10).toFixed(2)) }
}
```

#### Metric 5: Flight Shepherd System (Weight: 10%)

This metric has two sub-components, equally weighted:

```
Component A: Shepherd Submission Rate
  submissionRate = shepherdsSubmitted / totalActiveShepherds
  subScoreA = min(100, submissionRate × 100)

Component B: Shepherd Coverage Adequacy
  idealShepherds = ceil(totalActiveConverts / 10)    // 1 shepherd per 10 converts
  actualShepherds = totalActiveShepherds
  coverageRatio = min(1.0, actualShepherds / idealShepherds)
  subScoreB = coverageRatio × 100

rawScore = (subScoreA + subScoreB) / 2
weightedScore = rawScore × 0.10
```

**Implementation:**
```typescript
function calcShepherdSystemScore(
  shepherdsSubmitted: number,
  totalActiveShepherds: number,
  totalActiveConverts: number
): KpiMetricResult {
  // Sub-score A: Submission compliance
  const submissionRate = totalActiveShepherds === 0 ? 1
    : shepherdsSubmitted / totalActiveShepherds
  const subScoreA = Math.min(100, Math.round(submissionRate * 100))

  // Sub-score B: Coverage adequacy
  const idealShepherds = Math.ceil(totalActiveConverts / 10)
  const coverageRatio = idealShepherds === 0 ? 1
    : Math.min(1, totalActiveShepherds / idealShepherds)
  const subScoreB = Math.round(coverageRatio * 100)

  const raw = Math.round((subScoreA + subScoreB) / 2)
  return { raw, weighted: parseFloat((raw * 0.10).toFixed(2)) }
}
```

#### Metric 6: Evangelism Explosion (Weight: 5%)

```
rawScore = min(100, (eeTrained / targetEeTrained) × 100)

Where:
  eeTrained      = sum of branch_reports.evangelismExplosion.trained for month
  targetEeTrained = 10 (target: 10 new EE-trained members per month)

weightedScore = rawScore × 0.05
```

**Implementation:**
```typescript
function calcEEScore(eeTrained: number, target = 10): KpiMetricResult {
  const raw = Math.min(100, Math.round((eeTrained / target) * 100))
  return { raw, weighted: parseFloat((raw * 0.05).toFixed(2)) }
}
```

#### Metric 7: HST Readiness (Weight: 5%)

```
HST status scoring (per branch — mode/majority for district/zone):
  'ready'          → 100
  'ongoing'        → 60
  'about_to_start' → 20
  null / missing   → 0

For district/zone: average HST score across all branches in scope

weightedScore = rawScore × 0.05
```

**Implementation:**
```typescript
const HST_STATUS_SCORES: Record<string, number> = {
  ready: 100,
  ongoing: 60,
  about_to_start: 20,
}

function calcHSTScore(
  hstStatuses: string[]  // array of HST status strings from all weeks' reports
): KpiMetricResult {
  if (hstStatuses.length === 0) return { raw: 0, weighted: 0 }
  // Use the most recent (last) status for the month
  const latestStatus = hstStatuses[hstStatuses.length - 1]
  const raw = HST_STATUS_SCORES[latestStatus] ?? 0
  return { raw, weighted: parseFloat((raw * 0.05).toFixed(2)) }
}

// For district/zone: average across all branches
function calcHSTScoreAggregate(branchHstStatuses: string[]): KpiMetricResult {
  if (branchHstStatuses.length === 0) return { raw: 0, weighted: 0 }
  const scores = branchHstStatuses.map(s => HST_STATUS_SCORES[s] ?? 0)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const raw = Math.round(avg)
  return { raw, weighted: parseFloat((raw * 0.05).toFixed(2)) }
}
```

#### Metric 8: Reporting Compliance (Weight: 5%)

```
Measures: what % of reports in the month were submitted ON TIME (not late)

complianceRate = onTimeSubmissions / totalExpectedSubmissions

rawScore = min(100, complianceRate × 100)
weightedScore = rawScore × 0.05

Where:
  onTimeSubmissions      = count(branch_reports where isLate = false AND month matches)
  totalExpectedSubmissions = number of active branches × number of reporting weeks in month
```

**Implementation:**
```typescript
function calcComplianceScore(
  onTimeSubmissions: number,
  totalExpected: number
): KpiMetricResult {
  if (totalExpected === 0) return { raw: 100, weighted: 5 }
  const rate = onTimeSubmissions / totalExpected
  const raw = Math.min(100, Math.round(rate * 100))
  return { raw, weighted: parseFloat((raw * 0.05).toFixed(2)) }
}
```

### 6.3 Total KPI Score Assembly

```typescript
// src/lib/kpi/calculator.ts

async function computeBranchKpiScore(
  branchId: string,
  month: number,
  year: number
): Promise<IKpiScore> {

  const weekEndings = getWeeksInMonth(month, year)
  const branchObjectId = new mongoose.Types.ObjectId(branchId)

  // Fetch all branch reports for the month
  const reports = await BranchReport.find({
    branchId: branchObjectId,
    weekEnding: { $in: weekEndings.map(w => ({ $gte: startOfDay(w), $lte: endOfDay(w) })) },
    status: { $in: ['submitted', 'approved'] }
  }).lean()

  // Aggregate monthly totals from reports
  const monthly = {
    soulsWon: reports.reduce((s, r) => s + r.gowas.soulsWon, 0),
    familyClassEnrolled: reports.reduce((s, r) => s + r.fia.familyClass.enrolled, 0),
    newConverts: reports.reduce((s, r) => s + r.followUp.newConverts, 0),
    baptized: reports.reduce((s, r) => s + r.baptism.baptized, 0),
    eeTrained: reports.reduce((s, r) => s + r.evangelismExplosion.trained, 0),
    hstStatuses: reports.map(r => r.hst.status),
    onTimeCount: reports.filter(r => !r.isLate).length,
  }

  // Query live soul counts
  const [activeConverts, totalConverts] = await Promise.all([
    Soul.countDocuments({ branchId: branchObjectId, status: 'active' }),
    Soul.countDocuments({ branchId: branchObjectId, status: { $in: ['active', 'inactive', 'backslidden'] } })
  ])

  // Query shepherd submission data
  const activeShepherds = await User.countDocuments({
    organizationRef: branchObjectId,
    role: 'flight_shepherd',
    isActive: true
  })

  const shepherdSubmissions = await ShepherdReport.countDocuments({
    branchId: branchObjectId,
    weekEnding: { $in: weekEndings.map(w => ({ $gte: startOfDay(w), $lte: endOfDay(w) })) },
    status: 'submitted'
  })

  const totalExpectedReports = weekEndings.length  // 1 report expected per week

  // Compute each metric
  const scores = {
    soulsWon:              calcSoulsWonScore(monthly.soulsWon),
    retention:             calcRetentionScore(activeConverts, totalConverts),
    fiaProgress:           calcFiaProgressScore(monthly.familyClassEnrolled, monthly.newConverts),
    baptism:               calcBaptismScore(monthly.baptized, monthly.soulsWon),
    flightShepherdSystem:  calcShepherdSystemScore(shepherdSubmissions, activeShepherds, totalConverts),
    evangelismExplosion:   calcEEScore(monthly.eeTrained),
    hstReadiness:          calcHSTScore(monthly.hstStatuses),
    reportingCompliance:   calcComplianceScore(monthly.onTimeCount, totalExpectedReports),
  }

  const totalScore = parseFloat(
    Object.values(scores)
      .reduce((sum, s) => sum + s.weighted, 0)
      .toFixed(2)
  )

  // Upsert KPI score
  return KpiScore.findOneAndUpdate(
    { entityId: branchObjectId, entityType: 'branch', 'period.month': month, 'period.year': year },
    {
      $set: {
        entityId: branchObjectId,
        entityType: 'branch',
        period: { month, year },
        scores,
        totalScore,
        computedAt: new Date()
      }
    },
    { upsert: true, new: true }
  )
}
```

### 6.4 District / Zone KPI Score

For district and zone, the KPI score is the **weighted average** of the KPI scores of all their branches/districts respectively:

```typescript
async function computeDistrictKpiScore(
  districtId: string,
  month: number,
  year: number
): Promise<IKpiScore> {

  const branches = await Organization.find({
    type: 'branch',
    parentId: districtId,
    isActive: true
  }).lean()

  // Ensure all branch KPI scores exist (compute if missing)
  const branchScores = await Promise.all(
    branches.map(b => KpiScore.findOne({
      entityId: b._id,
      entityType: 'branch',
      'period.month': month,
      'period.year': year
    }))
  )

  const validScores = branchScores.filter(Boolean) as IKpiScore[]

  if (validScores.length === 0) {
    return KpiScore.findOneAndUpdate(
      { entityId: districtId, entityType: 'district', 'period.month': month, 'period.year': year },
      { $set: { totalScore: 0, scores: {}, period: { month, year }, computedAt: new Date() } },
      { upsert: true, new: true }
    )
  }

  // Average each metric's weighted score across all branches
  const avgScores = averageKpiScores(validScores)

  const totalScore = parseFloat(
    Object.values(avgScores).reduce((sum, s) => sum + s.weighted, 0).toFixed(2)
  )

  return KpiScore.findOneAndUpdate(
    { entityId: districtId, entityType: 'district', 'period.month': month, 'period.year': year },
    { $set: { entityType: 'district', period: { month, year }, scores: avgScores, totalScore, computedAt: new Date() } },
    { upsert: true, new: true }
  )
}
```

---

## 7. Cron Job Schedule

All cron routes are protected by `CRON_SECRET` environment variable check:
```typescript
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return err('Unauthorized', 401)
}
```

### vercel.json Cron Configuration

```json
{
  "crons": [
    { "path": "/api/cron/shepherd-reminder",   "schedule": "0 17 * * 5" },
    { "path": "/api/cron/shepherd-escalation", "schedule": "0 19 * * 6" },
    { "path": "/api/cron/branch-reminder",     "schedule": "0 17 * * 0" },
    { "path": "/api/cron/branch-escalation",   "schedule": "0 20 * * 0" },
    { "path": "/api/cron/district-reminder",   "schedule": "0 17 * * 1" },
    { "path": "/api/cron/zone-reminder",       "schedule": "0 17 * * 2" },
    { "path": "/api/cron/inactivity-check",    "schedule": "0 8 * * 1" },
    { "path": "/api/cron/national-digest",     "schedule": "0 21 * * 0" },
    { "path": "/api/cron/monthly-compile",     "schedule": "0 22 28-31 * *" }
  ]
}
```

> Note: Vercel Cron runs in UTC. Nigeria is UTC+1. All times above are set 1 hour behind local target time (e.g., 17:00 UTC = 18:00 Nigeria). The `monthly-compile` uses `28-31` day range; the job itself checks if it's the last day of the month before executing.

### Cron Job 1: Shepherd Reminder (Friday 18:00 WAT)

```
Path: GET /api/cron/shepherd-reminder
Schedule: 0 17 * * 5 (UTC)

Algorithm:
  1. Compute currentWeekEnding = next Sunday from today
  2. Find all active users with role = 'flight_shepherd'
  3. For each shepherd:
     a. Check if shepherd_report exists WHERE shepherdId = shepherd._id
        AND weekEnding = currentWeekEnding AND status = 'submitted'
     b. If NOT found (outstanding):
        → Create notification { type: 'REPORT_REMINDER', channel: ['whatsapp', 'email'] }
        → Send WhatsApp template: owas_report_reminder
        → Send email: Report Reminder template
        → Mark notification.status = 'sent'
  4. Log to audit_logs: { action: 'CRON_SHEPHERD_REMINDER', entitiesNotified: N }

Idempotency:
  Before sending, check notifications WHERE
    type = 'REPORT_REMINDER'
    AND relatedEntityId = shepherdId
    AND scheduledAt > (today - 1 day)
    AND status = 'sent'
  If found: SKIP (already sent today)
```

### Cron Job 2: Shepherd Escalation (Saturday 20:00 WAT)

```
Path: GET /api/cron/shepherd-escalation
Schedule: 0 19 * * 6 (UTC)

Algorithm:
  1. Find all shepherd reports still outstanding (not submitted) for currentWeek
  2. Group outstanding shepherds by branchId
  3. For each branch with outstanding shepherds:
     a. Find the branch_coordinator user for that branch
     b. Build list: [{ tag, name, phone }] of outstanding shepherds
     c. Send escalation WhatsApp + email to branch_coordinator
     d. Mark outstanding shepherd_report.isLate = true
        (create stub records if none exist)
     e. Create ESCALATION notification record
  4. Log: { action: 'CRON_SHEPHERD_ESCALATION', branchesEscalated: N }

Idempotency:
  Check: notifications WHERE type = 'ESCALATION' AND relatedEntityType = 'branch'
    AND scheduledAt > (today - 1 day) AND status = 'sent'
  If found for a branch: SKIP that branch
```

### Cron Job 3: Branch Reminder (Sunday 18:00 WAT)

```
Path: GET /api/cron/branch-reminder
Schedule: 0 17 * * 0 (UTC)

Algorithm:
  1. Find all branches with NO submitted branch_report for currentWeek
  2. For each outstanding branch:
     a. Find branch_coordinator user
     b. Send REPORT_REMINDER via WhatsApp + email
  3. Log: { action: 'CRON_BRANCH_REMINDER', branchesNotified: N }

Idempotency: same pattern — check for sent REPORT_REMINDER today
```

### Cron Job 4: Branch Escalation (Sunday 21:00 WAT)

```
Path: GET /api/cron/branch-escalation
Schedule: 0 20 * * 0 (UTC)

Algorithm:
  1. Find all branch_reports outstanding for currentWeek
  2. Group by districtId
  3. For each district with outstanding branches:
     a. Build outstanding branch list
     b. Send ESCALATION to district_coordinator
     c. Mark branch_reports.isLate = true for outstanding
  4. Log: { action: 'CRON_BRANCH_ESCALATION', districtsEscalated: N }
```

### Cron Job 5: District Reminder (Monday 18:00 WAT)

```
Path: GET /api/cron/district-reminder
Schedule: 0 17 * * 1 (UTC)

Algorithm:
  1. Find all districts with no submitted district_report for currentWeek
  2. For each outstanding district:
     a. Find district_coordinator user
     b. Send REPORT_REMINDER
  3. Log
```

### Cron Job 6: Zone Reminder (Tuesday 18:00 WAT)

```
Path: GET /api/cron/zone-reminder
Schedule: 0 17 * * 2 (UTC)

Algorithm:
  1. Find all zones with no submitted zonal_report for currentWeek
  2. For each outstanding zone: notify zonal_coordinator
  3. Also: if any district is still outstanding → send ESCALATION to zonal_coordinator
  4. Log
```

### Cron Job 7: Monthly Compile (Last Day of Month, 23:00 WAT)

```
Path: GET /api/cron/monthly-compile
Schedule: 0 22 28-31 * * (UTC)

Algorithm:
  1. GUARD: Check if today is last day of month.
     If not: return 200 with { skipped: true, reason: 'not last day' }

  2. Get current month/year
  
  3. Compute KPI scores for ALL branches (parallelized in batches of 50):
     await Promise.allSettled(branches.map(b => computeBranchKpiScore(b._id, month, year)))
  
  4. Compute KPI scores for ALL districts:
     await Promise.allSettled(districts.map(d => computeDistrictKpiScore(d._id, month, year)))
  
  5. Compute KPI scores for ALL zones:
     await Promise.allSettled(zones.map(z => computeZoneKpiScore(z._id, month, year)))
  
  6. Compile national report:
     await compileNationalReport(month, year)
  
  7. Compute rank within each parent group:
     For each branch: rank among siblings in same district
     For each district: rank among siblings in same zone
     For each zone: rank nationally
     → Update kpi_scores.rank for all entities
  
  8. Distribute KPI scorecards:
     → Email each branch_coordinator their branch KPI scorecard
     → Email each district_coordinator their district scorecard + top-3 branches
     → Email each zonal_coordinator their zone scorecard + top-3 districts
     → Email national_coordinator full national scorecard
  
  9. Send national digest to national desk
  
  10. Log: { action: 'CRON_MONTHLY_COMPILE', month, year, entitiesProcessed: N }

Idempotency:
  Check: NationalReport WHERE period.month = month AND period.year = year
    AND status != 'stale'
  If found and status = 'auto_compiled': SKIP recompute (already done today)
  Allow re-trigger only if super_admin manually POSTs /api/reports/national/compile
```

### Cron Job 8: Convert Inactivity Check (Monday 09:00 WAT)

```
Path: GET /api/cron/inactivity-check
Schedule: 0 8 * * 1 (UTC)

Algorithm:
  1. Query souls WHERE:
     status = 'active'
     AND lastContactDate < (now - 14 days)
  
  2. For each inactive soul:
     a. Update soul.status = 'inactive'
     b. Create CONVERT_INACTIVE notification:
        → To: soul.assignedShepherdId (WhatsApp + email)
        → To: branch.coordinatorId (in-app + email)
     c. Send notifications
  
  3. Log: { action: 'CRON_INACTIVITY_CHECK', soulsMarkedInactive: N }

Idempotency:
  Souls are only updated if status = 'active' AND lastContactDate threshold met.
  Re-running only creates duplicate notifications if the soul is STILL inactive.
  Guard: check notifications WHERE type = 'CONVERT_INACTIVE' AND relatedEntityId = soulId
    AND createdAt > (today - 1 day). Skip if found.
```

### Cron Job 9: National Digest (Sunday 22:00 WAT)

```
Path: GET /api/cron/national-digest
Schedule: 0 21 * * 0 (UTC)

Algorithm:
  1. Compute this week's national summary:
     → Total souls won this week (all submitted branch reports)
     → Total branches reported vs total branches
     → Total shepherd reports submitted
     → Top zone this week
     → Any CONVERT_INACTIVE alerts fired this week
  
  2. Send digest email to:
     → All users with role = 'national_coordinator'
     → All users with role = 'super_admin'
  
  3. Log: { action: 'CRON_NATIONAL_DIGEST' }
```

---

## 8. WhatsApp Bot State Machine

### States

```
IDLE              → User has no active session. Any message starts detection flow.
GREETING_SENT     → Bot has sent the greeting + quick-reply menu
AWAITING_CHOICE   → Waiting for user to select an action (report / query / help)
REPORT_INITIATED  → User selected "Submit Weekly Report"; bot sent the format prompt
REPORT_SUBMITTED  → User sent report data; bot is parsing
REPORT_CONFIRMED  → Report parsed OK; bot sent confirmation
REPORT_ERROR      → Report had validation error; bot sent error with correction prompt
QUERY_ACTIVE      → User selected "Check Converts"; bot sent convert list
AWAITING_STATUS_UPDATE → User selected a convert number to update; bot waiting for new status
SESSION_EXPIRED   → Session older than 24 hours; any message restarts from IDLE
UNKNOWN_NUMBER    → Sender not found in users collection; onboarding message sent
```

### State Transition Diagram

```
Inbound message arrives
        │
        ▼
  ┌─── Look up user by phone ──────────────────────────────────────────┐
  │    Not found                                                        │
  │         ↓                                                          │
  │    [UNKNOWN_NUMBER] → Send onboarding message → END                │
  └────────────────────────────────────────────────────────────────────┘
        │ Found
        ▼
  ┌─── Get/Create session ─────────────────────────────────────────────┐
  │    Session expired (> 24hr)                                         │
  │         ↓                                                          │
  │    Reset to IDLE → proceed as new session                          │
  └────────────────────────────────────────────────────────────────────┘
        │
        ▼ current state
  ═══ IDLE ═══════════════════════════════════════
  Any message → Send greeting with 3 quick-reply buttons
              → Transition to GREETING_SENT
  
  ═══ GREETING_SENT / AWAITING_CHOICE ════════════
  Button: "Submit Weekly Report"  → Send report format prompt
                                  → Transition to REPORT_INITIATED
  Button: "Check My Converts"     → Fetch convert list, send
                                  → Transition to QUERY_ACTIVE
  Button: "Help"                  → Send help message
                                  → Transition to IDLE
  Text: anything else             → Re-send menu
  
  ═══ REPORT_INITIATED ═══════════════════════════
  Text message received           → parseShepherdReport(text)
                                  → If fields missing: send format error
                                    → Stay in REPORT_INITIATED
                                  → If all fields present:
                                    → validate(active + inactive = assigned)
                                    → If invalid: send validation error + hint
                                      → Transition to REPORT_ERROR
                                    → If valid:
                                      → createShepherdReport(data)
                                      → Send confirmation
                                      → Transition to REPORT_CONFIRMED

  ═══ REPORT_ERROR ════════════════════════════════
  User sends corrected message    → re-run parse + validate
                                  → Same as REPORT_INITIATED branching
  User sends "CANCEL"             → Transition to IDLE

  ═══ REPORT_CONFIRMED ════════════════════════════
  Any message                     → "Your report is already submitted this week.
                                    Send HELP for options." → IDLE

  ═══ QUERY_ACTIVE ════════════════════════════════
  Text: digit (1-N)               → User selected a convert
                                  → Send status options: "Reply:
                                    1 = Active, 2 = Inactive, 3 = Backslidden"
                                  → Transition to AWAITING_STATUS_UPDATE
                                    with context.selectedSoulIndex = N
  Text: "BACK" or "MENU"          → Send greeting → GREETING_SENT
  
  ═══ AWAITING_STATUS_UPDATE ══════════════════════
  Text: "1"                       → Update soul.status = 'active', log contact
                                  → Send "Updated ✅" → QUERY_ACTIVE (refresh list)
  Text: "2"                       → Update soul.status = 'inactive'
                                  → Send "Updated ✅" → QUERY_ACTIVE
  Text: "3"                       → Update soul.status = 'backslidden'
                                  → Send "Updated ✅" → QUERY_ACTIVE
  Text: "BACK"                    → Show convert list → QUERY_ACTIVE
  Other                           → "Invalid. Reply 1, 2, 3, or BACK"
```

### Session Store Schema

```typescript
// Stored in memory Map AND backed to MongoDB for persistence across serverless cold starts

interface WaBotSession {
  phone: string            // E.164 format
  userId: string           // MongoDB ObjectId string
  userRole: UserRole
  state: WaBotState
  context: {
    weekEnding?: string          // ISO date for current report
    reportData?: Record<string, number | string>  // in-progress parse
    convertListIds?: string[]    // soul IDs shown in current list
    selectedSoulIndex?: number   // 1-based index
    lastActivity: string         // ISO timestamp
  }
  createdAt: string        // ISO timestamp
}

// Key: phone number
// TTL: 24 hours from lastActivity
// Cleanup: on every webhook call, delete sessions older than 24 hours
```

### Branch Coordinator Quick-Reply Flow

When user.role = `branch_coordinator`:

```
IDLE
  ↓ Any message
  "Hello {name}! What would you like to check?"
  [Branch Status] [Submit Branch Report] [Help]

AWAITING_CHOICE
  → "Branch Status" → Query outstanding shepherds + branch report status → Send STATUS message
  → "Submit Branch Report" → Direct to web dashboard (branch reports too complex for WhatsApp)
    → "Branch reports must be submitted via the web dashboard: {link}"
  → "Help" → Help message
```

---

## 9. Shepherd Tag Algorithm

### Rules

1. Tags are assigned per branch per demographic group
2. Tag numbers are sequential and permanent — they do not reset
3. When a soul is added, they are assigned to the next available shepherd in their demographic group
4. "Next available" means: the shepherd in that group whose assigned souls count is lowest (round-robin load balancing)
5. If no shepherd exists in a group, the soul is placed in an "unassigned" pool and the branch coordinator is alerted

### Demographic Group Mapping

```typescript
// src/lib/tag-assignment.ts

function getDemographicGroup(gender: 'male' | 'female', ageGroup: 'youth' | 'adult'): ShepherdCategory {
  if (gender === 'male' && ageGroup === 'youth')   return 'YM'
  if (gender === 'female' && ageGroup === 'youth') return 'YF'
  if (gender === 'male' && ageGroup === 'adult')   return 'M'
  if (gender === 'female' && ageGroup === 'adult') return 'W'
  throw new Error(`Invalid demographic: ${gender}/${ageGroup}`)
}
```

### Tag Generation (New Shepherd Created)

```typescript
async function generateShepherdTag(
  branchId: string,
  category: 'YM' | 'YF' | 'M' | 'W'
): Promise<string> {

  // Find highest tag number currently used in this branch+category
  const existingShepherds = await User.find({
    organizationRef: branchId,
    role: 'flight_shepherd',
    shepherdCategory: category
    // Include inactive/deactivated — tags are permanent
  }).select('shepherdTag').lean()

  const maxTagNumber = existingShepherds.reduce((max, s) => {
    const match = s.shepherdTag?.match(/^(?:YM|YF|M|W)-Tag(\d+)$/)
    const num = match ? parseInt(match[1]) : 0
    return Math.max(max, num)
  }, 0)

  const nextNumber = maxTagNumber + 1
  return `${category}-Tag${nextNumber}`
  // Examples: YM-Tag1, YF-Tag5, M-Tag12, W-Tag3
}
```

### Convert Assignment (New Soul Created)

```typescript
async function assignSoulToShepherd(
  soulId: string,
  branchId: string,
  gender: 'male' | 'female',
  ageGroup: 'youth' | 'adult'
): Promise<{ shepherdId: string; shepherdTag: string } | null> {

  const category = getDemographicGroup(gender, ageGroup)

  // Find all ACTIVE shepherds in this branch for this demographic
  const eligibleShepherds = await User.find({
    organizationRef: branchId,
    role: 'flight_shepherd',
    shepherdCategory: category,
    isActive: true
  }).select('_id shepherdTag').lean()

  if (eligibleShepherds.length === 0) {
    // No shepherd available — alert branch coordinator
    await createInAppAlert(branchId, `No active ${category} shepherd available for new soul assignment.`)
    return null
  }

  // Count current assigned souls per shepherd in this group
  const soulCounts = await Promise.all(
    eligibleShepherds.map(async (shepherd) => {
      const count = await Soul.countDocuments({
        assignedShepherdId: shepherd._id,
        status: { $in: ['new', 'active', 'inactive'] }
        // Don't count backslidden or sml_certified
      })
      return { shepherd, count }
    })
  )

  // Sort by count ascending (load balance: least-loaded first)
  soulCounts.sort((a, b) => a.count - b.count)
  const assignedShepherd = soulCounts[0].shepherd

  // Update soul record
  await Soul.findByIdAndUpdate(soulId, {
    $set: {
      assignedShepherdId: assignedShepherd._id,
      shepherdTag: assignedShepherd.shepherdTag,
      assignmentDate: new Date(),
      status: 'active'
    }
  })

  // Notify the shepherd
  await createNotification({
    recipientId: assignedShepherd._id.toString(),
    type: 'CONVERT_ASSIGNED',
    channel: ['whatsapp', 'in_app'],
    title: 'New Convert Assigned',
    body: `A new convert has been assigned to you (${assignedShepherd.shepherdTag}). Please contact them within 48 hours.`,
    relatedEntityId: soulId,
    relatedEntityType: 'soul'
  })

  return {
    shepherdId: assignedShepherd._id.toString(),
    shepherdTag: assignedShepherd.shepherdTag!
  }
}
```

### Reassignment (Shepherd Deactivated)

```typescript
async function reassignShepherdsConverts(
  deactivatedShepherdId: string,
  branchId: string
): Promise<void> {

  // Get all active souls assigned to this shepherd
  const soulsToReassign = await Soul.find({
    assignedShepherdId: deactivatedShepherdId,
    status: { $in: ['new', 'active', 'inactive'] }
  }).lean()

  for (const soul of soulsToReassign) {
    // Re-run assignment algorithm (will skip deactivated shepherd)
    const result = await assignSoulToShepherd(
      soul._id.toString(),
      branchId,
      soul.gender as 'male' | 'female',
      soul.ageGroup as 'youth' | 'adult'
    )

    if (result) {
      // Log the reassignment in soul notes
      await Soul.findByIdAndUpdate(soul._id, {
        $push: {
          notes: {
            text: `Reassigned from ${soul.shepherdTag} to ${result.shepherdTag} due to shepherd deactivation.`,
            createdBy: 'system',
            createdAt: new Date()
          }
        }
      })
    }
  }
}
```

### Tag Persistence Guarantee

Tags are NEVER renumbered or reused. Even if a shepherd is deactivated:
- Their tag remains in the database
- The next new shepherd gets the next sequential number
- This ensures historical reports referencing e.g. "YM-Tag4" always refer to the same person

---

## 10. Risk Log

### Risk 1: MongoDB Performance at Scale (High Probability / High Impact)

**Description:** With 7,000 branches × 4 shepherds average = 28,000 shepherd users, and weekly reports over years, the `shepherd_reports` and `soul` collections will grow to tens of millions of documents. Aggregation pipelines running without indexes will time out.

**Mitigation:**
- Enforce compound indexes on every collection at startup (see Phase 1A)
- Use MongoDB `$match` early in all aggregation pipelines to leverage indexes
- Set `explain()` on all aggregation pipelines during development to verify index use
- For national-level analytics: use pre-compiled `district_reports` and `zonal_reports` — never aggregate raw `branch_reports` for national view
- Set Read Preference to `secondaryPreferred` for read-heavy aggregations
- Add index on `souls.lastContactDate` specifically for inactivity cron query

### Risk 2: WhatsApp Report Parsing Failures (Medium Probability / High Impact)

**Description:** Flight shepherds may not follow the exact message format, causing the regex parser to return null values. A failed parse could silently drop data or block weekly reporting for that shepherd.

**Mitigation:**
- Parser must identify which fields are missing/incorrect and list them in the error reply
- Implement fuzzy matching as fallback: detect numbers near keywords even if format is off
- Always provide the exact expected format in the error reply
- Keep a `wa_parse_failures` log in audit_logs for analysis
- Fallback: if 3 parse attempts fail, bot redirects user to the web form URL
- Test with 50+ real-world format variations before launch

### Risk 3: Duplicate Report Submissions (Medium Probability / High Impact)

**Description:** Network retries, double-taps on the submit button, or WhatsApp webhook retries could create duplicate `shepherd_report` or `branch_report` documents, inflating soul counts.

**Mitigation:**
- Unique compound indexes on `(shepherdId, weekEnding)` and `(branchId, weekEnding)` prevent DB-level duplicates
- API idempotency check: return 409 with existing record if duplicate detected
- Frontend: disable submit button immediately on click, show spinner
- WhatsApp webhook: process each message once using Meta's `message_id` deduplication (store processed IDs in a 24hr TTL cache)
- Test with concurrent submission attempts in integration tests

### Risk 4: Vercel Cron Timeout for Monthly KPI Compute (Medium Probability / High Impact)

**Description:** The last-day-of-month cron must compute KPI scores for potentially 7,000 branches. Each computation involves multiple DB queries. At 100ms per branch, this would take 700 seconds — far exceeding Vercel's 10-second serverless function timeout.

**Mitigation:**
- Process branches in batches using a queue pattern: the cron job creates a work queue in MongoDB (`kpi_jobs` collection), then a separate background process drains the queue
- Alternative: use Vercel's Fluid Compute (up to 800s execution) or edge runtime for the monthly job
- Pre-aggregate branch monthly data during the month (maintain running totals in `branch_monthly_stats` collection, updated on each branch report submission)
- Use this pre-aggregated data for KPI compute — reduces per-branch compute to a single read + calculation
- Test with 500 branches in staging before launch

### Risk 5: WhatsApp Template Rejection by Meta (Medium Probability / Medium Impact)

**Description:** Meta can reject message templates for policy violations, delaying the notification system launch. Template approval takes 1-3 business days and can be rejected for vague reasons.

**Mitigation:**
- Submit all 4 templates (reminder, overdue, convert_inactive, sml_certified) at project start (Phase 1) not Phase 4
- Draft templates that are clearly utility messages with no promotional language
- Have backup email-only notification mode ready for launch if WA templates are pending
- Keep template language factual and context-specific (include report name, date, link)

### Risk 6: Session Management for WhatsApp Bot Under Load (Low Probability / High Impact)

**Description:** The bot conversation state is stored in-memory on serverless functions. Vercel may spin up multiple instances, each with different in-memory state, causing bot conversations to reset mid-flow.

**Mitigation:**
- Store ALL session state in MongoDB `wa_sessions` collection (TTL indexed)
- In-memory Map is only a cache — always read from MongoDB first, write to both
- Keep sessions lean (< 1KB per session) for fast DB round-trips
- Session TTL: 24 hours from last activity (automatically cleaned up by MongoDB TTL index)
- Test concurrent sessions in load testing before launch

### Risk 7: Report Unlock/Edit Process (Low Probability / High Impact)

**Description:** Once a report is submitted it's locked. If a branch coordinator enters wrong data (e.g., soulsWon = 150 instead of 15), there's no self-correction mechanism. This could cascade bad numbers up through district, zone, and national reports.

**Mitigation:**
- Only super_admin can unlock a report via `/api/admin/reports/[id]/unlock`
- Unlock requires a reason field (logged to audit_log)
- After unlock, re-submission by original coordinator required (cannot be edited by admin)
- After re-submission: automatically re-trigger aggregation invalidation upward
- Add a "flag for review" option so coordinators can request unlocks from the UI
- Upstream cached reports are automatically marked stale when source branch report changes

### Risk 8: Data Scope Breach (IDOR) (Low Probability / Critical Impact)

**Description:** A flight shepherd making API calls with modified IDs could access another shepherd's converts or a branch coordinator could access another district's data.

**Mitigation:**
- All API handlers enforce scope checks AFTER authentication:
  ```
  if (session.role === 'flight_shepherd' && soul.assignedShepherdId !== session.userId) → 403
  if (session.role === 'branch_coordinator' && branch.coordinatorId !== session.userId) → 403
  ```
- Never rely on client-provided `branchId` or `districtId` for scope — always derive from session
- Use `organizationId` in session JWT (set at login, signed) — never from request body
- Penetration test IDOR for all 10 roles across all entity types (Phase 5D)
- Add scope assertions as reusable middleware: `assertScopeOwnership(session, entityType, entityId)`

### Risk 9: Email Deliverability (Low Probability / Medium Impact)

**Description:** Nodemailer via Gmail SMTP may have sending limits (500/day for regular Gmail, 2000/day for Workspace). A weekly cron to 28,000 shepherds would immediately exceed this.

**Mitigation:**
- Use Gmail SMTP only for low-volume emails: individual reports, password resets, certificates
- For bulk cron notifications (weekly reminders to all shepherds): use SendGrid API or Mailgun
- Structure Nodemailer config with a transport abstraction so the SMTP provider can be swapped
- Set sending rate limits: max 100 emails/minute, batch with 100ms delay between batches
- Monitor bounce rates; soft-bounce → retry, hard-bounce → deactivate email in user profile

### Risk 10: Self-Hosted MongoDB VPS Downtime (Low Probability / Critical Impact)

**Description:** The project uses a self-hosted VPS MongoDB (not Atlas). Hardware failure or VPS provider issues will take down the entire platform.

**Mitigation:**
- Configure MongoDB as a replica set (at minimum: primary + 1 secondary on separate VPS)
- Set up daily mongodump backups to a separate cloud storage (S3 or Cloudinary)
- Implement health-check endpoint `/api/health` that checks DB connection — expose to uptime monitor
- Configure Mongoose connection retry logic in `src/lib/db.ts`: `{ serverSelectionTimeoutMS: 5000, retryWrites: true }`
- Document failover runbook: how to promote secondary to primary in `docs/ops-runbook.md`
- Consider MongoDB Atlas migration for production launch (stronger SLA than self-hosted VPS)
- Maintain a `.env.local` with Atlas connection string as emergency fallback

---

## Appendix A: Environment Variables Reference

```env
# NextAuth.js
NEXTAUTH_URL=https://owas.lff.org
NEXTAUTH_SECRET=<random-256bit>

# MongoDB
MONGODB_URI=mongodb://user:pass@vps-host:27017/owas?authSource=admin&replicaSet=rs0

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=owas@lff.org
SMTP_PASS=<app-password>
EMAIL_FROM="OWAS Platform <owas@lff.org>"

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=<from-meta-dashboard>
WHATSAPP_ACCESS_TOKEN=<cloud-api-token>
WHATSAPP_VERIFY_TOKEN=<random-string>
WHATSAPP_APP_SECRET=<for-signature-verification>

# File Storage
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# Cron Security
CRON_SECRET=<random-256bit>

# App Config
NEXT_PUBLIC_APP_URL=https://owas.lff.org
SEVEN_MILLION_TARGET=7000000
```

---

## Appendix B: Key Decisions & Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Aggregation pattern | On-read with write-through cache | District coordinators never re-enter data; cache prevents repeated expensive queries |
| WhatsApp state | MongoDB-backed sessions | Survives serverless cold starts and multi-instance deployments |
| Shepherd tag persistence | Never reset, always sequential | Historical reports remain accurate; no ambiguity in who "YM-Tag4" refers to |
| KPI at district/zone | Average of children's scores | More fair than re-computing from raw data; rewards consistent branch performance |
| Report lock policy | Locked on submit, super_admin unlock only | Prevents retroactive data manipulation; maintains audit trail integrity |
| Soul assignment | Round-robin by load (fewest assigned) | Prevents any one shepherd being overwhelmed; ensures equitable distribution |
| Monthly KPI cron | Pre-aggregated running totals | Avoids timeout issues with large-scale real-time aggregation on Vercel |
| Email provider | Nodemailer + SendGrid for bulk | Gmail for low-volume; SendGrid for weekly mass notifications |

---

*End of Implementation Plan*  
*Next Step: Schema & API Agent → implement all models, schemas, and API routes per this plan.*

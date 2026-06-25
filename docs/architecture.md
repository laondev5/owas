# System Architecture — HARPAZO-OWAS Platform

## Overview

A monolithic Next.js 14 App Router application with a MongoDB backend, deployed on Vercel.
Data flows upward through 5 organizational levels via an aggregation-on-write pattern.
WhatsApp is an input channel via webhooks. Email notifications via Nodemailer.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Next.js App Router (React Server Components + Client Islands)  │
│  Zustand (client state) │ React Query (server state/caching)    │
│  shadcn/ui + Tailwind CSS │ Recharts (data visualization)       │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP / RSC Streaming
┌────────────────────▼────────────────────────────────────────────┐
│                      API LAYER                                  │
│              Next.js API Routes (App Router)                    │
│  /api/auth       /api/reports     /api/souls      /api/users    │
│  /api/branches   /api/districts   /api/zones      /api/national │
│  /api/kpi        /api/whatsapp    /api/notif      /api/certs    │
└──────────┬──────────────┬──────────────────┬────────────────────┘
           │              │                  │
┌──────────▼──┐  ┌────────▼──────┐  ┌───────▼────────────────────┐
│  MongoDB    │  │  Nodemailer   │  │  WhatsApp Business API     │
│  Atlas      │  │  (SMTP/SG)    │  │  (Meta Cloud API)          │
│             │  │               │  │  Webhook: /api/whatsapp     │
│  Mongoose   │  │  Email Notif  │  │  Outbound: reminders/alerts │
│  ODM        │  │  + Templates  │  │  Inbound: report parsing    │
└─────────────┘  └───────────────┘  └────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  Cloudinary / S3 (cert storage)  │  Vercel Cron (scheduled jobs)│
│  NextAuth.js v5 (JWT sessions)   │  Zod (shared validation)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Architecture

### Core MongoDB Collections

#### 1. `users`
```js
{
  _id, name, email, phone, passwordHash,
  role: enum[super_admin, national_coordinator, zonal_coordinator,
             district_coordinator, branch_coordinator, chief_trainer,
             mission_field_coordinator, flight_shepherd, viewer],
  organizationRef: ObjectId,  // branch/district/zone/national
  organizationLevel: enum[national, zone, district, branch],
  shepherdTag: String,         // e.g., "YM-Tag3" (flight shepherds only)
  shepherdCategory: enum[YM, YF, M, W],
  isActive: Boolean,
  whatsappPhone: String,       // registered WA number for bot
  createdAt, updatedAt
}
```

#### 2. `organizations` (hierarchical, single collection)
```js
{
  _id, name, code, type: enum[national, region, zone, district, branch],
  parentId: ObjectId,
  coordinatorId: ObjectId,     // ref to users
  region: String,
  isActive: Boolean,
  createdAt, updatedAt
}
```

#### 3. `souls` (converts)
```js
{
  _id, fullName, phone, gender, ageGroup: enum[youth, adult],
  branchId: ObjectId,
  dateWon: Date,
  outreachType: enum[GOWAS, personal, crusade],
  assignedShepherdId: ObjectId,
  shepherdTag: String,         // e.g., "YM-Tag3"
  assignmentDate: Date,
  status: enum[new, active, inactive, backslidden, sml_certified],
  lastContactDate: Date,
  integrationStage: {
    familyClassEnrolled: Date,
    familyClassCompleted: Date,
    responsibilityClassEnrolled: Date,
    responsibilityClassCompleted: Date,
    sortingOutEnrolled: Date, sortingOutCompleted: Date,
    hsosEnrolled: Date, hsosCompleted: Date,
    zibiEnrolled: Date, zibiCompleted: Date,
    sip101Enrolled: Date, sip101Completed: Date,
    sip102Enrolled: Date, sip102Completed: Date,
    sip103Enrolled: Date, sip103Completed: Date,
    projectCompleted: Date,
    smlCertifiedDate: Date,
    certificateUrl: String
  },
  isBaptized: Boolean,
  baptismDate: Date,
  cellConnected: Boolean,
  workforceConnected: Boolean,
  notes: [{ text, createdBy, createdAt }],
  createdAt, updatedAt
}
```

#### 4. `shepherd_reports` (Level 1)
```js
{
  _id, shepherdId: ObjectId, branchId: ObjectId,
  weekStarting: Date, weekEnding: Date,
  assignedSouls: Number, activeSouls: Number, inactiveSouls: Number,
  newConvertsAssigned: Number,
  familyClassEnrolled: Number, responsibilityClassEnrolled: Number,
  cellConnected: Number, workforceConnected: Number,
  challenges: String, prayerRequests: String,
  submissionMethod: enum[web, whatsapp],
  submittedAt: Date, isLate: Boolean,
  status: enum[draft, submitted]
}
```

#### 5. `branch_reports` (Level 2)
```js
{
  _id, branchId: ObjectId, districtId: ObjectId, zoneId: ObjectId,
  weekEnding: Date,
  gowas: { participants, soulsReached, soulsWon, firstTimers },
  followUp: { newConverts, assignedToShepherds, active, inactive },
  fia: {
    familyClass: { enrolled, completed },
    responsibilityClass: { enrolled, completed },
    sortingOut: { enrolled, completed },
    hsos: { enrolled, completed },
    zibi: { enrolled, completed }
  },
  baptism: { baptized, awaitingBaptism },
  flightShepherds: { ym, yf, m, w, totalActive, trainingStatus },
  evangelismExplosion: { trained, ongoing },
  hst: { status: enum[ready, ongoing, about_to_start] },
  testimonies: String, challenges: String,
  submittedBy: ObjectId, submittedAt: Date, isLate: Boolean,
  status: enum[draft, submitted, approved]
}
```

#### 6. `district_reports` (Level 3 — auto-aggregated)
```js
{
  _id, districtId, zoneId,
  reportingWeek: Date,
  branchesReporting: Number, branchesOutstanding: Number,
  aggregated: { /* same structure as branch_reports, summed */ },
  topBranches: [{ branchId, score }],
  submittedBy, submittedAt, isLate,
  status: enum[auto_compiled, submitted, approved]
}
```

#### 7. `zonal_reports` (Level 4 — auto-aggregated)
```js
{
  _id, zoneId,
  reportingWeek: Date,
  districtsReporting, districtsOutstanding,
  aggregated: { /* summed */ },
  topDistricts: [{ districtId, score }],
  submittedBy, submittedAt, isLate,
  status
}
```

#### 8. `national_reports` (Level 5 — auto-aggregated)
```js
{
  _id, reportingPeriod: { month, year },
  zonesCount, districtsCount, branchesCount, regionsCount,
  aggregated: { /* summed */ },
  sevenMillionProgress: { currentTotal, target: 7000000, percentage },
  topZones: [{ zoneId, score }],
  testimonies: String, recommendations: String,
  compiledBy: ObjectId, compiledAt: Date
}
```

#### 9. `kpi_scores`
```js
{
  _id, entityId: ObjectId, entityType: enum[branch, district, zone],
  period: { month, year },
  scores: {
    soulsWon: { raw, weighted },        // 30%
    retention: { raw, weighted },        // 20%
    fiaProgress: { raw, weighted },      // 15%
    baptism: { raw, weighted },          // 10%
    flightShepherdSystem: { raw, weighted }, // 10%
    evangelismExplosion: { raw, weighted },  // 5%
    hstReadiness: { raw, weighted },         // 5%
    reportingCompliance: { raw, weighted }   // 5%
  },
  totalScore: Number,  // 0-100
  rank: Number,
  createdAt
}
```

#### 10. `notifications`
```js
{
  _id, recipientId: ObjectId, recipientPhone: String,
  type: enum[report_reminder, report_overdue, convert_inactive,
             sml_certified, kpi_published, escalation, digest],
  channel: enum[email, whatsapp, in_app],
  title, body,
  relatedEntityId: ObjectId, relatedEntityType: String,
  status: enum[pending, sent, failed, read],
  scheduledAt: Date, sentAt: Date,
  retryCount: Number
}
```

#### 11. `audit_logs`
```js
{
  _id, userId, action, entityType, entityId,
  before: Object, after: Object,
  ipAddress, userAgent, timestamp
}
```

---

## Aggregation Strategy

**Pattern: Aggregation-on-Read with Cache**

When a District Coordinator views their report:
1. Query all `branch_reports` for that district + week
2. Sum numerical fields via MongoDB `$group` aggregation pipeline
3. Cache result in a `district_reports` document (invalidated on new branch submission)
4. District coordinator can "submit" the cached aggregate (which locks it)

This means:
- District coordinators NEVER re-enter branch data
- Zonal coordinators NEVER re-enter district data
- National reports are always computed from source data

---

## Authentication Flow

```
User → Login Form → POST /api/auth/signin
  → NextAuth.js credentials provider
  → bcrypt.compare(password, hash)
  → JWT session with { userId, role, organizationId, organizationLevel }
  → All API routes check session + role via withAuth() middleware wrapper
```

---

## Role-Based Route Guard

```
middleware.ts intercepts:
  /dashboard/*      → require any authenticated session
  /api/reports/national/* → require national_coordinator | super_admin
  /api/reports/zone/*     → require zonal_coordinator | above
  /api/reports/district/* → require district_coordinator | above
  /api/reports/branch/*   → require branch_coordinator | chief_trainer | above
  /api/shepherds/*        → require flight_shepherd | branch_coordinator | above
  /api/admin/*            → require super_admin
```

---

## WhatsApp Webhook Flow

```
Meta WhatsApp Cloud API
  → POST /api/whatsapp/webhook
    → Verify webhook signature (X-Hub-Signature-256)
    → Parse message type (text / interactive / template)
    → Identify sender by phone → match to users.whatsappPhone
    → Detect report type by message prefix / button selection
    → Parse structured fields using regex / NLP
    → Validate against Zod schema
    → Create shepherd_report or branch_report document
    → Send WhatsApp confirmation back via REST API
    → If validation fails → send error message with format guide
```

---

## Notification Pipeline

```
Vercel Cron Jobs (cron schedule):
  Friday 6pm  → remind flight shepherds to submit
  Saturday 8pm → escalate unreported flight shepherds to branch coordinator
  Sunday 6pm  → remind branch coordinators
  Sunday 9pm  → escalate unreported branches to district
  Monday 6pm  → remind district coordinators
  Tuesday 6pm → remind zonal coordinators
  Last day of month → compile national report, distribute KPI scorecards

Each job:
  → Query overdue entities
  → Create notification records (channel: email | whatsapp)
  → Send via Nodemailer (email) or WhatsApp Cloud API (WA)
  → Update notification.status = 'sent' | 'failed'
  → Log to audit_logs
```

---

## Deployment Architecture

```
Vercel (Edge Network)
  ├── Next.js App (SSR + RSC)
  ├── API Routes (serverless functions)
  └── Cron Jobs (Vercel Cron)

MongoDB Atlas (M10+ cluster)
  ├── Primary replica set
  ├── Indexes: branchId+weekEnding, status, shepherdId
  └── Atlas Search (for convert name lookup)

Cloudinary
  └── SML certificates (PDF/image)

Meta WhatsApp Business API
  └── Webhook endpoint on Vercel

SendGrid / Gmail SMTP
  └── Via Nodemailer
```

---

## Additional Recommended Packages

| Package | Purpose |
|---------|---------|
| `next-auth` v5 | Authentication |
| `mongoose` | MongoDB ODM |
| `zod` | Schema validation (client + server) |
| `zustand` | Client state management |
| `@tanstack/react-query` | Server state, caching, background refresh |
| `nodemailer` | Email sending |
| `@react-pdf/renderer` | PDF certificate and report generation |
| `recharts` | Charts and dashboards |
| `shadcn/ui` | UI component system |
| `tailwindcss` | Styling |
| `pino` | Structured logging |
| `bcryptjs` | Password hashing |
| `date-fns` | Date utilities |
| `xlsx` | Excel export |
| `react-hook-form` | Form management |
| `vitest` | Unit testing |
| `@testing-library/react` | Component testing |
| `playwright` | E2E testing |
| `uploadthing` or `cloudinary` | File/cert upload |

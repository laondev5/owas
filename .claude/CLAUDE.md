# CLAUDE.md — OWAS Platform (LFF)

## Project Overview
This is the **HARPAZO-OWAS National Reporting & Management Platform** for Living Faith Foundation (LFF).
It digitizes the Operation Win A Soul (OWAS) system — a structured evangelism, discipleship, and soul-tracking
platform serving a 5-level organizational hierarchy: Flight Shepherd → Branch → District → Zone → National.

**Primary Goal:** Track the 7 Million Souls Mandate with real-time reporting, automated notifications, and
WhatsApp-integrated reporting at every level.

## Tech Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **State Management:** Zustand (client-side), React Query (server state/caching)
- **Backend:** Next.js API Routes (App Router), Mongoose ODM
- **Database:** MongoDB on private VPS (NOT Atlas — self-hosted)
- **Email:** Nodemailer with Gmail SMTP (App Password, port 587 STARTTLS)
- **WhatsApp:** Meta WhatsApp Business Cloud API (account confirmed — Meta, not Twilio)
- **Auth:** NextAuth.js v5 (Auth.js) — credentials + magic link
- **File Storage:** Cloudinary or AWS S3 (certificates, documents)
- **Charts/Analytics:** Recharts
- **Validation:** Zod (shared schema between client and server)
- **PDF Generation:** react-pdf / @react-pdf/renderer (certificates, reports)
- **Testing:** Vitest + React Testing Library + Playwright (e2e)
- **Deployment:** Vercel (frontend + API routes) + MongoDB Atlas

## Organizational Hierarchy
```
National (1)
  └── Regions (variable — confirmed level)
        └── Zones
              └── Districts
                    └── Branches (~500+ at launch, target 7,000)
                          └── Flight Shepherds (YM / YF / M / W)
                                └── Converts / Souls
```

## User Roles (10 Total — confirmed)
1. `super_admin` — National OWAS Desk / IT
2. `national_coordinator` — National Evangelism Coordinator
3. `regional_coordinator` — Regional Evangelism Coordinator ← CONFIRMED LEVEL
4. `zonal_coordinator` — Zonal Evangelism Coordinator
5. `district_coordinator` — District Evangelism Coordinator
6. `branch_coordinator` — Branch Evangelism Coordinator
7. `chief_trainer` — Branch Chief Trainer (SIP training)
8. `mission_field_coordinator` — Branch Mission Field Coordinator
9. `flight_shepherd` — Pastoral care for assigned converts
10. `viewer` — Read-only (pastors, leadership observers)

## Key Domain Concepts
- **GOWAS** — Go Win A Soul (weekly Saturday outreach, open to all members)
- **SIP** — Soulwinning Intensive Program (SIP 101, 102, 103 training tracks)
- **SML** — Soulwinning Mission Leader (certified graduate of all SIP levels)
- **FIA** — Follow-up & Integration Activities:
  - Family Class → Responsibility Class → Sorting Out → HSOS (Harpazo School Of Supernatural) → ZIBI (ZIBI Bible School)
  - NOTE: Family Class is tracked in a SEPARATE existing LFF platform. Our system records completion status only.
  - HSOS and ZIBI are tracked fully in this system.
- **Flight Shepherd Tagging:** YM-Tag1…n, YF-Tag1…n, M-Tag1…n, W-Tag1…n
- **HST** — Harpazo Soul Training (branch-level readiness program)
- **EE** — Evangelism Explosion (quick-start training tool)
- **Soul Integration Flow:** Won → Shepherd (48hrs) → Family Class (1wk) → Responsibility Class → SIP → SML
- **7M Target:** 7,000,000 souls / 7,000 branches = 1,000 per branch / ~20 per week

## Reporting Cadence
| Level | Submitted By | Due |
|-------|-------------|-----|
| Flight Shepherd | Flight Shepherd | Saturday |
| Branch | Branch Coordinator | Sunday |
| District | District Coordinator | Monday |
| Zone | Zonal Coordinator | Tuesday |
| National | National Desk | Monthly |

## KPI Weights (Monthly Scorecard)
| KPI | Weight |
|-----|--------|
| Souls Won | 30% |
| Retention Rate | 20% |
| FIA Progress | 15% |
| Baptism | 10% |
| Flight Shepherd System | 10% |
| Evangelism Explosion | 5% |
| HST Readiness | 5% |
| Reporting Compliance | 5% |

## Coding Conventions
- All API routes live in `src/app/api/`
- All Mongoose models live in `src/lib/models/`
- All Zod schemas live in `src/lib/schemas/`
- Shared types live in `src/types/`
- Zustand stores live in `src/stores/`
- Components follow shadcn/ui patterns and live in `src/components/`
- Dashboard pages live in `src/app/(dashboard)/`
- Auth pages live in `src/app/(auth)/`
- Use server actions for form mutations where possible
- Never expose MongoDB ObjectIds directly in URLs — use slugs or encoded IDs
- All monetary-equivalent figures (soul counts, percentages) must be number types, never strings
- Role-based access is enforced both at middleware (Next.js) AND at API route level

## Agent Instructions

### Planning Agents (3)
Run sequentially:
1. **Architect Agent** — Read `docs/prd.md`, `docs/architecture.md`, `.claude/context.md`. Produce an
   implementation plan with phases, file structure, and MongoDB schema designs.
2. **Critic Agent** — Review the Architect Agent's plan. Identify inconsistencies, missing edge cases,
   security gaps, scalability issues, and ambiguities. Produce a critique report.
3. **Replanner Agent** — Incorporate Critic's feedback and produce a revised, hardened implementation plan.
   Save final plan to `docs/implementation-plan.md`.

### Coding Agents (3)
Run after final plan is approved:
1. **Schema & API Agent** — Implement all Mongoose models, Zod schemas, and Next.js API routes.
2. **UI Agent** — Implement all pages, components, forms, and dashboards using the design system in
   `.claude/skills/ui-system.md`.
3. **Integration Agent** — Implement WhatsApp webhook, Nodemailer notifications, PDF export, and
   real-time KPI aggregation logic.

### Test Agent (1)
- Write Vitest unit tests for all utility functions and API route handlers
- Write React Testing Library tests for all form components and dashboards
- Write Playwright e2e tests for the full soul reporting flow (flight shepherd → national)
- Achieve ≥ 80% coverage on critical paths (reporting, authentication, role-based access)

### Security Agents (2)
Run after code is written:
1. **Penetration Test Agent** — Test for OWASP Top 10: injection, broken auth, IDOR, XSS, CSRF,
   misconfigured CORS, insecure API routes, role bypass. Document findings.
2. **Report & Remediation Agent** — Compile security findings into `docs/security-report.md` and
   send summary to the Planning/Architect Agent for remediation in a patched plan.

## File Structure (Target)
```
lff-owas/
├── .claude/
│   ├── CLAUDE.md          ← this file
│   ├── context.md
│   └── skills/
│       ├── ui-system.md
│       └── agents.md
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   ├── user-flows.md
│   ├── notification-flow.md
│   ├── whatsapp-integration.md
│   └── implementation-plan.md  ← generated by agents
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── api/
│   ├── components/
│   │   ├── ui/             ← shadcn primitives
│   │   ├── forms/
│   │   ├── charts/
│   │   └── layout/
│   ├── lib/
│   │   ├── models/         ← Mongoose models
│   │   ├── schemas/        ← Zod schemas
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── mailer.ts
│   │   └── whatsapp.ts
│   ├── stores/             ← Zustand stores
│   ├── types/
│   └── middleware.ts
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

## Do Not
- Do not write code before the implementation plan (`docs/implementation-plan.md`) is approved
- Do not use `any` TypeScript type
- Do not store plain-text passwords — use bcryptjs
- Do not expose internal server errors to the client
- Do not bypass role checks with admin overrides in production code
- Do not use `console.log` in production — use a structured logger (pino)

# Product Requirements Document (PRD)
# HARPAZO-OWAS National Reporting & Management Platform
**Version:** 1.0  
**Date:** June 2026  
**Owner:** LFF National Evangelism Department  
**Classification:** Internal

---

## 1. Executive Summary

The HARPAZO-OWAS Platform is a national-scale web application that digitizes the Operation Win A Soul
(OWAS) reporting and soul-tracking system for Living Faith Foundation (LFF). It replaces a fragmented,
WhatsApp-only manual reporting chain with a structured, auditable, real-time system — while preserving
WhatsApp as a valid reporting channel.

**Core Goal:** Give every level of LFF leadership — from Flight Shepherd to General Overseer — a single,
accurate, real-time view of progress toward the 7 Million Souls Mandate.

---

## 2. Problem Statement

### Current State (Pain Points)
- Reports are submitted as WhatsApp messages in group chats — easily missed, impossible to aggregate
- Soul counts at higher levels are manually re-typed, introducing errors and inflation
- Converts who fall inactive are not flagged until too late
- No national dashboard exists to track progress toward 7M souls
- No automated escalation when a branch fails to report
- Certificate issuance for SML graduates is entirely paper-based
- KPI scoring is done manually, if at all, making it inconsistent

### Desired Future State
- Every report flows digitally from Flight Shepherd upward, auto-aggregating at each level
- National leadership can see real-time soul counts, retention rates, and KPI scores
- WhatsApp remains a valid submission channel (via structured bot)
- Converts are tracked individually through their integration journey
- Automated reminders and escalations ensure reporting compliance
- SML certificates are generated and issued digitally

---

## 3. Target Users

| User Role | Count (Est.) | Primary Need |
|-----------|-------------|--------------|
| Flight Shepherd | ~28,000 | Submit weekly convert follow-up report |
| Branch Coordinator | ~7,000 | Aggregate branch report, manage shepherds |
| Branch Chief Trainer | ~7,000 | Track SIP enrollment, issue certificates |
| Mission Field Coordinator | ~7,000 | Track outreach zones and convert assignments |
| District Coordinator | ~700 | Consolidate branch reports |
| Zonal Coordinator | ~70 | Consolidate district reports |
| National OWAS Desk | ~5 | National dashboard, KPI scorecard, exports |
| National Coordinator | ~2 | Strategic oversight |
| Super Admin | ~3 | System configuration, user management |
| Viewer (leadership) | ~50 | Read-only national/zonal dashboards |

---

## 4. Features & Requirements

### 4.1 Authentication & Authorization
- **F-AUTH-01:** Email/password login with bcrypt hashing
- **F-AUTH-02:** Magic link (passwordless) login via email
- **F-AUTH-03:** Role-based access control (9 roles) enforced at middleware and API level
- **F-AUTH-04:** Session management via NextAuth.js v5 (JWT)
- **F-AUTH-05:** Account provisioning by super_admin or branch coordinator (no self-registration)
- **F-AUTH-06:** Password reset via email (Nodemailer)

### 4.2 Organizational Structure Management
- **F-ORG-01:** Super admin can create/edit Regions, Zones, Districts, Branches
- **F-ORG-02:** Each entity has name, code, parent reference, and assigned coordinator
- **F-ORG-03:** Branch can manage its own Flight Shepherds (tag assignment auto-managed)
- **F-ORG-04:** Flight Shepherd tag is auto-generated on creation: YM-Tag1, YF-Tag1, etc.
- **F-ORG-05:** Branch coordinator can deactivate / reassign Flight Shepherds

### 4.3 Soul (Convert) Management
- **F-SOUL-01:** Record a new soul/convert after GOWAS outreach
- **F-SOUL-02:** Auto-assign convert to next available Flight Shepherd tag within demographic group
- **F-SOUL-03:** Track convert's integration journey: Won → Shepherd → Family Class → Responsibility Class → SIP → SML
- **F-SOUL-04:** Mark convert status: Active / Inactive / Backslidden / SML Certified
- **F-SOUL-05:** Alert Flight Shepherd and Branch Coordinator when convert is inactive for 14+ days
- **F-SOUL-06:** Filter converts by shepherd, status, week, branch

### 4.4 Reporting System (5 Levels)
- **F-RPT-01:** Flight Shepherd submits weekly report via web form or WhatsApp bot
- **F-RPT-02:** Branch Coordinator submits aggregated Branch Weekly Report (includes GOWAS, FIA, Baptism, Shepherds, EE, HST sections)
- **F-RPT-03:** District Coordinator views aggregated district report auto-compiled from branch submissions
- **F-RPT-04:** Zonal Coordinator views aggregated zonal report from district submissions
- **F-RPT-05:** National Desk views national dashboard with all zones, monthly/quarterly rollup
- **F-RPT-06:** Each report is locked after submission (read-only); edits require coordinator approval
- **F-RPT-07:** System prevents submission if required fields are empty
- **F-RPT-08:** Validation rule: Souls Won ≤ Souls Reached; Active + Inactive = Total Assigned
- **F-RPT-09:** Reports auto-aggregate upward — district coordinator never re-enters branch data
- **F-RPT-10:** Branches Outstanding count shown at every consolidated level

### 4.5 KPI Scorecard
- **F-KPI-01:** Monthly KPI score calculated per branch/district/zone
- **F-KPI-02:** Weighted scoring: Souls Won 30%, Retention 20%, FIA 15%, Baptism 10%, Shepherds 10%, EE 5%, HST 5%, Compliance 5%
- **F-KPI-03:** Leaderboard: Top 3 branches per district, Top 3 districts per zone, Top 3 zones nationally
- **F-KPI-04:** Score history (trend over 6 months)
- **F-KPI-05:** KPI report exportable as PDF

### 4.6 FIA Tracking (Follow-up & Integration Activities)
- **F-FIA-01:** Track Family Class: enrolled / completed per branch
- **F-FIA-02:** Track Responsibility Class: enrolled / completed
- **F-FIA-03:** Track Sorting Out: enrolled / completed
- **F-FIA-04:** Track HSOS: enrolled / completed
- **F-FIA-05:** Track ZIBI: enrolled / completed
- **F-FIA-06:** Track SIP 101, 102, 103: enrolled / completed per cohort

### 4.7 SML Certification
- **F-CERT-01:** Chief Trainer marks a member as SIP 101, 102, 103 complete
- **F-CERT-02:** System checks prerequisites before allowing next level enrollment
- **F-CERT-03:** Upon SIP 103 + Project completion, generate SML certificate (PDF) with name, branch, date
- **F-CERT-04:** Certificate stored in cloud (Cloudinary / S3) and linked to member record
- **F-CERT-05:** SML added to Zonal SML Registry visible to Zonal Coordinator

### 4.8 Notification System
- **F-NOTIF-01:** Email reminders for overdue reports (per reporting calendar)
- **F-NOTIF-02:** WhatsApp reminder messages for overdue reports
- **F-NOTIF-03:** Email/WhatsApp alert when a convert goes inactive (14+ days)
- **F-NOTIF-04:** Escalation notification to coordinator above when deadline is missed
- **F-NOTIF-05:** Weekly digest email to national desk (Sunday night)
- **F-NOTIF-06:** Congratulation notification when SML is certified
- **F-NOTIF-07:** KPI scorecard published monthly with automated distribution to coordinators

### 4.9 WhatsApp Integration
- **F-WA-01:** WhatsApp bot accepts structured report messages from registered phone numbers
- **F-WA-02:** Bot parses Flight Shepherd weekly report format and creates a database record
- **F-WA-03:** Bot sends confirmation after successful report submission
- **F-WA-04:** Bot sends reminder messages on Friday (for Flight Shepherds), Saturday (for Branch)
- **F-WA-05:** Bot can answer status queries: "How many souls has my branch won this month?"
- **F-WA-06:** Unrecognized numbers receive a registration prompt

### 4.10 Dashboard & Analytics
- **F-DASH-01:** National dashboard: total souls won, retention rate, KPI progress toward 7M
- **F-DASH-02:** Zone/District/Branch dashboards with filtered views per role
- **F-DASH-03:** Progress ring: current total vs 7M target with percentage
- **F-DASH-04:** Weekly trend charts (souls won, participants, first timers)
- **F-DASH-05:** Convert pipeline funnel (Won → Shepherd → FIA stages → SML)
- **F-DASH-06:** Branch compliance heatmap (who reported / who didn't)
- **F-DASH-07:** Flight Shepherd performance per branch

### 4.11 Export & Print
- **F-EXPORT-01:** Export any report as PDF (formatted per official OWAS report template)
- **F-EXPORT-02:** Export convert list as Excel/CSV
- **F-EXPORT-03:** Export KPI scorecard as PDF
- **F-EXPORT-04:** Export SML registry as Excel

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Performance | Dashboard loads ≤ 2 seconds; report submission ≤ 1 second |
| Availability | 99.5% uptime (Vercel + Atlas SLA) |
| Security | OWASP Top 10 mitigated; all data encrypted in transit (HTTPS) |
| Scalability | Support 50,000 concurrent users (7,000 branches × ~7 users each) |
| Mobile | Fully responsive; PWA capability for offline draft saving |
| Accessibility | WCAG 2.1 AA minimum |
| Data Integrity | No report field can be estimated; all figures must be verifiable |
| Audit | Full audit log for all report submissions and user actions |

---

## 6. Out of Scope (v1.0)
- Native mobile apps (iOS / Android)
- Live video streaming for training
- Payment / tithe management
- Church management beyond OWAS scope
- SMS-only reporting (WhatsApp covers this)
- Multi-language support (English only, v1)

---

## 7. Success Metrics
- 90% of branches submit reports on time within first 90 days
- 0% manual aggregation at district level and above
- National dashboard reflects latest week's data by Tuesday EOD
- ≥ 80% of converts tracked through at least Family Class enrollment
- 7M souls target progress visible to national leadership in real-time

---

## 8. Timeline (Suggested Phases)

### Phase 1 — Foundation (Weeks 1-4)
- Auth system, org structure, user management
- MongoDB schema design and seed data
- Basic branch report submission form

### Phase 2 — Core Reporting (Weeks 5-8)
- All 5 report levels
- Auto-aggregation logic
- Notification system (email)

### Phase 3 — Soul Tracking & FIA (Weeks 9-12)
- Convert records and shepherd assignment
- FIA pipeline tracking
- SML certification workflow

### Phase 4 — WhatsApp & Analytics (Weeks 13-16)
- WhatsApp bot integration
- National dashboard and KPI scorecard
- Export/PDF generation

### Phase 5 — Testing & Security (Weeks 17-18)
- Full test suite
- Security audit and remediation
- Performance optimization

### Phase 6 — Launch (Week 19-20)
- Staging deployment
- User training
- Production go-live

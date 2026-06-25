# User Flows — HARPAZO-OWAS Platform
# Detailed Interaction Map: All Roles

---

## Role Hierarchy & Data Access Rules

```
super_admin              → sees everything; configures system
  national_coordinator   → sees all zones, districts, branches
    zonal_coordinator    → sees own zone's districts and branches only
      district_coordinator → sees own district's branches only
        branch_coordinator   → sees own branch only
        chief_trainer        → sees own branch SIP/FIA data
        mission_field_coordinator → sees own branch outreach + converts
          flight_shepherd    → sees only their assigned converts
viewer                   → read-only on assigned scope
```

---

## FLOW 1: SUPER ADMIN

### 1.1 System Setup (One-Time)
```
Login → Admin Dashboard
  → Create Regions (e.g., South West, North Central)
  → Create Zones under each Region
  → Create Districts under each Zone
  → Create Branches under each District
  → Assign coordinators to each level (creates user accounts)
  → Configure reporting calendar settings
  → Set 7M soul target and distribution per zone/district/branch
```

### 1.2 Ongoing Administration
```
Admin Dashboard
  → User Management: create/deactivate/reassign users
  → System Logs: audit trail of all actions
  → Notification Config: set reminder schedules
  → WhatsApp Config: set webhook URL, API token
  → Export: full data export (CSV/Excel)
  → KPI Config: adjust weightings if needed
```

---

## FLOW 2: NATIONAL COORDINATOR

### 2.1 Weekly Review (Every Wednesday)
```
Login → National Dashboard
  → View national summary card:
      Souls Won (this week) | Retention Rate | 7M Progress %
  → View Zones Reporting Status (green/red grid by Tuesday status)
  → Drill down: click Zone → see district breakdown
  → View Top 3 Zones (KPI leaderboard)
  → Identify non-reporting zones → trigger manual escalation
  → View convert pipeline funnel nationally
```

### 2.2 Monthly Report Review
```
National Dashboard → Monthly Tab
  → Review auto-compiled National Report
  → Add Testimonies and Recommendations
  → Approve/Submit National Report → goes to President/GO
  → Publish Monthly KPI Scorecard → triggers email/WA to all coordinators
  → Export National Report as PDF
```

### 2.3 Interactions With Other Roles
- Can message Zonal Coordinators via in-app notification
- Can view any branch's report for verification
- Receives automated digest every Sunday night

---

## FLOW 3: ZONAL COORDINATOR

### 3.1 Tuesday Reporting (Weekly)
```
Login → Zonal Dashboard
  → View Districts Reporting Status (auto-populated)
    → Districts that submitted (Monday) appear green
    → Outstanding districts flagged in red
  → Review auto-aggregated Zonal Summary:
      Total Souls Won | Total Participants | FIA totals
  → Add Testimonies and Challenges
  → Submit Zonal Report → notifies National Desk
```

### 3.2 District Performance Monitoring
```
Zonal Dashboard → Districts Tab
  → Click any district → view that district's weekly report
  → View Top 3 Districts (by KPI score)
  → Flag a district for pastoral intervention
  → Send encouragement/correction notification to District Coordinator
```

### 3.3 HST & EE Oversight
```
Zonal Dashboard → Training Tab
  → View HST status per district: Ready / Ongoing / Launching
  → View EE completion rates per district
  → Export zonal training report
```

---

## FLOW 4: DISTRICT COORDINATOR

### 4.1 Monday Reporting (Weekly)
```
Login → District Dashboard
  → View Branches Reporting Status:
      Branches that submitted Sunday → appear
      Outstanding branches → flagged
  → Review auto-aggregated District Summary:
      Total from all branches (never re-typed)
  → Add Challenges
  → Select Top 3 Branches for recognition
  → Submit District Report → notifies Zonal Coordinator
```

### 4.2 Branch Performance
```
District Dashboard → Branches Tab
  → Click branch → see branch weekly report
  → Call out non-reporting branch coordinator (in-app message)
  → View convert pipeline per branch
  → View Flight Shepherd activity per branch
```

---

## FLOW 5: BRANCH COORDINATOR

### 5.1 Sunday Report Submission (Core Weekly Flow)
```
Login → Branch Dashboard
  → Click "New Weekly Report"
  → Form Section 1: GOWAS
      Participants: [number input]
      Souls Reached: [number input]
      Souls Won: [number input]  ← validated ≤ Souls Reached
      First Timers: [number input]
  → Form Section 2: Follow-Up
      New Converts: [auto-pulled from souls collection]
      Assigned to Shepherds: [auto-counted]
      Active Converts: [auto-counted from status]
      Inactive Converts: [auto-counted]
  → Form Section 3: FIA
      Family Class Enrolled/Completed: [inputs]
      Responsibility Class Enrolled/Completed: [inputs]
      Sorting Out, HSOS, ZIBI: [inputs]
  → Form Section 4: Baptism
      Baptized: [number]
      Awaiting Baptism: [number]
  → Form Section 5: Flight Shepherds
      YM / YF / M / W counts: [auto-from system]
      Total Active: [auto]
      Training Status: [Completed / Ongoing dropdown]
  → Form Section 6: Evangelism Explosion
      Trained: [number]
      Ongoing: [number]
  → Form Section 7: HST
      Status: [Ready / Ongoing / About To Start dropdown]
  → Form Section 8: Testimonies [text area]
  → Form Section 9: Challenges [text area]
  → Preview → Submit
  → Confirmation screen → report locked
```

### 5.2 Soul/Convert Registration (After GOWAS)
```
Branch Dashboard → Souls Tab → "Add New Soul"
  → Name, Phone, Gender, Age Group
  → Date Won, Location/Mission Field
  → System auto-assigns Flight Shepherd tag:
      If gender=Male, ageGroup=Youth → next available YM-Tag
      If gender=Female, ageGroup=Youth → next available YF-Tag
      If gender=Male, ageGroup=Adult → next M-Tag
      If gender=Female, ageGroup=Adult → next W-Tag
  → Notification sent to assigned Flight Shepherd
  → Soul record created with status: "new"
```

### 5.3 Flight Shepherd Management
```
Branch Dashboard → Shepherds Tab
  → View all shepherds with their tags (YM-Tag1, YF-Tag2 etc.)
  → See each shepherd's assigned souls count + active/inactive split
  → Add new shepherd → auto-assigns next available tag
  → Deactivate shepherd → reassign their converts to another tag
  → View shepherd weekly reports submitted / outstanding
```

### 5.4 Interactions With Other Roles
- Receives automated reminder Sunday 6pm if no report submitted
- Receives escalation from District Coordinator if report not submitted Sunday 9pm
- Sends report confirmation to District Coordinator on submission
- Can view chief trainer's SIP progress in a read-only tab

---

## FLOW 6: CHIEF TRAINER

### 6.1 SIP Enrollment & Tracking
```
Login → Training Dashboard
  → Prerequisite Check: before enrolling in SIP 101:
      Verify Family Class: Complete ✓
      Verify Responsibility Class: Complete ✓
  → Enroll eligible members in SIP 101 cohort
  → Mark sessions as taught (date + hours logged)
  → Mark SIP 101 complete → member moves to SIP 102 eligible
  → Repeat for SIP 102 → SIP 103
  → For SIP 103: mark project completed → GENERATE SML CERTIFICATE
      → PDF generated with name, branch, date, signature
      → Certificate uploaded to Cloudinary
      → Member status → sml_certified
      → Name added to Zonal SML Registry
      → Celebration notification sent to member's shepherd and branch coordinator
```

### 6.2 Training Report Contribution
```
Training Dashboard → Weekly Summary
  → View: enrolled counts per SIP level, completions this week
  → This data auto-feeds into Branch Report Section (FIA)
```

---

## FLOW 7: MISSION FIELD COORDINATOR

### 7.1 GOWAS Outreach Planning
```
Login → Mission Field Dashboard
  → Set up Mission Fields (geographical zones for outreach)
  → Assign teams to each mission field for the week
  → Log GOWAS outreach results:
      Date, Location, Team Members, Souls Reached, Souls Won, First Timers
  → Data auto-feeds into Branch Coordinator's weekly report form
```

### 7.2 Convert Intake
```
After GOWAS outreach:
  → Add each soul won (or bulk import from field sheet)
  → System assigns shepherd tag automatically
  → Mission Field Coordinator marks soul record as "assigned"
```

---

## FLOW 8: FLIGHT SHEPHERD

### 8.1 Weekly Report Submission (Saturday)
```
Option A: Web Form
  Login → My Dashboard
  → View assigned converts list
  → Click "Submit Weekly Report"
      Branch: [auto-filled]
      Flight Shepherd: [auto-filled]
      Tag: [auto-filled, e.g., YM-Tag3]
      Category: [auto-filled, YM/YF/M/W]
      Reporting Week: [current week auto]
      Assigned Souls: [auto-counted from souls collection]
      Active: [number input ← shepherds updates]
      Inactive: [number input ← auto-validated: active + inactive = assigned]
      New Converts Assigned: [auto-counted this week]
      Family Class Enrolled: [number]
      Responsibility Class Enrolled: [number]
      Cell Connected: [number]
      Workforce Connected: [number]
      Challenges: [text]
      Prayer Requests: [text]
  → Submit

Option B: WhatsApp
  → Send formatted message to OWAS WhatsApp number
  → Bot parses and creates the report
  → Bot confirms submission
```

### 8.2 Convert Management
```
My Dashboard → My Converts
  → See list of assigned converts with integration stage
  → Click convert → update status (Active / Inactive)
  → Log contact: date visited / called
  → Mark Family Class enrolled / completed
  → View days since last contact (flagged if > 14 days)
```

### 8.3 Interactions
- Receives assignment notification when new convert is assigned to their tag
- Receives reminder Friday if no report submitted
- Escalated to Branch Coordinator if not submitted by Saturday EOD
- Can message Branch Coordinator via in-app

---

## FLOW 9: VIEWER (READ-ONLY LEADERSHIP)

```
Login → Dashboard scoped to their assigned level
  → View summary cards (read-only)
  → View charts and KPI scores
  → Cannot submit any report
  → Cannot modify any data
  → Can export reports as PDF
```

---

## Cross-Role Interaction Map

```
Flight Shepherd
    ↓ submits weekly report
Branch Coordinator ←→ Chief Trainer (reads SIP data)
    ↓ submits aggregated branch report
District Coordinator
    ↓ submits aggregated district report
Zonal Coordinator
    ↓ submits aggregated zonal report
National Coordinator
    ↓ compiles and submits national report
President / GO (viewer)

WhatsApp Bot ──────────────────→ (all submission levels)
Nodemailer ─── reminders ──────→ (all levels on schedule)
Cron Jobs ──── auto-escalations → (coordinator above missed level)
```

---

## Key UX Decisions

1. **Branch Coordinators see a "traffic light" per section** — green (submitted), yellow (pending), red (overdue)
2. **Flight shepherds see a simple card per convert** — name, status, days since contact, stage
3. **All forms auto-save as drafts** — users can close and return without losing data
4. **Readonly preview before submission** — shows what will be sent to the level above
5. **Submission is final** — only super_admin can unlock a submitted report for correction
6. **Mobile-first layout** — all forms are single-column on mobile with large tap targets

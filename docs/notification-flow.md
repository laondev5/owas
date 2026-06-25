# Notification System — Detailed Flow
# HARPAZO-OWAS Platform

---

## Notification Channels

| Channel | When Used | Library/Service |
|---------|-----------|----------------|
| In-app | Immediate feedback, status updates | Zustand + database polling |
| Email | Formal reminders, reports, certificates | Nodemailer (SendGrid SMTP) |
| WhatsApp | Field-level reminders, quick status alerts | WhatsApp Business Cloud API |

---

## Notification Types

| Type | Trigger | Recipients | Channel |
|------|---------|-----------|---------|
| `REPORT_REMINDER` | 6pm day before deadline | Level owner | WA + Email |
| `REPORT_OVERDUE` | EOD on deadline day (not submitted) | Level owner | WA + Email |
| `ESCALATION` | 2 hours after deadline (still not submitted) | Coordinator above | WA + Email |
| `CONVERT_INACTIVE` | Convert not contacted for 14+ days | Flight Shepherd + Branch Coord | Email + In-app |
| `CONVERT_ASSIGNED` | New convert assigned to shepherd | Flight Shepherd | WA + In-app |
| `SML_CERTIFIED` | Member completes SIP 103 + Project | Branch Coord + Zonal Coord + Member | Email + WA |
| `KPI_PUBLISHED` | Monthly scorecard compiled | All coordinators in scope | Email |
| `NATIONAL_DIGEST` | Every Sunday night | National Coordinator | Email |
| `WELCOME` | New user account created | New user | Email |
| `PASSWORD_RESET` | User requests reset | Requesting user | Email |
| `REPORT_LATE_WARNING` | Report submitted after deadline | Submitter + Level above | In-app |

---

## Automated Notification Schedule (Vercel Cron Jobs)

### Friday — 6:00 PM
**Target:** All Flight Shepherds who haven't submitted their weekly report  
**Message:** "Your OWAS weekly report for {weekRange} is due tomorrow (Saturday). Please submit on time."  
**Channel:** WhatsApp + Email

```
Cron: 0 18 * * 5  (Friday 6pm)
  → Query shepherd_reports WHERE weekEnding = currentWeek AND status != 'submitted'
  → For each outstanding shepherd:
      → Create notification record (channel: whatsapp, email)
      → Send WA message via Cloud API
      → Send email via Nodemailer
      → Update notification.status = sent
```

### Saturday — 8:00 PM (Post-Deadline Escalation)
**Target:** Branch Coordinators whose flight shepherds haven't submitted  
**Message:** "Alert: The following Flight Shepherds in {Branch} have not submitted their weekly report: [names+tags]. Please follow up."  
**Channel:** WhatsApp + Email

```
Cron: 0 20 * * 6  (Saturday 8pm)
  → Query shepherd_reports WHERE weekEnding = currentWeek AND status != 'submitted'
  → Group by branchId
  → For each branch with outstanding reports:
      → Build list of outstanding shepherd names/tags
      → Send escalation to branch_coordinator
      → Mark shepherd reports as isLate = true
```

### Sunday — 6:00 PM
**Target:** All Branch Coordinators who haven't submitted weekly branch report  
**Message:** "Your OWAS Branch Report for week ending {date} is due today (Sunday). Submit before midnight."  
**Channel:** WhatsApp + Email

```
Cron: 0 18 * * 0  (Sunday 6pm)
  → Query branch_reports WHERE weekEnding = currentWeek AND status != 'submitted'
  → For each outstanding branch:
      → Notify branch_coordinator
```

### Sunday — 9:00 PM (Branch Escalation)
**Target:** District Coordinators whose branches haven't submitted  
**Message:** "Alert: {N} branches in {District} have not submitted their OWAS weekly report. Outstanding branches: [list]."  
**Channel:** WhatsApp + Email

```
Cron: 0 21 * * 0  (Sunday 9pm)
  → Query branch_reports WHERE weekEnding = currentWeek AND status != 'submitted'
  → Group by districtId
  → For each district with outstanding branches:
      → Send escalation to district_coordinator
```

### Monday — 6:00 PM
**Target:** District Coordinators who haven't submitted district report  
**Message:** "Your OWAS District Report for week {date} is due today (Monday). Please compile and submit."  
**Channel:** WhatsApp + Email

```
Cron: 0 18 * * 1  (Monday 6pm)
  → Query district_reports WHERE reportingWeek = currentWeek AND status != 'submitted'
  → Notify outstanding district_coordinators
```

### Monday — 9:00 PM (District → Zone Escalation)
**Target:** Zonal Coordinators whose districts haven't submitted  

### Tuesday — 6:00 PM
**Target:** Zonal Coordinators who haven't submitted zonal report  

### Tuesday — 9:00 PM (Zone → National Escalation)
**Target:** National Coordinator, flagging outstanding zones  

### Last Day of Month — 11:00 PM
**Target:** National Coordinator  
**Action:** Auto-compile National Report; distribute KPI Scorecards to all coordinators

```
Cron: 0 23 L * *  (Last day of month, 11pm)
  → Aggregate all branch/district/zone reports for the month
  → Compute KPI scores per branch/district/zone
  → Create kpi_scores documents for all entities
  → Create national_reports document
  → Send KPI Scorecard email to all coordinators (Nodemailer)
  → Send digest to national_coordinator
```

### Sunday Night — 10:00 PM (Weekly National Digest)
**Target:** National Coordinator, National OWAS Desk  
**Content:** This week: Souls Won, Branches Reported, Top Zone, any alerts

---

## Convert Inactivity Alert

```
Cron: 0 9 * * 1  (Every Monday 9am — check inactivity)
  → Query souls WHERE status = 'active'
      AND lastContactDate < (now - 14 days)
  → For each inactive convert:
      → Update souls.status = 'inactive'
      → Create CONVERT_INACTIVE notification:
          → To: assignedShepherd (WhatsApp + Email)
          → To: branch_coordinator (in-app + Email)
          → Message: "{SoulName} assigned to {ShepherdTag} has not been contacted in {N} days. Please follow up."
```

---

## Email Templates (Nodemailer)

All emails use HTML templates with LFF branding. Variables are injected via template strings.

### Template: Report Reminder
```
Subject: [OWAS] Reminder: {Level} Report Due — {weekEnding}
Body:
  Dear {name},
  
  This is a reminder that your OWAS {Level} Report for the week ending {weekEnding}
  is due {dueDay}.
  
  📊 Submit your report here: {reportLink}
  
  Reporting is accountability. Every soul counts.
  
  — OWAS National Reporting System
```

### Template: Escalation
```
Subject: [OWAS ALERT] Outstanding Report — {entityName} ({level})
Body:
  Dear {coordinatorName},
  
  The following {subordinateLevel}(s) in your {level} have NOT submitted their OWAS report
  for week ending {weekEnding}:
  
  {outstandingList}
  
  Please follow up immediately.
  
  — OWAS National Reporting System
```

### Template: SML Certificate Notification
```
Subject: 🎉 Congratulations — New SML Certified: {memberName}
Body:
  Dear {branchCoordinator},
  
  {memberName} from {branchName} has successfully completed all SIP levels
  and has been certified as a Soulwinning Mission Leader (SML).
  
  Certificate is attached and stored in the SML Registry.
  
  — OWAS Chief Trainer System
```

### Template: KPI Scorecard
```
Subject: [OWAS] Monthly KPI Scorecard — {Month} {Year}
Body:
  Dear {coordinatorName},
  
  Your {entityType} KPI Score for {Month}: {totalScore}/100
  
  Breakdown:
  - Souls Won:         {soulsWonScore}/30
  - Retention:         {retentionScore}/20
  - FIA Progress:      {fiaScore}/15
  - Baptism:           {baptismScore}/10
  - Flight Shepherds:  {shepherdScore}/10
  - Evang. Explosion:  {eeScore}/5
  - HST Readiness:     {hstScore}/5
  - Report Compliance: {complianceScore}/5
  
  National Rank: #{rank}
  
  Full scorecard: {dashboardLink}
```

---

## WhatsApp Message Templates (Meta-Approved)

Meta requires pre-approved templates for outbound WhatsApp messages.
Interactive reply-based messages are session messages (within 24hr window).

### Template 1: Report Reminder
```
Template name: owas_report_reminder
Body: "Hello {{1}}, your OWAS {{2}} Report for week ending {{3}} is due {{4}}. 
Reply YES to confirm you'll submit or visit {{5}} to submit now."
Category: UTILITY
```

### Template 2: Overdue Escalation
```
Template name: owas_report_overdue
Body: "OWAS ALERT: {{1}}, your {{2}} report for {{3}} is OVERDUE. 
This has been flagged to {{4}}. Please submit immediately: {{5}}"
Category: UTILITY
```

### Template 3: Convert Inactive Alert
```
Template name: owas_convert_inactive
Body: "Hello {{1}}, {{2}} assigned to you ({{3}}) has not been contacted in {{4}} days. 
Please reach out and update their status in OWAS."
Category: UTILITY
```

### Template 4: SML Certification
```
Template name: owas_sml_certified
Body: "Congratulations! {{1}} from {{2}} has been certified as an OWAS Soulwinning Mission Leader (SML). 
Certificate available in the OWAS dashboard."
Category: UTILITY
```

---

## In-App Notification (Real-Time)

- Notifications stored in `notifications` collection
- Badge count shown in navbar
- Notification dropdown shows last 10 unread
- Click notification → navigate to relevant report/soul/entity
- "Mark all read" clears badge

---

## Notification Retry Logic

```
If sending fails (network error, WA API error):
  → Set notification.status = 'failed'
  → Set notification.retryCount += 1
  → If retryCount < 3:
      → Schedule retry after 30 minutes (via Vercel serverless)
  → If retryCount >= 3:
      → Alert super_admin via in-app notification
      → Log to audit_logs
```

---

## Notification Opt-Out Rules

- Users CANNOT opt out of escalation notifications (they are mandatory)
- Users CAN mute email reminders (they'll still get in-app)
- WhatsApp can only be muted by unregistering their number from the system
- Super admin can force-send any notification type for any user

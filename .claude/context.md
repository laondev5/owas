# context.md — Project Context & Background

## What Is This?
The **HARPAZO-OWAS National Reporting & Management Platform** is a full-stack web application that
digitizes the Operation Win A Soul (OWAS) system of Living Faith Foundation (LFF), Nigeria.

It replaces the current WhatsApp-based manual reporting chain with a structured, auditable, real-time
digital platform — while RETAINING WhatsApp as an input channel via the WhatsApp Business API.

## Why It Exists
LFF has launched a **7 Million Souls Mandate**. Without a digital tracking system:
- Reports are lost in WhatsApp group chats
- Soul counts cannot be verified or aggregated accurately
- Converts fall through the cracks between levels
- Leadership has no real-time visibility into progress toward the 7M target
- No automated escalation when a branch fails to report

## The Organization
- **LFF** = Living Faith Foundation (church body)
- **OWAS** = Operation Win A Soul (the evangelism system)
- **GOWAS** = Go Win A Soul (the weekly outreach activity)
- **SIP** = Soulwinning Intensive Program (SIP 101, 102, 103)
- **SML** = Soulwinning Mission Leader (highest certification)
- **FIA** = Follow-up & Integration Activities pipeline
- **HST** = Harpazo Soul Training
- **EE** = Evangelism Explosion (30-day quick training)

## Hierarchy (Critical to Understand)
Every piece of data flows UPWARD through this chain:

```
Flight Shepherd (individual pastoral carer)
    → reports to Branch Evangelism Coordinator
        → District Evangelism Coordinator
            → Zonal Evangelism Coordinator
                → National OWAS Desk
                    → National Evangelism Department
                        → President / General Overseer
```

Each level AGGREGATES data from the level below it and produces a consolidated report.

## The Soul Journey (Soul Integration Flow)
```
1. Soul WON during GOWAS outreach
2. Assigned to Flight Shepherd within 48 HOURS
3. Enrolled in Family Class within 1 WEEK
4. Completes Family Class → moves to Responsibility Class (2-3 months)
5. Completes Responsibility Class → eligible for SIP 101
6. Completes SIP 101 → SIP 102 → SIP 103 + Project → CERTIFIED SML
7. SML goes out and wins new souls → cycle repeats
```
Any broken link in this chain = soul at risk of being lost.

## Flight Shepherd Tagging System
Converts are assigned to shepherds using a sequential demographic tag:
- Youth Male: YM-Tag1, YM-Tag2 … YM-TagN
- Youth Female: YF-Tag1, YF-Tag2 … YF-TagN
- Men: M-Tag1, M-Tag2 … M-TagN
- Women: W-Tag1, W-Tag2 … W-TagN

Rule: Assignment is sequential and never restarts. Tag numbers are persistent.
Each shepherd has a defined capacity; when full, next convert goes to next tag.

## Key Numbers
- National target: 7,000,000 souls
- Assumed branches: ~7,000
- Target per branch per year: 1,000 souls
- Target per branch per week: ~20 souls
- KPI review: Monthly (scorecard weighted across 8 metrics)

## Report Types in the System
1. **Flight Shepherd Weekly Report** — individual shepherd → branch coordinator
2. **Branch Weekly Report (OWAS Branch Report)** — aggregated → district
3. **District Consolidated Report** — aggregated → zone
4. **Zonal Consolidated Report** — aggregated → national
5. **National Dashboard Report** — monthly/quarterly → leadership

## What the Platform Must Do
- Allow each level to submit their report digitally (web form OR WhatsApp bot)
- Auto-aggregate lower-level reports into upper-level consolidated views
- Send automated reminders when reports are overdue
- Show real-time KPI dashboards per level (branch/district/zone/national)
- Track individual converts through their integration journey
- Generate PDF certificates for SML graduates
- Export reports as PDF/Excel
- Alert coordinators when converts go inactive (no check-in for 2+ weeks)
- Score each branch/district/zone on the monthly KPI scorecard
- Support WhatsApp-based report submission via structured message templates

## Reporting Deadlines (Strict)
| Level | Due Day |
|-------|---------|
| Flight Shepherd | Saturday by EOD |
| Branch | Sunday by EOD |
| District | Monday by EOD |
| Zone | Tuesday by EOD |
| National | Last day of month |

Missing a deadline triggers an automated escalation notification to the level above.

## Design Principles for the Platform
1. **Mobile-first** — most coordinators will use phones
2. **Offline-tolerant** — allow draft saving; submit when connected
3. **WhatsApp-native** — reports should be submittable via WhatsApp message
4. **Role-strict** — a flight shepherd cannot see district data; a district coordinator cannot see another district
5. **Aggregation-accurate** — numbers must be auto-summed, not manually re-entered at each level
6. **Audit trail** — every report submission is timestamped and tied to a user account
7. **No estimates** — system rejects reports with flagged inconsistencies (e.g., souls won > souls reached)

## Environment Notes
- Developer: LFF internal team
- Stack preference: Next.js, MongoDB, Zustand, Nodemailer
- WhatsApp: Meta Business Cloud API (preferred) or Twilio sandbox
- Deployment: Vercel + MongoDB Atlas
- Auth: Email/password + optional magic link

## Open Questions (For Developer to Answer Before Building)
See `.claude/CLAUDE.md` for the full question list at section 9.
The developer should answer these before coding begins.

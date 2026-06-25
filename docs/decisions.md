# Architecture Decisions & Clarifications
# Recorded from founder/developer Q&A — June 2026

---

## Q1: WhatsApp Provider
**Decision:** Meta WhatsApp Business Cloud API (already have account)  
**Impact:** Build directly for Meta Cloud API. No Twilio. Use Twilio sandbox only for local dev if needed.

## Q2: Account Creation
**Decision:** Admin-created top-down. No self-registration.  
**Flow:** Super Admin → creates National Coordinators → Zonal Coordinators create District ones → District creates Branch → Branch creates Shepherds  
**Impact:** No public /register page. Invitation-based account creation only. New users receive a Welcome email with a one-time password setup link.

## Q3: Scale
**Decision:** ~500+ branches worldwide (not 7,000 yet — that is the growth target)  
**Impact:** Database indexing strategy is simpler for now. Scale plan remains but initial seed data and performance targets are for 500 branches (~3,500 users at launch).

## Q4: Rollout
**Decision:** All LFF worldwide from day 1  
**Impact:** Multi-timezone awareness needed. Reporting deadlines should account for timezone (store all times in UTC, display in user's local time). Branch registration must include country/timezone field.

## Q5: FIA Class Definitions
- **HSOS** = Harpazo School Of Supernatural  
- **ZIBI** = ZIBI Bible School  
**Impact:** These are confirmed as distinct LFF training programs tracked separately in the FIA pipeline. Display full names in the UI, use short codes in database field names.

## Q6: Infrastructure
**Decision:** Vercel (frontend + API) + MongoDB on a private VPS (not Atlas)  
**Impact:** 
- Connection string points to VPS MongoDB, not Atlas
- No Atlas Search — use MongoDB text indexes instead
- Ensure MongoDB VPS has proper firewall rules to only accept connections from Vercel's IP range
- Set up replica set on VPS for proper Mongoose change stream support (if needed)
- Use `MONGODB_URI` env var pointing to VPS connection string

## Q7: Email
**Decision:** Gmail SMTP via Nodemailer  
**Impact:** 
- Use Gmail App Password (not account password) — requires 2FA enabled on Google account
- Gmail limit: 500 emails/day for regular accounts, 2,000/day for Google Workspace
- For 500 branches this is fine at launch; plan migration to SendGrid when volume grows
- Config: host: smtp.gmail.com, port: 587, secure: false (STARTTLS)

## Q8: Certificate Storage
**Decision:** Cloudinary  
**Impact:** Use `cloudinary` npm package. Upload SML certificates as PDFs or images to a dedicated `owas-certificates` folder. Store `secure_url` in souls.integrationStage.certificateUrl.

## Q9: Reporting Channels
**Decision:** Both web form AND WhatsApp bot  
**Impact:** Build both interfaces. Web form is primary for coordinators (branch and above). WhatsApp is primary for Flight Shepherds. Both write to the same database.

## Q10: Reporting Schedule
**Decision:** GOWAS/outreach is enforced as Saturday. All other reporting days (Sunday → Tuesday) are set by each coordinator themselves within allowed windows.  
**Impact:** 
- Saturday deadline for Flight Shepherd reports is system-enforced (auto-flagged as late after 11:59pm Saturday)
- Branch coordinators can set their own Sunday deadline time (default: 11:59pm Sunday)
- District coordinators can set their own Monday deadline time
- Zonal coordinators can set their own Tuesday deadline time
- Each organization entity stores `reportingDeadlineHour` (default: 23) and `reportingDeadlineMinute` (default: 59)

## Q11: Dashboard Visibility
**Decision:** All dashboards require login. No public-facing tracker.  
**Impact:** All routes under /dashboard/* are protected. Remove any consideration of public API endpoints for soul counts.

## Q12: Region Level
**Decision:** Yes, Region level EXISTS between National and Zone  
**Hierarchy confirmed:**
```
National (1)
  └── Regions (variable)
        └── Zones
              └── Districts
                    └── Branches
                          └── Flight Shepherds
                                └── Souls/Converts
```
**Impact:** Add `region_reports` collection. Add `regional_coordinator` role. 6 organizational levels total.

## Q13: Convert Portal
**Decision:** No convert-facing login. Separate platform handles Family Class.  
**Impact:** 
- Do NOT build a convert login system
- Family Class and Responsibility Class status is entered manually by Chief Trainer
- The existing platform handles Family Class — our system just records completion status
- Chief Trainer enters "Family Class Completed" date based on data from existing platform
- HSOS and ZIBI are tracked here since they're newer programs

## Q14: SML Certificate
**Decision:** Yes, downloadable PDF certificate with official LFF branding  
**Status:** Developer needs to provide: LFF logo (PNG), certificate layout preference, signatory name(s) and title(s)  
**Impact:** Build @react-pdf/renderer template with placeholder logo. Replace with real assets when provided. Certificate includes: member name, branch, date certified, SIP completion dates, signatory.

## Q15: Data Migration
**Decision:** Starting fresh — no existing data to migrate  
**Impact:** Build seed script for initial organizational structure. No ETL pipeline needed. First task after launch is for admins to create org structure and user accounts.

---

## Additional Decisions (Derived from above)

### Timezone Handling
- Store all timestamps in UTC in MongoDB
- Each Branch record includes `timezone` field (e.g., "Africa/Lagos", "Europe/London")
- All deadline calculations use branch timezone
- UI displays dates/times in the user's local timezone (via Intl.DateTimeFormat)

### Roles (Updated — 10 roles, not 9)
Adding `regional_coordinator` for the Region level:
1. `super_admin`
2. `national_coordinator`
3. `regional_coordinator` ← NEW
4. `zonal_coordinator`
5. `district_coordinator`
6. `branch_coordinator`
7. `chief_trainer`
8. `mission_field_coordinator`
9. `flight_shepherd`
10. `viewer`

### MongoDB VPS Connection
- Use connection pooling: `maxPoolSize: 10`
- Connection string format: `mongodb://user:pass@your-vps-ip:27017/owas?authSource=admin`
- Must enable TLS on VPS MongoDB for security
- Vercel will need static IP or allowlist approach for VPS firewall

### Gmail Rate Limiting Strategy
- Batch low-priority notifications (KPI scorecards) into a single daily digest rather than individual emails
- Escalation and overdue notifications sent immediately
- Reminder emails batched per coordinator (one email listing all outstanding shepherds, not one per shepherd)

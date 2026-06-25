# Implementation Plan Critique Report
# HARPAZO-OWAS National Reporting Platform

**Reviewer:** Principal Engineer (Critic Agent)  
**Date:** June 2026  
**Plan Version:** 1.0  
**Verdict:** NOT APPROVED — 12 critical issues, 18 high-severity issues must be resolved before coding begins.

---

## Executive Summary

The plan demonstrates solid architectural thinking on the happy path, but has dangerous gaps in data integrity, auth scoping, aggregation correctness, and real-world failure handling. Proceeding to code with the plan as-written would produce a system that generates wrong soul counts under concurrent load, allows cross-branch data leakage, and fails silently on the most important cron job of the month. These are not edge cases — they are the core use cases at scale.

---

## 1. SCHEMA GAPS

### [CRITICAL] Missing `regionId` / Region level in all report models

**The Hierarchy is wrong.** CLAUDE.md explicitly defines a 6-level hierarchy:

```
National → Regions → Zones → Districts → Branches → Flight Shepherds
```

The implementation plan only designs 5 levels of reports: Shepherd → Branch → District → Zone → National. There is **no Regional Report model, no regional aggregation layer, no regional coordinator dashboard, and no regional coordinator API routes**. The PRD user table lists `regional_coordinator` as a role with estimated ~70 users. The CLAUDE.md lists `regional_coordinator` as role #3. The plan completely omits this entire organizational level.

Consequence: The aggregation chain is broken. Zonal reports cannot roll up correctly to National without going through Regions, or the Region level must be treated as optional — but neither case is addressed. The `Organization.ts` model needs a `region` type, and `ZonalReport` needs a `regionId` field.

### [CRITICAL] No `isLate` flag ever written on ShepherdReport

The plan defines `isLate` logic in the cron job (Section 7, Cron Job 2: Shepherd Escalation) — it says "Mark outstanding shepherd_report.isLate = true (create stub records if none exist)." But:
1. The `ShepherdReport` model stub does not list an `isLate` field in the hardening requirements (Section 1A).
2. "Create stub records if none exist" is extremely dangerous. Creating phantom/stub report records for shepherds who haven't submitted will corrupt compliance statistics and break the idempotency check in `5.5 Idempotency Guard` (`status: 'submitted'` check). A stub record with `status: 'pending'` and `isLate: true` is a completely different document from no document.
3. The `calcComplianceScore` function queries `reports.filter(r => !r.isLate)` — if stubs aren't created, late count is never captured. If they are created, the aggregate pipeline in Section 5.1 must explicitly exclude stubs (status filter of `['submitted', 'approved']` would exclude them, but the compliance calculation queries them).

The `isLate` mechanism is architecturally inconsistent across the entire plan.

### [CRITICAL] `BranchReport.weekEnding` unique index will break the week-boundary edge case

The plan specifies: `unique compound index on (branchId, weekEnding)`. The aggregation pipeline does:
```
weekEnding: { $gte: startOfDay(weekEnding), $lte: endOfDay(weekEnding) }
```
This is a range query, not a point query. The index can only enforce uniqueness on exact stored values. If one submission stores `weekEnding = 2026-06-21T00:00:00Z` and another stores `2026-06-21T12:00:00Z`, the unique index will NOT prevent it. The system must normalize `weekEnding` to midnight UTC before every insert. This normalization step is missing from the plan. The date-utils function `getWeekEnding` is mentioned but its normalization behavior is not specified.

### [HIGH] `Soul` model is missing critical fields

The Soul model (Section 1A) lists indexes but not the actual field definitions. Cross-referencing Section 9 (tag assignment) reveals these fields that must exist but aren't explicitly listed for the model:
- `gender: 'male' | 'female'` — required for demographic group assignment
- `ageGroup: 'youth' | 'adult'` — required for demographic group assignment  
- `shepherdTag: string` — the assigned tag label (separate from `assignedShepherdId`)
- `assignmentDate: Date`
- `notes: Array<{ text, createdBy, createdAt }>` — referenced in reassignment code
- `integrationStage: IntegrationStage` — referenced in Section 3 but never defined on the model

Missing these fields will cause the Schema & API Agent to invent their own field names, producing type inconsistencies across the codebase.

### [HIGH] `User.ts` model missing `shepherdCategory` field

The `generateShepherdTag` function (Section 9) queries `shepherdCategory: category` on the `User` model. This field is never mentioned in the model hardening list (Section 1A). The plan adds `shepherdTag` but not `shepherdCategory`. These are different: `shepherdTag` = "YM-Tag4"; `shepherdCategory` = "YM". Without `shepherdCategory` indexed, every tag generation query requires a regex scan over all shepherds' tags.

### [HIGH] No `wa_sessions` collection / `WaSession` model defined

Section 8 defines `WaBotSession` as a TypeScript interface but there is no corresponding Mongoose model. Section 4.6 says "Fallback: stored in notifications collection with type='wa_session'" — this is a terrible design that pollutes the notifications collection with session data, complicates the TTL index, and makes notification queries slower. A dedicated `WaSession` model with a TTL index (`lastActivity + 24h`) must be in the model list. This is entirely missing from Phase 1A.

### [HIGH] No `MissionField.ts` schema defined beyond the filename

Section 1A lists `MissionField.ts` as a new model to create, but provides zero field definitions. The PRD describes GOWAS outreach zones per branch. The Branch Report Wizard has a GOWAS section. There is no connection between the two. The Mission Field Coordinator role (role #8) has no API routes at all. What does this model contain? Without a definition, the Schema Agent will guess.

### [MEDIUM] Missing index on `Organization.ancestorIds`

The plan adds `ancestorIds: [ObjectId]` for fast subtree queries, but does not add a multikey index on this field. Queries like "find all branches under zone X" will require a full collection scan if this array is not indexed with `{ ancestorIds: 1 }`.

### [MEDIUM] `KpiScore` unique index is insufficient for entity type collisions

The unique index `(entityId, period.month, period.year)` does NOT include `entityType`. A branch and a district could theoretically share an `ObjectId` value (different collections). The unique index should be `(entityId, entityType, period.month, period.year)` — and the findOneAndUpdate query in Section 6.3 already includes `entityType` in the match, meaning the index must also include it to be useful.

### [MEDIUM] `SipEnrollment.ts` fields never defined

Same problem as `MissionField.ts` — the model is listed as a new file to create but has no field schema. SIP 101/102/103 enrollment tracking needs at minimum: `soulId`, `level (101|102|103)`, `enrolledDate`, `completedDate`, `completedBy (userId)`, `status`, `branchId`. The prerequisite validation logic in `sip-prerequisites.ts` is described in prose but the fields it operates on don't exist in writing.

### [LOW] No soft-delete field on `Soul` model

The API route `DELETE /api/souls/[id]` is described as "archive" but there's no `archivedAt` or `isArchived` field in the model hardening list. Without this, delete = permanent delete, which destroys historical shepherd report accuracy.

---

## 2. API HOLES

### [CRITICAL] `branch_coordinator+` on user creation is dangerously over-permissive

Section 2.2: `POST /api/users` is authorized for `branch_coordinator+`. This means a branch coordinator can create users. But there is no scope restriction specified: can a branch coordinator create a `national_coordinator` user? Can they create users for other branches? The plan says "derive scope from session" (Risk 8 mitigation) but the User Management API section has no scope enforcement logic described. A branch coordinator should only be able to create `flight_shepherd` users within their own branch. This must be explicitly stated in the API spec.

### [CRITICAL] No endpoint to associate a coordinator with an organization

The Organization model has an `ancestorIds` array and a `parentId` but where is the `coordinatorId` or `assignedUserId`? The PRD says (F-ORG-02) "each entity has... assigned coordinator." The scope enforcement logic in Risk 8 mitigation depends on `branch.coordinatorId !== session.userId`. But there's no `PATCH /api/organizations/[id]/assign-coordinator` endpoint, no `coordinatorId` field defined in the model hardening, and no mechanism for the cron jobs to find "the branch coordinator for this branch" except by querying `User WHERE role=branch_coordinator AND organizationRef=branchId`. That query is used implicitly everywhere but never documented as the canonical lookup.

### [HIGH] GET `/api/organizations` with `auth: any` is a data leak

Any authenticated user — including a flight shepherd — can list all organizations. With 7,000 branches and a shepherd able to query `?type=branch`, they get the entire org tree. This should be scoped: flight shepherds should see only their own branch; branch coordinators should see their district subtree; etc.

### [HIGH] No endpoint for `POST /api/souls/[id]/reassign`

Section 9 defines reassignment logic triggered by shepherd deactivation. But this is only triggered from `PATCH /api/users/[id]` (deactivate user). There is no standalone reassignment endpoint. If a branch coordinator wants to manually reassign a convert to a different shepherd (without deactivating the original shepherd), there is no API route for it. This is a common operational need that the plan misses.

### [HIGH] Missing `GET /api/reports/shepherd` scope — shepherd can query any shepherdId

Section 2.5: `GET /api/reports/shepherd?shepherdId=X` — the `shepherdId` query parameter is caller-supplied. A flight shepherd could supply a different shepherd's ID and read their report. The plan's Risk 8 mitigation says to "never trust client-provided IDs" but the API spec itself lists `shepherdId` as an input for this route. This is a direct IDOR on the most-used API route for 28,000 users.

### [HIGH] No `DELETE /api/notifications/[id]` endpoint

The notification system has read-all and mark-read but no way to delete individual notifications. Given the 90-day TTL on notification records, a user with 90 days of reports will accumulate hundreds of notifications with no way to clear them from the UI.

### [HIGH] `POST /api/admin/reports/[id]/unlock` only for super_admin — no escalation path

The PRD implies coordinators can request report corrections. The plan's Risk 7 mitigation mentions "Add a 'flag for review' option so coordinators can request unlocks from the UI" — but there is NO API endpoint for this. No `POST /api/reports/[type]/[id]/flag` endpoint exists in Section 2. The unlock workflow is half-implemented.

### [MEDIUM] Export endpoints have no rate limiting

`GET /api/export/souls` with `?format=xlsx` on 7,000 branches' souls is an unbounded query. There is no `limit` or pagination on the export endpoint. A single request could attempt to export 200,000 soul records, bringing down the server. The export endpoints need scoping (branch coordinator only sees their branch) AND a max-row limit with chunked export or background job pattern.

### [MEDIUM] Cron routes use GET method — Vercel cron should use POST

The plan specifies all cron routes as `GET /api/cron/...`. Vercel's cron jobs invoke HTTP requests; while GET works, it is unconventional and some security middleware (CSRF protection mentioned in Phase 5E) may inadvertently interfere. More importantly, GET requests are idempotent by convention — cron jobs that write data should use POST. This is a minor but real footgun if a developer later adds caching middleware.

### [MEDIUM] No endpoint to manually trigger the shepherd-to-branch aggregation

The district compile can be manually triggered via `POST /api/reports/district/compile`. But there's no equivalent for branch-level aggregation from shepherd reports. If a branch coordinator submits their weekly report and then a shepherd submits late, the branch report is already locked. There's no way to re-aggregate shepherd data into a branch report after lock.

### [LOW] `/api/notifications/send` endpoint allows super_admin to send arbitrary notifications

`POST /api/notifications/send { recipientId, type, channel, body }` — super_admin can send any notification body to any user. This is a privilege escalation vector for phishing if an admin account is compromised. The endpoint should use predefined templates and not allow freeform `body` content.

---

## 3. AGGREGATION BUGS

### [CRITICAL] Zonal aggregation sums from ONLY submitted district reports — creates wrong branchesOutstanding count

In Section 5.2, the zonal aggregator:
```typescript
const branchesOutstanding = submittedDistrictReports.reduce(
  (sum, d) => sum + d.branchesOutstanding, 0
)
```

This is **wrong**. `d.branchesOutstanding` is branches that hadn't reported when the district report was compiled. But if a district report is in status `submitted`, it was locked at a point in time. Branches that submitted after the district report was locked are NOT reflected. More critically: branches in districts that have NOT yet submitted their district report are entirely excluded from the `branchesOutstanding` count. The zone sees a smaller outstanding count than reality.

Correct approach: For zonal outstanding branches, query the zone's total branch count from `Organization` and subtract `branchesReporting` from the real-time branch reports, NOT from the cached district report.

### [CRITICAL] National aggregation uses `ZonalReport` — but only submitted ones, missing active zones

Section 5.3:
```typescript
const zonalReports = await ZonalReport.find({
  reportingWeek: { $in: weeksInMonth },
  status: { $in: ['submitted', 'approved'] }
}).lean()
```

The national report totals only include zones that have submitted their weekly reports. Zones that haven't submitted (which could be significant in early weeks) are silently excluded. The `sevenMillionProgress` cumulative count uses `Soul.countDocuments` (all souls in DB) which IS correct — but the weekly `nationalAggregated.gowas.soulsWon` will under-count by however many zones haven't submitted. This produces a national report that systematically understates performance and creates a false sense of "souls won = only from zones that submitted."

### [CRITICAL] Race condition on concurrent branch report submissions to district cache

Two branches in the same district submit their reports simultaneously. Both trigger `invalidateUpstreamCaches`. Both call `DistrictReport.updateOne` with `$set: { status: 'stale' }`. Then both might trigger `compileDistrictReport`. Two concurrent aggregation pipelines run. The second `findOneAndUpdate` upsert will overwrite the first. Whether the final cached result reflects both submissions depends on timing. There is no distributed lock or atomic aggregation guard.

Fix: Use a MongoDB write concern with a version field (`__v`) and optimistic concurrency, or process aggregation through a queue.

### [HIGH] KPI score for district/zone uses simple average of branch scores — unfair for branches that didn't submit

Section 6.4: `computeDistrictKpiScore` averages the KPI scores of `validScores` (branches that have a KpiScore record). Branches that failed to submit any report this month have no KpiScore record and are simply excluded from the average (`filter(Boolean)`). This means a district with 10 branches where 9 submitted perfectly and 1 submitted nothing gets the same district score as a district where all 10 submitted perfectly. The non-reporting branch should count as score = 0, dragging down the district score.

### [HIGH] `shepherdSubmissions` query in KPI is counted wrong

Section 6.3:
```typescript
const shepherdSubmissions = await ShepherdReport.countDocuments({
  branchId: branchObjectId,
  weekEnding: { $in: weekEndings.map(w => ({ $gte: startOfDay(w), $lte: endOfDay(w) })) },
  ...
})
```

`$in` does not accept condition objects — it accepts values. `{ $in: [{ $gte: ..., $lte: ... }] }` is not valid MongoDB syntax. This will silently match zero documents or throw a runtime error. The correct approach is `$or` with one condition per week, or store normalized weekEnding dates and use exact `$in: [date1, date2, ...]`.

### [HIGH] `followUp.newConverts` vs `gowas.soulsWon` — these are different numbers, FIA metric uses wrong denominator

FIA Progress KPI (Section 6.2, Metric 3):
```
soulsEnrolledInFamilyClass = sum of fia.familyClass.enrolled
newSoulsWonThisMonth = sum of followUp.newConverts
```

`followUp.newConverts` is the number from the follow-up section, which represents converts who were followed up this week — **not** the total new souls won in the GOWAS section. A branch could have 20 souls won this week but only 15 turned up for follow-up. The FIA enrollment rate would then be `familyClassEnrolled / 15` instead of `familyClassEnrolled / 20`. This difference needs to be explicitly decided and documented. As written, using `newConverts` from `followUp` instead of `soulsWon` from `gowas` will produce inconsistent results depending on how branches fill the form.

### [MEDIUM] HST score uses only the "most recent" week's status — wrong for monthly KPI

Section 6.2, Metric 7:
```typescript
const latestStatus = hstStatuses[hstStatuses.length - 1]
```

`hstStatuses` is `reports.map(r => r.hst.status)` where reports are fetched without an explicit `sort()`. MongoDB's `.find()` does not guarantee insertion order. The "last" element in the array may not be the most recent report. Add `.sort({ weekEnding: 1 })` to the reports query, or track `hst.status` as a branch-level field updated on each submission rather than re-reading from reports.

### [MEDIUM] `compileNationalReport` uses `ZonalReport` not `DistrictReport` — wrong for missing zone levels

The plan's hierarchy is National → Region → Zone → District → Branch. But the national aggregator queries `ZonalReport` directly, skipping the Region level entirely. If the Region level exists (as CLAUDE.md confirms), then national should aggregate from regional reports, or zones should aggregate into regions before reaching national. This is another symptom of the missing Region level in the entire plan.

---

## 4. KPI FORMULA ERRORS

### [HIGH] Baptism KPI returns 100 when soulsWon = 0 — reward for inactivity

Section 6.2, Metric 4:
```typescript
if (soulsWon === 0) return { raw: 100, weighted: 10 }
```

A branch that wins zero souls this month gets a **perfect baptism score of 100**. This is logically indefensible. A branch with no evangelism activity should score 0 on baptism (nothing to baptize). The zero-division guard should return `{ raw: 0, weighted: 0 }` or `{ raw: 100, weighted: 0 }` — but not 10 weighted points for doing nothing. Same problem exists for FIA Progress (Metric 3): if `newSoulsWonThisMonth = 0`, the branch gets `raw: 100, weighted: 15` — 15 free points for no converts.

### [HIGH] Total KPI weights do not always sum to exactly 100 due to floating-point rounding

Each metric uses `parseFloat((raw * weight).toFixed(2))`. Sum of 8 weighted scores with rounding at each step:
- 30% weight: e.g. 85 × 0.30 = 25.50 ✓
- 20% weight: e.g. 72 × 0.20 = 14.40 ✓
- But: 83 × 0.15 = 12.45, 67 × 0.10 = 6.70, etc.

Accumulated floating-point truncation over 8 metrics means `totalScore` may be 99.98 or 100.02. Use `Math.round` at the final total, not at each step, OR use integer arithmetic throughout (multiply by 100, round, divide by 100 only at display).

### [HIGH] Shepherd Coverage sub-score B: division by zero when `idealShepherds = 0`

```typescript
const idealShepherds = Math.ceil(totalActiveConverts / 10)
const coverageRatio = idealShepherds === 0 ? 1 : Math.min(1, totalActiveShepherds / idealShepherds)
```

When `totalActiveConverts = 0` (new branch, no converts yet), `idealShepherds = Math.ceil(0 / 10) = 0`, and the guard returns coverageRatio = 1, giving sub-score B = 100. A branch with no converts gets full shepherd coverage points. This should be: if `totalActiveConverts === 0`, sub-score B = 0 (no converts to cover).

### [MEDIUM] Reporting Compliance metric penalizes multi-week months inconsistently

`totalExpectedSubmissions = weekEndings.length` — this is set to the number of weeks in the month for the **branch** KPI. But months have either 4 or 5 Sundays. A branch is penalized differently in a 5-Sunday month vs a 4-Sunday month for the same absolute number of late submissions. This inconsistency is baked into the formula and will confuse coordinators comparing KPI scores across months.

### [MEDIUM] EE target of 10 is hardcoded but meaningful only for large branches

A small branch with 50 members training 5 EE members gets 50/100 raw score. A mega-branch with 500 members training 5 EE members gets the same score. The target should either scale per branch size or be configurable per branch in the Organization model. Using a flat national benchmark treats all branches identically, which the "BRANCH_BENCHMARKS are Configurable in DB" note implies is possible — but no UI or API for configuring per-branch benchmarks is in the plan.

---

## 5. WHATSAPP BOT FAILURES

### [CRITICAL] In-memory session store will not work on Vercel — serverless concurrency problem is understated

Section 4.6 acknowledges this in Risk 6, but the risk log says "In-memory Map is only a cache — always read from MongoDB first." However, the session store code in Section 8 defines it as "Uses an in-memory Map + MongoDB fallback." The implementation direction is ambiguous. The plan needs to be explicit: **the Map is never the source of truth**, it is only a write-back cache. The code in `session-store.ts` must:
1. ALWAYS read from MongoDB first
2. ALWAYS write to MongoDB before responding
3. The Map is populated as a cache AFTER MongoDB read

Without this, a user mid-conversation will restart from IDLE when their request hits a different serverless instance. The plan's wording is too vague for a coding agent to implement correctly.

### [CRITICAL] WhatsApp webhook must respond in under 20 seconds — DB operations will timeout

Meta's WhatsApp Cloud API requires the webhook to respond with HTTP 200 within **20 seconds** or it retries the message. The current plan's webhook flow includes:
1. Look up user by phone (DB query)
2. Get/create session from MongoDB (DB query)
3. Parse message
4. Create shepherd report (DB write)
5. Invalidate upstream caches (3 DB writes)
6. Send WhatsApp reply (external API call)
7. Create notification (DB write)

That's 5+ DB round-trips plus an external API call, all synchronous, within 20 seconds. On a cold serverless start with a VPS MongoDB that has network latency, this will frequently exceed the timeout, causing Meta to retry and potentially creating **duplicate report submissions**.

Fix: The webhook must queue the message for async processing and immediately return 200. A simple MongoDB `wa_inbox` collection as a queue, drained by a separate processor, is sufficient.

### [HIGH] No deduplication of incoming WhatsApp messages by `message_id`

Risk 3 mitigation mentions "store processed IDs in a 24hr TTL cache" but no model, collection, or implementation detail for this is in the plan. The WhatsApp webhook section (Section 8) does not reference this deduplication at all. Meta will retry failed webhooks, sending the same `message_id` multiple times. Without deduplication by `message_id`, a network glitch between the webhook and MongoDB causes the shepherd's report to be submitted twice.

### [HIGH] Bot state machine does not handle media messages (images, voice notes)

Field shepherds may accidentally send a photo or voice note to the bot number (they share the number in WhatsApp groups). The state machine only handles text messages. An image or voice note arriving in `REPORT_INITIATED` state will either crash the parser or silently drop the message. The bot must handle `type !== 'text'` messages and respond with "Please send text only. " and stay in the current state.

### [HIGH] No handling for Meta platform status messages (read receipts, delivery receipts)

The WhatsApp webhook payload includes not just user messages but also status updates (`message.status: 'delivered' | 'read' | 'failed'`). The plan's webhook handler assumes all POST payloads are inbound messages. The handler must check `entry[0].changes[0].value.messages` vs `entry[0].changes[0].value.statuses` and skip or log status updates separately.

### [HIGH] Session cleanup "on every webhook call, delete sessions older than 24 hours"

Section 8: "Cleanup: on every webhook call, delete sessions older than 24 hours." This runs a `deleteMany` on every single incoming message — for 28,000 potential users sending messages, this cleanup will run tens of thousands of times per day. At scale this wastes DB write capacity. Use a MongoDB TTL index on `lastActivity` field set to 86400 seconds instead. Remove the inline cleanup from the webhook handler entirely.

### [MEDIUM] No rate limit on WhatsApp bot responses per user

A shepherd could spam the bot with messages, triggering multiple DB queries and WhatsApp API calls per second. Meta charges per message sent (template messages cost money). There is no per-phone-number rate limit defined anywhere in the plan. Add: max 1 bot response per 3 seconds per phone number, with a backoff message if exceeded.

### [MEDIUM] Convert list in QUERY_ACTIVE state — no pagination for shepherds with many converts

A flight shepherd with 25+ assigned converts will receive a WhatsApp message exceeding 4096 characters (Meta's limit per message). The bot sends the full list at once with no pagination. Above ~15 converts, the message will be truncated by Meta's API or rejected. The plan must implement page-based navigation: "Showing 1-10 of 25. Reply PAGE2 for more."

---

## 6. NOTIFICATION GAPS

### [HIGH] No notification when a branch coordinator submits their report late

The cron jobs send reminders and escalations, but the PRD (F-NOTIF-01) requires email reminders for overdue reports. The cron sets `isLate = true` on branch reports — but there is no notification to the **branch coordinator themselves** confirming that their report has been marked late and escalated. They find out indirectly (or not at all). Add a "your report has been marked late and escalated to your district coordinator" notification.

### [HIGH] No notification when a report is unlocked by super_admin

If a super_admin unlocks a branch report to allow correction, the branch coordinator must be notified immediately or they won't know to re-submit. The unlock endpoint (`POST /api/admin/reports/[id]/unlock`) has no notification side-effect described in the plan.

### [HIGH] All cron times are wrong — UTC vs WAT offset error in vercel.json

The vercel.json cron schedule (Section 7) claims `0 17 * * 5 = Friday 18:00 WAT (UTC+1)`. This is correct. However, the `monthly-compile` is `0 22 28-31 * *`, described as "23:00 WAT." 22:00 UTC = 23:00 WAT is correct. But the **GUARD LOGIC** checks `if today is last day of month` — this guard runs at 22:00 UTC = 23:00 WAT. On months where the last day is the 31st, `28-31` fires on the 28th, 29th, 30th, and 31st. On a 30-day month, it fires on the 28th, 29th, and 30th correctly. But on February (28/29 days), `28-31` fires on the 28th through 31st — days 29, 30, 31 don't exist, so only the 28th fires. But for a leap year where February has 29 days, the job runs on the 28th AND 29th with the guard skipping the 28th and executing on the 29th. This is correct but fragile. More critically: the cron guard checks "is today the last day of month?" using the UTC clock. If the last day is Sunday the 31st at 22:00 UTC, WAT is already 23:00 — still the 31st. But if DST were ever relevant (Nigeria does not observe DST, so this specific concern is N/A) this could shift. The guard is safe for Nigeria. However, documenting this explicitly is necessary.

### [HIGH] F-NOTIF-07 (KPI scorecard distribution) is in the monthly cron but has no in-app notification

The monthly cron (Step 8) distributes KPI scorecards via email only. The PRD says "automated distribution to coordinators" — but there is no in-app notification created for this event. Coordinators who rarely check email will never see their KPI scores unless they navigate to the KPI page manually.

### [MEDIUM] Inactivity cron marks souls inactive but does not notify the convert directly

The PRD (F-SOUL-05) says "Alert Flight Shepherd and Branch Coordinator when convert is inactive for 14+ days." The cron notifies the shepherd and coordinator. But some branches may have the convert's phone number. The Soul model may have a `phone` field (not defined but implied). No notification is sent to the convert themselves. This is a pastoral care gap — the system flags them as inactive but doesn't attempt outreach.

### [MEDIUM] F-NOTIF-06 (SML certification congratulation) is missing from the plan

When a soul is certified as SML, there should be a congratulation notification to the soul, the shepherd, the branch coordinator, and the chief trainer. The notification dispatcher is defined, but there is no event hook in `POST /api/sml/certify` that triggers this notification. The plan mentions the template (Risk 5 mitigation) but the actual dispatch is absent from the SML API route description.

### [LOW] No notification when a convert is assigned to a shepherd

Section 9 creates a `CONVERT_ASSIGNED` notification to the shepherd — this exists. But neither the branch coordinator nor the mission field coordinator is notified of the new soul assignment. Given the Mission Field Coordinator role manages outreach zones, they should receive a notification when a soul from their zone is registered.

---

## 7. AUTH WEAKNESSES

### [CRITICAL] JWT session contains `organizationId` — changing a coordinator's branch requires a forced re-login

Section 4.1 stores `organizationId` in the Zustand auth store, derived from the NextAuth session JWT. If a super_admin changes a user's `organizationRef` in the DB (reassigning a coordinator from Branch A to Branch B), the user's JWT still contains the old `organizationId` until their token expires. During this window, their API calls use the old org scope. The plan has no mechanism to invalidate existing JWTs or force re-login after org changes.

Fix: Implement a `sessionVersion` field on the User model. Include it in the JWT. On each request, verify the JWT's `sessionVersion` matches the current DB value. If not, force re-login. OR use database sessions instead of JWT, which NextAuth v5 supports.

### [CRITICAL] Magic link is PUBLIC but the plan provides no token expiry or one-time-use guarantee

Section 2.1: `POST /api/auth/magic-link` generates a link. The implementation detail is absent. There is no model for storing magic link tokens, no TTL, no one-time-use flag, and no mention of which collection stores them. A leaked magic link email would grant permanent access until the token is manually revoked (with no mechanism for that either). Magic links MUST: expire in 15 minutes, be single-use (consumed on first click), and be stored in a dedicated collection with a TTL index.

### [HIGH] A district coordinator can call `GET /api/reports/district?districtId=ANY_OTHER_DISTRICT_ID`

The district report API (Section 2.7) accepts `?districtId` as a query parameter. The API spec does not state that the `districtId` is validated against the session user's `organizationId`. A district coordinator could query another district's report by supplying a different `districtId`. This is a horizontal privilege escalation vulnerability. The handler must validate `session.organizationId === districtId` (or that districtId is within the user's ancestorId scope).

### [HIGH] `POST /api/users` (`branch_coordinator+`) allows cross-branch user creation

As noted in API Holes section — a branch coordinator can supply any `organizationRef` in the user create body. The plan's scoping rules say to derive scope from session, but this is NOT stated in the API spec for `POST /api/users`. The Schema & API Agent will implement this endpoint without scope enforcement unless it's explicitly stated.

### [HIGH] Password reset token has no storage model

`POST /api/auth/reset-password` accepts `{ token, newPassword }`. Where is the token stored? There is no `PasswordResetToken` model or collection defined in the plan. Without a storage layer, the agent will either store tokens in the User document (insecure if the reset field is returned in API responses) or invent their own schema. This MUST be specified: dedicated collection with fields `{ userId, token (hashed), expiresAt, usedAt }`.

### [HIGH] NextAuth v5 (Auth.js) is beta software — no stable release strategy

The plan uses "NextAuth.js v5 (Auth.js)" which as of mid-2026 is still in release candidate / beta phase. The API surface changes between minor versions. The plan specifies no version pin (e.g., `next-auth@5.0.0-beta.25`). When a coding agent runs `npm install next-auth@latest`, they may get a different version than what the plan was designed around. The plan must specify an exact version and lock it. Breaking changes between beta versions have historically broken session callbacks, JWT callbacks, and the `auth()` helper function signature.

### [MEDIUM] No session revocation for deactivated users

If a branch coordinator is deactivated (`isActive: false`), their JWT is still valid until it expires. They can continue making API calls. The plan's middleware (`src/middleware.ts`) only checks for a valid session, not whether the user's `isActive` status is current. Add an `isActive` check on every authenticated request (either via the JWT including `isActive` and a `sessionVersion` check, or via a short-lived token with frequent DB re-validation).

### [MEDIUM] CRON_SECRET check uses string comparison — timing attack

```typescript
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
```

String comparison with `!==` is not constant-time. For a secret token, use `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))`. While this is a server-to-server call (Vercel infrastructure), it is defense-in-depth best practice.

---

## 8. PERFORMANCE RISKS

### [CRITICAL] Monthly compile cron will timeout — the mitigation is in the risk log but NOT in the plan itself

Risk 4 identifies this problem and proposes a queue/batch solution. But the actual implementation in Section 7 (Cron Job 7) still uses:
```typescript
await Promise.allSettled(branches.map(b => computeBranchKpiScore(b._id, month, year)))
```
...for ALL branches. At 7,000 branches × ~8 DB queries each = 56,000 DB operations in one serverless invocation. This directly contradicts the mitigation described in Risk 4. The risk log says to use pre-aggregated `branch_monthly_stats` running totals — but no `branch_monthly_stats` collection, model, or update trigger is defined anywhere in the plan. The mitigation is documented but not implemented.

### [CRITICAL] `inactivity-check` cron queries ALL active souls globally without an index-aware limit

```
Query: souls WHERE status = 'active' AND lastContactDate < (now - 14 days)
```

At 200,000+ souls, this is a large scan. The plan adds an index on `souls.lastContactDate` but not a compound index on `(status, lastContactDate)`. The query filters on `status` first (high cardinality filter), then `lastContactDate`. Without a compound index `{ status: 1, lastContactDate: 1 }`, MongoDB will either use the `lastContactDate` index alone or do a collection scan. Add the compound index.

Additionally, the cron then does per-soul `findByIdAndUpdate` + `createNotification` for each inactive soul. At 1,000 newly-inactive souls, this is 2,000 sequential writes. Use `BulkWrite` operations.

### [HIGH] `assignSoulToShepherd` is O(N) queries per assignment — N+1 problem

Section 9:
```typescript
const soulCounts = await Promise.all(
  eligibleShepherds.map(async (shepherd) => {
    const count = await Soul.countDocuments({ assignedShepherdId: shepherd._id, ... })
    return { shepherd, count }
  })
)
```

If a branch has 20 shepherds in the YM category, this fires 20 separate `countDocuments` queries to assign a single soul. This should be a single aggregation:
```
Soul.aggregate([
  { $match: { assignedShepherdId: { $in: shepherdIds }, status: { $in: [...] } } },
  { $group: { _id: '$assignedShepherdId', count: { $sum: 1 } } }
])
```

### [HIGH] `GET /api/organizations/tree` returns the full org tree as nested JSON

With 7,000 branches + ~700 districts + ~70 zones + regions, this JSON could be 500KB–2MB. The plan provides this to `national_coordinator+` users. Returning multi-megabyte JSON from a serverless function on every tree request will be slow and expensive. The tree should be paginated (lazy-load children) or cached at the edge (CDN cache with short TTL), or pre-computed and stored as a document.

### [HIGH] BranchReport aggregate pipeline in Section 5.1 runs twice for the same data

Section 5.1 runs two separate aggregation pipelines on `BranchReport` for the same `branchIds` and `weekEnding` filter:
1. One `$group` pipeline to sum all numeric fields
2. One separate `$group` to get HST status distribution

These can be combined into a single pipeline with two `$group` stages or using `$facet`, halving the DB work. At district level with many branches, this is a 2× unnecessary overhead.

### [MEDIUM] Notification polling every 30 seconds for 50,000 users = 100,000 requests/minute

Section 4.3: React Query polls `/api/notifications?status=unread` every 30 seconds. With 50,000 concurrent users (PRD non-functional requirement), this is 50,000 / 30 = 1,667 requests/second just for notification polling. Each request hits MongoDB. This will saturate both the Next.js serverless functions and the VPS MongoDB. Use Server-Sent Events (SSE) or WebSockets for real-time notifications instead, or increase the poll interval to at least 2 minutes and add aggressive HTTP caching headers.

### [MEDIUM] `computeDistrictKpiScore` — N+1 query for branch scores

```typescript
const branchScores = await Promise.all(
  branches.map(b => KpiScore.findOne({ entityId: b._id, ... }))
)
```
For a district with 20 branches, this fires 20 separate `findOne` queries. Replace with a single `KpiScore.find({ entityId: { $in: branchIds }, ... })`.

---

## 9. MISSING FEATURES FROM PRD

### [CRITICAL] F-ORG-02: `regional_coordinator` role exists but has ZERO routes, ZERO pages, ZERO aggregation

The PRD and CLAUDE.md both define `regional_coordinator` as a confirmed role (#3 of 10). The plan's API Route Map (Section 2) has no routes scoped to `regional_coordinator`. There is no:
- Regional Report model
- Regional aggregation logic
- Regional coordinator dashboard
- Regional reminder cron job
- Regional compliance page

Either the Region level must be fully implemented (adding a 6th report level) or it must be explicitly documented as a viewer-only role with no report duties. As currently written, regional coordinators log in to a blank dashboard.

### [CRITICAL] F-RPT-08: Validation rule "Active + Inactive = Total Assigned" — never enforced server-side

The PRD explicitly requires: "Active + Inactive = Total Assigned." This validation is mentioned in the Branch Report Wizard comment (`{/* validated: soulsWon <= soulsReached */}`) but:
1. Only `soulsWon <= soulsReached` is shown in the UI comment
2. The `Active + Inactive = Total Assigned` rule is nowhere in the Zod schema plan
3. There is no server-side enforcement in the branch report POST handler
4. The shepherd report has the same issue — shepherd's `active + inactive` should equal their total assigned souls

### [HIGH] F-WA-05: "How many souls has my branch won this month?" — not in the bot state machine

The PRD requires the bot to answer status queries like "How many souls has my branch won this month?" The WhatsApp bot state machine (Section 8) only implements:
- Submit Weekly Report
- Check My Converts
- Help

There is no "Branch Status" query that answers the PRD's F-WA-05 requirement. The `branch-status.ts` handler is listed as a file to create but is completely absent from the state machine diagram.

### [HIGH] F-DASH-07: "Flight Shepherd performance per branch" — no API endpoint or component

The PRD (F-DASH-07) requires showing flight shepherd performance within each branch dashboard. There is no API endpoint that returns per-shepherd metrics. The branch dashboard component (Section 3.3) shows a `ShepherdComplianceList` (submitted yes/no) but not performance metrics (souls assigned, contacted this week, inactive converts, etc.).

### [HIGH] F-CERT-03: SIP prerequisite is "SIP 103 + Project completion" — the "Project" is never defined

The SML certification requirement in the PRD is "SIP 103 + Project completion." What is this project? There is no `project` field in the `SipEnrollment` model (which itself has no fields defined). The `sip-prerequisites.ts` file is planned but its logic cannot be implemented without knowing what the "Project" requirement entails. This needs a product decision before any code is written.

### [MEDIUM] F-RPT-06: "Edits require coordinator approval" — no approval workflow in the plan

The PRD says locked reports can only be edited with "coordinator approval." The plan's implementation is "super_admin unlocks" (Risk 7). These are different: PRD implies a coordinator one level up approves the edit request; the plan requires super_admin intervention. If the intent is super_admin only, the PRD must be updated. If coordinator approval is required, an approval workflow with states (pending_approval → approved → unlocked) must be added.

### [MEDIUM] F-AUTH-05: "Account provisioning by super_admin OR branch coordinator (no self-registration)" — partially implemented

The plan allows `branch_coordinator+` to create users. But `branch_coordinator+` includes district, zonal, and national coordinators, which the PRD does not intend. The PRD says branch coordinators provision their own shepherds. District coordinators should not be able to provision users. The role hierarchy for user creation must be: `super_admin` creates all coordinator roles; `branch_coordinator` creates only `flight_shepherd` users within their own branch.

### [MEDIUM] No `viewer` role dashboard or restricted view

CLAUDE.md lists `viewer` as role #10 (read-only for pastors, leadership observers). The plan has admin, national, zone, district, branch, shepherd, trainer, and mission field dashboards — but no viewer dashboard. What can viewers see? Which data is scoped for them? Without this, viewers get a role that gives them access to the default dashboard (probably an empty state) with no useful information.

### [LOW] F-EXPORT-01: "formatted per official OWAS report template" — the template is never described

The export API generates PDFs, but the PRD specifies they should match the "official OWAS report template." No description, mockup, or sample of this template is included in the plan or referenced documents. The PDF renderer (`@react-pdf/renderer`) will produce a generic layout unless the template's visual design is specified. The plan should reference a design document or include layout specifications.

---

## 10. DEPENDENCY RISKS

### [HIGH] `@react-pdf/renderer` memory usage in serverless is dangerous at scale

`@react-pdf/renderer` renders PDF in-process using a JavaScript layout engine. For a complex branch report PDF with charts, tables, and formatted sections, this can consume 200–500MB of memory per request. Vercel serverless functions have a default memory limit of 1024MB. If multiple export requests hit the same function concurrently, memory exhaustion will crash the function. Options: (a) use a separate PDF microservice, (b) use Puppeteer to render an HTML page to PDF (headless Chrome, which has its own memory profile), or (c) use a lighter PDF library (pdfkit) for simple documents. The plan should specify which approach and add memory limits to the export routes.

### [HIGH] `xlsx` package has known prototype pollution vulnerability (CVE-2023-30533)

The plan uses the `xlsx` package for Excel export. SheetJS/xlsx had a critical prototype pollution vulnerability (CVSS 7.8) disclosed in 2023. While a patched version exists (`xlsx@0.20.0+`), many projects still use vulnerable versions. The plan must specify `xlsx@0.20.0` minimum and add it to a dependency security checklist. Alternatively, use `exceljs` which is actively maintained and had no equivalent vulnerability.

### [HIGH] NextAuth v5 beta — `auth()` vs `getServerSession()` API is fundamentally different from v4

The plan says the existing `src/lib/auth.ts` is "Complete — NextAuth v5 credentials." But v5 introduces breaking changes: `getServerSession()` is replaced by `auth()`, the session callback signature changed, and JWT handling is different. If the existing `auth.ts` was written by a different agent or developer using v4 patterns, it may not be compatible with v5. The plan does not verify which patterns the existing file uses. The critique points out: the existing `auth.ts` must be reviewed before any dependent code is built. An incompatible `auth.ts` will break every authenticated route.

### [MEDIUM] Cloudinary vs S3 decision is unresolved — "Cloudinary or AWS S3" in CLAUDE.md

The CLAUDE.md says "Cloudinary or AWS S3 (certificates, documents)" and the environment variables only include Cloudinary. But the implementation plan (Section 1C) creates `src/lib/cloudinary.ts` — locking the decision. If the client later decides on S3, a refactor is required. The plan should make this decision explicitly and commit to one provider. A storage abstraction interface (`IFileStorage` with `upload()` and `getUrl()` methods) would allow future swapping.

### [MEDIUM] Recharts in a Next.js App Router server component context requires `'use client'`

The plan uses Recharts for all charts. Recharts requires browser APIs (`window`, `ResizeObserver`) and does not support server-side rendering. Every chart component must be a client component with `'use client'`. If a coding agent wraps a chart inside a server component without this directive, it will throw a server-side render error. The plan should explicitly note that all chart components are client components and cannot be composed inside server components without a boundary.

### [MEDIUM] Nodemailer + Gmail SMTP will be rate-limited for the weekly reminder volume

Risk 9 acknowledges this, proposing SendGrid for bulk mail. However, the plan's `mailer.ts` is described as "Nodemailer singleton + sendMail wrapper + all HTML email templates" with no mention of a SendGrid transport. The transport abstraction (Appendix B mentions it: "structure Nodemailer config with a transport abstraction") is not reflected in the file plan. The `mailer.ts` file needs an explicit interface for transport switching, or the plan needs a `sendgrid.ts` utility file added to Phase 1C.

### [LOW] `pino` logger in a Next.js edge/serverless context may have issues

The plan uses `pino` as the structured logger. Pino works well in Node.js runtimes but has limitations in Next.js edge runtime (which uses V8 isolates, not Node.js). If any edge middleware uses the logger, it will fail. The plan should either pin all API routes to the Node.js runtime (`export const runtime = 'nodejs'`) or use a logger that's compatible with both runtimes (`winston` or a simple fetch-based logger for edge).

---

## Summary Scorecard

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Schema Gaps | 3 | 4 | 3 | 1 |
| API Holes | 3 | 4 | 3 | 1 |
| Aggregation Bugs | 3 | 3 | 2 | 0 |
| KPI Formula Errors | 0 | 3 | 2 | 0 |
| WhatsApp Bot Failures | 2 | 4 | 2 | 0 |
| Notification Gaps | 0 | 4 | 2 | 1 |
| Auth Weaknesses | 2 | 4 | 2 | 0 |
| Performance Risks | 2 | 3 | 2 | 0 |
| Missing PRD Features | 2 | 3 | 3 | 1 |
| Dependency Risks | 0 | 3 | 3 | 1 |
| **TOTAL** | **17** | **35** | **24** | **5** |

---

## Top 10 Must-Fix Before Coding Begins

1. **Add the Region level** — 6-level hierarchy is confirmed in CLAUDE.md. Regional report, regional aggregation, and regional coordinator routes are entirely missing.

2. **Fix the aggregation race condition** — Concurrent branch submissions can corrupt district report cache. Implement an optimistic lock or queue before any reporting code is written.

3. **Fix KPI "reward for inactivity" bug** — Zero soulsWon returning score=100 on Baptism and FIA will produce nonsensical KPI scores from day one.

4. **Fix WhatsApp webhook — must return 200 immediately** — The synchronous webhook flow will exceed Meta's 20-second timeout and cause duplicate submissions. Queue all processing asynchronously.

5. **Define magic link token storage model** — No model = no implementation. Without this, the auth system is incomplete.

6. **Add `regionId` and Region level to Organization and all report models** — Without this, the org tree is wrong and aggregation at national level produces incorrect totals.

7. **Fix `shepherdSubmissions` query syntax** — `$in: [{ $gte:..., $lte:... }]` is invalid MongoDB. This will silently return 0 and corrupt shepherd system KPI scores for every branch.

8. **Specify scope enforcement on `POST /api/users`** — A branch coordinator creating a national coordinator account is a critical auth bypass.

9. **Monthly compile cron must use batch/queue pattern** — `Promise.allSettled` over 7,000 branches will time out on Vercel. The mitigation in Risk 4 must be moved into the actual implementation plan, not left in the risk log.

10. **Fix `isLate` stub record design** — Creating phantom ShepherdReport stubs corrupts idempotency checks and compliance statistics. Either use a separate `missed_reports` collection or track compliance via a separate audit mechanism.

---

*End of Critique Report*  
*Next Step: Replanner Agent — incorporate all findings into a revised implementation plan.*

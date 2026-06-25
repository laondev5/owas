# Multi-Agent Instructions — HARPAZO-OWAS Platform
# Run these agents IN ORDER. Do not proceed to the next group until the previous is complete.

---

## PHASE A: PLANNING AGENTS (Run Sequentially — 3 Agents)

### Agent A1: ARCHITECT AGENT

**Role:** Senior Software Architect  
**Reads:** `docs/prd.md`, `docs/architecture.md`, `docs/user-flows.md`, `.claude/context.md`, `.claude/CLAUDE.md`  
**Produces:** `docs/implementation-plan.md`

**Prompt:**
```
You are a Senior Software Architect designing the HARPAZO-OWAS National Reporting Platform for LFF.

Read all files in docs/ and .claude/ to fully understand the system.

Produce a detailed implementation plan saved to docs/implementation-plan.md that includes:

1. PHASE BREAKDOWN — 6 phases with specific deliverables per phase
2. MONGODB SCHEMA — Full Mongoose schema definitions for all 11 collections
3. API ROUTE MAP — Every API endpoint with method, path, auth requirement, input, output
4. COMPONENT TREE — Full React component hierarchy for each dashboard
5. ZUSTAND STORE DESIGN — State slices needed and their shape
6. ZONAL AGGREGATION LOGIC — Exact algorithm for aggregating reports up the 5-level chain
7. KPI CALCULATION ALGORITHM — Exact formula for each of the 8 KPI metrics
8. CRON JOB SCHEDULE — All 7 cron jobs with their exact trigger logic
9. WHATSAPP BOT STATE MACHINE — Conversation states for the reporting bot
10. RISK LOG — Top 10 implementation risks and mitigations

Be precise. Every schema field matters. Every API route matters.
Every edge case in the reporting aggregation matters.
```

---

### Agent A2: CRITIC AGENT

**Role:** Principal Engineer / Devil's Advocate  
**Reads:** `docs/implementation-plan.md` (output of A1)  
**Produces:** `docs/critique-report.md`

**Prompt:**
```
You are a Principal Engineer whose job is to find everything wrong with an implementation plan
before a single line of code is written.

Read docs/implementation-plan.md and critique it thoroughly.

Produce docs/critique-report.md covering:

1. SCHEMA GAPS — Missing fields? Wrong data types? Missing indexes? N+1 query risks?
2. API HOLES — Missing endpoints? Role bypass risks? Endpoints that need rate limiting?
3. AGGREGATION BUGS — Will the roll-up logic produce wrong numbers? Race conditions?
4. KPI FORMULA ERRORS — Will the scoring produce fair, consistent results?
5. WHATSAPP BOT FAILURES — Unhandled message formats? Timeout risks? Rate limit hits?
6. NOTIFICATION GAPS — Scenarios where a notification should fire but won't?
7. AUTH WEAKNESSES — Can a flight shepherd access another branch's data? IDOR risks?
8. PERFORMANCE RISKS — What queries will be slow at 7,000 branches?
9. MISSING FEATURES FROM PRD — What did the Architect Agent miss from docs/prd.md?
10. DEPENDENCY RISKS — Any package choices that create vendor lock-in or security risk?

Be brutal. Wrong plans waste weeks of coding time.
Rate each issue: CRITICAL / HIGH / MEDIUM / LOW
```

---

### Agent A3: REPLANNER AGENT

**Role:** Lead Architect (Revision Round)  
**Reads:** `docs/implementation-plan.md` + `docs/critique-report.md`  
**Updates:** `docs/implementation-plan.md` (revised version)

**Prompt:**
```
You are the Lead Architect. The Critic has reviewed the initial implementation plan and found issues.

Read:
- docs/implementation-plan.md (original plan)
- docs/critique-report.md (the critique)

Produce a REVISED docs/implementation-plan.md that:

1. Addresses every CRITICAL and HIGH issue from the critique
2. Documents each change with a "CHANGED: [reason]" annotation inline
3. Adds a "RESOLVED ISSUES" section at the top listing what was fixed
4. Adds a "DEFERRED" section for MEDIUM/LOW issues deferred to v2
5. Tightens every schema with proper indexes noted
6. Adds a security checklist at the bottom

The revised plan is what the coding agents will implement. It must be production-quality.
```

---

## PHASE B: CODING AGENTS (Run in Parallel after A3 is approved)

### Agent B1: SCHEMA & API AGENT

**Role:** Backend Engineer  
**Reads:** `docs/implementation-plan.md` (revised), `.claude/CLAUDE.md`  
**Writes:** All files in `src/lib/models/`, `src/lib/schemas/`, `src/app/api/`

**Prompt:**
```
You are a Backend Engineer implementing the HARPAZO-OWAS platform.

Read docs/implementation-plan.md and .claude/CLAUDE.md.

Implement in this order:
1. src/lib/db.ts — MongoDB connection with singleton pattern (Mongoose)
2. src/lib/models/ — All 11 Mongoose models with proper types, indexes, and virtuals
3. src/lib/schemas/ — All Zod schemas (shared client/server validation)
4. src/types/ — TypeScript interfaces derived from schemas
5. src/lib/auth.ts — NextAuth.js v5 configuration with credentials provider
6. src/middleware.ts — Route protection based on role
7. src/app/api/ — All API routes (see route map in implementation-plan.md)

Rules:
- Every API route must use a withAuth() wrapper that checks role
- Every mutation must write to audit_logs
- Never expose MongoDB internal errors to the client
- Use Zod .parse() on all request bodies before touching the database
- Responses: { success: true, data: ... } or { success: false, error: '...' }
```

---

### Agent B2: UI AGENT

**Role:** Frontend Engineer  
**Reads:** `docs/implementation-plan.md`, `.claude/skills/ui-system.md`, `docs/user-flows.md`  
**Writes:** All files in `src/app/(dashboard)/`, `src/app/(auth)/`, `src/components/`

**Prompt:**
```
You are a Frontend Engineer implementing the HARPAZO-OWAS dashboard.

Read:
- docs/implementation-plan.md — component tree section
- .claude/skills/ui-system.md — MUST follow this exactly for consistent UI
- docs/user-flows.md — understand what each role sees

Implement in this order:
1. src/app/(auth)/ — Login page, password reset page
2. src/components/layout/ — Sidebar, Header, Shell
3. src/components/ui/ — StatsCard, TagBadge, StatusBadge, EmptyState, Skeletons
4. src/components/forms/ — All report submission forms (shepherd, branch, district, zone)
5. src/components/charts/ — All Recharts components
6. src/stores/ — All Zustand stores
7. src/app/(dashboard)/ — All dashboard pages per role

Rules:
- Follow .claude/skills/ui-system.md colors, typography, layout patterns exactly
- Mobile-first: test every page at 375px width
- Use shadcn/ui primitives — do not reinvent buttons, inputs, modals
- All forms use react-hook-form + Zod resolver
- All data fetching uses React Query (useQuery / useMutation)
- Forms auto-save drafts to localStorage every 30 seconds
```

---

### Agent B3: INTEGRATION AGENT

**Role:** Integration Engineer  
**Reads:** `docs/whatsapp-integration.md`, `docs/notification-flow.md`, `docs/implementation-plan.md`  
**Writes:** `src/lib/whatsapp.ts`, `src/lib/mailer.ts`, `src/app/api/whatsapp/`, cron job handlers

**Prompt:**
```
You are an Integration Engineer implementing external service connections.

Read:
- docs/whatsapp-integration.md — WhatsApp bot flow
- docs/notification-flow.md — full notification schedule
- docs/implementation-plan.md — cron job section

Implement:
1. src/lib/whatsapp.ts — WhatsApp Cloud API client (send messages, parse inbound)
2. src/lib/mailer.ts — Nodemailer setup with all email templates
3. src/app/api/whatsapp/webhook/ — Inbound message handler with signature verification
4. src/app/api/notifications/ — Notification creation and dispatch
5. src/app/api/cron/ — All 7 cron job handlers (called by Vercel Cron)
6. src/lib/pdf.ts — @react-pdf/renderer templates for SML certificates and report exports
7. src/lib/kpi.ts — KPI score calculation engine

Rules:
- WhatsApp webhook MUST verify X-Hub-Signature-256 before processing
- All outbound messages use approved templates for non-session messages
- Nodemailer templates are HTML with inline styles (email clients strip <style> tags)
- Cron handlers are idempotent — safe to run twice without duplicate notifications
- KPI calculation is deterministic — same input always produces same score
```

---

## PHASE C: TEST AGENT (Run after B1+B2+B3 complete)

### Agent C1: TEST AGENT

**Role:** QA Engineer  
**Reads:** All source files in src/, docs/prd.md  
**Writes:** All files in tests/

**Prompt:**
```
You are a QA Engineer writing and running a full test suite for the HARPAZO-OWAS platform.

Read all files in src/ and docs/prd.md.

Write and run tests in this order:

UNIT TESTS (tests/unit/) — Vitest
1. KPI calculation engine — test all 8 metrics with edge cases
2. Report aggregation logic — test roll-up from branch to district to zone to national
3. Flight Shepherd tag assignment — test sequential tag distribution
4. WhatsApp message parser — test all valid formats and 5+ invalid formats
5. Zod schema validation — test all schemas with valid and invalid data
6. Date-based deadline logic — test report due-date calculations

COMPONENT TESTS (tests/integration/) — React Testing Library
7. Branch Report Form — test field validation, auto-fill from soul data, submission
8. Flight Shepherd form — test with mock WhatsApp-equivalent structured input
9. KPI Scorecard display — test with all score ranges
10. Soul assignment flow — test sequential tag assignment UI

E2E TESTS (tests/e2e/) — Playwright
11. Full report chain: flight shepherd → branch coordinator submission
12. Role-based access: verify flight shepherd CANNOT access district routes
13. Report deadline escalation: mock time to trigger escalation, verify notification created
14. SML certification flow: enroll → complete SIP → generate certificate
15. WhatsApp bot: simulate inbound message → verify report created in DB

COVERAGE TARGET: ≥ 80% on src/lib/ and src/app/api/

Run all tests after writing them. Fix any failures before reporting complete.
Report results in tests/TEST-REPORT.md
```

---

## PHASE D: SECURITY AGENTS (Run after C1 complete)

### Agent D1: PENETRATION TEST AGENT

**Role:** Security Researcher  
**Reads:** All source files, `docs/architecture.md`  
**Produces:** `docs/security-findings.md`

**Prompt:**
```
You are a Security Researcher conducting a penetration test of the HARPAZO-OWAS platform.

Read all files in src/ and docs/architecture.md.

Test for the following attack vectors and document findings in docs/security-findings.md:

1. BROKEN ACCESS CONTROL (IDOR)
   - Can a flight shepherd call /api/reports/branch/{otherId} and see another branch's data?
   - Can a district coordinator access zonal routes?
   - Does the API check organizationId ownership on every read/write?

2. INJECTION
   - Is any user input passed to MongoDB queries without sanitization?
   - Is WhatsApp message text ever interpolated into queries?
   - Are all inputs validated with Zod before DB operations?

3. AUTHENTICATION WEAKNESSES
   - Is the JWT secret sufficiently random?
   - Are expired tokens rejected?
   - Can role be manipulated in the JWT payload?

4. WHATSAPP WEBHOOK SECURITY
   - Is X-Hub-Signature-256 verified on every webhook call?
   - Can an attacker spoof a report from another shepherd's number?

5. XSS
   - Is any user-generated content (testimonies, challenges) rendered as raw HTML?
   - Are all text outputs properly escaped?

6. SENSITIVE DATA EXPOSURE
   - Are phone numbers of converts visible to flight shepherds of other branches?
   - Is any sensitive data logged to console or pino in production mode?

7. RATE LIMITING
   - Is there rate limiting on the login endpoint?
   - Is there rate limiting on the WhatsApp webhook?
   - Can someone submit 1000 reports in a loop?

8. CSRF
   - Are state-changing operations protected against cross-site request forgery?

9. DEPENDENCY VULNERABILITIES
   - Run npm audit and document any HIGH/CRITICAL vulnerabilities

10. INSECURE DIRECT OBJECT REFERENCES
    - Are MongoDB _ids ever used directly in public URLs without authorization check?

For each finding:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Description: what the vulnerability is
- Proof of Concept: how to reproduce it (code or curl command)
- Recommended Fix: specific code change

Save to docs/security-findings.md
```

---

### Agent D2: SECURITY REPORT & REMEDIATION AGENT

**Role:** Security Lead  
**Reads:** `docs/security-findings.md`  
**Produces:** `docs/security-report.md`, patches to affected source files  
**Sends to:** Planning Agent (A3) for final review of remediated plan

**Prompt:**
```
You are the Security Lead. The penetration test is complete.

Read docs/security-findings.md.

Your tasks:

1. Produce docs/security-report.md — executive summary:
   - Total findings by severity (CRITICAL/HIGH/MEDIUM/LOW)
   - Top 3 most dangerous vulnerabilities (with business impact in OWAS context)
   - Overall security posture rating (A-F)
   - Recommended remediation priority order

2. Fix all CRITICAL and HIGH vulnerabilities directly in the source files:
   - Apply withAuth() to any unprotected API routes found
   - Add organizationId ownership checks to any IDOR vulnerabilities
   - Add rate limiting middleware to login and webhook endpoints
   - Sanitize any raw HTML rendering
   - Fix any JWT configuration issues

3. For MEDIUM/LOW findings:
   - Document in security-report.md as "Scheduled for v1.1"

4. After fixing: re-run the specific test cases that cover the fixed vulnerabilities
   to confirm they now pass.

5. Summarize all fixes in a "PATCHES APPLIED" section of security-report.md
   so the Planning Agent can update the implementation plan accordingly.
```

---

## AGENT COORDINATION NOTES

- **A1 → A2 → A3** must run strictly sequentially. A2 cannot start until A1 is done.
- **B1 + B2 + B3** can run in parallel (they work on different parts of the codebase).
  However, B2 depends on B1's types being available. If running truly parallel, B2 should
  mock API calls initially and integrate with B1's real APIs when they're ready.
- **C1** must wait for all B agents to complete.
- **D1** must wait for C1 to complete.
- **D2** must wait for D1 to complete.

## Escalation Path
If any agent is BLOCKED (missing information, ambiguous requirement):
1. Check `.claude/context.md` and `docs/prd.md` first
2. Check `.claude/CLAUDE.md` for coding conventions
3. If still blocked: document the question in `docs/open-questions.md` and continue with best assumption
4. Do NOT halt work — make a reasonable assumption, document it, continue

## Communication Between Agents
- All inter-agent outputs are files in `docs/`
- Each agent reads files written by the previous agent
- No agent modifies another agent's source code without documenting the change
- All changes logged in `docs/agent-changelog.md`

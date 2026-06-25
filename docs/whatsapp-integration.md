# WhatsApp Integration Plan
# HARPAZO-OWAS Platform

---

## Strategy Overview

WhatsApp is the primary communication channel already used by LFF leaders at all levels.
Rather than forcing them to abandon it, we MEET THEM where they are:

**WhatsApp becomes a reporting INPUT channel.** The database and web dashboard are the source of truth.
WhatsApp submits INTO the system, not instead of it.

---

## Two Modes of WhatsApp Use

### Mode 1: Reporting Bot (Inbound)
Users send structured report messages → Bot parses → Creates database record → Confirms

### Mode 2: Notification Channel (Outbound)
System sends reminders, alerts, KPI results, escalations → Via approved WhatsApp templates

---

## Platform Choice: Meta WhatsApp Business Cloud API

**Recommended over Twilio** for production because:
- Meta-native (no third-party cost layer)
- Supports interactive messages (buttons, quick replies)
- Higher message throughput
- Better webhook delivery guarantees

**For development/testing:** Use Twilio WhatsApp Sandbox (no Meta approval needed in sandbox)

---

## Setup Requirements

### Meta Business Account Requirements
1. Create a Meta Business Manager account (business.facebook.com)
2. Create a WhatsApp Business Account (WABA)
3. Register a dedicated phone number (cannot be a number already on regular WA)
4. Submit business verification to Meta
5. Submit message templates for approval (1-3 business days)
6. Get: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`

### Environment Variables
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_cloud_api_token
WHATSAPP_VERIFY_TOKEN=your_random_verify_string
WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/whatsapp/webhook
```

---

## Webhook Architecture

### Webhook Verification (GET /api/whatsapp/webhook)
```
Meta sends GET request to verify your webhook:
  Query params: hub.mode, hub.challenge, hub.verify_token
  → Compare hub.verify_token === WHATSAPP_VERIFY_TOKEN
  → If match: respond with hub.challenge (plain text)
  → If no match: respond 403
```

### Inbound Message Handling (POST /api/whatsapp/webhook)
```
Meta sends POST with message payload:
  → Verify X-Hub-Signature-256 header (HMAC-SHA256 of body using app secret)
  → Parse: entry[0].changes[0].value.messages[0]
  → Extract: from (phone number), type (text/interactive), body (text)
  → Look up user by phone: users.findOne({ whatsappPhone: from })
  → If not found: send onboarding message (register at dashboard URL)
  → If found: route to appropriate handler by user.role
```

---

## Bot Conversation Flows

### Flow 1: Flight Shepherd Report Submission

**Trigger:** Shepherd sends a message starting with `REPORT` or selects the "Submit Report" quick reply

```
Step 1: Bot sends greeting with quick-reply buttons:
  "Hello {name} (YM-Tag3)! What would you like to do?"
  [Submit Weekly Report] [Check My Converts] [Help]

Step 2: Shepherd selects "Submit Weekly Report"
  Bot: "Submitting report for week {weekRange}. 
        Reply with your report in this format:
        
        ACTIVE: [number]
        INACTIVE: [number]
        NEW CONVERTS: [number]
        FAMILY CLASS: [number]
        RESPONSIBILITY CLASS: [number]
        CELL: [number]
        WORKFORCE: [number]
        CHALLENGES: [text]
        
        Example:
        ACTIVE: 13
        INACTIVE: 2
        NEW CONVERTS: 3
        FAMILY CLASS: 3
        RESPONSIBILITY CLASS: 1
        CELL: 2
        WORKFORCE: 1
        CHALLENGES: 2 members absent for 2 weeks."

Step 3: Shepherd sends the formatted message

Step 4: Bot parses:
  → Regex extract each field
  → Validate: ACTIVE + INACTIVE = assigned souls (from DB)
  → If valid: create shepherd_report document, status = 'submitted'
  → Reply: "✅ Report submitted! 
             Week: {weekRange}
             Active: 13 | Inactive: 2 | New: 3
             Thank you, {name}!"

Step 5: If invalid:
  → Bot: "⚠️ Your report has an issue:
           Active (13) + Inactive (2) = 15, but you have 14 assigned souls.
           Please correct and resend."
```

### Flow 2: Convert Status Query
```
Shepherd sends: "MY CONVERTS" or selects quick reply

Bot responds:
  "Your assigned converts ({tag}):
   
   1. John Doe — ✅ Active | Family Class
   2. Jane Smith — ⚠️ Inactive (18 days)
   3. Peter Olu — ✅ Active | Responsibility Class
   
   Reply with a number to update status, or visit {dashboardLink} for full details."
```

### Flow 3: Branch Coordinator Quick Check
```
Branch Coordinator sends: "STATUS"

Bot responds:
  "Branch: {branchName}
   Week: {currentWeek}
   
   Flight Shepherds:
   ✅ 8 submitted | ❌ 3 outstanding
   
   Outstanding: YM-Tag2, YF-Tag5, M-Tag1
   
   Branch report: Not yet submitted
   Due: Sunday EOD"
```

### Flow 4: Unregistered Number
```
Bot: "👋 Hello! This number is not registered in OWAS.
      
      If you're an OWAS member, please:
      1. Ask your Branch Coordinator to register you
      2. Or visit {registrationUrl} to request access
      
      God bless you! 🙏"
```

---

## Message Parsing Strategy

### Structured Format Parsing (Regex)
```typescript
function parseShepherdReport(text: string) {
  const patterns = {
    active: /ACTIVE\s*:\s*(\d+)/i,
    inactive: /INACTIVE\s*:\s*(\d+)/i,
    newConverts: /NEW\s*CONVERTS?\s*:\s*(\d+)/i,
    familyClass: /FAMILY\s*CLASS\s*:\s*(\d+)/i,
    responsibilityClass: /RESPONSIBILITY\s*CLASS\s*:\s*(\d+)/i,
    cell: /CELL\s*:\s*(\d+)/i,
    workforce: /WORKFORCE\s*:\s*(\d+)/i,
    challenges: /CHALLENGES?\s*:\s*(.+?)(?=\n[A-Z]|$)/is,
  };
  
  const result: Record<string, any> = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    result[key] = match ? (key === 'challenges' ? match[1].trim() : parseInt(match[1])) : null;
  }
  return result;
}
```

### Fuzzy Matching (Fallback)
If the format isn't exact, use keyword detection to guide the user:
- Detects numbers near keywords even if format is slightly off
- Sends a corrected format suggestion

---

## Outbound Messaging (Notifications)

### Sending a WhatsApp Message
```typescript
// lib/whatsapp.ts
export async function sendWhatsAppMessage({
  to,            // phone number in E.164 format: +2348012345678
  templateName,
  languageCode = 'en',
  components    // template variable values
}: WhatsAppMessagePayload) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}
```

---

## Session Messages vs Template Messages

| Type | When | Requires Approval |
|------|------|------------------|
| Template message | Outbound to user (any time) | YES — Meta approval |
| Session message | Reply within 24hr of user message | NO — free-form text |

**Strategy:**
- Use **session messages** for bot replies (within 24hr of shepherd's inbound message)
- Use **template messages** for scheduled reminders and escalations
- All template messages must be submitted to Meta for approval before launch

---

## Phone Number Registration Flow

1. Branch Coordinator creates a Flight Shepherd account in the web dashboard
2. Enters shepherd's WhatsApp phone number (E.164 format)
3. System stores `users.whatsappPhone = "+2348012345678"`
4. System sends a Welcome WhatsApp message to confirm registration
5. If shepherd replies, their session is established

---

## Fallback Strategy

If WhatsApp API is unavailable:
- Queue notification in `notifications` collection with `channel: 'whatsapp'`, `status: 'pending'`
- Retry every 30 minutes (up to 3 attempts)
- Fall back to email after 3 failed WA attempts
- Alert super_admin in-app

---

## Development Testing Plan

### Phase 1: Twilio Sandbox
- Register your own number in Twilio WhatsApp Sandbox
- Test inbound/outbound flows locally via ngrok tunnel
- Webhook: `ngrok http 3000` → `https://xxxx.ngrok.io/api/whatsapp/webhook`

### Phase 2: Meta Test WABA
- Set up Meta test business account
- Use a dedicated test phone number
- Submit templates for approval early (can take 1-3 days)

### Phase 3: Production
- Migrate to production WABA number
- Ensure all templates are approved
- Set webhook URL to Vercel production domain

---

## Security Considerations

1. **Webhook Signature Verification** — Always verify `X-Hub-Signature-256` on every POST
2. **Phone Number Validation** — Reject messages from unregistered numbers
3. **Rate Limiting** — Limit report submissions to 1 per shepherd per week
4. **Injection Protection** — Never pass raw WhatsApp text into a database without validation
5. **Sensitive Data** — Never echo back sensitive convert data in WhatsApp messages (only counts/tags)
6. **Token Security** — WhatsApp access token must be rotated regularly; stored only in env vars

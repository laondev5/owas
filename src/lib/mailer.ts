import nodemailer from "nodemailer"

let transporterInstance: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT ?? "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  return transporterInstance
}

interface SendMailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendMail({ to, subject, html, text, replyTo }: SendMailOptions) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? '"HARPAZO-OWAS" <noreply@lff.org>',
    replyTo: replyTo ?? process.env.EMAIL_USER,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  })
}

// Shared footer — a consistent sender identity/signature across every template
// helps mail providers treat these as legitimate recurring correspondence
// rather than a one-off templated blast (a common spam-classifier signal).
function emailFooter(): string {
  return `
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #F3F4F6;">
      <p style="color:#9CA3AF;font-size:11px;line-height:1.6;margin:0;">
        Living Faith Foundation — HARPAZO-OWAS Operation Win A Soul Platform<br/>
        This is an automated message from your church's internal reporting system. If something
        looks wrong, contact your Branch Coordinator or Super Admin directly rather than replying to this address.
      </p>
    </div>
  `
}

// --- Email Templates ---

export function reportReminderHtml(params: {
  name: string
  role: string
  weekEnding: string
  dueTime: string
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1B4F72;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">HARPAZO-OWAS</h1>
        <p style="color:#93C6E0;margin:4px 0 0;font-size:13px;">Living Faith Foundation</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#111827;font-size:18px;margin:0 0 16px;">Report Due Reminder</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${params.name}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          This is a reminder that your <strong>${params.role} Report</strong> for the week ending
          <strong>${params.weekEnding}</strong> is due by <strong>${params.dueTime}</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/report"
             style="background:#1B4F72;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            Submit Report Now
          </a>
        </div>
        <p style="color:#6B7280;font-size:12px;">
          Late submissions affect your branch's KPI compliance score.
        </p>
        ${emailFooter()}
      </div>
    </div>
  `
}

export function convertInactiveHtml(params: {
  shepherdName: string
  convertName: string
  daysSinceContact: number
  shepherdTag: string
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#C0392B;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Convert Inactive Alert</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${params.shepherdName}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          <strong>${params.convertName}</strong> (assigned to <strong>${params.shepherdTag}</strong>)
          has not been contacted in <strong>${params.daysSinceContact} days</strong> and is at risk
          of becoming inactive.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          Please reach out to them as soon as possible to continue their integration journey.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/souls"
             style="background:#C0392B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            View Convert Record
          </a>
        </div>
        ${emailFooter()}
      </div>
    </div>
  `
}

export function convertAssignedHtml(params: {
  shepherdName: string
  convertName: string
  convertPhone?: string
  convertAddress?: string
  locationWon?: string
  dateWon: string
  loginUrl: string
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1B4F72;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">HARPAZO-OWAS</h1>
        <p style="color:#93C6E0;margin:4px 0 0;font-size:13px;">New Convert Assignment</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#111827;font-size:18px;margin:0 0 8px;">Hi ${params.shepherdName},</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          A new convert has been assigned to you for follow-up. Please make contact within <strong>48 hours</strong>.
        </p>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#166534;font-size:15px;margin:0 0 12px;">Convert Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:5px 0;width:130px;">Name</td>
              <td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${params.convertName}</td>
            </tr>
            ${params.convertPhone ? `<tr>
              <td style="color:#6B7280;font-size:13px;padding:5px 0;">Phone</td>
              <td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${params.convertPhone}</td>
            </tr>` : ""}
            ${params.convertAddress ? `<tr>
              <td style="color:#6B7280;font-size:13px;padding:5px 0;">Home Address</td>
              <td style="color:#111827;font-size:13px;padding:5px 0;">${params.convertAddress}</td>
            </tr>` : ""}
            ${params.locationWon ? `<tr>
              <td style="color:#6B7280;font-size:13px;padding:5px 0;">Where Won</td>
              <td style="color:#111827;font-size:13px;padding:5px 0;">${params.locationWon}</td>
            </tr>` : ""}
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:5px 0;">Date Won</td>
              <td style="color:#111827;font-size:13px;padding:5px 0;">${params.dateWon}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.loginUrl}"
             style="background:#1B4F72;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
            View Convert Record
          </a>
        </div>
        <p style="color:#9CA3AF;font-size:12px;border-top:1px solid #F3F4F6;padding-top:16px;margin-top:8px;">
          Regular follow-up is key to helping this soul integrate into the church. Log every contact in the system.
        </p>
        ${emailFooter()}
      </div>
    </div>
  `
}

export function welcomeUserHtml(params: {
  name: string
  email: string
  password: string
  role: string
  loginUrl: string
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1B4F72;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">HARPAZO-OWAS</h1>
        <p style="color:#93C6E0;margin:4px 0 0;font-size:13px;">Living Faith Foundation — Operation Win A Soul</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#111827;font-size:18px;margin:0 0 8px;">Hi ${params.name},</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          Your coordinator has added you to the HARPAZO-OWAS platform as a <strong>${params.role}</strong>,
          using this email address (${params.email}).
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          You can sign in at <a href="${params.loginUrl}" style="color:#1B4F72;">${params.loginUrl}</a> using
          the temporary passphrase below. You'll be able to change it to something memorable once you're in.
        </p>
        <p style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;background:#F9FAFB;border:1px dashed #D1D5DB;border-radius:8px;
             padding:12px 24px;font-family:monospace;font-size:15px;color:#111827;letter-spacing:0.5px;">${params.password}</span>
        </p>
        <p style="color:#6B7280;font-size:13px;line-height:1.6;">
          If you weren't expecting an account, or something here doesn't look right, just let your Branch
          Coordinator or the National OWAS Desk know — no need to click anything below.
        </p>
        ${emailFooter()}
      </div>
    </div>
  `
}

export function commentHtml(params: {
  recipientName: string
  authorName: string
  text: string
  loginUrl: string
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1B4F72;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">HARPAZO-OWAS</h1>
        <p style="color:#93C6E0;margin:4px 0 0;font-size:13px;">New Feedback From Your Supervisor</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${params.recipientName}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          <strong>${params.authorName}</strong> left a comment on your activity:
        </p>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="color:#111827;font-size:14px;line-height:1.6;margin:0;">${params.text}</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.loginUrl}"
             style="background:#1B4F72;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
            View in HARPAZO-OWAS
          </a>
        </div>
        ${emailFooter()}
      </div>
    </div>
  `
}

export function smlCertifiedHtml(params: {
  coordinatorName: string
  smlName: string
  branchName: string
  certifiedDate: string
  certificateUrl?: string
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#27AE60;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🎉 New SML Certified!</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${params.coordinatorName}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          <strong>${params.smlName}</strong> from <strong>${params.branchName}</strong> has been
          certified as a Soulwinning Mission Leader on <strong>${params.certifiedDate}</strong>.
        </p>
        ${
          params.certificateUrl
            ? `<div style="text-align:center;margin:24px 0;">
                <a href="${params.certificateUrl}" style="background:#27AE60;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
                  View Certificate
                </a>
               </div>`
            : ""
        }
        ${emailFooter()}
      </div>
    </div>
  `
}

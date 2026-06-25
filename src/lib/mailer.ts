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
}

export async function sendMail({ to, subject, html, text }: SendMailOptions) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? '"HARPAZO-OWAS" <noreply@lff.org>',
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  })
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
        <h2 style="color:#111827;font-size:18px;margin:0 0 8px;">Welcome to HARPAZO-OWAS, ${params.name}!</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          An account has been created for you on the HARPAZO-OWAS platform. Below are your login credentials:
        </p>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:6px 0;width:100px;">Role</td>
              <td style="color:#111827;font-size:13px;font-weight:600;padding:6px 0;">${params.role}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:6px 0;">Email</td>
              <td style="color:#111827;font-size:13px;font-weight:600;padding:6px 0;">${params.email}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:6px 0;">Password</td>
              <td style="color:#111827;font-size:13px;font-weight:600;padding:6px 0;font-family:monospace;">${params.password}</td>
            </tr>
          </table>
        </div>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          Please log in and change your password as soon as possible.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.loginUrl}"
             style="background:#1B4F72;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
            Log In Now
          </a>
        </div>
        <p style="color:#9CA3AF;font-size:12px;border-top:1px solid #F3F4F6;padding-top:16px;margin-top:8px;">
          If you did not expect this email, please contact your Branch Coordinator or Super Admin immediately.
        </p>
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
      </div>
    </div>
  `
}

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// From address — update to your verified domain in Resend once you have one
// For now uses Resend's sandbox domain which works for testing
const FROM = "Proffy <onboarding@resend.dev>";

function verificationEmailHtml(code: string, name?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Proffy account</title>
</head>
<body style="margin:0;padding:0;background:#0f0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f12;min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;">
              <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#4f8ef7,#a78bfa);display:inline-block;"></div>
            </td>
            <td>
              <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Proffy</span>
              <span style="font-size:9px;font-weight:800;letter-spacing:0.07em;color:#6366f1;background:rgba(99,102,241,0.13);border:1px solid rgba(99,102,241,0.28);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">BETA</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">

          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6366f1;">Email verification</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
            ${name ? `Hey ${name}, verify` : "Verify"} your account
          </h1>
          <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#a1a1aa;">
            Enter this code in the Proffy tab to complete your registration. It expires in <strong style="color:#ffffff;">15 minutes</strong>.
          </p>

          <!-- Code -->
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:#0f0f12;border:1px solid rgba(99,102,241,0.35);border-radius:12px;padding:20px 40px;">
              <span style="font-size:40px;font-weight:800;letter-spacing:0.18em;color:#ffffff;font-variant-numeric:tabular-nums;">${code}</span>
            </div>
          </div>

          <p style="margin:0;font-size:13px;color:#52525b;line-height:1.6;">
            Didn't create a Proffy account? You can safely ignore this email — no account will be created.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:28px;">
          <p style="margin:0;font-size:12px;color:#3f3f46;">
            © 2025 Proffy · Built for Israeli university students
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, code: string, name?: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${code} is your Proffy verification code`,
    html: verificationEmailHtml(code, name),
  });
  if (error) throw new Error(`Failed to send email: ${error.message}`);
}

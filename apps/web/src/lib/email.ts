import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

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

function welcomeEmailHtml(name?: string): string {
  const firstName = name ? name.split(" ")[0] : null;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Proffy</title>
</head>
<body style="margin:0;padding:0;background:#0d0d18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d18;min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;">
              <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#4f8ef7,#a78bfa);display:inline-block;"></div>
            </td>
            <td>
              <span style="font-size:20px;font-weight:800;color:#f0f0f8;letter-spacing:-0.02em;">Proffy</span>
              <span style="font-size:9px;font-weight:800;letter-spacing:0.07em;color:#6366f1;background:rgba(99,102,241,0.13);border:1px solid rgba(99,102,241,0.28);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">BETA</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#131325;border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:40px 36px;">

          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a78bfa;">Welcome aboard</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#f0f0f8;letter-spacing:-0.02em;">
            ${firstName ? `Hey ${firstName}, you're in! 🎓` : "You're in! 🎓"}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#a0a0c0;">
            Proffy is your AI study companion built for Israeli university students. I know your courses, your professor's exam style, and what's most likely to show up on your test.
          </p>

          <!-- Features -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[
              ["📚", "Add your courses", "Tell me your course, university, and professor — I'll build your study plan."],
              ["🃏", "Auto-saved flashcards", "Every concept I explain becomes a flashcard you can review later."],
              ["📄", "Upload your slides", "Share your course material and I'll answer directly from it."],
            ].map(([icon, title, desc]) => `
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:20px;padding-right:14px;vertical-align:top;">${icon}</td>
                <td>
                  <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#f0f0f8;">${title}</p>
                  <p style="margin:0;font-size:13px;color:#6a6a90;line-height:1.5;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join("")}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center">
              <a href="https://proffy.co.il/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4f8ef7,#a78bfa);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:-0.01em;">
                Start studying →
              </a>
            </td>
          </tr></table>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:28px;">
          <p style="margin:0;font-size:12px;color:#3f3f56;">
            © 2025 Proffy · Built for Israeli university students
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(email: string, name?: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Welcome to Proffy 🎓`,
      html: welcomeEmailHtml(name),
    });
  } catch {
    // Non-fatal — don't block signup if welcome email fails
  }
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

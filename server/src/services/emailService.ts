import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const baseUrl = process.env.APP_URL || 'https://ruralagriconnect-15c7c.web.app';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: 'RuralAgriConnect <onboarding@resend.dev>',
    to,
    subject: 'Reset your RuralAgriConnect password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2d6a4f">Password Reset</h2>
        <p>You requested a password reset. Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  });
}

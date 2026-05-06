import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const baseUrl = process.env.APP_URL || 'https://ruralagriconnect-15c7c.web.app';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"RuralAgriConnect" <${process.env.EMAIL_USER}>`,
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

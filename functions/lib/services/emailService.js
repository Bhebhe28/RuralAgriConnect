"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
    },
});
async function sendPasswordResetEmail(to, resetToken) {
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
//# sourceMappingURL=emailService.js.map
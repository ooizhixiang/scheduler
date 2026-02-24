import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: false,
    });
  }

  async sendInviteEmail(email: string, firstName: string, token: string, previewToken?: string) {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const setPasswordUrl = `${webUrl}/set-password?token=${token}`;
    const previewUrl = previewToken ? `${webUrl}/preview/${previewToken}` : null;

    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM', 'noreply@scheduler.local'),
      to: email,
      subject: 'You have been invited to Scheduler',
      html: `
        <h2>Welcome to Scheduler, ${firstName}!</h2>
        <p>You have been invited to join the team. Click the link below to set your password and activate your account.</p>
        <p><a href="${setPasswordUrl}">Set Your Password</a></p>
        <p>This link expires in 72 hours.</p>
        ${previewUrl ? `
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p>Want to see your schedule right away? Use this preview link — no account needed:</p>
        <p><a href="${previewUrl}">View My Schedule</a></p>
        <p style="font-size: 12px; color: #6b7280;">This preview link expires in 30 days.</p>
        ` : ''}
      `,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const resetUrl = `${webUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM', 'noreply@scheduler.local'),
      to: email,
      subject: 'Password Reset - Scheduler',
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${firstName}, you requested a password reset. Click the link below to set a new password.</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      `,
    });
  }
}

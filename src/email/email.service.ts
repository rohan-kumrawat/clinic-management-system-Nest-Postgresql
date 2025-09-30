import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Admin Password Reset OTP - Clinic Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Clinic Management System - Admin Portal</h2>
            <p><strong>Admin Password Reset Request</strong></p>
            <p>Your One-Time Password (OTP) for admin password reset is:</p>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0;">
              <h1 style="margin: 0; color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p><strong>This OTP is valid for 10 minutes.</strong></p>
            <p style="color: #ef4444; font-size: 14px;">
              ⚠️ Security Notice: This OTP is for admin access only. If you didn't request this, please secure your account immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">Clinic Management System - Admin Team</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Admin OTP sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }
}
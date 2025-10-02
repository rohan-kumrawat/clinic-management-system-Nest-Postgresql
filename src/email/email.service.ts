import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Clinic Management <onboarding@resend.dev>',
        to: [email],
        subject: 'Your OTP for Password Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Clinic Management System</h2>
            <p>Your One-Time Password (OTP) for password reset is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="margin: 0; color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p>This OTP is valid for 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error('Error sending email:', error);
        return false;
      }

      console.log('OTP email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return false;
    }
  }
}
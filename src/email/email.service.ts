import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing in environment');
    }

    this.resend = new Resend(apiKey);
  }

  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: 'no-reply@clinicapp.com',
        to,
        subject: 'Your OTP Code',
        html: `<p>Your OTP code is <strong>${otp}</strong></p>`,
      });

      // Resend returns: { data: { id }, error }
      if (result?.error) {
        console.error('Resend Error:', result.error);
        return false;
      }

      return !!result?.data?.id;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }
}

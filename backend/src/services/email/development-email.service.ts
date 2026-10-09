import { IEmailService } from './email.interface';

export class DevelopmentEmailService implements IEmailService {
  async sendPasswordResetOtp(toEmail: string, otp: string): Promise<void> {
    console.log('\n======================================================');
    console.log('📨 [DEVELOPMENT EMAIL SERVICE - PASSWORD RESET OTP]');
    console.log(`Recipient: ${toEmail}`);
    console.log(`Verification Code (OTP):  👉  ${otp}  👈`);
    console.log('Validity: 15 minutes');
    console.log('Note: In production mode, this will be dispatched via Brevo API.');
    console.log('======================================================\n');
  }
}

export const emailService = new DevelopmentEmailService();

export interface IEmailService {
  /**
   * Send password reset OTP code to the given email address
   */
  sendPasswordResetOtp(toEmail: string, otp: string): Promise<void>;
}

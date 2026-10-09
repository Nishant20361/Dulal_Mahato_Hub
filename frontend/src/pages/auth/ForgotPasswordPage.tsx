import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { apiForgotPassword, apiVerifyOtp, apiResetPassword } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Step 1: email, Step 2: otp, Step 3: new password, Step 4: done
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await apiForgotPassword(email.trim());
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setOtp(data.devOtp); // Auto-fill for convenience in local dev
      }
      toast.info('Verification code generated. Please check below or in your terminal.');
      setStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to request OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiVerifyOtp(email.trim(), otp.trim());
      toast.success('Verification code accepted!');
      setStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Invalid or expired OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiResetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      toast.success('Password reset successfully!');
      setStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to reset password';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Recover access to your Dulal Mahato Hub account
          </p>
        </div>

        {/* Development OTP Banner */}
        {devOtp && step < 4 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs space-y-1.5 shadow-sm">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Development Mode Active
            </div>
            <p>
              Your 6-digit OTP is: <span className="font-mono text-base font-extrabold tracking-widest px-2 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 rounded border border-amber-400/40">{devOtp}</span>
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              In production, this code will be dispatched to your email via Brevo Transactional API.
            </p>
          </div>
        )}

        <Card className="shadow-xl border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Enter your registered account email and we'll generate a 6-digit verification code.
                </p>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. student@univ.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
                  Send Verification Code
                </Button>
              </form>
            )}

            {/* STEP 2: Enter OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Enter the 6-digit verification code sent to <span className="font-semibold text-slate-800 dark:text-white">{email}</span>.
                </p>
                <Input
                  label="6-Digit Verification Code"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  className="font-mono text-center tracking-widest text-lg font-bold"
                  required
                />
                <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
                  Verify Code
                </Button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                >
                  Change Email Address
                </button>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Choose a strong new password for your account.
                </p>
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
                  Save New Password
                </Button>
              </form>
            )}

            {/* STEP 4: Success confirmation */}
            {step === 4 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Password Reset Successful
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Your password has been securely updated. You can now sign in with your new credentials.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  size="md"
                  className="w-full mt-2"
                >
                  Return to Sign In
                </Button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

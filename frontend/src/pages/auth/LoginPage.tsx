import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  Cloud,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

interface LoginPageProps {
  initialMode?: 'signin' | 'signup';
}

export function LoginPage({ initialMode = 'signin' }: LoginPageProps) {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Sign In States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up Extra States
  const [name, setName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time unique username validation state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Live check username uniqueness with debounce
  useEffect(() => {
    const trimmed = signupUsername.trim().toLowerCase();
    if (trimmed.length < 3) {
      setUsernameStatus({ checking: false });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        if (res.data?.success) {
          setUsernameStatus({
            checking: false,
            available: res.data.available,
            message: res.data.message,
          });
        }
      } catch {
        setUsernameStatus({ checking: false });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [signupUsername]);

  // Handle Sign In Submit
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please fill in both fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(identifier.trim(), password, rememberMe);
      toast.success('Welcome back to Dulal Mahato Hub!');
      navigate('/drive');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Invalid credentials. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (usernameStatus.available === false) {
      setError('This username is already taken. Please choose another username.');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        name,
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
        confirmPassword,
      });
      toast.success('Account created successfully! Welcome to Dulal Mahato Hub.');
      navigate('/drive');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to create account. Please check your inputs.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setIdentifier('dulal');
    setPassword('Password@123');
    toast.info('Filled default demo credentials (dulal)');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Card (Dribbble Split Screen Style) */}
      <div className="w-full max-w-6xl rounded-[2.5rem] bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] z-10 transition-all duration-300">
        
        {/* LEFT COLUMN: Clean Form */}
        <div className="lg:col-span-6 xl:col-span-5 p-6 sm:p-10 lg:p-11 flex flex-col justify-between bg-slate-900/95">
          {/* Top Brand Header */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                  <HardDrive className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                    Dulal Mahato Hub
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Vault
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">Personal Cloud &amp; Class Notes</p>
                </div>
              </div>

              {/* Quick Demo Fill Button */}
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:border-indigo-600 px-2.5 py-1 rounded-xl transition-all"
                  title="Auto-fill demo credentials"
                >
                  Fill Demo
                </button>
              )}
            </div>

            {/* Welcome Heading */}
            <div className="space-y-1.5 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {authMode === 'signin' ? (
                  <>
                    Welcome back <span className="animate-wave-hand">👋</span>
                  </>
                ) : (
                  <>
                    Create Account <Sparkles className="w-6 h-6 text-amber-400" />
                  </>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                {authMode === 'signin'
                  ? 'Welcome back! Please enter your details to access your storage.'
                  : 'Start storing and organizing class lectures, PDFs, and notes.'}
              </p>
            </div>

            {/* Mode Switcher Pill Slider */}
            <div className="p-1 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center relative mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 text-center relative z-10 ${
                  authMode === 'signin'
                    ? 'text-white shadow-md bg-gradient-to-r from-indigo-600 to-indigo-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 text-center relative z-10 ${
                  authMode === 'signup'
                    ? 'text-white shadow-md bg-gradient-to-r from-indigo-600 to-indigo-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-xs font-semibold text-rose-300 flex items-center gap-2 animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            {authMode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Username / Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Username or Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. dulal or student@univ.edu"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border border-slate-700/80 focus:border-indigo-500 focus:bg-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border border-slate-700/80 focus:border-indigo-500 focus:bg-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                        rememberMe
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'border border-slate-600 bg-slate-800'
                      }`}
                    >
                      {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs text-slate-400">Remember for 30 days</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Drive</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Sign Up Form Mode */
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dulal Mahato"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border border-slate-700/80 focus:border-indigo-500 text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-300">Username</label>
                      {signupUsername.trim().length >= 3 && (
                        <span className="text-[10px] flex items-center gap-1 font-semibold">
                          {usernameStatus.checking ? (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> checking...
                            </span>
                          ) : usernameStatus.available === true ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Available
                            </span>
                          ) : usernameStatus.available === false ? (
                            <span className="text-rose-400 flex items-center gap-0.5">
                              <XCircle className="w-3 h-3" /> Taken
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. dulal"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border text-white placeholder:text-slate-500 focus:outline-none transition-all ${
                        usernameStatus.available === false
                          ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                          : usernameStatus.available === true
                          ? 'border-emerald-500/80 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                          : 'border-slate-700/80 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">Email</label>
                    <input
                      type="email"
                      placeholder="student@univ.edu"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border border-slate-700/80 focus:border-indigo-500 text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border border-slate-700/80 focus:border-indigo-500 text-white placeholder:text-slate-500 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-2xl bg-slate-800/70 border border-slate-700/80 focus:border-indigo-500 text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Bottom Switch Link */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
            {authMode === 'signin' ? (
              <>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                >
                  Sign up for free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Dribbble "Smart Save" 3D Animated Hero Showcase */}
        <div className="lg:col-span-6 xl:col-span-7 relative hidden lg:flex flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 overflow-hidden border-l border-slate-800/80">
          
          {/* Glowing Radial Backdrop */}
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-sky-500/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Showcase Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Smart Save 3.0 Cloud Encryption</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] text-slate-400 font-mono">100% Secure Storage</span>
            </div>
          </div>

          {/* Central 3D Illustration with Floating Glassmorphic Badges */}
          <div className="relative z-10 flex items-center justify-center my-auto py-4">
            
            {/* Main 3D Vault Graphic in Framed Glass Card */}
            <div className="relative w-72 h-72 xl:w-84 xl:h-84 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-indigo-500/20 group">
              <img
                src="/images/smart_save_3d_hero.jpg"
                alt="Smart Save 3D Cloud Vault"
                className="w-full h-full object-cover animate-float-slow"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating Glass Badge 1: Bank-Grade Encryption (Top-Right) */}
            <div className="absolute -top-3 -right-2 xl:right-4 z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-indigo-500/40 shadow-xl shadow-indigo-950/50 animate-float-delayed select-none">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>AES-256 Vault</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-400">Zero-knowledge privacy</div>
              </div>
            </div>

            {/* Floating Glass Badge 2: High Speed Sync (Bottom-Left) */}
            <div className="absolute -bottom-4 -left-2 xl:left-4 z-20 flex items-center gap-3 p-3 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-sky-500/40 shadow-xl shadow-sky-950/50 animate-float-reverse select-none max-w-xs">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">10 Gbps Turbo Sync</div>
                <div className="text-[10px] text-slate-400 truncate">HTTP range streaming for videos &amp; PDFs</div>
              </div>
            </div>

            {/* Floating Glass Badge 3: Storage Status (Top-Left) */}
            <div className="absolute top-10 -left-6 z-20 hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/70 shadow-lg animate-float-slow select-none">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <div className="text-[11px] font-bold text-slate-200">100 GB Cloud Vault</div>
            </div>
          </div>

          {/* Bottom Testimonial & Social Proof */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <p className="text-xs text-slate-300 font-medium italic leading-relaxed">
                "The cleanest and most reliable cloud workspace for student notes, textbooks, and project files."
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-bold text-white">Dulal Mahato Hub</span>
                <span>•</span>
                <span className="text-amber-400">★★★★★</span>
                <span>5.0 rating</span>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-5 h-1.5 rounded-full bg-indigo-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

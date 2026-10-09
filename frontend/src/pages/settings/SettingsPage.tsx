import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/Toast';
import {
  apiUpdateProfile,
  apiChangePassword,
  apiGetStorageUsage,
  fetchHealth,
  StorageUsage,
  HealthResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  Shield,
  Palette,
  Server,
  HardDrive,
  Folder,
  FileText,
  File,
  Sun,
  Moon,
  Laptop,
  Check,
  RefreshCw,
  Clock,
  Database,
  Lock,
} from 'lucide-react';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'system'>('profile');

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Storage usage state
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  // System Diagnostics state
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const loadStorage = async () => {
    try {
      setIsLoadingStorage(true);
      const res = await apiGetStorageUsage();
      if (res.success) {
        setStorageUsage(res.storage);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const loadHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const res = await fetchHealth();
      setHealthData(res);
    } catch {
      // ignore
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadStorage();
    loadHealth();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      toast.error('All fields are required');
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await apiUpdateProfile({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
      });
      if (res.success) {
        await refreshUser();
        toast.success('Profile updated successfully');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await apiChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        revokeOtherSessions,
      });
      if (res.success) {
        toast.success(res.message || 'Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setRevokeOtherSessions(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to change password';
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account profile, security credentials, storage quota, and system diagnostics.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          Profile & Storage
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-4 h-4" />
          Appearance
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'system'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server className="w-4 h-4" />
          System Diagnostics
        </button>
      </div>

      {/* Tab: Profile & Storage */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Update your personal information and contact email.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Full Name</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Username</label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="username"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Used for unique identification and login.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Storage Summary Card */}
          <div className="space-y-6">
            <Card className="border-indigo-200/50 dark:border-indigo-900/40 bg-gradient-to-b from-card to-indigo-50/20 dark:to-indigo-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Storage Overview
                  </CardTitle>
                  <button
                    onClick={loadStorage}
                    disabled={isLoadingStorage}
                    className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                    title="Refresh storage stats"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStorage ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <CardDescription>Local filesystem capacity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span>Used Space</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {storageUsage ? storageUsage.formattedUsed : '0 B'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: storageUsage && storageUsage.usedBytes > 0 ? '8%' : '2%' }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Provider: <span className="font-mono font-medium text-foreground">{storageUsage?.provider || 'Local Filesystem'}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <File className="w-3.5 h-3.5 text-indigo-500" /> Total Files
                    </span>
                    <span className="font-semibold text-foreground">{storageUsage?.totalFiles ?? 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Folder className="w-3.5 h-3.5 text-amber-500" /> Total Folders
                    </span>
                    <span className="font-semibold text-foreground">{storageUsage?.totalFolders ?? 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" /> Class Notes
                    </span>
                    <span className="font-semibold text-foreground">{storageUsage?.totalNotes ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Change Password
              </CardTitle>
              <CardDescription>
                Ensure your account is protected with a strong, distinct passphrase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">New Password</label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Confirm New Password</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revokeOtherSessions}
                      onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs text-foreground font-medium">
                      Sign out from all other active browser sessions
                    </span>
                  </label>
                  <p className="text-[11px] text-muted-foreground ml-6.5 mt-0.5">
                    Recommended if you suspect your password might have been exposed.
                  </p>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interface Theme</CardTitle>
              <CardDescription>
                Customize how Dulal Mahato Hub appears on your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Light */}
                <div
                  onClick={() => setTheme('light')}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col items-center gap-3 text-center ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-border/60 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Light Mode</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Clean crisp daytime aesthetic</p>
                  </div>
                  {theme === 'light' && (
                    <Badge variant="default" className="text-[10px] mt-1">
                      <Check className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  )}
                </div>

                {/* Dark */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col items-center gap-3 text-center ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-border/60 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Dark Mode</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">High-contrast night study mode</p>
                  </div>
                  {theme === 'dark' && (
                    <Badge variant="default" className="text-[10px] mt-1">
                      <Check className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  )}
                </div>

                {/* System */}
                <div
                  onClick={() => setTheme('system')}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col items-center gap-3 text-center ${
                    theme === 'system'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-border/60 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">System Sync</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Matches your macOS theme</p>
                  </div>
                  {theme === 'system' && (
                    <Badge variant="default" className="text-[10px] mt-1">
                      <Check className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: System Diagnostics */}
      {activeTab === 'system' && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Local Architecture Diagnostics
                  </CardTitle>
                  <CardDescription>
                    Real-time status of your self-hosted backend, SQLite database, and local filesystem storage.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHealth}
                  disabled={isLoadingHealth}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                  Check Health
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>API Server Status</span>
                    <Badge variant={healthData?.status === 'ok' ? 'default' : 'danger'} className="text-[10px]">
                      {healthData?.status === 'ok' ? 'HEALTHY' : 'UNAVAILABLE'}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {healthData ? `${healthData.app} v${healthData.version}` : 'Connecting...'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Port: 5001 | Environment: {healthData?.environment || 'development'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Database Engine</span>
                    <Badge variant={healthData?.database?.status === 'connected' ? 'default' : 'danger'} className="text-[10px]">
                      {healthData?.database?.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {healthData?.database?.provider === 'sqlite' ? 'SQLite (Local dev.db)' : 'Database'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Latency: {healthData?.database?.latencyMs != null ? `${healthData.database.latencyMs}ms` : 'N/A'} (Zero cloud latency)
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>File Storage Provider</span>
                    <Badge variant="default" className="text-[10px]">LOCAL FILESYSTEM</Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Local Disk (backend/storage)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Path-traversal guarded, native HTTP range streaming
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Email & OTP Mode</span>
                    <Badge variant="outline" className="text-[10px]">DEVELOPMENT OTP</Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Terminal Console + Direct Dev OTP
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    No external Brevo account required for password recovery
                  </p>
                </div>
              </div>

              {healthData && (
                <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Uptime: {healthData.uptime.formatted}
                  </span>
                  <span>Node: {healthData.system.nodeVersion} | Platform: {healthData.system.platform}</span>
                  <span>Memory RSS: {healthData.system.memoryUsageMB.rss}MB</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;

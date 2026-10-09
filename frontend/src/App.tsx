import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

// App Layout & Pages
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DrivePage } from '@/pages/drive/DrivePage';
import { NotesPage } from '@/pages/notes/NotesPage';
import { RecentPage } from '@/pages/recent/RecentPage';
import { TrashPage } from '@/pages/trash/TrashPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { HomePage } from '@/pages/HomePage';
import { NotFound } from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

/**
 * Route guard for authenticated areas.
 * Redirects unauthenticated users to /login preserving target destination.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading Dulal Mahato Hub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Route guard for public-only auth pages (login, signup, forgot-password).
 * Redirects logged-in users directly to /drive.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/drive" replace />;
  }

  return <>{children}</>;
}

/**
 * Root index route handler.
 * Automatically takes authenticated users to /drive and guests to /login.
 */
function RootIndexRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/drive" replace /> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Root Redirection */}
                <Route path="/" element={<RootIndexRedirect />} />

                {/* Public Auth Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage initialMode="signup" />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicOnlyRoute>
                      <ForgotPasswordPage />
                    </PublicOnlyRoute>
                  }
                />

                {/* System Diagnostics Route */}
                <Route path="/status" element={<HomePage />} />

                {/* Authenticated Application Routes with AppLayout Shell */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/drive" element={<DrivePage />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/recent" element={<RecentPage />} />
                  <Route path="/trash" element={<TrashPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* 404 Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeEffect } from '@/app/useThemeEffect'
import { AuthGate } from '@/app/AuthGate'
import { Toaster } from '@/components/Toaster'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { Spinner } from '@/components/ui/misc'
import { LandingPage } from '@/pages/LandingPage'
import { DocsPage } from '@/pages/DocsPage'
import { LegalPage } from '@/pages/LegalPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// The workspace pulls in Monaco, xterm, WebContainer, and isomorphic-git —
// several hundred KB nothing outside the IDE needs, so it's the one route
// split out of the main bundle (spec §44).
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage').then((m) => ({ default: m.WorkspacePage })))

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-base">
      <Spinner size={22} />
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const loadSettings = useSettingsStore((s) => s.load)
  useThemeEffect()

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/legal/:page" element={<LegalPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            element={
              <AuthGate>
                <DashboardLayout />
              </AuthGate>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route
            path="/projects/:projectId"
            element={
              <AuthGate>
                <Suspense fallback={<FullScreenSpinner />}>
                  <WorkspacePage />
                </Suspense>
              </AuthGate>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

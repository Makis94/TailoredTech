import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { AppShell } from '@/components/app-shell'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

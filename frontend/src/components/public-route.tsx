import { Outlet } from 'react-router-dom'
import { PublicShell } from '@/components/public-shell'

export function PublicRoute() {
  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  )
}

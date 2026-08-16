import { Link } from 'react-router-dom'
import { Eye, Vault } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Vault className="size-5 text-accent" strokeWidth={1.75} />
            <span className="font-serif text-lg font-semibold tracking-tight">Vault</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to={user ? '/' : '/login'}>{user ? 'Go to your data rooms' : 'Log in'}</Link>
          </Button>
        </div>
      </header>
      <div className="border-b border-accent/25 bg-accent/10">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs text-accent-foreground/80">
          <Eye className="size-3.5 text-accent" />
          <span>You're viewing shared content — read-only.</span>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}

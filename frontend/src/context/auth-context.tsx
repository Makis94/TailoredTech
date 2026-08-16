import * as React from 'react'
import * as authApi from '@/api/auth'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false))
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken)
    setUser(res.user)
  }, [])

  const register = React.useCallback(async (email: string, password: string, name: string) => {
    const res = await authApi.register({ email, password, name })
    localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken)
    setUser(res.user)
  }, [])

  const logout = React.useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

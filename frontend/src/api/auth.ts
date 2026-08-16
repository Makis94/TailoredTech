import { api } from './client'
import type { User } from '@/types'

export interface AuthResponse {
  accessToken: string
  user: User
}

export function register(data: { email: string; password: string; name: string }) {
  return api.post<AuthResponse>('/auth/register', data).then((r) => r.data)
}

export function login(data: { email: string; password: string }) {
  return api.post<AuthResponse>('/auth/login', data).then((r) => r.data)
}

export function me() {
  return api.get<User>('/auth/me').then((r) => r.data)
}

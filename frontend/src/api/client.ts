import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'dataroom_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A logged-in user's session token expired or was rejected: drop it and send
// them back to the login screen instead of leaving the UI silently broken.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_STORAGE_KEY)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return fallback
}

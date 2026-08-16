import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { PublicRoute } from '@/components/public-route'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { DataRoomPage } from '@/pages/data-room-page'
import { FolderPage } from '@/pages/folder-page'
import { FileViewerPage } from '@/pages/file-viewer-page'
import { SharedExplorerPage } from '@/pages/shared-explorer-page'
import { NotFoundPage } from '@/pages/not-found-page'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<PublicRoute />}>
              <Route path="/shared/:token" element={<SharedExplorerPage />} />
              <Route path="/shared/:token/folders/:folderId" element={<SharedExplorerPage />} />
              <Route path="/shared/:token/files/:fileId" element={<FileViewerPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/data-rooms/:dataRoomId" element={<DataRoomPage />} />
              <Route path="/data-rooms/:dataRoomId/folders/:folderId" element={<FolderPage />} />
              <Route path="/files/:fileId" element={<FileViewerPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/not-found" replace />} />
            <Route path="/not-found" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}

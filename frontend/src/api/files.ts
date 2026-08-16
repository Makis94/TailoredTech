import { api } from './client'
import type { FileDetail, FileSummary, FileVersion } from '@/types'

export function uploadFile(
  params: { file: File; dataRoomId: string; folderId?: string },
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const formData = new FormData()
  formData.append('file', params.file)
  formData.append('dataRoomId', params.dataRoomId)
  if (params.folderId) formData.append('folderId', params.folderId)

  return api
    .post<FileSummary>('/files/upload', formData, {
      signal,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
    .then((r) => r.data)
}

export function getFile(id: string, shareToken?: string) {
  return api.get<FileDetail>(`/files/${id}`, { params: { shareToken } }).then((r) => r.data)
}

export function listFileVersions(id: string, shareToken?: string) {
  return api.get<FileVersion[]>(`/files/${id}/versions`, { params: { shareToken } }).then((r) => r.data)
}

export function getFileDownloadUrl(id: string, opts: { shareToken?: string; versionId?: string } = {}) {
  return api
    .get<{ url: string; mimeType: string; size: number }>(`/files/${id}/download-url`, { params: opts })
    .then((r) => r.data)
}

export function renameFile(id: string, name: string) {
  return api.patch<FileSummary>(`/files/${id}`, { name }).then((r) => r.data)
}

export function moveFile(id: string, folderId: string | null) {
  return api.patch<FileSummary>(`/files/${id}/move`, { folderId }).then((r) => r.data)
}

export function deleteFile(id: string) {
  return api.delete(`/files/${id}`).then((r) => r.data)
}

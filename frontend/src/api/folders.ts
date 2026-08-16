import { api } from './client'
import type { FolderContents, FolderDetail, FolderSummary, SearchResults, Stats } from '@/types'

export function createFolder(data: { name: string; dataRoomId: string; parentId?: string }) {
  return api.post<FolderSummary>('/folders', data).then((r) => r.data)
}

export function getFolder(id: string, shareToken?: string) {
  return api.get<FolderDetail>(`/folders/${id}`, { params: { shareToken } }).then((r) => r.data)
}

export function getFolderContents(id: string, opts: { page?: number; pageSize?: number; shareToken?: string } = {}) {
  return api.get<FolderContents>(`/folders/${id}/contents`, { params: opts }).then((r) => r.data)
}

export function getFolderStats(id: string, shareToken?: string) {
  return api.get<Stats>(`/folders/${id}/stats`, { params: { shareToken } }).then((r) => r.data)
}

export function renameFolder(id: string, name: string) {
  return api.patch<FolderSummary>(`/folders/${id}`, { name }).then((r) => r.data)
}

export function deleteFolder(id: string) {
  return api.delete(`/folders/${id}`).then((r) => r.data)
}

export function searchFolder(id: string, q: string, shareToken?: string) {
  return api.get<SearchResults>(`/folders/${id}/search`, { params: { q, shareToken } }).then((r) => r.data)
}

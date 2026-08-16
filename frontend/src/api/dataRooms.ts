import { api } from './client'
import type { DataRoom, DataRoomDetail, FolderContents, SearchResults } from '@/types'

export function listDataRooms() {
  return api.get<DataRoom[]>('/data-rooms').then((r) => r.data)
}

export function createDataRoom(name: string) {
  return api.post<DataRoom>('/data-rooms', { name }).then((r) => r.data)
}

export function getDataRoom(id: string, shareToken?: string) {
  return api.get<DataRoomDetail>(`/data-rooms/${id}`, { params: { shareToken } }).then((r) => r.data)
}

export function getDataRoomContents(id: string, opts: { page?: number; pageSize?: number; shareToken?: string } = {}) {
  return api.get<FolderContents>(`/data-rooms/${id}/contents`, { params: opts }).then((r) => r.data)
}

export function renameDataRoom(id: string, name: string) {
  return api.patch<DataRoom>(`/data-rooms/${id}`, { name }).then((r) => r.data)
}

export function deleteDataRoom(id: string) {
  return api.delete(`/data-rooms/${id}`).then((r) => r.data)
}

export function searchDataRoom(id: string, q: string, shareToken?: string) {
  return api.get<SearchResults>(`/data-rooms/${id}/search`, { params: { q, shareToken } }).then((r) => r.data)
}

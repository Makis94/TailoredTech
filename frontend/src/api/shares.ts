import { api } from './client'
import type { Share, ShareMode, ShareResourceType, SharedWithMeItem, ShareTokenResolution } from '@/types'

export function createShare(data: {
  resourceType: ShareResourceType
  resourceId: string
  mode: ShareMode
  emails?: string[]
}) {
  return api.post<Share>('/shares', data).then((r) => r.data)
}

export function listShares(resourceType: ShareResourceType, resourceId: string) {
  return api.get<Share[]>('/shares', { params: { resourceType, resourceId } }).then((r) => r.data)
}

export function revokeShare(id: string) {
  return api.delete(`/shares/${id}`).then((r) => r.data)
}

export function addGrant(shareId: string, email: string) {
  return api.post<Share>(`/shares/${shareId}/grants`, { email }).then((r) => r.data)
}

export function removeGrant(shareId: string, grantId: string) {
  return api.delete(`/shares/${shareId}/grants/${grantId}`).then((r) => r.data)
}

export function resolveShareToken(token: string) {
  return api.get<ShareTokenResolution>(`/shares/by-token/${token}`).then((r) => r.data)
}

export function listSharedWithMe() {
  return api.get<SharedWithMeItem[]>('/shared-with-me').then((r) => r.data)
}

export interface User {
  id: string
  email: string
  name: string
}

export type AccessLevel = 'OWNER' | 'VIEWER'
export type ShareResourceType = 'DATA_ROOM' | 'FOLDER' | 'FILE'
export type ShareMode = 'PUBLIC' | 'PERMISSIONED'

export interface DataRoom {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface Stats {
  folderCount: number
  fileCount: number
  totalSizeBytes: number
}

export interface DataRoomDetail extends DataRoom {
  accessLevel: AccessLevel
  stats: Stats
}

export interface FolderSummary {
  id: string
  name: string
  type: 'folder'
  createdAt: string
  updatedAt: string
}

export interface FileSummary {
  id: string
  name: string
  type: 'file'
  folderId: string | null
  size: number
  mimeType: string
  versionNumber: number
  createdAt: string
  updatedAt: string
}

export interface Breadcrumb {
  id: string
  name: string
}

export interface FolderDetail extends FolderSummary {
  dataRoom: { id: string; name: string; ownerId: string }
  breadcrumb: Breadcrumb[]
  accessLevel: AccessLevel
}

export interface FileDetail extends FileSummary {
  dataRoom: { id: string; name: string }
  accessLevel: AccessLevel
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface FolderContents {
  folders: FolderSummary[]
  files: Paginated<FileSummary>
}

export interface SearchResults {
  folders: FolderSummary[]
  files: FileSummary[]
}

export interface FileVersion {
  id: string
  versionNumber: number
  size: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; name: string; email: string }
}

export interface ShareGrant {
  id: string
  email: string
  userId: string | null
  createdAt: string
}

export interface Share {
  id: string
  resourceType: ShareResourceType
  mode: ShareMode
  createdAt: string
  revokedAt: string | null
  shareUrl: string | null
  grants: ShareGrant[]
}

export interface SharedWithMeItem {
  shareId: string
  resourceType: ShareResourceType
  resourceId: string
  name: string
  dataRoomId: string
  dataRoomName: string
  sharedBy: { id: string; name: string; email: string }
  sharedAt: string
}

export interface ShareTokenResolution {
  token: string
  mode: ShareMode
  resourceType: ShareResourceType
  resourceId: string
  dataRoomId: string
  name: string
}

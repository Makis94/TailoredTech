/** Shared shape-mapping helpers so Folders/Files/DataRooms/Shares controllers all return identically-shaped items. */

export interface FolderSummary {
  id: string;
  name: string;
  type: 'folder';
  createdAt: Date;
  updatedAt: Date;
}

export interface FileSummary {
  id: string;
  name: string;
  type: 'file';
  folderId: string | null;
  size: number;
  mimeType: string;
  versionNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toFolderSummary(folder: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): FolderSummary {
  return {
    id: folder.id,
    name: folder.name,
    type: 'folder',
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export function toFileSummary(file: {
  id: string;
  name: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: {
    size: number;
    mimeType: string;
    versionNumber: number;
  } | null;
}): FileSummary {
  return {
    id: file.id,
    name: file.name,
    type: 'file',
    folderId: file.folderId,
    size: file.currentVersion?.size ?? 0,
    mimeType: file.currentVersion?.mimeType ?? 'application/octet-stream',
    versionNumber: file.currentVersion?.versionNumber ?? 1,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

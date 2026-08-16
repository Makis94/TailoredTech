import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderX } from 'lucide-react'
import { ExplorerView } from '@/components/explorer-view'
import { EmptyState } from '@/components/empty-state'
import * as foldersApi from '@/api/folders'

export function FolderPage() {
  const { dataRoomId, folderId } = useParams<{ dataRoomId: string; folderId: string }>()

  const { data: folder, isError } = useQuery({
    queryKey: ['folder-detail', folderId, undefined],
    queryFn: () => foldersApi.getFolder(folderId!),
    enabled: !!folderId,
    retry: false,
  })

  if (isError) {
    return (
      <EmptyState
        icon={FolderX}
        title="Folder not found"
        description="It may have been moved, deleted, or you no longer have access to it."
      />
    )
  }
  if (!dataRoomId || !folderId || !folder) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <ExplorerView
      dataRoomId={dataRoomId}
      rootLabel={folder.dataRoom.name}
      folderId={folderId}
      rootHref={`/data-rooms/${dataRoomId}`}
      urls={{
        folder: (id) => `/data-rooms/${dataRoomId}/folders/${id}`,
        file: (id) => `/files/${id}`,
      }}
    />
  )
}

import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FolderX, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
import { ExplorerView } from '@/components/explorer-view'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RenameDialog } from '@/components/dialogs/rename-dialog'
import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { ShareDialog } from '@/components/dialogs/share-dialog'
import { EmptyState } from '@/components/empty-state'
import * as dataRoomsApi from '@/api/dataRooms'
import { apiErrorMessage } from '@/api/client'
import { formatBytes } from '@/lib/utils'

export function DataRoomPage() {
  const { dataRoomId } = useParams<{ dataRoomId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)

  const { data: room, isError } = useQuery({
    queryKey: ['dataroom-detail', dataRoomId, undefined],
    queryFn: () => dataRoomsApi.getDataRoom(dataRoomId!),
    enabled: !!dataRoomId,
    retry: false,
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => dataRoomsApi.renameDataRoom(dataRoomId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataroom-detail', dataRoomId] })
      queryClient.invalidateQueries({ queryKey: ['data-rooms'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => dataRoomsApi.deleteDataRoom(dataRoomId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-rooms'] })
      toast.success('Data room deleted')
      navigate('/')
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (isError) {
    return (
      <EmptyState
        icon={FolderX}
        title="Data room not found"
        description="It may have been deleted, or you no longer have access to it."
      />
    )
  }
  if (!dataRoomId || !room) return <p className="text-sm text-muted-foreground">Loading…</p>
  const isOwner = room.accessLevel === 'OWNER'

  return (
    <div>
      {isOwner && (
        <div className="mb-2 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Data room settings <MoreVertical className="ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                <Share2 /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 /> Delete data room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <ExplorerView
        dataRoomId={dataRoomId}
        rootLabel={room.name}
        rootHref={`/data-rooms/${dataRoomId}`}
        urls={{
          folder: (id) => `/data-rooms/${dataRoomId}/folders/${id}`,
          file: (id) => `/files/${id}`,
        }}
      />

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        kind="data room"
        initialName={room.name}
        onSubmit={(name) => renameMutation.mutateAsync(name)}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${room.name}"?`}
        description={
          <>
            This permanently deletes the entire data room — {room.stats.folderCount} folder
            {room.stats.folderCount === 1 ? '' : 's'} and {room.stats.fileCount} file
            {room.stats.fileCount === 1 ? '' : 's'} ({formatBytes(room.stats.totalSizeBytes)}). This can't be undone,
            and everyone it was shared with will lose access.
          </>
        }
        onConfirm={() => deleteMutation.mutateAsync()}
      />
      {shareOpen && (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} resourceType="DATA_ROOM" resourceId={dataRoomId} resourceName={room.name} />
      )}
    </div>
  )
}

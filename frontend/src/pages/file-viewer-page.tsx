import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Download, FileX, FolderInput, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RenameDialog } from '@/components/dialogs/rename-dialog'
import { MoveFileDialog } from '@/components/dialogs/move-file-dialog'
import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { ShareDialog } from '@/components/dialogs/share-dialog'
import { VersionHistoryDialog } from '@/components/dialogs/version-history-dialog'
import * as filesApi from '@/api/files'
import { apiErrorMessage } from '@/api/client'
import { formatBytes } from '@/lib/utils'

export function FileViewerPage() {
  const { fileId, token } = useParams<{ fileId: string; token?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [renameOpen, setRenameOpen] = React.useState(false)
  const [moveOpen, setMoveOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [versionsOpen, setVersionsOpen] = React.useState(false)

  const fileQuery = useQuery({
    queryKey: ['file-detail', fileId, token],
    queryFn: () => filesApi.getFile(fileId!, token),
    enabled: !!fileId,
    retry: false,
  })

  const urlQuery = useQuery({
    queryKey: ['file-download-url', fileId, token],
    queryFn: () => filesApi.getFileDownloadUrl(fileId!, { shareToken: token }),
    enabled: !!fileId,
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => filesApi.renameFile(fileId!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['file-detail', fileId] }),
  })
  const moveMutation = useMutation({
    mutationFn: (folderId: string | null) => filesApi.moveFile(fileId!, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-detail', fileId] })
      toast.success('File moved')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => filesApi.deleteFile(fileId!),
    onSuccess: () => {
      toast.success('File deleted')
      const room = fileQuery.data?.dataRoom
      navigate(token ? `/shared/${token}` : room ? `/data-rooms/${room.id}` : '/')
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (fileQuery.isError) {
    return (
      <EmptyState
        icon={FileX}
        title="File not found"
        description="It may have been moved, deleted, or you no longer have access to it."
      />
    )
  }
  if (!fileId || !fileQuery.data) return <p className="text-sm text-muted-foreground">Loading…</p>
  const file = fileQuery.data
  const isOwner = file.accessLevel === 'OWNER'
  const roomHref = token ? `/shared/${token}` : `/data-rooms/${file.dataRoom.id}`

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Breadcrumbs items={[{ label: file.dataRoom.name, to: roomHref }, { label: file.name }]} />
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => window.open(urlQuery.data?.url, '_blank', 'noopener,noreferrer')} disabled={!urlQuery.data}>
            <Download /> Download
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="File actions">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setVersionsOpen(true)}>
                <Clock /> Version history
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                    <Share2 /> Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
                    <FolderInput /> Move
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {formatBytes(file.size)} · version {file.versionNumber}
      </p>

      <div className="mt-4 h-[75vh] overflow-hidden rounded-lg border border-border bg-muted">
        {urlQuery.data ? (
          <iframe src={urlQuery.data.url} title={file.name} className="size-full" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Loading preview…</div>
        )}
      </div>

      <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} kind="file" initialName={file.name} onSubmit={(name) => renameMutation.mutateAsync(name)} />
      {moveOpen && (
        <MoveFileDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          dataRoomId={file.dataRoom.id}
          dataRoomName={file.dataRoom.name}
          currentFolderId={file.folderId}
          onSubmit={(folderId) => moveMutation.mutateAsync(folderId)}
        />
      )}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${file.name}"?`}
        description="This permanently deletes this file and all its versions. This can't be undone."
        onConfirm={() => deleteMutation.mutateAsync()}
      />
      {shareOpen && <ShareDialog open={shareOpen} onOpenChange={setShareOpen} resourceType="FILE" resourceId={fileId} resourceName={file.name} />}
      <VersionHistoryDialog open={versionsOpen} onOpenChange={setVersionsOpen} fileId={fileId} fileName={file.name} shareToken={token} />
    </div>
  )
}

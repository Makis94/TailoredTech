import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FolderPlus, FolderX, Search, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumbs, type Crumb } from '@/components/breadcrumbs'
import { EmptyState } from '@/components/empty-state'
import { ItemRow, type Item } from '@/components/item-row'
import { UploadProgressPanel } from '@/components/upload-progress-panel'
import { NamePromptDialog } from '@/components/dialogs/name-prompt-dialog'
import { RenameDialog } from '@/components/dialogs/rename-dialog'
import { MoveFileDialog } from '@/components/dialogs/move-file-dialog'
import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { ShareDialog } from '@/components/dialogs/share-dialog'
import { VersionHistoryDialog } from '@/components/dialogs/version-history-dialog'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { apiErrorMessage } from '@/api/client'
import * as dataRoomsApi from '@/api/dataRooms'
import * as foldersApi from '@/api/folders'
import * as filesApi from '@/api/files'
import { formatBytes } from '@/lib/utils'
import type { AccessLevel, DataRoomDetail, FileSummary, FolderDetail, FolderSummary } from '@/types'

export interface ExplorerUrls {
  folder: (id: string) => string
  file: (id: string) => string
}

export function ExplorerView({
  dataRoomId,
  rootLabel,
  rootHref,
  folderId,
  shareToken,
  urls,
  breadcrumbFloorId,
}: {
  dataRoomId: string
  /** Label + link for the first breadcrumb: the data room name for owned views, or the shared item's own name for a link scoped below the room root. */
  rootLabel: string
  rootHref: string
  folderId?: string
  shareToken?: string
  urls: ExplorerUrls
  /** When viewing a FOLDER-scoped share, excludes this id and everything above it from the breadcrumb trail (the viewer can't see those ancestors). */
  breadcrumbFloorId?: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const [createFolderOpen, setCreateFolderOpen] = React.useState(false)
  const [renameTarget, setRenameTarget] = React.useState<Item | null>(null)
  const [moveTarget, setMoveTarget] = React.useState<FileSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Item | null>(null)
  const [shareTarget, setShareTarget] = React.useState<Item | null>(null)
  const [versionsTarget, setVersionsTarget] = React.useState<FileSummary | null>(null)

  React.useEffect(() => setPage(1), [folderId])

  const detailQuery = useQuery<DataRoomDetail | FolderDetail>({
    queryKey: folderId ? ['folder-detail', folderId, shareToken] : ['dataroom-detail', dataRoomId, shareToken],
    queryFn: () => (folderId ? foldersApi.getFolder(folderId, shareToken) : dataRoomsApi.getDataRoom(dataRoomId, shareToken)),
  })

  // Prefix (no page/shareToken) so invalidation below catches every page at once.
  const contentsListPrefix = folderId ? ['folder-contents', folderId] : ['dataroom-contents', dataRoomId]
  const contentsQueryKey = [...contentsListPrefix, page, shareToken]

  const contentsQuery = useQuery({
    queryKey: contentsQueryKey,
    queryFn: () =>
      folderId
        ? foldersApi.getFolderContents(folderId, { page, shareToken })
        : dataRoomsApi.getDataRoomContents(dataRoomId, { page, shareToken }),
  })

  const searchQuery = useQuery({
    queryKey: ['search', folderId ?? dataRoomId, debouncedSearch, shareToken],
    queryFn: () =>
      folderId
        ? foldersApi.searchFolder(folderId, debouncedSearch, shareToken)
        : dataRoomsApi.searchDataRoom(dataRoomId, debouncedSearch, shareToken),
    enabled: debouncedSearch.length > 0,
  })

  const accessLevel: AccessLevel = detailQuery.data?.accessLevel ?? 'VIEWER'
  const isOwner = accessLevel === 'OWNER'

  const { uploads, startUpload, dismissUpload } = useFileUpload(dataRoomId, folderId, contentsListPrefix)

  const invalidateContents = () => {
    queryClient.invalidateQueries({ queryKey: contentsListPrefix })
    queryClient.invalidateQueries({ queryKey: ['search'] })
  }

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => foldersApi.createFolder({ name, dataRoomId, parentId: folderId }),
    onSuccess: () => {
      invalidateContents()
      toast.success('Folder created')
    },
  })

  const renameMutation = useMutation<FileSummary | FolderSummary, Error, string>({
    mutationFn: (name: string) => {
      if (!renameTarget) return Promise.reject(new Error('No target'))
      return renameTarget.type === 'folder' ? foldersApi.renameFolder(renameTarget.id, name) : filesApi.renameFile(renameTarget.id, name)
    },
    onSuccess: (updated) => {
      invalidateContents()
      if (renameTarget?.type === 'file' && updated.name !== renameTarget.name) {
        toast.success(`Renamed to "${updated.name}"`)
      }
    },
  })

  const moveMutation = useMutation({
    mutationFn: (destinationFolderId: string | null) => {
      if (!moveTarget) return Promise.reject(new Error('No target'))
      return filesApi.moveFile(moveTarget.id, destinationFolderId)
    },
    onSuccess: () => {
      invalidateContents()
      toast.success('File moved')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteTarget) return Promise.reject(new Error('No target'))
      return deleteTarget.type === 'folder' ? foldersApi.deleteFolder(deleteTarget.id) : filesApi.deleteFile(deleteTarget.id)
    },
    onSuccess: () => {
      invalidateContents()
      toast.success(`${deleteTarget?.type === 'folder' ? 'Folder' : 'File'} deleted`)
    },
  })

  const [deleteStats, setDeleteStats] = React.useState<{ folderCount: number; fileCount: number; totalSizeBytes: number } | null>(null)
  async function requestDelete(item: Item) {
    setDeleteTarget(item)
    setDeleteStats(null)
    if (item.type === 'folder') {
      try {
        const stats = await foldersApi.getFolderStats(item.id)
        setDeleteStats(stats)
      } catch (err) {
        toast.error(apiErrorMessage(err))
      }
    }
  }

  function handleOpen(item: Item) {
    if (item.type === 'folder') navigate(urls.folder(item.id))
    else navigate(urls.file(item.id))
  }

  async function handleDownload(file: FileSummary) {
    try {
      const { url } = await filesApi.getFileDownloadUrl(file.id, { shareToken })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not open file'))
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (!isOwner) return
    if (e.dataTransfer.files.length > 0) startUpload(e.dataTransfer.files)
  }

  const fullBreadcrumb = detailQuery.data && folderId && 'breadcrumb' in detailQuery.data ? detailQuery.data.breadcrumb : []
  const floorIndex = breadcrumbFloorId ? fullBreadcrumb.findIndex((b) => b.id === breadcrumbFloorId) : -1
  const visibleBreadcrumb = floorIndex >= 0 ? fullBreadcrumb.slice(floorIndex + 1) : fullBreadcrumb

  const crumbs: Crumb[] = [
    { label: rootLabel, to: rootHref },
    ...visibleBreadcrumb.map((b, i, arr) => ({
      label: b.name,
      to: i === arr.length - 1 ? undefined : urls.folder(b.id),
    })),
  ]

  const isSearching = debouncedSearch.length > 0
  const items: Item[] = isSearching
    ? [...(searchQuery.data?.folders ?? []), ...(searchQuery.data?.files ?? [])]
    : [...(contentsQuery.data?.folders ?? []), ...(contentsQuery.data?.files.items ?? [])]

  const totalFiles = contentsQuery.data?.files.total ?? 0
  const pageSize = contentsQuery.data?.files.pageSize ?? 50
  const totalPages = Math.max(1, Math.ceil(totalFiles / pageSize))

  return (
    <div>
      <Breadcrumbs items={crumbs} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search this data room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {isOwner && (
            <>
              <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus /> New folder
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload /> Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) startUpload(e.target.files)
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          if (!isOwner) return
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-4 rounded-lg border transition-colors ${isDragging ? 'border-accent bg-accent/5' : 'border-border'}`}
      >
        {isSearching ? (
          searchQuery.isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : items.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description={`Nothing named "${debouncedSearch}" here.`} />
          ) : (
            items.map((item) => (
              <ItemRow
                key={`${item.type}-${item.id}`}
                item={item}
                accessLevel={accessLevel}
                onOpen={handleOpen}
                onRename={setRenameTarget}
                onMove={setMoveTarget}
                onDelete={requestDelete}
                onShare={setShareTarget}
                onVersionHistory={setVersionsTarget}
                onDownload={handleDownload}
              />
            ))
          )
        ) : contentsQuery.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : contentsQuery.isError || detailQuery.isError ? (
          <EmptyState
            icon={FolderX}
            title="This is no longer available"
            description="It may have been moved, deleted, or had its access revoked."
          />
        ) : items.length === 0 && contentsQuery.isSuccess ? (
          <EmptyState
            icon={Upload}
            title={isOwner ? 'Nothing here yet' : 'This folder is empty'}
            description={isOwner ? 'Drag and drop PDFs anywhere in this area, or use Upload.' : undefined}
          />
        ) : (
          items.map((item) => (
            <ItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              accessLevel={accessLevel}
              onOpen={handleOpen}
              onRename={setRenameTarget}
              onMove={setMoveTarget}
              onDelete={requestDelete}
              onShare={setShareTarget}
              onVersionHistory={setVersionsTarget}
              onDownload={handleDownload}
            />
          ))
        )}
      </div>

      {!isSearching && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <UploadProgressPanel uploads={uploads} onDismiss={dismissUpload} />

      <NamePromptDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title="New folder"
        label="Name"
        placeholder="Untitled folder"
        onSubmit={(name) => createFolderMutation.mutateAsync(name)}
      />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          kind={renameTarget.type}
          initialName={renameTarget.name}
          onSubmit={(name) => renameMutation.mutateAsync(name)}
        />
      )}

      {moveTarget && (
        <MoveFileDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          dataRoomId={dataRoomId}
          dataRoomName={rootLabel}
          currentFolderId={folderId ?? null}
          onSubmit={(destination) => moveMutation.mutateAsync(destination)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          description={
            deleteTarget.type === 'folder' ? (
              deleteStats ? (
                <>
                  This permanently deletes this folder, its {deleteStats.folderCount} subfolder
                  {deleteStats.folderCount === 1 ? '' : 's'}, and {deleteStats.fileCount} file
                  {deleteStats.fileCount === 1 ? '' : 's'} ({formatBytes(deleteStats.totalSizeBytes)}). This can't be
                  undone. Anyone this folder was shared with will lose access.
                </>
              ) : (
                'Loading what will be deleted…'
              )
            ) : (
              "This permanently deletes this file and all its versions. This can't be undone."
            )
          }
          onConfirm={() => deleteMutation.mutateAsync()}
        />
      )}

      {shareTarget && (
        <ShareDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          resourceType={shareTarget.type === 'folder' ? 'FOLDER' : 'FILE'}
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
        />
      )}

      {versionsTarget && (
        <VersionHistoryDialog
          open={!!versionsTarget}
          onOpenChange={(open) => !open && setVersionsTarget(null)}
          fileId={versionsTarget.id}
          fileName={versionsTarget.name}
          shareToken={shareToken}
        />
      )}
    </div>
  )
}

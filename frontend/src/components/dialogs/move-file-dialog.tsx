import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, Folder, Home } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getDataRoomContents } from '@/api/dataRooms'
import { getFolderContents } from '@/api/folders'
import { apiErrorMessage } from '@/api/client'

export function MoveFileDialog({
  open,
  onOpenChange,
  dataRoomId,
  dataRoomName,
  currentFolderId,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataRoomId: string
  dataRoomName: string
  currentFolderId: string | null
  onSubmit: (folderId: string | null) => Promise<unknown>
}) {
  const [browsingFolderId, setBrowsingFolderId] = React.useState<string | null>(null)
  const [trail, setTrail] = React.useState<{ id: string | null; name: string }[]>([{ id: null, name: dataRoomName }])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setBrowsingFolderId(null)
      setTrail([{ id: null, name: dataRoomName }])
    }
  }, [open, dataRoomName])

  const { data, isLoading } = useQuery({
    queryKey: ['move-dialog-contents', dataRoomId, browsingFolderId],
    queryFn: () =>
      browsingFolderId ? getFolderContents(browsingFolderId) : getDataRoomContents(dataRoomId, { pageSize: 1 }),
    enabled: open,
  })

  function navigateInto(id: string, name: string) {
    setBrowsingFolderId(id)
    setTrail((prev) => [...prev, { id, name }])
  }

  function navigateToCrumb(index: number) {
    setTrail((prev) => prev.slice(0, index + 1))
    setBrowsingFolderId(trail[index].id)
  }

  async function handleMoveHere() {
    setIsSubmitting(true)
    try {
      await onSubmit(browsingFolderId)
      onOpenChange(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not move file'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSameLocation = browsingFolderId === currentFolderId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move file</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {trail.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" />}
              <button
                className="rounded px-1 py-0.5 hover:bg-secondary hover:text-foreground"
                onClick={() => navigateToCrumb(i)}
              >
                {i === 0 ? <Home className="size-3.5" /> : crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="mt-2 h-64 overflow-y-auto rounded-md border border-border">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {data && data.folders.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No subfolders here.</p>
          )}
          {data?.folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => navigateInto(folder.id, folder.name)}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-secondary"
            >
              <Folder className="size-4 shrink-0 text-accent" />
              <span className="truncate">{folder.name}</span>
              <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMoveHere} disabled={isSubmitting || isSameLocation}>
            {isSameLocation ? 'Already here' : `Move here`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

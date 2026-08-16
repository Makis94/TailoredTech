import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listFileVersions, getFileDownloadUrl } from '@/api/files'
import { formatBytes, formatDateTime } from '@/lib/utils'
import { Download } from 'lucide-react'

export function VersionHistoryDialog({
  open,
  onOpenChange,
  fileId,
  fileName,
  shareToken,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileId: string
  fileName: string
  shareToken?: string
}) {
  const { data: versions = [] } = useQuery({
    queryKey: ['file-versions', fileId],
    queryFn: () => listFileVersions(fileId, shareToken),
    enabled: open,
  })

  async function openVersion(versionId: string) {
    const { url } = await getFileDownloadUrl(fileId, { shareToken, versionId })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">Version history — {fileName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {versions.map((v, i) => (
            <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Version {v.versionNumber}</span>
                  {i === 0 && (
                    <Badge variant="accent" className="text-[10px]">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatBytes(v.size)} · uploaded by {v.uploadedBy.name} · {formatDateTime(v.createdAt)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => openVersion(v.id)} aria-label="Open this version">
                <Download />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

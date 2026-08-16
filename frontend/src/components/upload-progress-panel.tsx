import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { UploadItem } from '@/hooks/use-file-upload'

export function UploadProgressPanel({ uploads, onDismiss }: { uploads: UploadItem[]; onDismiss: (id: string) => void }) {
  if (uploads.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 rounded-lg border border-border bg-card shadow-lg">
      <div className="border-b border-border px-4 py-2.5 text-sm font-medium">
        Uploading {uploads.filter((u) => u.status === 'uploading').length || uploads.length} file
        {uploads.length === 1 ? '' : 's'}
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {uploads.map((upload) => (
          <div key={upload.id} className="flex items-start gap-2.5 rounded-md px-2 py-2">
            {upload.status === 'done' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : upload.status === 'error' ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{upload.name}</p>
              {upload.status === 'uploading' && <Progress value={upload.progress} className="mt-1 h-1" />}
              {upload.status === 'error' && <p className="text-xs text-destructive">{upload.error}</p>}
            </div>
            {upload.status !== 'uploading' && (
              <button onClick={() => onDismiss(upload.id)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

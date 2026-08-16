import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadFile } from '@/api/files'
import { apiErrorMessage } from '@/api/client'

export interface UploadItem {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

/** Drives one or more concurrent file uploads into a folder (or data room root), each with its own progress. */
export function useFileUpload(dataRoomId: string, folderId: string | undefined, contentsQueryKey: unknown[]) {
  const [uploads, setUploads] = React.useState<UploadItem[]>([])
  const queryClient = useQueryClient()

  const startUpload = React.useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files)
      if (list.length === 0) return

      const nonPdf = list.filter((f) => f.type !== 'application/pdf')
      const pdfs = list.filter((f) => f.type === 'application/pdf')
      if (nonPdf.length > 0) {
        toast.error(
          nonPdf.length === 1
            ? `"${nonPdf[0].name}" isn't a PDF and was skipped.`
            : `${nonPdf.length} files weren't PDFs and were skipped.`,
        )
      }

      pdfs.forEach((file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`
        setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: 'uploading' }])

        uploadFile({ file, dataRoomId, folderId }, (progress) => {
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)))
        })
          .then(() => {
            setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'done', progress: 100 } : u)))
            queryClient.invalidateQueries({ queryKey: contentsQueryKey })
          })
          .catch((err) => {
            const message = apiErrorMessage(err, 'Upload failed')
            setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'error', error: message } : u)))
            toast.error(`"${file.name}" failed to upload: ${message}`)
          })
      })
    },
    [dataRoomId, folderId, contentsQueryKey, queryClient],
  )

  const dismissUpload = React.useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const clearFinished = React.useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status === 'uploading'))
  }, [])

  return { uploads, startUpload, dismissUpload, clearFinished }
}

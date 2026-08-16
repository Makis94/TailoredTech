import { Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExplorerView } from '@/components/explorer-view'
import { EmptyState } from '@/components/empty-state'
import { resolveShareToken } from '@/api/shares'
import { ShieldOff } from 'lucide-react'

export function SharedExplorerPage() {
  const { token, folderId } = useParams<{ token: string; folderId?: string }>()

  const { data: resolution, isError } = useQuery({
    queryKey: ['share-token', token],
    queryFn: () => resolveShareToken(token!),
    enabled: !!token,
    retry: false,
  })

  if (isError) {
    return <EmptyState icon={ShieldOff} title="Link unavailable" description="This share link is invalid or has been revoked." />
  }
  if (!token || !resolution) return null

  if (resolution.resourceType === 'FILE') {
    return <Navigate to={`/shared/${token}/files/${resolution.resourceId}`} replace />
  }

  const currentFolderId = folderId ?? (resolution.resourceType === 'FOLDER' ? resolution.resourceId : undefined)

  return (
    <ExplorerView
      dataRoomId={resolution.dataRoomId}
      folderId={currentFolderId}
      shareToken={token}
      rootLabel={resolution.name}
      rootHref={`/shared/${token}`}
      breadcrumbFloorId={resolution.resourceType === 'FOLDER' ? resolution.resourceId : undefined}
      urls={{
        folder: (id) => `/shared/${token}/folders/${id}`,
        file: (id) => `/shared/${token}/files/${id}`,
      }}
    />
  )
}

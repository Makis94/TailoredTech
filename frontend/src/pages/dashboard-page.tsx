import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, Folder, Plus, Vault } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { NamePromptDialog } from '@/components/dialogs/name-prompt-dialog'
import * as dataRoomsApi from '@/api/dataRooms'
import * as sharesApi from '@/api/shares'
import { apiErrorMessage } from '@/api/client'
import { formatDate } from '@/lib/utils'
import type { SharedWithMeItem } from '@/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)

  const dataRoomsQuery = useQuery({ queryKey: ['data-rooms'], queryFn: dataRoomsApi.listDataRooms })
  const sharedQuery = useQuery({ queryKey: ['shared-with-me'], queryFn: sharesApi.listSharedWithMe })

  const createMutation = useMutation({
    mutationFn: (name: string) => dataRoomsApi.createDataRoom(name),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['data-rooms'] })
      navigate(`/data-rooms/${room.id}`)
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create data room')),
  })

  function sharedItemHref(item: SharedWithMeItem) {
    if (item.resourceType === 'DATA_ROOM') return `/data-rooms/${item.resourceId}`
    if (item.resourceType === 'FOLDER') return `/data-rooms/${item.dataRoomId}/folders/${item.resourceId}`
    return `/files/${item.resourceId}`
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold">Your data rooms</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> New data room
          </Button>
        </div>

        <div className="mt-4">
          {dataRoomsQuery.data?.length === 0 ? (
            <EmptyState
              icon={Vault}
              title="No data rooms yet"
              description="Create one to start organizing documents for due diligence."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus /> New data room
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dataRoomsQuery.data?.map((room) => (
                <Link
                  key={room.id}
                  to={`/data-rooms/${room.id}`}
                  className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent"
                >
                  <Vault className="size-6 text-accent" strokeWidth={1.5} />
                  <p className="mt-3 truncate font-medium">{room.name}</p>
                  <p className="text-xs text-muted-foreground">Updated {formatDate(room.updatedAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {(sharedQuery.data?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold">Shared with you</h2>
          <div className="mt-4 divide-y divide-border rounded-lg border border-border">
            {sharedQuery.data!.map((item) => (
              <Link key={item.shareId} to={sharedItemHref(item)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary/60">
                {item.resourceType === 'FILE' ? (
                  <FileText className="size-4 text-muted-foreground" />
                ) : (
                  <Folder className="size-4 text-accent" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{item.dataRoomName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">from {item.sharedBy.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <NamePromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New data room"
        label="Name"
        placeholder="Project Falcon — Due Diligence"
        onSubmit={(name) => createMutation.mutateAsync(name)}
      />
    </div>
  )
}

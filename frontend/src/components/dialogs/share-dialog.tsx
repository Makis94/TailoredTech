import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Link2, Trash2, Users, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import * as sharesApi from '@/api/shares'
import { apiErrorMessage } from '@/api/client'
import type { ShareResourceType } from '@/types'

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceType: ShareResourceType
  resourceId: string
  resourceName: string
}) {
  const queryClient = useQueryClient()
  const queryKey = ['shares', resourceType, resourceId]

  const { data: shares = [] } = useQuery({
    queryKey,
    queryFn: () => sharesApi.listShares(resourceType, resourceId),
    enabled: open,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const publicShare = shares.find((s) => s.mode === 'PUBLIC' && !s.revokedAt)
  const permissionedShare = shares.find((s) => s.mode === 'PERMISSIONED' && !s.revokedAt)

  const createPublic = useMutation({
    mutationFn: () => sharesApi.createShare({ resourceType, resourceId, mode: 'PUBLIC' }),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create link')),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => sharesApi.revokeShare(id),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not revoke access')),
  })

  const [email, setEmail] = React.useState('')
  const addPerson = useMutation({
    mutationFn: (email: string) =>
      permissionedShare
        ? sharesApi.addGrant(permissionedShare.id, email)
        : sharesApi.createShare({ resourceType, resourceId, mode: 'PERMISSIONED', emails: [email] }),
    onSuccess: () => {
      invalidate()
      setEmail('')
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not invite this person')),
  })
  const removePerson = useMutation({
    mutationFn: (grantId: string) => sharesApi.removeGrant(permissionedShare!.id, grantId),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove access')),
  })

  function copyLink() {
    if (!publicShare?.shareUrl) return
    navigator.clipboard.writeText(publicShare.shareUrl)
    toast.success('Link copied')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">Share "{resourceName}"</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link2 className="mr-1.5 size-3.5" /> Public link
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="mr-1.5 size-3.5" /> People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-3">
            {publicShare ? (
              <>
                <p className="text-sm text-muted-foreground">Anyone with this link can view — read-only.</p>
                <div className="flex gap-2">
                  <Input readOnly value={publicShare.shareUrl ?? ''} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
                    <Copy />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => revoke.mutate(publicShare.id)}
                  disabled={revoke.isPending}
                >
                  <Trash2 /> Revoke link
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Create a link that lets anyone view this {resourceType === 'FILE' ? 'file' : 'content'} — no account
                  needed.
                </p>
                <Button type="button" onClick={() => createPublic.mutate()} disabled={createPublic.isPending}>
                  Create link
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="people" className="space-y-3">
            <p className="text-sm text-muted-foreground">Only people you invite here can view.</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (email.trim()) addPerson.mutate(email.trim())
              }}
            >
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" disabled={addPerson.isPending || !email.trim()}>
                Invite
              </Button>
            </form>

            <div className="space-y-1.5">
              {(permissionedShare?.grants ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No one else has access yet.</p>
              )}
              {permissionedShare?.grants.map((grant) => (
                <div key={grant.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span className="truncate">{grant.email}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Viewer</Badge>
                    <button
                      onClick={() => removePerson.mutate(grant.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${grant.email}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

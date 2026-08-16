import * as React from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/api/client'

export function RenameDialog({
  open,
  onOpenChange,
  kind,
  initialName,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'folder' | 'file' | 'data room'
  initialName: string
  onSubmit: (name: string) => Promise<unknown>
}) {
  const [name, setName] = React.useState(initialName)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(name.trim())
      onOpenChange(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not rename'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename {kind}</DialogTitle>
            {kind === 'file' && (
              <DialogDescription>If another file here has this name already, we'll add a number to keep both.</DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="rename-input">Name</Label>
            <Input id="rename-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

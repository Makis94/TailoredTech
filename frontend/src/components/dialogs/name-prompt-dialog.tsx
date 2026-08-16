import * as React from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/api/client'

/** Generic "type a name, submit" dialog — backs both "new folder" and "new data room". */
export function NamePromptDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  submitLabel = 'Create',
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  placeholder?: string
  submitLabel?: string
  onSubmit: (name: string) => Promise<unknown>
}) {
  const [name, setName] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) setName('')
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(name.trim())
      onOpenChange(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, `Could not create`))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="name-prompt-input">{label}</Label>
            <Input id="name-prompt-input" autoFocus placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

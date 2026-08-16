import { FileText, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ItemIcon({ type, className }: { type: 'folder' | 'file'; className?: string }) {
  if (type === 'folder') {
    return <Folder className={cn('size-5 fill-accent/20 text-accent', className)} strokeWidth={1.75} />
  }
  return <FileText className={cn('size-5 text-muted-foreground', className)} strokeWidth={1.75} />
}

import { Clock, Download, FolderInput, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
import { ItemIcon } from '@/components/file-icon'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatBytes, formatDate } from '@/lib/utils'
import type { AccessLevel, FileSummary, FolderSummary } from '@/types'

export type Item = (FolderSummary | FileSummary) & { type: 'folder' | 'file' }

export function ItemRow({
  item,
  accessLevel,
  onOpen,
  onRename,
  onMove,
  onDelete,
  onShare,
  onVersionHistory,
  onDownload,
}: {
  item: Item
  accessLevel: AccessLevel
  onOpen: (item: Item) => void
  onRename: (item: Item) => void
  onMove: (item: FileSummary) => void
  onDelete: (item: Item) => void
  onShare: (item: Item) => void
  onVersionHistory: (item: FileSummary) => void
  onDownload: (item: FileSummary) => void
}) {
  const isOwner = accessLevel === 'OWNER'
  const isFile = item.type === 'file'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item)}
      className="group flex items-center gap-3 border-b border-border px-3 py-2.5 text-sm last:border-b-0 hover:bg-secondary/60 cursor-pointer"
    >
      <ItemIcon type={item.type} />
      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
      {isFile && <span className="hidden w-20 shrink-0 font-mono text-xs text-muted-foreground sm:block">{formatBytes(item.size)}</span>}
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">{formatDate(item.updatedAt)}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Actions for ${item.name}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {isFile && (
            <DropdownMenuItem onSelect={() => onDownload(item)}>
              <Download /> Download
            </DropdownMenuItem>
          )}
          {isFile && (
            <DropdownMenuItem onSelect={() => onVersionHistory(item)}>
              <Clock /> Version history
            </DropdownMenuItem>
          )}
          {isOwner && (
            <>
              {isFile && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => onShare(item)}>
                <Share2 /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRename(item)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              {isFile && (
                <DropdownMenuItem onSelect={() => onMove(item)}>
                  <FolderInput /> Move
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

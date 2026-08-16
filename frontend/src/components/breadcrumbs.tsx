import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="rounded px-1 py-0.5 hover:bg-secondary hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'px-1 py-0.5 font-medium text-foreground' : 'px-1 py-0.5'}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

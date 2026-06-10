'use client'

import ExpandIconButton from '@/components/ui/ExpandIconButton'

type CollapsibleCardShellProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  onExpand: () => void
  className?: string
}

export default function CollapsibleCardShell({
  title,
  subtitle,
  eyebrow,
  onExpand,
  className = '',
}: CollapsibleCardShellProps) {
  return (
    <section
      className={`min-h-[92px] w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-medium tracking-wide text-gray-400">{eyebrow}</p>
          )}
          <h2 className={`text-sm font-semibold text-gray-900 ${eyebrow ? 'mt-0.5' : ''}`}>{title}</h2>
          {subtitle && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{subtitle}</p>
          )}
        </div>
        <ExpandIconButton onClick={onExpand} />
      </div>
    </section>
  )
}

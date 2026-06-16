'use client'

import ExpandIconButton from '@/components/ui/ExpandIconButton'

type CollapsibleCardShellProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  tags?: string[]
  onExpand: () => void
  className?: string
}

export default function CollapsibleCardShell({
  title,
  subtitle,
  eyebrow,
  tags,
  onExpand,
  className = '',
}: CollapsibleCardShellProps) {
  return (
    <section
      className={`min-h-[104px] w-full overflow-hidden rounded-[28px] border border-[#efe3df] bg-[#fffdfa] p-4 shadow-[0_10px_28px_rgba(44,36,32,0.06)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-bold tracking-wide text-[#a65a68]">{eyebrow}</p>
          )}
          <h2 className={`text-[15px] font-bold leading-5 text-[#202124] ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
          {subtitle && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#6f6864]">{subtitle}</p>
          )}
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#f5ebe8] px-2.5 py-1 text-[10px] font-bold text-[#8b4253]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <ExpandIconButton onClick={onExpand} />
      </div>
    </section>
  )
}

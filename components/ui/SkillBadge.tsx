// components/ui/SkillBadge.tsx

import { getSkillIcon } from '@/data/skill-icons'

interface SkillBadgeProps {
  label: string
  className?: string
}

export function SkillBadge({ label, className = '' }: SkillBadgeProps) {
  const entry = getSkillIcon(label)

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full
        bg-accent-violet/8 border border-accent-violet/20
        text-text-secondary transition-all duration-200
        hover:border-accent-violet/50 hover:text-text-primary
        ${className}
      `}
    >
      {entry && (
        <entry.icon
          size={13}
          color={entry.color}
          aria-hidden={true}
        />
      )}
      {label}
    </span>
  )
}

// components/ui/SkillBadge.tsx

'use client'

interface SkillBadgeProps {
  label: string
  className?: string
}

export function SkillBadge({ label, className = '' }: SkillBadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 text-xs font-mono rounded-full
        bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)]
        text-text-secondary transition-all duration-200
        hover:border-[rgba(139,92,246,0.5)] hover:text-text-primary
        ${className}
      `}
    >
      {label}
    </span>
  )
}

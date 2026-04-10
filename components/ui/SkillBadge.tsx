// components/ui/SkillBadge.tsx

interface SkillBadgeProps {
  label: string
  className?: string
}

export function SkillBadge({ label, className = '' }: SkillBadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 text-xs font-mono rounded-full
        bg-accent-violet/8 border border-accent-violet/20
        text-text-secondary transition-all duration-200
        hover:border-accent-violet/50 hover:text-text-primary
        ${className}
      `}
    >
      {label}
    </span>
  )
}

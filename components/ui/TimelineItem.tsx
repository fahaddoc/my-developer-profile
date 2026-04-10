'use client'

import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import type { Experience } from '@/data/projects'

interface TimelineItemProps {
  item: Experience
  index: number
}

export function TimelineItem({ item, index }: TimelineItemProps) {
  const { ref, isInView } = useInView()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
      className="relative pl-8 pb-10 last:pb-0"
    >
      {/* Vertical line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-[rgba(139,92,246,0.2)]" />

      {/* Dot */}
      <div
        className={`absolute left-[-4px] top-1.5 w-2 h-2 rounded-full border-2 ${
          item.current
            ? 'bg-accent-violet border-accent-violet shadow-[0_0_8px_rgba(139,92,246,0.6)]'
            : 'bg-bg-base border-[rgba(139,92,246,0.4)]'
        }`}
      />

      {/* Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-3">
        <div>
          <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest block mb-1">
            {item.company}
          </span>
          <h3 className="font-display font-bold text-xl text-text-primary">{item.role}</h3>
        </div>
        <span className="font-mono text-xs text-text-muted whitespace-nowrap mt-1">{item.period}</span>
      </div>

      {/* Bullets */}
      <ul className="flex flex-col gap-2 mb-4">
        {item.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
            <span className="mt-2 w-1 h-1 rounded-full bg-accent-violet flex-shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>

      {/* Tech badges */}
      <div className="flex flex-wrap gap-1.5">
        {item.tech.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 text-xs font-mono rounded-full bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)] text-text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// components/ui/ProjectCard.tsx

'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Project } from '@/data/projects'

interface ProjectCardProps {
  project: Project
  onClick: (project: Project) => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.12)] bg-bg-surface cursor-pointer transition-all duration-300 hover:border-[rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(project)}
    >
      {/* Screenshot */}
      <div className="relative aspect-video overflow-hidden bg-bg-elevated">
        <Image
          src={project.image}
          alt={project.title}
          fill
          className={`object-cover transition-transform duration-500 ${hovered ? 'scale-105' : 'scale-100'}`}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-[rgba(139,92,246,0.65)] flex items-center justify-center transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-white font-medium text-sm flex items-center gap-2">
            View Case Study
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-6 flex flex-col gap-3">
        <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">
          {project.company}
        </span>
        <h3 className="font-display font-bold text-xl text-text-primary leading-snug">
          {project.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {project.tech.slice(0, 4).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 text-xs font-mono rounded-full bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-text-secondary"
            >
              {t}
            </span>
          ))}
        </div>
        <button className="mt-2 text-sm text-accent-violet font-medium text-left hover:opacity-80 transition-opacity">
          View Case Study →
        </button>
      </div>
    </motion.article>
  )
}

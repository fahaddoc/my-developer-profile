// components/ui/ProjectModal.tsx

'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SkillBadge } from '@/components/ui/SkillBadge'
import type { Project } from '@/data/projects'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [project])

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[rgba(8,8,16,0.92)] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-surface border border-[rgba(139,92,246,0.2)]"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary hover:border hover:border-[rgba(139,92,246,0.3)] transition-all duration-200"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">{project.company}</span>
                <span className="font-mono text-xs text-text-muted">· {project.year}</span>
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-text-primary">
                {project.title}
              </h2>
            </div>

            {/* Screenshot */}
            <div className="relative w-full aspect-video bg-bg-elevated">
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>

            {/* Body */}
            <div className="px-6 py-6 flex flex-col gap-6">

              {/* Problem */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-2">Problem</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{project.problem}</p>
              </div>

              {/* Solution */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-2">Solution & Approach</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{project.solution}</p>
              </div>

              {/* Key Features */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Key Features</h4>
                <ul className="flex flex-col gap-2">
                  {project.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent-violet flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tech Stack */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <SkillBadge key={t} label={t} />
                  ))}
                </div>
              </div>

              {/* Links */}
              {(project.liveUrl || project.githubUrl) && (
                <div className="flex gap-4 pt-2 border-t border-[rgba(139,92,246,0.1)]">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      GitHub
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-accent-cyan hover:opacity-80 transition-opacity"
                    >
                      Live Demo
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

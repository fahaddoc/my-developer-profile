// components/sections/Projects.tsx

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { ProjectModal } from '@/components/ui/ProjectModal'
import { RevealText } from '@/components/ui/RevealText'
import { projects, type Project } from '@/data/projects'

type Filter = 'all' | 'web' | 'mobile' | 'realtime'

const filters: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Web', value: 'web' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Real-Time', value: 'realtime' },
]

export function Projects() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const filtered = projects.filter(
    (p) => activeFilter === 'all' || p.category === activeFilter
  )
  const featured = filtered.filter((p) => p.featured)
  const rest = filtered.filter((p) => !p.featured)

  return (
    <section id="projects" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        {/* Header */}
        <RevealText className="mb-10">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">My Work</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Featured Projects
          </h2>
          <p className="text-text-secondary mt-3 max-w-lg">
            A selection of products I've designed and built. Click any project to read the full case study.
          </p>
        </RevealText>

        {/* Filter tabs */}
        <RevealText delay={0.1} className="flex flex-wrap gap-2 mb-10">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-200 ${
                activeFilter === f.value
                  ? 'bg-accent-violet text-white'
                  : 'text-text-muted border border-[rgba(139,92,246,0.2)] hover:text-text-primary hover:border-[rgba(139,92,246,0.4)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </RevealText>

        {/* Featured cards */}
        <AnimatePresence mode="wait">
          {featured.length > 0 && (
            <motion.div
              key={activeFilter + '-featured'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
            >
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} onClick={setSelectedProject} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact list */}
        {rest.length > 0 && (
          <div className="border-t border-[rgba(139,92,246,0.1)]">
            <AnimatePresence>
              {rest.map((project, i) => (
                <motion.button
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  onClick={() => setSelectedProject(project)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-4 border-b border-[rgba(139,92,246,0.1)] text-left hover:bg-[rgba(139,92,246,0.05)] transition-colors duration-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-accent-cyan">{project.company}</span>
                    <span className="font-mono text-xs text-text-muted ml-2">•</span>
                    <span className="font-medium text-text-secondary group-hover:text-text-primary transition-colors ml-2 text-sm">
                      {project.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                    {project.tech.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 text-xs font-mono rounded-full bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)] text-text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0 text-text-muted group-hover:text-accent-violet transition-colors hidden sm:block"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* GitHub CTA */}
        <RevealText delay={0.2} className="mt-10 flex justify-center">
          <a
            href="https://github.com/fahaddoc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[rgba(139,92,246,0.2)] text-text-secondary hover:text-text-primary hover:border-[rgba(139,92,246,0.4)] transition-all duration-200 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View All on GitHub
          </a>
        </RevealText>

      </div>

      {/* Modal */}
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </section>
  )
}

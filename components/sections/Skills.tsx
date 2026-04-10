// components/sections/Skills.tsx

'use client'

import { motion } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'
import { skills } from '@/data/projects'

export function Skills() {
  const { ref, isInView } = useInView()

  return (
    <section id="skills" className="py-24 md:py-32 bg-bg-surface">
      <div className="max-w-content mx-auto px-6">

        <RevealText className="mb-14">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Expertise</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Skills & Expertise
          </h2>
        </RevealText>

        <div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {skills.map((category, i) => (
            <motion.div
              key={category.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col gap-4"
            >
              <div>
                <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">
                  {category.label}
                </span>
                <div className="mt-2 h-px bg-[rgba(139,92,246,0.2)]" />
              </div>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <SkillBadge key={skill} label={skill} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}

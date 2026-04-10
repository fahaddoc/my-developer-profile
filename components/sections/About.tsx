// components/sections/About.tsx

'use client'

import { motion } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'

const quickFacts = [
  { value: '6+', label: 'Years' },
  { value: '9+', label: 'Projects' },
  { value: '4+', label: 'Companies' },
  { value: 'Karachi', label: 'Pakistan' },
]

const techStack = ['React.js', 'Next.js', 'Flutter', 'TypeScript', 'WebRTC', 'SignalR', 'Redux', 'Tailwind CSS']

export function About() {
  const { ref: statsRef, isInView: statsVisible } = useInView()

  return (
    <section id="about" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        {/* Section label */}
        <RevealText className="mb-12">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">About Me</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Turning ideas into products
          </h2>
        </RevealText>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">

          {/* Left — narrative copy */}
          <div className="flex-1 flex flex-col gap-6">
            <RevealText delay={0.1}>
              <p className="text-text-secondary text-lg leading-relaxed">
                Over the past 6+ years, I've built products people actually use — from real-time video
                platforms at MILETAP to modern hiring systems at DigitalHire.
              </p>
            </RevealText>
            <RevealText delay={0.2}>
              <p className="text-text-secondary text-lg leading-relaxed">
                My expertise lies at the intersection of React, Next.js, Flutter, and real-time
                technologies like WebRTC and SignalR. I focus on writing clean, maintainable code
                while keeping the end-user experience at the center.
              </p>
            </RevealText>
            <RevealText delay={0.3}>
              <p className="text-text-secondary text-lg leading-relaxed">
                Currently based in Karachi, I'm always excited to work on challenging projects
                that push technical and product boundaries.
              </p>
            </RevealText>

            {/* Tech stack chips */}
            <RevealText delay={0.4} className="flex flex-wrap gap-2 pt-4">
              {techStack.map((skill) => (
                <SkillBadge key={skill} label={skill} />
              ))}
            </RevealText>
          </div>

          {/* Right — quick facts */}
          <div
            ref={statsRef}
            className="flex-shrink-0 grid grid-cols-2 gap-6 lg:w-56"
          >
            {quickFacts.map((fact, i) => (
              <motion.div
                key={fact.label}
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-1"
              >
                <span className="font-display font-bold text-3xl md:text-4xl text-accent-violet">
                  {fact.value}
                </span>
                <span className="font-mono text-xs text-text-muted uppercase tracking-wide">
                  {fact.label}
                </span>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

// components/sections/Hero.tsx

'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const stats = [
  { value: '6+', label: 'Years' },
  { value: '9+', label: 'Projects' },
  { value: '4+', label: 'Companies' },
  { value: '25+', label: 'Clients' },
]

// Stagger helper — each element delays slightly after the previous
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
})

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="max-w-content mx-auto px-6 w-full py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left column — text content */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Available badge */}
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono text-accent-green border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-breathe" />
                Available for opportunities
              </span>
            </motion.div>

            {/* Display name */}
            <h1 className="flex flex-col font-display font-extrabold text-7xl md:text-8xl leading-none text-text-primary">
              <motion.span {...fadeUp(0.2)} style={{ display: 'block' }}>
                Shah
              </motion.span>
              <motion.span {...fadeUp(0.3)} style={{ display: 'block' }}>
                Fahad<span className="text-accent-violet">.</span>
              </motion.span>
            </h1>

            {/* Role */}
            <motion.p
              {...fadeUp(0.4)}
              className="font-mono text-lg md:text-xl text-accent-cyan tracking-widest uppercase"
            >
              Software Engineer
            </motion.p>

            {/* Tagline */}
            <motion.p
              {...fadeUp(0.5)}
              className="text-base md:text-lg text-text-secondary max-w-lg leading-relaxed"
            >
              I craft high-performance, real-time web and mobile experiences that scale.
              Currently at{' '}
              <span className="text-text-primary font-medium">DigitalHire</span>,
              based in{' '}
              <span className="text-text-primary font-medium">Karachi, Pakistan</span>.
            </motion.p>

            {/* CTA buttons */}
            <motion.div {...fadeUp(0.6)} className="flex flex-wrap items-center gap-4">
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                View Projects
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="/Shah_Fahad_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[rgba(241,245,249,0.15)] text-text-primary font-medium text-sm hover:border-[rgba(139,92,246,0.4)] hover:text-accent-violet transition-all duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Resume
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              {...fadeUp(0.7)}
              className="flex flex-wrap items-center gap-8 pt-6 border-t border-[rgba(139,92,246,0.1)]"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className="font-display font-bold text-2xl text-accent-violet">{stat.value}</span>
                  <span className="font-mono text-xs text-text-muted tracking-wide uppercase">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right column — photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="relative flex-shrink-0 w-72 md:w-80 lg:w-96"
          >
            {/* Violet glow behind the photo */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'radial-gradient(circle at center, rgba(139,92,246,0.3) 0%, transparent 70%)',
                transform: 'scale(1.2)',
                filter: 'blur(40px)',
              }}
            />

            {/* Photo container */}
            <div className="relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.3)] aspect-[4/5]">
              <Image
                src="/images/shah-fahad.jpg"
                alt="Shah Fahad — Software Engineer"
                fill
                className="object-cover object-top"
                priority
                sizes="(max-width: 768px) 288px, (max-width: 1024px) 320px, 384px"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

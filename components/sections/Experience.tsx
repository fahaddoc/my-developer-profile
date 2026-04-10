import { RevealText } from '@/components/ui/RevealText'
import { TimelineItem } from '@/components/ui/TimelineItem'
import { experience } from '@/data/projects'

export function Experience() {
  return (
    <section id="experience" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        <RevealText className="mb-14">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Experience</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Professional Journey
          </h2>
        </RevealText>

        <div className="max-w-2xl">
          {experience.map((item, i) => (
            <TimelineItem key={item.id} item={item} index={i} />
          ))}
        </div>

        {/* Resume CTA */}
        <div className="mt-14">
          <a
            href="/Shah_Fahad_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Resume
          </a>
        </div>

      </div>
    </section>
  )
}

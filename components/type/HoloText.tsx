'use client'

// HoloText — a heading that floats like a HUD projected in zero gravity.
// The text is split into lines ("\n"), words (kept whole so lines wrap at
// spaces) and glyphs; holo.ts moves the glyphs. On first view the corner
// brackets lock on, the glyphs pull into focus from depth one after another
// and a scanline passes over. Screen readers get the plain text once.

import { Fragment, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { holo } from './holo'
import s from './HoloText.module.css'

export function HoloText({ text, as: Tag = 'h2', className, baseWdth = 100 }: {
  text: string
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  /** the resting width-axis value the warp eases back to */
  baseWdth?: number
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const glyphs = Array.from(root.querySelectorAll<HTMLElement>(`.${s.g}`))
    const stop = holo(root, glyphs, baseWdth)
    // lock on the first time it comes into view
    root.setAttribute('data-armed', '')
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      root.setAttribute('data-on', '')
      io.disconnect()
    }, { threshold: 0.35 })
    io.observe(root)
    return () => { io.disconnect(); stop() }
  }, [text, baseWdth])

  let i = 0
  return (
    <Tag ref={ref} className={`${s.holo} ${className ?? ''}`}>
      <span className={s.sr}>{text.replace(/\n/g, ' ')}</span>
      <span className={s.glyphs} aria-hidden>
        {text.split('\n').map((line, li) => (
          <span key={li} className={s.line}>
            {line.split(' ').map((word, wi, words) => (
              <Fragment key={wi}>
                <span className={s.word}>
                  {[...word].map((ch) => (
                    <span key={i} className={s.g} style={{ '--i': i++ } as CSSProperties}>
                      <span className={s.in}>{ch}</span>
                    </span>
                  ))}
                </span>
                {/* the space sits between words, so lines can break there */}
                {wi < words.length - 1 && ' '}
              </Fragment>
            ))}
          </span>
        ))}
      </span>
      <span className={`${s.c} ${s.tl}`} aria-hidden />
      <span className={`${s.c} ${s.tr}`} aria-hidden />
      <span className={`${s.c} ${s.bl}`} aria-hidden />
      <span className={`${s.c} ${s.br}`} aria-hidden />
      <span className={s.scan} aria-hidden />
    </Tag>
  )
}

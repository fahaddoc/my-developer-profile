'use client'

// HoloText — a heading that floats like a HUD projected in zero gravity.
// The text is split into lines ("\n"), words (kept whole so lines wrap at
// spaces) and glyphs. Each glyph drifts on a CSS keyframe (its phase comes
// from --r) and holo.ts adds the pointer field, scroll inertia and warp. On
// first view the corner brackets lock on, the glyphs pull into focus from
// depth one after another and a scanline passes over. `instant` headings (a
// page's h1, usually its LCP) are visible from the first paint and only
// settle into focus. Screen readers get the plain text once.

import { Fragment, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { glyphRnd, holo } from './holo'
import s from './HoloText.module.css'

export function HoloText({ text, as: Tag = 'h2', className, id, baseWdth = 100, instant = false }: {
  text: string
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  id?: string
  /** the resting width-axis value the warp eases back to */
  baseWdth?: number
  /** paint the glyphs from the first frame (no opacity-0 lock-on); for an
      above-the-fold h1 that is the page's LCP */
  instant?: boolean
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const glyphs = Array.from(root.querySelectorAll<HTMLElement>(`.${s.g}`))
    const stop = holo(root, glyphs, baseWdth)
    // A wrapped heading's box is as wide as its column, not its letters: put
    // the right-hand brackets at the longest line's end instead (--holo-w).
    const words = Array.from(root.querySelectorAll<HTMLElement>(`.${s.word}`))
    const measure = () => {
      const left = root.getBoundingClientRect().left
      const right = Math.max(...words.map((w) => w.getBoundingClientRect().right))
      if (Number.isFinite(right)) root.style.setProperty('--holo-w', `${Math.round(right - left)}px`)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    document.fonts?.ready.then(measure)
    // Lock on the first time it is in view. Inside a reveal container (an
    // ancestor with data-in, like the tunnel's station cards) also wait until
    // that container is revealed, so a flight passing a station doesn't play
    // the title ahead of its card. An instant heading is never armed: its
    // glyphs stay visible and only the brackets and scan wait for this.
    root.toggleAttribute('data-armed', !instant)
    const gate = root.parentElement?.closest('[data-in]') ?? null
    let seen = false
    let open = !gate || gate.getAttribute('data-in') !== 'false'
    const fire = () => {
      if (!seen || !open) return
      root.setAttribute('data-on', '')
      io.disconnect()
      mo?.disconnect()
    }
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; fire() }, { threshold: 0.35 })
    const mo = gate ? new MutationObserver(() => { open = gate.getAttribute('data-in') !== 'false'; fire() }) : null
    mo?.observe(gate!, { attributes: true, attributeFilter: ['data-in'] })
    io.observe(root)
    return () => { io.disconnect(); mo?.disconnect(); ro.disconnect(); stop() }
  }, [text, baseWdth, instant])

  const lines = text.split('\n').map((line) => line.split(' ').map((word) => [...word]))
  // every glyph's float phase is seeded by its index and the glyph count, the
  // same seed holo.ts uses for its scroll lag
  const n = lines.reduce((a, words) => a + words.reduce((b, chars) => b + chars.length, 0), 0)
  let i = 0
  return (
    <Tag
      ref={ref}
      id={id}
      className={[s.holo, instant && s.instant, className].filter(Boolean).join(' ')}
      style={{ '--holo-wdth': baseWdth } as CSSProperties}
    >
      <span className={s.sr}>{text.replace(/\n/g, ' ')}</span>
      <span className={s.glyphs} aria-hidden>
        {lines.map((words, li) => (
          <span key={li} className={s.line}>
            {words.map((chars, wi) => (
              <Fragment key={wi}>
                <span className={s.word}>
                  {chars.map((ch) => {
                    const k = i++
                    return (
                      <span key={k} className={s.g} style={{ '--i': k, '--r': glyphRnd(k, n).toFixed(3) } as CSSProperties}>
                        <span className={s.in}>{ch}</span>
                      </span>
                    )
                  })}
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

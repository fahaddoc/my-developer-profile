'use client'

// Shared building blocks for the pages around the journey, so every page
// speaks the same HUD language as the home page:
//   PageHeader  kicker + a floating HoloText title + lead
//   Panel       a machined titanium plate (glass-free), optional label
//   Telemetry   label / value readouts in mono
//   Viewport    a media frame with HUD corner brackets

import type { ReactNode } from 'react'
import { HoloText } from '@/components/type/HoloText'
import s from './site.module.css'

export function PageHeader({ kicker, title, lead, children }: {
  kicker: ReactNode
  /** "\n" breaks the title into lines */
  title: string
  lead?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className={s.header}>
      <p className={`t-data ${s.kicker}`}>{kicker}</p>
      <HoloText as="h1" text={title} className={`t-display ${s.title}`} />
      {lead && <p className={`t-lead ${s.lead}`}>{lead}</p>}
      {children && <div className={s.headerActions}>{children}</div>}
    </header>
  )
}

export function Panel({ label, children, className, as: Tag = 'section' }: {
  label?: string
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'aside' | 'article'
}) {
  return (
    <Tag className={`${s.panel} ${className ?? ''}`}>
      {label && <p className={`t-data ${s.panelLabel}`}>{label}</p>}
      {children}
    </Tag>
  )
}

export function Telemetry({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={`${s.telemetry} ${className ?? ''}`}>
      {items.map((it) => (
        <div key={it.label} className={s.readout}>
          <dt className="t-data">{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Viewport({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${s.viewport} ${className ?? ''}`}>
      {children}
      <span className={`${s.vc} ${s.vtl}`} aria-hidden />
      <span className={`${s.vc} ${s.vtr}`} aria-hidden />
      <span className={`${s.vc} ${s.vbl}`} aria-hidden />
      <span className={`${s.vc} ${s.vbr}`} aria-hidden />
    </div>
  )
}

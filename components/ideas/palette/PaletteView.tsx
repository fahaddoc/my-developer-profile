'use client'

// PaletteView — one colour + material direction on the cockpit HUD pages.
// The palette's class goes on <html>, so everything picks it up, including
// what renders outside this tree (the ⌘K dialog, the phone telescope sheet).

import Link from 'next/link'
import { useLayoutEffect } from 'react'
import { IdeasShell } from '../IdeasShell'
import { TYPES } from '../type/fonts'
import { TypeSpecimen } from '../type/TypeSpecimen'
import specimen from '../type/TypeSpecimen.module.css'
import { PALETTES } from './palettes'
import s from './PaletteView.module.css'

const HUD = TYPES.find((t) => t.slug === 'hud')!

export function PaletteView({ slug }: { slug: string }) {
  const pal = PALETTES.find((p) => p.slug === slug)!

  // before paint, so the page never flashes the default ember first
  useLayoutEffect(() => {
    const html = document.documentElement
    if (pal.className) html.classList.add(pal.className)
    html.setAttribute('data-palette', pal.slug)
    return () => {
      if (pal.className) html.classList.remove(pal.className)
      html.removeAttribute('data-palette')
    }
  }, [pal])

  return (
    <IdeasShell title={`Palette · ${PALETTES.indexOf(pal) + 1} of ${PALETTES.length}`}>
      {/* the palette's page material, behind everything on the page */}
      <div className={s.backdrop} aria-hidden />
      <TypeSpecimen
        type={HUD}
        caption={{ name: pal.name, from: pal.from, cast: pal.cast }}
        nav={(
          <nav className={specimen.switcher} aria-label="Palettes">
            {PALETTES.map((p) => (
              <Link key={p.slug} href={`/ideas/palette/${p.slug}`} className={specimen.chip} aria-current={p.slug === pal.slug ? 'page' : undefined}>
                {p.name}
              </Link>
            ))}
          </nav>
        )}
      />
    </IdeasShell>
  )
}

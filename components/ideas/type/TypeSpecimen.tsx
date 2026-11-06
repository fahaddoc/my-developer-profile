'use client'

// TypeSpecimen — one type direction applied to real pieces of the home page:
// the hero with the flight-plan rail, a station title, the star map (live),
// and the contact sign-off. The fonts swap through the same custom
// properties the site uses (--font-display / --font-body / --font-mono), so
// what you see is what the site would look like, not a font sample sheet.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { STATIONS } from '@/lib/tunnel'
import { skills } from '@/data/projects'
import { AUTHOR } from '@/lib/seo/site'
import { FlightPlan } from '@/components/nav/FlightPlan'
import { StarMap } from '@/components/projects/starmap/StarMap'
import { TYPES, type TypeStyle } from './fonts'
import s from './TypeSpecimen.module.css'

const station = (id: string) => STATIONS.find((st) => st.id === id)!
const lines = (h: string) => h.split('\n').map((l, i) => <span key={i} className={s.line}>{l}</span>)

export function TypeSpecimen({ type }: { type: TypeStyle }) {
  const vars = {
    ...(type.display && { '--font-display': type.display }),
    ...(type.body && { '--font-body': type.body }),
    ...(type.mono && { '--font-mono': type.mono }),
  } as CSSProperties
  const hero = station('hero'), skillsSt = station('skills'), contact = station('contact')

  return (
    <div className={s.spec} data-type={type.slug} style={vars}>
      <nav className={s.switcher} aria-label="Type styles">
        {TYPES.map((t) => (
          <Link key={t.slug} href={`/ideas/type/${t.slug}`} className={s.chip} aria-current={t.slug === type.slug ? 'page' : undefined}>
            {t.name}
          </Link>
        ))}
      </nav>

      <header className={s.caption}>
        <h1 className={`t-title ${s.name}`}>{type.name}</h1>
        <p className={s.from}>{type.from}</p>
        <p className={`t-data ${s.cast}`}>{type.cast}</p>
      </header>

      {/* hero, with the flight-plan rail beside it */}
      <section className={`${s.block} ${s.hero}`}>
        <FlightPlan className={s.rail} activeId="hero" progress={hero.t} onGo={() => {}} onSetCourse={() => {}} />
        <div>
          <p className={`t-data ${s.kicker}`}>{hero.num} · {hero.short}</p>
          <h2 className={`t-display ${s.d1}`}>{lines(hero.heading)}</h2>
          <p className={`t-lead ${s.lead}`}>{hero.tagline}</p>
          <div className={s.actions}>
            <span className="btn btn--primary">See the work <span className="btn-arrow" aria-hidden="true">→</span></span>
            <span className="btn btn--ghost">Resume</span>
          </div>
        </div>
      </section>

      {/* a station */}
      <section className={s.block}>
        <p className={`t-data ${s.kicker}`}>{skillsSt.num} · {skillsSt.short}</p>
        <h2 className={`t-display ${s.d2}`}>{lines(skillsSt.heading)}</h2>
        <p className={`t-lead ${s.lead}`}>{skillsSt.tagline}</p>
        <div className={s.groups}>
          {skills.slice(0, 3).map((g) => (
            <div key={g.label}>
              <h3 className={`t-subtitle ${s.groupH}`}>{g.label}</h3>
              <p className={s.groupP}>{g.skills.join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the star map, live */}
      <section className={s.block}>
        <StarMap title="Selected work." />
      </section>

      {/* contact */}
      <section className={s.block}>
        <p className={`t-data ${s.kicker}`}>{contact.num} · {contact.short}</p>
        <h2 className={`t-display ${s.d2}`}>{lines(contact.heading)}</h2>
        <p className={`t-title ${s.mail}`}>{AUTHOR.email}</p>
        <div className={s.actions}>
          <span className="btn btn--primary">Write to me <span className="btn-arrow" aria-hidden="true">→</span></span>
          <span className="btn btn--ghost">Book a 15-min call</span>
        </div>
      </section>
    </div>
  )
}

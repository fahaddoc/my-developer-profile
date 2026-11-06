'use client'

import { IdeasShell } from '../IdeasShell'
import { TYPES } from './fonts'
import { TypeSpecimen } from './TypeSpecimen'

export function TypeView({ slug }: { slug: string }) {
  const type = TYPES.find((t) => t.slug === slug)!
  return (
    <IdeasShell title={`Type · ${TYPES.indexOf(type) + 1} of ${TYPES.length}`}>
      <TypeSpecimen type={type} />
    </IdeasShell>
  )
}

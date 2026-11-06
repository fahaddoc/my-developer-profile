// app/ideas/palette/page.tsx — the palettes start on today's colours.

import { redirect } from 'next/navigation'

export default function PaletteIndex() {
  redirect('/ideas/palette/ember')
}

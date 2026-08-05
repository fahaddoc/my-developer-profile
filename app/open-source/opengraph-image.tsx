import { renderOpenSourceOg, OG_SIZE, OG_OPENSOURCE_ALT } from '@/lib/seo/og'
import { openSourceStats } from '@/data/open-source'

export const runtime = 'nodejs'
export const alt = OG_OPENSOURCE_ALT
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return renderOpenSourceOg(openSourceStats())
}

// lib/og/marks.ts
// Monochrome chrome marks as SVG data URIs (Satori renders these reliably and
// no binary asset is needed). One colour for every org: the HUD has no
// per-project colour themes.

import { C } from './theme'

const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
const mark = (path: string) =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24' fill='${C.chrome}'><path d='${path}'/></svg>`)

export const GITHUB_MARK = mark(
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
)

// Full Flutter mark (simple-icons): top bar, middle bar and the lower leg.
const FLUTTER_MARK = mark('M14.314 0L2.3 12 6 15.7 21.684.013h-7.357L14.314 0zm.014 11.072L7.857 17.53l6.47 6.47H21.7l-6.46-6.468 6.46-6.46h-7.37z')

const SUPABASE_MARK = mark(
  'M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z',
)

const BY_ORG: Record<string, string> = { flutter: FLUTTER_MARK, supabase: SUPABASE_MARK }

/** The org's mark, or null for an org with no mark yet (render the repo name only). */
export function orgMark(org: string): string | null {
  return BY_ORG[org.toLowerCase()] ?? null
}

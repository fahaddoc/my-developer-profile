// components/mobile/hero/media.ts — the screens AppShell sends to MobileSpace,
// as CSS media, and the hero's sticker image.

/** AppShell's rule as one media query list: not (min-width 1024 + hover), or
 *  reduced motion. Keep in sync with AppShell (and HeroStyles' copy of it,
 *  which styled-jsx needs as a literal). Low-tier GPUs on desktop also get
 *  MobileSpace; CSS cannot see that, so they get no server-rendered hero. */
export const MOBILE_EXPERIENCE_MEDIA =
  'not all and (min-width: 1024px) and (hover: hover), (prefers-reduced-motion: reduce)'

/** Its complement: the desktop tunnel. */
export const TUNNEL_MEDIA =
  '(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)'

/** The hero portrait. The server render's preload (app/page.tsx), the
 *  stand-in and the live hero all use these, so they resolve the same srcset
 *  candidate: one request, shared from the memory cache. */
export const HERO_STICKER_SRC = '/images/shah-fahad-sticker.png'
export const HERO_STICKER_SIZES = '(min-width: 1024px) 540px, (min-width: 640px) 500px, 320px'

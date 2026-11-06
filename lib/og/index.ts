// lib/og/index.ts
// Titanium-armour share images (next/og). Size and alt text are re-exported
// from lib/seo/og unchanged so every route keeps the exact same metadata.

export { OG_SIZE, OG_ALT, OG_OPENSOURCE_ALT, OG_ACHIEVEMENT_ALT } from '@/lib/seo/og'
export { renderOgImage } from './home'
export { renderAchievementOg, renderOpenSourceOg } from './open-source'

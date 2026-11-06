// lib/og/theme.ts
// Titanium armour palette for the share images. Satori has no CSS variables,
// so these mirror the dark-theme tokens in app/globals.css by value.

export const C = {
  plate: '#090a0c', // --space-0
  plate1: '#0e0f12', // --space-1
  surface: '#141619', // --surface
  line: '#3e4147', // --line, machined seams
  ink: '#eceef1', // --ink
  ink2: '#b8bcc2', // --ink-2
  ink3: '#92969d', // --ink-3
  chrome: '#e2e8ef', // --accent
  chromeInk: '#0b0c0e', // --accent-ink
} as const

/** rgba() of the chrome accent at the given alpha. */
export const chrome = (a: number) => `rgba(226,232,239,${a})`

export const FONT = {
  display: 'Tektur',
  mono: 'Chivo Mono',
  body: 'Chivo',
} as const

/** Karachi, the city in AUTHOR; a real coordinate for the HUD readout. */
export const COORDS = '24.86°N  67.00°E'

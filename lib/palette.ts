// lib/palette.ts — theme-aware colours for WebGL / canvas code.
//
// WebGL cannot read CSS variables, so the scene mirrors the tokens in
// app/globals.css here as hex. Keep the two in sync (DESIGN.md is the source).
// DOM code should keep using rgb(var(--token)); only canvas/three code reads this.
//
// Planets get their own albedos per theme. Daylight is "the same world seen
// at noon": lighter, cooler bodies, a warm sun side and a soft cool shadow
// tint, never the dark bodies mixed toward the sky colour (that read as grey
// placeholders).

'use client'

import { useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

/** One planet's surface colours. deep → mid → bright are blended by the
 *  surface noise; cap/cloud/ring only apply where the planet has them. */
export interface PlanetAlbedo {
  deep:   string
  mid:    string
  bright: string
  cap?:   string
  cloud?: string
  ring?:  string
}

export type PlanetId = 'hero' | 'about' | 'skills' | 'projects' | 'opensource' | 'experience' | 'contact'

export interface ScenePalette {
  mode: ThemeMode
  /** page + canvas clear colour (= --space-0) */
  bg: string
  /** text drawn inside the canvas / Html overlays (= --ink, --ink-2, --ink-3) */
  ink: string
  ink2: string
  ink3: string
  /** the one accent (= --accent); accentText is the small-text variant */
  accent: string
  accentText: string
  /** text on an accent fill (= --accent-ink) */
  accentInk: string
  /** raised surface behind DOM-in-3D cards (= --surface) and hairline (= --line) */
  surface: string
  line: string
  /** nebula shell colours: void → atmosphere → sparse bright cores */
  nebula: {
    inner: { deep: string; mid: string; bright: string; alpha: number; brightStrength: number }
    outer: { deep: string; mid: string; bright: string; alpha: number; brightStrength: number }
  }
  /** daylight only: a faint warm haze on the sky towards the sun (view space) */
  sunSide: { dir: [number, number, number]; strength: number }
  /** star tint range (neutral warm → neutral cool) and overall star opacity */
  stars: { warm: string; cool: string; opacity: number }
  /** key light, in view space: a warm "sun" to the left and slightly behind
   *  the planets (a real terminator), plus the cold rim on the dark limb */
  keyLight: { dir: [number, number, number]; color: string; rim: string }
  /** planet lighting that is not a colour token */
  planetLight: {
    /** linear RGB fill on the shadow side (dark: near black; light: cool tint) */
    shadow:       [number, number, number]
    keyIntensity: number
    rimScale:     number
    /** lit-limb atmosphere and hero ember halo strength */
    atmoScale:    number
    haloScale:    number
    /** how far a fading planet sinks toward the sky colour before it is gone */
    sink:         number
  }
  planets: Record<PlanetId, PlanetAlbedo>
}

// Key light direction shared by both themes (DESIGN.md section 7: one warm
// light from the upper left). Mostly sideways with a little lift, so 35-50%
// of every disc falls into real shadow.
const KEY_DIR: [number, number, number] = [-0.85, 0.35, 0.1]

export const PALETTES: Record<ThemeMode, ScenePalette> = {
  dark: {
    mode: 'dark',
    bg: '#05080f',
    ink: '#f1f3f8',
    ink2: '#b8bec8',
    ink3: '#9299a5',
    accent: '#fc9e47',
    accentText: '#fc9e47',
    accentInk: '#05080f',
    surface: '#0f141d',
    line: '#2d333d',
    nebula: {
      inner: { deep: '#020309', mid: '#0b1626', bright: '#2a5a80', alpha: 0.7, brightStrength: 0.8 },
      outer: { deep: '#020308', mid: '#0a1a24', bright: '#1f5866', alpha: 0.9, brightStrength: 0.55 },
    },
    sunSide: { dir: [-0.55, 0.45, 0.7], strength: 0 },
    stars: { warm: '#ffe6cf', cool: '#dbe6ff', opacity: 1 },
    keyLight: { dir: KEY_DIR, color: '#ffd9b0', rim: '#7fb2ff' },
    planetLight: {
      shadow:       [0.0045, 0.006, 0.011],
      keyIntensity: 1.7,
      rimScale:     1.0,
      atmoScale:    1.0,
      haloScale:    1.0,
      sink:         0.45,
    },
    planets: {
      // Graphite giant behind the intro portrait; ember lives on its lit limb.
      hero:       { deep: '#0d0f12', mid: '#22262c', bright: '#454a52' },
      // Stone: warm grey, rocky.
      about:      { deep: '#1b1b1b', mid: '#4a4844', bright: '#86837c' },
      // Ice: pale blue-grey with caps.
      skills:     { deep: '#253039', mid: '#62788b', bright: '#c3d0dc', cap: '#d5dde4' },
      // Dust: banded, desaturated sand with a thin ring.
      projects:   { deep: '#2a2722', mid: '#5c564e', bright: '#a39c91', ring: '#8f8a82' },
      // Graphite moon.
      opensource: { deep: '#14171b', mid: '#353b43', bright: '#737b86' },
      // Ice giant: soft cold bands.
      experience: { deep: '#18232d', mid: '#465b6c', bright: '#97a9b8', cap: '#b9c4cf' },
      // Natural, desaturated Earth.
      contact:    { deep: '#0b1c2b', mid: '#1c3b55', bright: '#4d533b', cap: '#d9dfe4', cloud: '#e3e7ea' },
    },
  },
  light: {
    mode: 'light',
    bg: '#f4f7fb',
    ink: '#121927',
    ink2: '#454d5d',
    ink3: '#616977',
    accent: '#dd6300',
    accentText: '#b24a0f',
    accentInk: '#121927',
    surface: '#fcfdff',
    line: '#cbd2d9',
    nebula: {
      inner: { deep: '#eef3f8', mid: '#dce6f0', bright: '#fff0de', alpha: 0.75, brightStrength: 0.6 },
      outer: { deep: '#f4f7fb', mid: '#e3ecf3', bright: '#ffe7cc', alpha: 0.6, brightStrength: 0.45 },
    },
    sunSide: { dir: [-0.55, 0.45, 0.7], strength: 0.5 },
    stars: { warm: '#9a6a44', cool: '#5a6f8f', opacity: 0.35 },
    keyLight: { dir: KEY_DIR, color: '#ffe6c7', rim: '#a9c8ec' },
    planetLight: {
      // Soft cool shadow: slate blue, never black, never the sky colour.
      shadow:       [0.36, 0.43, 0.56],
      keyIntensity: 1.55,
      rimScale:     0.75,
      atmoScale:    0.7,
      haloScale:    0.55,
      sink:         1.0,
    },
    planets: {
      hero:       { deep: '#7e8896', mid: '#a6b0bc', bright: '#cdd4dc' },
      about:      { deep: '#858a91', mid: '#aab0b7', bright: '#d0d4d9' },
      skills:     { deep: '#7d93a8', mid: '#a7bbcc', bright: '#dfe8f0', cap: '#f5f8fb' },
      projects:   { deep: '#958b7c', mid: '#b8af9f', bright: '#dad3c6', ring: '#b5ab9b' },
      opensource: { deep: '#7a818b', mid: '#9ca3ad', bright: '#c6ccd3' },
      experience: { deep: '#6c8295', mid: '#94a8b9', bright: '#c7d3de', cap: '#e8eef3' },
      contact:    { deep: '#3d6b94', mid: '#5c8bb3', bright: '#8e9a6e', cap: '#f3f6f8', cloud: '#ffffff' },
    },
  },
}

function readMode(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/** Live theme mode from <html data-theme>, updated without remounting anything. */
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(readMode)
  useEffect(() => {
    const el = document.documentElement
    const sync = () => setMode(readMode())
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return mode
}

/** Palette for the current theme. */
export function useScenePalette(): ScenePalette {
  return PALETTES[useThemeMode()]
}

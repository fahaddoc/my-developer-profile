// lib/palette.ts — theme-aware colours for WebGL / canvas code.
//
// WebGL cannot read CSS variables, so the scene mirrors the tokens in
// app/globals.css here as hex. Keep the two in sync (DESIGN.md is the source).
// DOM code should keep using rgb(var(--token)); only canvas/three code reads this.

'use client'

import { useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

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
  /** star tint range (neutral warm → neutral cool) and overall star opacity */
  stars: { warm: string; cool: string; opacity: number }
  /** key light: a warm "sun" upper-left, cold rim from behind */
  keyLight: { dir: [number, number, number]; color: string; rim: string }
}

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
    stars: { warm: '#ffe6cf', cool: '#dbe6ff', opacity: 1 },
    keyLight: { dir: [-0.55, 0.45, 0.7], color: '#ffd9b0', rim: '#7fb2ff' },
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
    stars: { warm: '#9a6a44', cool: '#5a6f8f', opacity: 0.35 },
    keyLight: { dir: [-0.55, 0.45, 0.7], color: '#fff4e6', rim: '#9fc0e6' },
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

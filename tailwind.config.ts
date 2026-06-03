import type { Config } from 'tailwindcss'

// All color tokens funnel through CSS variables so a single `[data-theme]`
// attribute on <html> swaps the entire palette. Variables live in
// app/globals.css under `:root` (dark default) and `[data-theme="light"]`.

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'bg-base':      'rgb(var(--bg-base) / <alpha-value>)',
        'bg-surface':   'rgb(var(--bg-surface) / <alpha-value>)',
        'bg-elevated':  'rgb(var(--bg-elevated) / <alpha-value>)',

        'accent-violet':  'rgb(var(--accent-violet) / <alpha-value>)',
        'accent-cyan':    'rgb(var(--accent-cyan) / <alpha-value>)',
        'accent-green':   'rgb(var(--accent-green) / <alpha-value>)',
        'accent-emerald': 'rgb(var(--accent-emerald) / <alpha-value>)',

        'text-primary':   'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--text-muted) / <alpha-value>)',
      },

      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },

      maxWidth: {
        content: '1200px',
      },

      boxShadow: {
        'neon-violet':  '0 0 20px rgb(var(--accent-violet) / 0.4), 0 0 60px rgb(var(--accent-violet) / 0.15)',
        'neon-cyan':    '0 0 20px rgb(var(--accent-cyan)   / 0.4), 0 0 60px rgb(var(--accent-cyan)   / 0.12)',
        'neon-emerald': '0 0 20px rgb(var(--accent-emerald) / 0.4), 0 0 60px rgb(var(--accent-emerald) / 0.12)',
        'card-hover':   '0 8px 40px rgb(var(--accent-violet) / 0.15), 0 0 0 1px rgb(var(--accent-violet) / 0.3)',
      },

      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.5)', opacity: '0' },
        },
        'float-up': {
          '0%':   { transform: 'translateY(0px) translateX(0px)', opacity: '0' },
          '10%':  { opacity: '1' },
          '90%':  { opacity: '0.6' },
          '100%': { transform: 'translateY(-120px) translateX(20px)', opacity: '0' },
        },
        'drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%':      { transform: 'translate(-20px, 15px) scale(0.97)' },
        },
        'neon-flicker': {
          '0%, 95%, 100%': { opacity: '1' },
          '96%':           { opacity: '0.85' },
          '97%':           { opacity: '1' },
          '98%':           { opacity: '0.9' },
        },
      },

      animation: {
        'fade-in':      'fade-in 0.6s ease-out forwards',
        'breathe':      'breathe 2s ease-in-out infinite',
        'float-up':     'float-up 4s ease-in-out infinite',
        'drift':        'drift 8s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from 'tailwindcss'

// All color tokens funnel through CSS variables so a single `[data-theme]`
// attribute on <html> swaps the entire palette. Variables live in
// app/globals.css (semantic tokens + legacy aliases). See DESIGN.md.

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // semantic
        'space-0':     'rgb(var(--space-0) / <alpha-value>)',
        'space-1':     'rgb(var(--space-1) / <alpha-value>)',
        surface:       'rgb(var(--surface) / <alpha-value>)',
        'surface-2':   'rgb(var(--surface-2) / <alpha-value>)',
        line:          'rgb(var(--line) / <alpha-value>)',
        ink:           'rgb(var(--ink) / <alpha-value>)',
        'ink-2':       'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3':       'rgb(var(--ink-3) / <alpha-value>)',
        accent:        'rgb(var(--accent) / <alpha-value>)',
        'accent-text': 'rgb(var(--accent-text) / <alpha-value>)',
        'accent-ink':  'rgb(var(--accent-ink) / <alpha-value>)',

        // legacy names (aliases of the above)
        'bg-base':        'rgb(var(--bg-base) / <alpha-value>)',
        'bg-surface':     'rgb(var(--bg-surface) / <alpha-value>)',
        'bg-elevated':    'rgb(var(--bg-elevated) / <alpha-value>)',
        'text-primary':   'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--text-muted) / <alpha-value>)',
      },

      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },

      transitionTimingFunction: {
        out:        'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':      '#0A0A0B',
        'bg-surface':   '#111114',
        'bg-elevated':  '#16161A',

        // single warm accent — replaces cyberpunk neon dual palette.
        // token names preserved so JSX doesn't need refactor.
        'accent-violet':  '#7A7A82',   // muted gray (former secondary)
        'accent-cyan':    '#FFB547',   // amber primary
        'accent-green':   '#22c55e',   // success state (hex game wires)
        'accent-emerald': '#10b981',

        'text-primary':   '#F5F5F7',
        'text-secondary': '#9CA3AF',
        'text-muted':     '#5B5B63',
      },

      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },

      maxWidth: {
        content: '1200px',
      },

      // refined elevation — soft hairline glow, no cyberpunk halo.
      // keep token names so existing JSX classes work unchanged.
      boxShadow: {
        'neon-violet': '0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)',
        'neon-cyan':   '0 0 0 1px rgba(255,181,71,0.25), 0 8px 24px rgba(0,0,0,0.35)',
        'neon-emerald':'0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px rgba(0,0,0,0.35)',
        'card-hover':  '0 1px 0 rgba(255,255,255,0.05), 0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,181,71,0.18)',
      },

      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // the little pulse dot on "available" badge + current job
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.5)', opacity: '0' },
        },
        // particles floating up in hero background
        'float-up': {
          '0%':   { transform: 'translateY(0px) translateX(0px)', opacity: '0' },
          '10%':  { opacity: '1' },
          '90%':  { opacity: '0.6' },
          '100%': { transform: 'translateY(-120px) translateX(20px)', opacity: '0' },
        },
        // slow drift for background glow orbs
        'drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%':      { transform: 'translate(-20px, 15px) scale(0.97)' },
        },
        // editorial: subtle opacity breath only, no flicker
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.92' },
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

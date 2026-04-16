import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':      '#0a0a0a',
        'bg-surface':   '#0d0d14',
        'bg-elevated':  '#111120',

        // updated violet to a punchier purple-pink
        'accent-violet':  '#a855f7',
        'accent-cyan':    '#22d3ee',
        'accent-green':   '#22c55e',
        'accent-emerald': '#10b981',

        'text-primary':   '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted':     '#475569',
      },

      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },

      maxWidth: {
        content: '1200px',
      },

      // neon drop shadows as box-shadow utilities — useful for cards, buttons
      boxShadow: {
        'neon-violet': '0 0 20px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.15)',
        'neon-cyan':   '0 0 20px rgba(34, 211, 238, 0.4), 0 0 60px rgba(34, 211, 238, 0.12)',
        'neon-emerald':'0 0 20px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.12)',
        'card-hover':  '0 8px 40px rgba(168, 85, 247, 0.15), 0 0 0 1px rgba(168, 85, 247, 0.3)',
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
        // neon flicker for section headings — subtle, not annoying
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

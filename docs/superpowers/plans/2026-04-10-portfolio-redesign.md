# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Shah Fahad's portfolio as a Next.js 15 App Router site with Tailwind CSS and Framer Motion, targeting a premium "Editorial Dark" aesthetic with violet/cyan accents.

**Architecture:** Single-page application using Next.js 15 App Router. Root `page.tsx` is a server component composing six section components. All sections using Framer Motion are client components. Project/experience/skills data lives in a single typed `data/projects.ts` file.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v3, Framer Motion v11, @emailjs/browser v4, next/font/google

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependencies |
| `next.config.ts` | Image domains, build config |
| `tailwind.config.ts` | Custom colors, fonts, extended theme |
| `tsconfig.json` | TypeScript config |
| `app/globals.css` | CSS variables, Tailwind directives, base resets |
| `app/layout.tsx` | Font loading, metadata, body wrapper |
| `app/page.tsx` | Section composition (server component) |
| `data/projects.ts` | All typed data — projects, experience, skills |
| `hooks/useInView.ts` | Framer Motion useInView wrapper |
| `components/ui/RevealText.tsx` | Scroll-triggered fade+slide wrapper |
| `components/ui/SkillBadge.tsx` | Pill badge for skills/tech |
| `components/ui/ProjectCard.tsx` | Featured project card (large format) |
| `components/ui/ProjectModal.tsx` | Case study modal with AnimatePresence |
| `components/ui/TimelineItem.tsx` | Single experience timeline entry |
| `components/layout/Navbar.tsx` | Sticky nav with mobile menu |
| `components/layout/Footer.tsx` | Minimal 3-col footer |
| `components/sections/Hero.tsx` | Split hero — text left, photo right |
| `components/sections/About.tsx` | Storytelling + stats panel |
| `components/sections/Projects.tsx` | Filter tabs + featured cards + compact list |
| `components/sections/Experience.tsx` | Vertical timeline |
| `components/sections/Skills.tsx` | Category grid with pill badges |
| `components/sections/Contact.tsx` | EmailJS form + contact info |
| `public/images/shah-fahad.jpg` | Profile photo (user provides) |
| `public/images/projects/*.jpg` | Migrated from assets/projects/ |
| `public/Shah_Fahad_Resume.pdf` | Migrated from assets/ |

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "shah-fahad-portfolio",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.18.0",
    "@emailjs/browser": "^4.4.1"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.5.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.3.0"
  }
}
```

- [ ] **Step 2: Write next.config.ts**

```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    // local images only for now — add domains here if needed later
    formats: ['image/avif', 'image/webp'],
  },
}

export default config
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write/update .gitignore**

```
# dependencies
node_modules/
.pnp
.pnp.js

# Next.js build output
.next/
out/

# production build
build/

# environment variables — never commit these
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# debug logs
npm-debug.log*

# editor
.DS_Store
*.pem
```

- [ ] **Step 5: Write postcss.config.mjs**

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/shahfahad/portfolio
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No output (no errors). If it says `tsconfig.json not found` that's fine — it means no .ts files yet.

- [ ] **Step 8: Commit**

```bash
cd /Users/shahfahad/portfolio
git add package.json next.config.ts tsconfig.json postcss.config.mjs .gitignore
git commit -m "chore: initialize Next.js 15 project with TypeScript and Tailwind"
```

---

## Task 2: Tailwind Config & Global Styles

**Files:**
- Create: `tailwind.config.ts`
- Create: `app/globals.css`

- [ ] **Step 1: Write tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#080810',
        'bg-surface': '#0F0F1A',
        'bg-elevated': '#13131F',
        'accent-violet': '#8B5CF6',
        'accent-cyan': '#22D3EE',
        'accent-green': '#22C55E',
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted': '#475569',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      maxWidth: {
        content: '1200px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'breathe': 'breathe 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Create app/ directory and write globals.css**

```bash
mkdir -p /Users/shahfahad/portfolio/app
```

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-display: 'Plus Jakarta Sans';
  --font-body: 'Inter';
  --font-mono: 'JetBrains Mono';

  --border-subtle: rgba(139, 92, 246, 0.12);
  --border-hover: rgba(139, 92, 246, 0.35);
  --glow-violet: rgba(139, 92, 246, 0.25);
  --glow-violet-sm: rgba(139, 92, 246, 0.10);
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #080810;
  color: #F1F5F9;
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #080810;
}

::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.5);
}

/* Selection color */
::selection {
  background: rgba(139, 92, 246, 0.3);
  color: #F1F5F9;
}

@layer utilities {
  .border-subtle {
    border-color: var(--border-subtle);
  }

  .glow-violet {
    box-shadow: 0 0 40px var(--glow-violet);
  }

  .glow-violet-sm {
    box-shadow: 0 0 20px var(--glow-violet-sm);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "style: add Tailwind config and global CSS variables"
```

---

## Task 3: Data Layer

**Files:**
- Create: `data/projects.ts`

- [ ] **Step 1: Create data directory**

```bash
mkdir -p /Users/shahfahad/portfolio/data
```

- [ ] **Step 2: Write data/projects.ts**

```typescript
// data/projects.ts
// Central data store for all portfolio content.
// Update this file to change any project, experience, or skill data.

export interface Project {
  id: string
  title: string
  company: string
  category: 'web' | 'mobile' | 'realtime'
  year: string
  featured: boolean
  tagline: string
  description: string
  problem: string
  solution: string
  features: string[]
  tech: string[]
  image: string
  color: string
  liveUrl: string | null
  githubUrl: string | null
}

export interface Experience {
  id: string
  role: string
  company: string
  period: string
  current: boolean
  bullets: string[]
  tech: string[]
}

export interface SkillCategory {
  label: string
  skills: string[]
}

export const projects: Project[] = [
  {
    id: 'konnect',
    title: 'Konnect.im — Video Conferencing',
    company: 'MILETAP',
    category: 'realtime',
    year: '2024',
    featured: true,
    tagline: 'Enterprise-grade real-time video conferencing platform',
    description:
      'Multi-participant video conferencing with screen sharing, real-time chat, and participant management. Built for enterprise teams needing reliable, low-latency communication.',
    problem:
      'MILETAP needed an in-house video conferencing solution that could handle enterprise-scale usage without dependency on third-party providers.',
    solution:
      'Architected a WebRTC-based peer-to-peer system with SignalR as the signaling server. Implemented adaptive bitrate streaming and a Redux-managed session state to keep the UI in sync across all participants.',
    features: [
      'Multi-participant video and audio with adaptive quality',
      'Real-time chat alongside active video sessions',
      'Screen sharing with annotation support',
      'Participant management — mute, remove, pin',
      'Session recording to cloud storage',
    ],
    tech: ['React.js', 'WebRTC', 'SignalR', 'Redux'],
    image: '/images/projects/konnect.im.jpg',
    color: '#3b82f6',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'eocean',
    title: 'WhatsApp ChatBot Simulator',
    company: 'E-OCEAN',
    category: 'web',
    year: '2024',
    featured: true,
    tagline: 'Visual flow builder for designing and testing WhatsApp bots',
    description:
      'A drag-and-drop flow builder that lets teams design, preview and test WhatsApp chatbot conversations before deploying them to production customers.',
    problem:
      'E-OCEAN's support team was spending hours debugging chatbot flows in production. There was no safe environment to design and validate bot logic before it went live.',
    solution:
      'Built a visual flow editor using React where each node represents a bot message or user input. A live preview panel simulates the WhatsApp UI, and a state viewer shows exactly which node is active at each step.',
    features: [
      'Drag-and-drop flow builder with node/edge connections',
      'Live WhatsApp-style preview of the bot conversation',
      'Real-time flow state viewer for debugging',
      'Conditional branching based on user input',
      'Export/import flows as JSON',
    ],
    tech: ['React.js', 'Redux', 'Tailwind CSS', 'Node.js'],
    image: '/images/projects/chatbot.jpg',
    color: '#f97316',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'helpers',
    title: 'Helpers — Service Booking App',
    company: 'Freelance',
    category: 'mobile',
    year: '2024',
    featured: false,
    tagline: 'On-demand home services marketplace for Pakistan',
    description:
      'Mobile app connecting homeowners with vetted service professionals for plumbing, electrical, cleaning, and AC repair. Features live tracking and in-app payments.',
    problem:
      'Finding reliable home service professionals in Karachi was an inconsistent, word-of-mouth process with no accountability or pricing transparency.',
    solution:
      'Built a Flutter app with two user flows — customer and helper. Customers browse categories, book slots, and track the helper in real time. Helpers receive job requests and manage their schedule.',
    features: [
      'Service categories with verified professional listings',
      'Real-time booking status and live location tracking',
      'In-app messaging between customer and helper',
      'Stripe-integrated payments with split settlement',
      'Rating and review system after job completion',
    ],
    tech: ['Flutter', 'Firebase', 'Google Maps', 'Stripe'],
    image: '/images/projects/helpers.jpg',
    color: '#f97316',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'khawateen',
    title: 'Khawateen Rozgar Services',
    company: 'EXACT',
    category: 'web',
    year: '2023',
    featured: false,
    tagline: 'Women's empowerment job portal for re-entering the workforce',
    description:
      'A job portal tailored for women returning to professional life, with curated listings across IT, healthcare, teaching, and marketing sectors.',
    problem:
      'Women re-entering the workforce in Pakistan face barriers not addressed by general job portals — no flexibility options, no safe-workspace filters, no reskilling resources.',
    solution:
      'Built a full-stack portal with targeted job filters (flexible hours, remote-friendly, women-preferred employers) and an integrated workshops/resources section for skill-building.',
    features: [
      'Job listings with women-specific filters (flexible, remote, verified employers)',
      'Candidate profile builder with skills and availability',
      'Employer dashboard for posting and managing listings',
      'Workshops and reskilling resources section',
      'Application tracking for candidates',
    ],
    tech: ['React.js', 'Node.js', 'MongoDB', 'Express'],
    image: '/images/projects/khawateen.jpg',
    color: '#ec4899',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'kistpay',
    title: 'Kistpay Admin Portal',
    company: 'KISTPAY',
    category: 'web',
    year: '2023',
    featured: false,
    tagline: 'Installment management dashboard with payment analytics',
    description:
      'Admin portal for tracking customer installment plans, pending payments, and repayment schedules with a comprehensive analytics dashboard.',
    problem:
      'KISTPAY was managing installment data across spreadsheets with no central view of which customers were overdue, how much was outstanding, or where the revenue was coming from.',
    solution:
      'Built a React dashboard with role-based access (admin / manager / agent), payment graphs using Chart.js, and automated overdue notifications.',
    features: [
      'Dashboard with total loans, active customers, and outstanding amounts',
      'Payment history and schedule per customer',
      'Role-based access control for admin, manager, and agents',
      'Chart.js graphs for payment trends over time',
      'Export payment data to CSV',
    ],
    tech: ['React.js', 'Redux', 'Chart.js', 'REST API'],
    image: '/images/projects/kistpay-portal.jpg',
    color: '#14b8a6',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'opd',
    title: 'OPD Entry Software',
    company: 'KHADIM-E-INSANIYAT',
    category: 'mobile',
    year: '2023',
    featured: false,
    tagline: 'Offline-first patient registration app for hospital OPDs',
    description:
      'Flutter app for patient registration and daily OPD management at a hospital in Karachi. Works fully offline with local SQLite and syncs when connected.',
    problem:
      'Hospital staff were using paper registers for OPD entry — slow, error-prone, and impossible to query for patient history.',
    solution:
      'Built a Flutter app backed by Floor ORM and SQLite for full offline operation. Patient records sync to a central backend when connectivity is available.',
    features: [
      'Patient registration with medical history',
      'Daily patient count and pending case tracking',
      'Search across all patient records instantly',
      'Full offline operation with automatic sync',
      'Department-wise case categorization',
    ],
    tech: ['Flutter', 'Floor ORM', 'SQLite', 'Dart'],
    image: '/images/projects/opd-entry.jpg',
    color: '#22c55e',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'reapagro',
    title: 'Reap Agro — Loan Management',
    company: 'REAP AGRO',
    category: 'web',
    year: '2023',
    featured: false,
    tagline: 'Agricultural loan management system for farmers',
    description:
      'Web app for managing farm loans — tracking documents, land records, disbursement amounts, and repayment schedules in one place.',
    problem:
      'Reap Agro was processing loans through disconnected spreadsheets, making it hard to track document status, repayment health, or which loans were at risk.',
    solution:
      'Built a structured admin portal with file upload for land documents, a loan lifecycle tracker, and a calendar-based repayment scheduler.',
    features: [
      'Farmer onboarding with document upload (land records, agreements)',
      'Loan disbursement tracking and repayment schedule',
      'Dashboard showing active loans and overdue alerts',
      'AWS S3 for document storage',
      'Role-based access for field agents and management',
    ],
    tech: ['React.js', 'Node.js', 'PostgreSQL', 'AWS S3'],
    image: '/images/projects/reap-agro.jpg',
    color: '#84cc16',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'screening',
    title: 'Digital Display Manager',
    company: 'SCREENING',
    category: 'web',
    year: '2022',
    featured: false,
    tagline: 'Content scheduling system for corporate digital signage',
    description:
      'CMS for managing what plays on digital signage displays — playlist builder, zone management, content scheduling, and live preview.',
    problem:
      'Corporate clients needed to manage dynamic content across dozens of displays in different locations without IT involvement for each update.',
    solution:
      'Built an Electron-based desktop app with a React frontend. Content managers drag media into playlists, set display zones, and schedule content via a calendar. Changes push to displays over WebSocket.',
    features: [
      'Drag-and-drop playlist builder',
      'Zone management for multi-panel displays',
      'Calendar-based content scheduling',
      'Live preview before publishing',
      'WebSocket push to connected displays',
    ],
    tech: ['React.js', 'Electron', 'Node.js', 'WebSocket'],
    image: '/images/projects/screening.jpg',
    color: '#f59e0b',
    liveUrl: null,
    githubUrl: null,
  },
  {
    id: 'leavesystem',
    title: 'Leave Management System',
    company: 'DR. RUTH K.M. PFAU CIVIL HOSPITAL',
    category: 'web',
    year: '2019',
    featured: false,
    tagline: 'Employee leave application and approval workflow',
    description:
      'Internal web app for Dr. Ruth K.M. Pfau Civil Hospital Karachi — employees apply for leave, managers approve or reject, HR tracks across departments.',
    problem:
      'Leave applications were submitted on paper and approvals took days with no visibility into how many staff were absent at any time.',
    solution:
      'Built a PHP/MySQL web app with three roles — employee, manager, and HR. Employees submit applications; managers get email notifications and approve/reject from a dashboard.',
    features: [
      'Leave application form with type selection (sick, annual, casual)',
      'Manager approval workflow with email notifications',
      'Leave balance tracker per employee',
      'HR view for department-wise absence overview',
      'Leave history export to PDF',
    ],
    tech: ['PHP', 'jQuery', 'MySQL', 'Bootstrap'],
    image: '/images/projects/leave-applications-system.jpg',
    color: '#0ea5e9',
    liveUrl: null,
    githubUrl: null,
  },
]

export const experience: Experience[] = [
  {
    id: 'digitalhire',
    role: 'Software Engineer',
    company: 'DigitalHire',
    period: 'Jan 2023 – Present',
    current: true,
    bullets: [
      'Leading frontend development for a modern hiring & recruitment platform using React, Next.js & TypeScript',
      'Built reusable component library and complex multi-step application flows',
      'Focused on performance optimization, clean code architecture and exceptional user experience',
    ],
    tech: ['React.js', 'Next.js', 'TypeScript'],
  },
  {
    id: 'miletap',
    role: 'Senior Frontend Developer',
    company: 'MILETAP / E-OCEAN',
    period: '2020 – 2024',
    current: false,
    bullets: [
      'Developed Konnect.im — real-time video conferencing platform using WebRTC and SignalR',
      'Built WhatsApp ChatBot Simulator with visual drag-and-drop flow builder',
      'Architected real-time messaging and communication infrastructure',
    ],
    tech: ['React.js', 'WebRTC', 'SignalR'],
  },
  {
    id: 'freelance',
    role: 'Full-Stack Developer',
    company: 'Freelance & Contract',
    period: '2018 – 2020',
    current: false,
    bullets: [
      'Delivered 10+ custom web and mobile applications for clients across Pakistan',
      'Specialized in Flutter mobile apps with PHP/MySQL backend',
      'Built service booking platforms with live tracking and payment integration (Helpers App)',
    ],
    tech: ['Flutter', 'PHP', 'MySQL'],
  },
  {
    id: 'career-start',
    role: 'Junior Developer',
    company: 'Career Start',
    period: '2016 – 2018',
    current: false,
    bullets: [
      'Started professional journey mastering modern JavaScript, React and web fundamentals',
      'Developed internal tools and web applications for local businesses',
    ],
    tech: ['JavaScript', 'React', 'HTML/CSS'],
  },
]

export const skills: SkillCategory[] = [
  {
    label: 'Frontend',
    skills: ['React.js', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Redux'],
  },
  {
    label: 'Mobile',
    skills: ['Flutter', 'Dart'],
  },
  {
    label: 'Real-Time',
    skills: ['WebRTC', 'SignalR', 'WebSocket'],
  },
  {
    label: 'Backend & DB',
    skills: ['Node.js', 'PHP', 'MySQL', 'PostgreSQL', 'MongoDB'],
  },
  {
    label: 'Tools & Platforms',
    skills: ['Git', 'GitHub', 'Vercel', 'Figma', 'VS Code'],
  },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/shahfahad/portfolio
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add data/projects.ts
git commit -m "feat: add typed data layer for projects, experience and skills"
```

---

## Task 4: useInView Hook

**Files:**
- Create: `hooks/useInView.ts`

- [ ] **Step 1: Create hooks directory**

```bash
mkdir -p /Users/shahfahad/portfolio/hooks
```

- [ ] **Step 2: Write hooks/useInView.ts**

```typescript
// hooks/useInView.ts
// Thin wrapper around Framer Motion's useInView so every animated section
// uses the same default configuration without repeating options everywhere.

import { useRef } from 'react'
import { useInView as useFramerInView } from 'framer-motion'

interface InViewOptions {
  once?: boolean
  margin?: string
  amount?: number | 'some' | 'all'
}

export function useInView(options: InViewOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useFramerInView(ref, {
    once: true,
    margin: '-60px',
    ...options,
  })

  return { ref, isInView }
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useInView.ts
git commit -m "feat: add useInView hook wrapping Framer Motion"
```

---

## Task 5: UI Components — RevealText & SkillBadge

**Files:**
- Create: `components/ui/RevealText.tsx`
- Create: `components/ui/SkillBadge.tsx`

- [ ] **Step 1: Create component directories**

```bash
mkdir -p /Users/shahfahad/portfolio/components/ui
mkdir -p /Users/shahfahad/portfolio/components/layout
mkdir -p /Users/shahfahad/portfolio/components/sections
```

- [ ] **Step 2: Write components/ui/RevealText.tsx**

```tsx
// components/ui/RevealText.tsx
// Wraps any content in a fade-up animation that plays once when scrolled into view.

'use client'

import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'

interface RevealTextProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function RevealText({ children, delay = 0, className = '' }: RevealTextProps) {
  const { ref, isInView } = useInView()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: Write components/ui/SkillBadge.tsx**

```tsx
// components/ui/SkillBadge.tsx

'use client'

interface SkillBadgeProps {
  label: string
  className?: string
}

export function SkillBadge({ label, className = '' }: SkillBadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 text-xs font-mono rounded-full
        bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)]
        text-text-secondary transition-all duration-200
        hover:border-[rgba(139,92,246,0.5)] hover:text-text-primary
        ${className}
      `}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/RevealText.tsx components/ui/SkillBadge.tsx
git commit -m "feat: add RevealText and SkillBadge UI components"
```

---

## Task 6: Navbar

**Files:**
- Create: `components/layout/Navbar.tsx`

- [ ] **Step 1: Write components/layout/Navbar.tsx**

```tsx
// components/layout/Navbar.tsx

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on route change or resize
  useEffect(() => {
    const close = () => setMenuOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled ? 'bg-bg-surface/90 backdrop-blur-md border-b border-[rgba(139,92,246,0.1)]' : 'bg-transparent'}
        `}
      >
        <nav className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            className="font-display font-bold text-xl text-accent-violet hover:opacity-80 transition-opacity"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          >
            SF
          </a>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <button
                  onClick={() => handleNavClick(link.href)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Hire Me CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => handleNavClick('#contact')}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-violet text-white text-sm font-medium hover:bg-opacity-90 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-breathe" />
              Hire Me
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-px bg-text-primary transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-px bg-text-primary transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-text-primary transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-bg-base/98 backdrop-blur-md flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {navLinks.map((link, i) => (
              <motion.button
                key={link.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handleNavClick(link.href)}
                className="text-3xl font-display font-bold text-text-primary hover:text-accent-violet transition-colors"
              >
                {link.label}
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={() => handleNavClick('#contact')}
              className="mt-4 px-8 py-3 rounded-full bg-accent-violet text-white font-medium text-lg"
            >
              Hire Me
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "feat: add Navbar with mobile menu and scroll behavior"
```

---

## Task 7: Footer

**Files:**
- Create: `components/layout/Footer.tsx`

- [ ] **Step 1: Write components/layout/Footer.tsx**

```tsx
// components/layout/Footer.tsx

const footerLinks = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[rgba(139,92,246,0.1)] mt-24">
      <div className="max-w-content mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div>
            <span className="font-display font-bold text-lg text-accent-violet">SF</span>
            <p className="text-text-muted text-sm mt-1">Building experiences that scale.</p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-sm text-text-muted">
            © {year} Shah Fahad. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/Footer.tsx
git commit -m "feat: add Footer component"
```

---

## Task 8: Root Layout & Page Composition

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Write app/layout.tsx**

```tsx
// app/layout.tsx

import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Shah Fahad — Software Engineer',
  description:
    'Senior Software Engineer with 6+ years of experience building real-time web and mobile applications. Specializing in React, Next.js, Flutter, WebRTC and SignalR.',
  keywords: ['Software Engineer', 'React', 'Next.js', 'Flutter', 'WebRTC', 'Karachi', 'Pakistan'],
  authors: [{ name: 'Shah Fahad' }],
  openGraph: {
    title: 'Shah Fahad — Software Engineer',
    description: 'Senior Software Engineer specializing in React, Flutter, and real-time applications.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg-base text-text-primary font-body antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write app/page.tsx**

```tsx
// app/page.tsx

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Projects } from '@/components/sections/Projects'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Contact } from '@/components/sections/Contact'

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: Errors about missing section components — that's fine, they come in later tasks.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: add root layout with fonts and page composition"
```

---

## Task 9: Hero Section

**Files:**
- Create: `components/sections/Hero.tsx`

- [ ] **Step 1: Write components/sections/Hero.tsx**

```tsx
// components/sections/Hero.tsx

'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const stats = [
  { value: '6+', label: 'Years' },
  { value: '9+', label: 'Projects' },
  { value: '4+', label: 'Companies' },
  { value: '25+', label: 'Clients' },
]

// Stagger helper — each element delays slightly after the previous
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
})

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="max-w-content mx-auto px-6 w-full py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left column — text content */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Available badge */}
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono text-accent-green border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-breathe" />
                Available for opportunities
              </span>
            </motion.div>

            {/* Display name */}
            <div className="flex flex-col">
              <motion.h1
                {...fadeUp(0.2)}
                className="font-display font-extrabold text-7xl md:text-8xl leading-none text-text-primary"
              >
                Shah
              </motion.h1>
              <motion.h1
                {...fadeUp(0.3)}
                className="font-display font-extrabold text-7xl md:text-8xl leading-none text-text-primary"
              >
                Fahad<span className="text-accent-violet">.</span>
              </motion.h1>
            </div>

            {/* Role */}
            <motion.p
              {...fadeUp(0.4)}
              className="font-mono text-lg md:text-xl text-accent-cyan tracking-widest uppercase"
            >
              Software Engineer
            </motion.p>

            {/* Tagline */}
            <motion.p
              {...fadeUp(0.5)}
              className="text-base md:text-lg text-text-secondary max-w-lg leading-relaxed"
            >
              I craft high-performance, real-time web and mobile experiences that scale.
              Currently at{' '}
              <span className="text-text-primary font-medium">DigitalHire</span>,
              based in{' '}
              <span className="text-text-primary font-medium">Karachi, Pakistan</span>.
            </motion.p>

            {/* CTA buttons */}
            <motion.div {...fadeUp(0.6)} className="flex flex-wrap items-center gap-4">
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                View Projects
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="/Shah_Fahad_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[rgba(241,245,249,0.15)] text-text-primary font-medium text-sm hover:border-[rgba(139,92,246,0.4)] hover:text-accent-violet transition-all duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Resume
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              {...fadeUp(0.7)}
              className="flex flex-wrap items-center gap-8 pt-6 border-t border-[rgba(139,92,246,0.1)]"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className="font-display font-bold text-2xl text-accent-violet">{stat.value}</span>
                  <span className="font-mono text-xs text-text-muted tracking-wide uppercase">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right column — photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="relative flex-shrink-0 w-72 md:w-80 lg:w-96"
          >
            {/* Violet glow behind the photo */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'radial-gradient(circle at center, rgba(139,92,246,0.3) 0%, transparent 70%)',
                transform: 'scale(1.2)',
                filter: 'blur(40px)',
              }}
            />

            {/* Photo container */}
            <div className="relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.3)] aspect-[4/5]">
              <Image
                src="/images/shah-fahad.jpg"
                alt="Shah Fahad — Software Engineer"
                fill
                className="object-cover object-top"
                priority
                sizes="(max-width: 768px) 288px, (max-width: 1024px) 320px, 384px"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/sections/Hero.tsx
git commit -m "feat: add Hero section with split layout and Framer Motion entry animations"
```

---

## Task 10: About Section

**Files:**
- Create: `components/sections/About.tsx`

- [ ] **Step 1: Write components/sections/About.tsx**

```tsx
// components/sections/About.tsx

'use client'

import { motion } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'

const quickFacts = [
  { value: '6+', label: 'Years' },
  { value: '9+', label: 'Projects' },
  { value: '4+', label: 'Companies' },
  { value: 'Karachi', label: 'Pakistan' },
]

const techStack = ['React.js', 'Next.js', 'Flutter', 'TypeScript', 'WebRTC', 'SignalR', 'Redux', 'Tailwind CSS']

export function About() {
  const { ref: statsRef, isInView: statsVisible } = useInView()

  return (
    <section id="about" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        {/* Section label */}
        <RevealText className="mb-12">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">About Me</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Turning ideas into products
          </h2>
        </RevealText>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">

          {/* Left — narrative copy */}
          <div className="flex-1 flex flex-col gap-6">
            <RevealText delay={0.1}>
              <p className="text-text-secondary text-lg leading-relaxed">
                Over the past 6+ years, I've built products people actually use — from real-time video
                platforms at MILETAP to modern hiring systems at DigitalHire.
              </p>
            </RevealText>
            <RevealText delay={0.2}>
              <p className="text-text-secondary text-lg leading-relaxed">
                My expertise lies at the intersection of React, Next.js, Flutter, and real-time
                technologies like WebRTC and SignalR. I focus on writing clean, maintainable code
                while keeping the end-user experience at the center.
              </p>
            </RevealText>
            <RevealText delay={0.3}>
              <p className="text-text-secondary text-lg leading-relaxed">
                Currently based in Karachi, I'm always excited to work on challenging projects
                that push technical and product boundaries.
              </p>
            </RevealText>

            {/* Tech stack chips */}
            <RevealText delay={0.4} className="flex flex-wrap gap-2 pt-4">
              {techStack.map((skill) => (
                <SkillBadge key={skill} label={skill} />
              ))}
            </RevealText>
          </div>

          {/* Right — quick facts */}
          <div
            ref={statsRef}
            className="flex-shrink-0 grid grid-cols-2 gap-6 lg:w-56"
          >
            {quickFacts.map((fact, i) => (
              <motion.div
                key={fact.label}
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-1"
              >
                <span className="font-display font-bold text-3xl md:text-4xl text-accent-violet">
                  {fact.value}
                </span>
                <span className="font-mono text-xs text-text-muted uppercase tracking-wide">
                  {fact.label}
                </span>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/sections/About.tsx
git commit -m "feat: add About section with storytelling layout and stats panel"
```

---

## Task 11: ProjectCard & ProjectModal

**Files:**
- Create: `components/ui/ProjectCard.tsx`
- Create: `components/ui/ProjectModal.tsx`

- [ ] **Step 1: Write components/ui/ProjectCard.tsx**

```tsx
// components/ui/ProjectCard.tsx

'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Project } from '@/data/projects'

interface ProjectCardProps {
  project: Project
  onClick: (project: Project) => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.12)] bg-bg-surface cursor-pointer transition-all duration-300 hover:border-[rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(project)}
    >
      {/* Screenshot */}
      <div className="relative aspect-video overflow-hidden bg-bg-elevated">
        <Image
          src={project.image}
          alt={project.title}
          fill
          className={`object-cover transition-transform duration-500 ${hovered ? 'scale-105' : 'scale-100'}`}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-[rgba(139,92,246,0.65)] flex items-center justify-center transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-white font-medium text-sm flex items-center gap-2">
            View Case Study
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-6 flex flex-col gap-3">
        <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">
          {project.company}
        </span>
        <h3 className="font-display font-bold text-xl text-text-primary leading-snug">
          {project.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {project.tech.slice(0, 4).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 text-xs font-mono rounded-full bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-text-secondary"
            >
              {t}
            </span>
          ))}
        </div>
        <button className="mt-2 text-sm text-accent-violet font-medium text-left hover:opacity-80 transition-opacity">
          View Case Study →
        </button>
      </div>
    </motion.article>
  )
}
```

- [ ] **Step 2: Write components/ui/ProjectModal.tsx**

```tsx
// components/ui/ProjectModal.tsx

'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SkillBadge } from '@/components/ui/SkillBadge'
import type { Project } from '@/data/projects'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [project])

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[rgba(8,8,16,0.92)] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-surface border border-[rgba(139,92,246,0.2)]"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary hover:border hover:border-[rgba(139,92,246,0.3)] transition-all duration-200"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">{project.company}</span>
                <span className="font-mono text-xs text-text-muted">· {project.year}</span>
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-text-primary">
                {project.title}
              </h2>
            </div>

            {/* Screenshot */}
            <div className="relative w-full aspect-video bg-bg-elevated">
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>

            {/* Body */}
            <div className="px-6 py-6 flex flex-col gap-6">

              {/* Problem */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-2">Problem</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{project.problem}</p>
              </div>

              {/* Solution */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-2">Solution & Approach</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{project.solution}</p>
              </div>

              {/* Key Features */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Key Features</h4>
                <ul className="flex flex-col gap-2">
                  {project.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent-violet flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tech Stack */}
              <div>
                <h4 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <SkillBadge key={t} label={t} />
                  ))}
                </div>
              </div>

              {/* Links */}
              {(project.liveUrl || project.githubUrl) && (
                <div className="flex gap-4 pt-2 border-t border-[rgba(139,92,246,0.1)]">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      GitHub
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-accent-cyan hover:opacity-80 transition-opacity"
                    >
                      Live Demo
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/ProjectCard.tsx components/ui/ProjectModal.tsx
git commit -m "feat: add ProjectCard and ProjectModal components"
```

---

## Task 12: Projects Section

**Files:**
- Create: `components/sections/Projects.tsx`

- [ ] **Step 1: Write components/sections/Projects.tsx**

```tsx
// components/sections/Projects.tsx

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { ProjectModal } from '@/components/ui/ProjectModal'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { projects, type Project } from '@/data/projects'

type Filter = 'all' | 'web' | 'mobile' | 'realtime'

const filters: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Web', value: 'web' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Real-Time', value: 'realtime' },
]

export function Projects() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const filtered = projects.filter(
    (p) => activeFilter === 'all' || p.category === activeFilter
  )
  const featured = filtered.filter((p) => p.featured)
  const rest = filtered.filter((p) => !p.featured)

  return (
    <section id="projects" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        {/* Header */}
        <RevealText className="mb-10">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">My Work</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Featured Projects
          </h2>
          <p className="text-text-secondary mt-3 max-w-lg">
            A selection of products I've designed and built. Click any project to read the full case study.
          </p>
        </RevealText>

        {/* Filter tabs */}
        <RevealText delay={0.1} className="flex flex-wrap gap-2 mb-10">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-200 ${
                activeFilter === f.value
                  ? 'bg-accent-violet text-white'
                  : 'text-text-muted border border-[rgba(139,92,246,0.2)] hover:text-text-primary hover:border-[rgba(139,92,246,0.4)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </RevealText>

        {/* Featured cards */}
        <AnimatePresence mode="wait">
          {featured.length > 0 && (
            <motion.div
              key={activeFilter + '-featured'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
            >
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} onClick={setSelectedProject} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact list */}
        {rest.length > 0 && (
          <div className="border-t border-[rgba(139,92,246,0.1)]">
            <AnimatePresence>
              {rest.map((project, i) => (
                <motion.button
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  onClick={() => setSelectedProject(project)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-4 border-b border-[rgba(139,92,246,0.1)] text-left hover:bg-[rgba(139,92,246,0.05)] transition-colors duration-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-accent-cyan">{project.company}</span>
                    <span className="font-mono text-xs text-text-muted ml-2">•</span>
                    <span className="font-medium text-text-secondary group-hover:text-text-primary transition-colors ml-2 text-sm">
                      {project.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                    {project.tech.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 text-xs font-mono rounded-full bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)] text-text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0 text-text-muted group-hover:text-accent-violet transition-colors hidden sm:block"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* GitHub CTA */}
        <RevealText delay={0.2} className="mt-10 flex justify-center">
          <a
            href="https://github.com/fahaddoc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[rgba(139,92,246,0.2)] text-text-secondary hover:text-text-primary hover:border-[rgba(139,92,246,0.4)] transition-all duration-200 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View All on GitHub
          </a>
        </RevealText>

      </div>

      {/* Modal */}
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/sections/Projects.tsx
git commit -m "feat: add Projects section with filter tabs, featured cards and compact list"
```

---

## Task 13: TimelineItem & Experience Section

**Files:**
- Create: `components/ui/TimelineItem.tsx`
- Create: `components/sections/Experience.tsx`

- [ ] **Step 1: Write components/ui/TimelineItem.tsx**

```tsx
// components/ui/TimelineItem.tsx

'use client'

import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import type { Experience } from '@/data/projects'

interface TimelineItemProps {
  item: Experience
  index: number
}

export function TimelineItem({ item, index }: TimelineItemProps) {
  const { ref, isInView } = useInView()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
      className="relative pl-8 pb-10 last:pb-0"
    >
      {/* Vertical line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-[rgba(139,92,246,0.2)]" />

      {/* Dot */}
      <div
        className={`absolute left-[-4px] top-1.5 w-2 h-2 rounded-full border-2 ${
          item.current
            ? 'bg-accent-violet border-accent-violet shadow-[0_0_8px_rgba(139,92,246,0.6)]'
            : 'bg-bg-base border-[rgba(139,92,246,0.4)]'
        }`}
      />

      {/* Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-3">
        <div>
          <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest block mb-1">
            {item.company}
          </span>
          <h3 className="font-display font-bold text-xl text-text-primary">{item.role}</h3>
        </div>
        <span className="font-mono text-xs text-text-muted whitespace-nowrap mt-1">{item.period}</span>
      </div>

      {/* Bullets */}
      <ul className="flex flex-col gap-2 mb-4">
        {item.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
            <span className="mt-2 w-1 h-1 rounded-full bg-accent-violet flex-shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>

      {/* Tech badges */}
      <div className="flex flex-wrap gap-1.5">
        {item.tech.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 text-xs font-mono rounded-full bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)] text-text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Write components/sections/Experience.tsx**

```tsx
// components/sections/Experience.tsx

import { RevealText } from '@/components/ui/RevealText'
import { TimelineItem } from '@/components/ui/TimelineItem'
import { experience } from '@/data/projects'

export function Experience() {
  return (
    <section id="experience" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        <RevealText className="mb-14">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Experience</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Professional Journey
          </h2>
        </RevealText>

        <div className="max-w-2xl">
          {experience.map((item, i) => (
            <TimelineItem key={item.id} item={item} index={i} />
          ))}
        </div>

        {/* Resume CTA */}
        <div className="mt-14">
          <a
            href="/Shah_Fahad_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Resume
          </a>
        </div>

      </div>
    </section>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/TimelineItem.tsx components/sections/Experience.tsx
git commit -m "feat: add Experience section with animated timeline"
```

---

## Task 14: Skills Section

**Files:**
- Create: `components/sections/Skills.tsx`

- [ ] **Step 1: Write components/sections/Skills.tsx**

```tsx
// components/sections/Skills.tsx

'use client'

import { motion } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'
import { skills } from '@/data/projects'

export function Skills() {
  const { ref, isInView } = useInView()

  return (
    <section id="skills" className="py-24 md:py-32 bg-bg-surface">
      <div className="max-w-content mx-auto px-6">

        <RevealText className="mb-14">
          <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Expertise</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
            Skills & Expertise
          </h2>
        </RevealText>

        <div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {skills.map((category, i) => (
            <motion.div
              key={category.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col gap-4"
            >
              <div>
                <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">
                  {category.label}
                </span>
                <div className="mt-2 h-px bg-[rgba(139,92,246,0.2)]" />
              </div>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <SkillBadge key={skill} label={skill} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/sections/Skills.tsx
git commit -m "feat: add Skills section with category grid"
```

---

## Task 15: Contact Section

**Files:**
- Create: `components/sections/Contact.tsx`
- Create: `.env.local` (manual step — user fills in values)

- [ ] **Step 1: Write components/sections/Contact.tsx**

```tsx
// components/sections/Contact.tsx

'use client'

import { useState, FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import { RevealText } from '@/components/ui/RevealText'

type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<FormStatus>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return

    setStatus('sending')

    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
          from_name: form.name,
          from_email: form.email,
          subject: form.subject,
          message: form.message,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      )
      setStatus('sent')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const inputClass = `
    w-full bg-transparent border-b border-[rgba(139,92,246,0.2)] py-3 text-text-primary text-sm
    placeholder:text-text-muted outline-none transition-all duration-300
    focus:border-accent-violet
  `

  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">

          {/* Left — info */}
          <div className="flex-1">
            <RevealText>
              <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Contact</span>
              <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2 mb-4">
                Let's work together
              </h2>
              <p className="text-text-secondary leading-relaxed max-w-sm">
                Have a project in mind? I'm currently open to new opportunities and exciting projects.
              </p>
            </RevealText>

            <RevealText delay={0.15} className="mt-8 flex flex-col gap-4">
              <a
                href="mailto:fahaddoc600@gmail.com"
                className="flex items-center gap-3 text-text-secondary hover:text-accent-cyan transition-colors duration-200 group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-violet flex-shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-sm">fahaddoc600@gmail.com</span>
              </a>
              <a
                href="tel:+923042186009"
                className="flex items-center gap-3 text-text-secondary hover:text-accent-cyan transition-colors duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-violet flex-shrink-0">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span className="text-sm">+92 304 2186009</span>
              </a>
            </RevealText>

            <RevealText delay={0.25} className="mt-8 flex items-center gap-4">
              <a href="https://github.com/fahaddoc" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/fahaddoc600" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </RevealText>
          </div>

          {/* Right — form */}
          <RevealText delay={0.1} className="flex-1">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={form.subject}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <textarea
                name="message"
                placeholder="Tell me about your project..."
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                className={`${inputClass} resize-none`}
              />

              <button
                type="submit"
                disabled={status === 'sending' || status === 'sent'}
                className="w-full py-4 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Message Sent ✓' : 'Send Message'}
              </button>

              {status === 'error' && (
                <p className="text-sm text-red-400 text-center">
                  Something went wrong. Please email directly at fahaddoc600@gmail.com
                </p>
              )}
            </form>
          </RevealText>

        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create .env.local template**

Create the file `/Users/shahfahad/portfolio/.env.local`:
```bash
# EmailJS credentials — get these from emailjs.com dashboard
# Same service you used in the old portfolio (service_izjqfuf, template_qey1c9a)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_izjqfuf
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_qey1c9a
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
```

Note: `.env.local` is already in `.gitignore` by default in Next.js projects. Do not commit it.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/sections/Contact.tsx
# DO NOT add .env.local — it contains secrets
git commit -m "feat: add Contact section with EmailJS form"
```

---

## Task 16: Asset Migration

**Files:**
- Copy: `assets/projects/*.jpg` → `public/images/projects/`
- Copy: `assets/Shah_Fahad_Resume.pdf` → `public/Shah_Fahad_Resume.pdf`
- Copy: profile photo → `public/images/shah-fahad.jpg`

- [ ] **Step 1: Create public directories**

```bash
mkdir -p /Users/shahfahad/portfolio/public/images/projects
```

- [ ] **Step 2: Copy project screenshots**

```bash
cp /Users/shahfahad/portfolio/assets/projects/chatbot.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/konnect.im.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/helpers.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/khawateen.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/kistpay-portal.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/opd-entry.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/reap-agro.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/screening.jpg /Users/shahfahad/portfolio/public/images/projects/
cp /Users/shahfahad/portfolio/assets/projects/leave-applications-system.jpg /Users/shahfahad/portfolio/public/images/projects/
```

- [ ] **Step 3: Copy resume PDF**

```bash
cp /Users/shahfahad/portfolio/assets/Shah_Fahad_Resume.pdf /Users/shahfahad/portfolio/public/
```

- [ ] **Step 4: Add profile photo**

Place your professional photo at:
```
/Users/shahfahad/portfolio/public/images/shah-fahad.jpg
```

If you don't have it yet, create a temporary placeholder so the build doesn't fail:
```bash
# Temporary: copy any existing image as placeholder
cp /Users/shahfahad/portfolio/assets/projects/konnect.im.jpg /Users/shahfahad/portfolio/public/images/shah-fahad.jpg
```
Replace with real photo before deploying.

- [ ] **Step 5: Commit**

```bash
git add public/
git commit -m "chore: migrate project screenshots and resume to public/"
```

---

## Task 17: Build Verification & Dev Run

- [ ] **Step 1: Full typecheck**

```bash
cd /Users/shahfahad/portfolio
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Run dev server**

```bash
npm run dev
```

Expected: `✓ Ready in Xms` — open http://localhost:3000

- [ ] **Step 3: Visual checklist in browser**

Open http://localhost:3000 and verify:
- [ ] Fonts load (Plus Jakarta Sans for headings, monospace for badges)
- [ ] Hero: "Shah Fahad." visible with violet period, cyan role label, photo placeholder shows
- [ ] Hero entry animations play on page load (staggered fade-up)
- [ ] Navbar: "SF" logo visible, links scroll to sections, "Hire Me" CTA visible
- [ ] Navbar becomes blurred/dark on scroll
- [ ] Mobile: hamburger opens full-screen menu (resize to < 768px)
- [ ] About: stats and tech stack chips visible
- [ ] Projects: filter tabs work (All/Web/Mobile/Real-Time)
- [ ] Projects: clicking a card opens modal with screenshot, problem, solution, features, tech
- [ ] Modal: Escape key closes it
- [ ] Experience: timeline shows with violet dot on DigitalHire (current)
- [ ] Skills: category grid with pill badges
- [ ] Contact: form inputs have bottom-border focus animation
- [ ] Footer: "SF" logo, nav links, copyright visible

- [ ] **Step 4: Production build**

```bash
npm run build
```

Expected: Build completes with no errors. Note any warnings.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete portfolio redesign — Editorial Dark with Next.js 15 and Framer Motion"
```

---

## Post-Deployment Checklist

After `git push` and Vercel redeploys:

- [ ] Replace placeholder photo with real professional photo at `public/images/shah-fahad.jpg`
- [ ] Update `.env.local` with real EmailJS public key and verify contact form sends
- [ ] Verify `public/Shah_Fahad_Resume.pdf` is accessible at `/Shah_Fahad_Resume.pdf`
- [ ] Test on mobile (iPhone Safari, Android Chrome)
- [ ] Check Vercel Analytics is collecting data
- [ ] Update `liveUrl` and `githubUrl` fields in `data/projects.ts` for any projects that have public URLs

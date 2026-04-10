# Shah Fahad — Portfolio Redesign Design Spec
**Date:** 2026-04-10  
**Target:** 10/10 Premium "Editorial Dark" Portfolio  
**Status:** Approved — Ready for Implementation

---

## 1. Overview

Full rebuild of shah-fahad-software-engineer.vercel.app from vanilla HTML/CSS/JS into a Next.js 15 App Router project. Goal: a premium, editorially-styled dark portfolio that positions Shah Fahad as a senior, high-caliber Software Engineer — not just another template-based dev portfolio.

**Core Philosophy:**
- Trust and confidence over visual tricks
- Every animation serves a purpose — no decorative loops
- Real content (9 real projects, real experience, real photo)
- Code reads like it was written by a careful senior developer

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Best-in-class SSG/SSR, Vercel-native |
| Styling | Tailwind CSS v3 | Utility-first, no runtime cost |
| Animations | Framer Motion | Purpose-built for React, clean API |
| Fonts | Plus Jakarta Sans + Inter + JetBrains Mono | Via `next/font/google` |
| Contact Form | EmailJS | Client-side, no backend needed |
| Deployment | Vercel | Existing setup |

**Not using:** Three.js (too heavy for this design), GSAP (Framer Motion covers all needs), Lenis (Next.js scroll is fine for this approach).

---

## 3. Design System

### 3.1 Color Tokens

```css
/* Background layers */
--bg-base:       #080810;   /* page background */
--bg-surface:    #0F0F1A;   /* cards, nav */
--bg-elevated:   #13131F;   /* modal, hover states */

/* Accents */
--accent-violet: #8B5CF6;   /* primary brand — violet */
--accent-cyan:   #22D3EE;   /* secondary — electric cyan-blue */
--accent-green:  #22C55E;   /* available badge only */

/* Borders */
--border-subtle: rgba(139, 92, 246, 0.12);
--border-hover:  rgba(139, 92, 246, 0.35);

/* Glows */
--glow-violet:   rgba(139, 92, 246, 0.25);
--glow-violet-sm: rgba(139, 92, 246, 0.10);

/* Text */
--text-primary:   #F1F5F9;
--text-secondary: #94A3B8;
--text-muted:     #475569;
```

### 3.2 Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Hero name (display) | Plus Jakarta Sans | `text-8xl` (7rem) | 800 |
| Section headings | Plus Jakarta Sans | `text-5xl` | 700 |
| Subheadings | Plus Jakarta Sans | `text-2xl` | 600 |
| Body text | Inter | `text-base` / `text-lg` | 400 |
| Labels, roles, badges | JetBrains Mono | `text-sm` / `text-xs` | 500 |

### 3.3 Spacing & Layout

- Max content width: `1200px` (centered, `px-6` on mobile)
- Section vertical padding: `py-24` (desktop), `py-16` (mobile)
- Card border radius: `rounded-2xl` (16px)
- Consistent gap between sections: `gap-6` for grids, `gap-4` for lists

### 3.4 Animation Rules

| Animation | Trigger | Duration | Easing |
|---|---|---|---|
| Section text reveal | scroll enter (once) | 0.6s | easeOut |
| Card entrance | scroll enter (once) | 0.5s | easeOut |
| Stagger children | scroll enter | 0.1s per item | easeOut |
| Hover glow | hover | 0.2s | easeInOut |
| Modal open/close | click | 0.3s | easeInOut |
| Page hero entries | page load | staggered 0.1–0.7s | easeOut |

**No:** continuous loops, parallax scroll, background animations.

---

## 4. Folder Structure

```
portfolio/                       ← existing repo root
├── app/
│   ├── layout.tsx               ← metadata, fonts, globals
│   ├── page.tsx                 ← section composition (Hero→Contact)
│   └── globals.css              ← CSS variables, Tailwind base
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           ← logo, links, hire-me CTA
│   │   └── Footer.tsx           ← minimal 3-col footer
│   ├── sections/
│   │   ├── Hero.tsx             ← split layout, photo, stats
│   │   ├── About.tsx            ← storytelling, stats panel
│   │   ├── Projects.tsx         ← filter, featured cards, list
│   │   ├── Experience.tsx       ← timeline
│   │   ├── Skills.tsx           ← category grid with pill badges
│   │   └── Contact.tsx          ← form + info
│   └── ui/
│       ├── ProjectCard.tsx      ← featured card component
│       ├── ProjectModal.tsx     ← case study modal
│       ├── TimelineItem.tsx     ← single experience entry
│       ├── SkillBadge.tsx       ← pill badge
│       └── RevealText.tsx       ← scroll-triggered text reveal
├── data/
│   └── projects.ts              ← all 9 projects + experience + skills data
├── hooks/
│   └── useInView.ts             ← thin wrapper around Framer Motion's useInView for consistent animation config
├── public/
│   └── images/
│       ├── shah-fahad.jpg       ← profile photo (user provides)
│       └── projects/            ← project screenshots (existing assets)
│           ├── chatbot.jpg
│           ├── konnect.im.jpg
│           └── ... (all 9)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Section Specifications

### 5.1 Navbar

- **Sticky** top, `backdrop-blur` + `bg-surface/80` after scroll
- Left: "SF" logo in violet (Plus Jakarta Sans, bold)
- Center: navigation links (About · Projects · Experience · Contact)
- Right: "Hire Me" pill CTA — violet bg, white text, pulse dot
- Mobile: hamburger menu, full-screen overlay nav
- Hide-on-scroll-down, reveal-on-scroll-up behavior

### 5.2 Hero Section

**Desktop:** Split 55/45 — text left, photo right.  
**Mobile:** Stacked, photo below text (circular crop on mobile).

**Left column (top to bottom):**
1. "Available for opportunities" badge
   - Pill shape, `bg: rgba(34,197,94,0.08)`, `border: rgba(34,197,94,0.2)`
   - Soft breathing pulse on the green dot (scale 1→1.4, opacity 1→0, 2s loop, subtle)
2. Display heading:
   - Line 1: "Shah" — `text-8xl`, weight 800, `#F1F5F9`
   - Line 2: "Fahad." — same, period in `#8B5CF6`
3. Role label: "Software Engineer" — JetBrains Mono, `text-xl`, `#22D3EE`, tracked
4. Tagline: "I craft high-performance, real-time web and mobile experiences that scale." — Inter, `text-lg`, `#94A3B8`
5. CTA row: [View Projects →] (violet filled) + [Download Resume] (ghost border)
6. Stats divider + 4 stats: `6+` Years · `9+` Projects · `4+` Companies · `25+` Clients

**Right column:**
- Photo in `rounded-2xl` container, max-width ~420px on desktop
- Behind: radial gradient glow `rgba(139,92,246,0.25)` spread ~300px
- Border: `1px solid rgba(139,92,246,0.3)`
- No floating cards, no rings — clean

**Hero entry animation (Framer Motion, on page load):**
```
badge        → fadeIn, delay 0.1s
"Shah"       → y: 40→0, opacity 0→1, delay 0.2s
"Fahad."     → y: 40→0, opacity 0→1, delay 0.3s
role label   → fadeIn, delay 0.4s
tagline      → fadeIn, delay 0.5s
CTA buttons  → y: 20→0, opacity 0→1, delay 0.6s
stats row    → fadeIn, delay 0.7s
photo        → scale 0.95→1, opacity 0→1, delay 0.4s
```

### 5.3 About Section

**Layout:** 60/40 split — narrative left, facts panel right.

**Left — Storytelling copy:**
```
Over the past 6+ years, I've built products people actually use — 
from real-time video platforms at MILETAP to modern hiring systems 
at DigitalHire.

My expertise lies at the intersection of React, Next.js, Flutter, 
and real-time technologies like WebRTC and SignalR. I focus on 
writing clean, maintainable code while keeping the end-user 
experience at the center.

Currently based in Karachi, I'm always excited to work on 
challenging projects that push technical and product boundaries.
```

**Right — Facts panel (4 items):**
```
6+          9+          4+          Karachi
Years       Projects    Companies   Pakistan
```
- Each stat: number in `#8B5CF6` (`text-4xl`, weight 700), label in `#475569` (small, Mono)
- Clean grid, no card boxes — just numbers

**Bottom — Tech stack chips:**
Row of pills: `React.js` `Next.js` `Flutter` `TypeScript` `WebRTC` `SignalR` `Redux` `Tailwind CSS`
- `bg: rgba(139,92,246,0.08)`, `border: rgba(139,92,246,0.2)`, text `#94A3B8`
- JetBrains Mono, `text-xs`

### 5.4 Projects Section

**Filter tabs:** All · Web · Mobile · Real-Time (4 tabs, no "All Projects" duplicate)  
Active tab: violet bg, white text. Inactive: ghost, `#475569`.

**Featured cards (top 2 — WhatsApp ChatBot + Konnect.im):**
- Large cards, side by side on desktop, stacked on mobile
- Top: `aspect-video` screenshot image
- Overlay on hover: violet tinted (`rgba(139,92,246,0.6)`) + "View Case Study →" centered in white
- Bottom section:
  - Company name: JetBrains Mono, `text-xs`, `#22D3EE`
  - Project title: `text-xl`, weight 700, `#F1F5F9`
  - 1-line tagline + 2-line description
  - Tech badges (max 4): `bg: rgba(139,92,246,0.1)`, `border: rgba(139,92,246,0.2)`
  - "View Case Study →" text button in violet
- Card border: `--border-subtle`, hover: `--border-hover` + `--glow-violet-sm` box-shadow
- Click anywhere on card → opens modal

**Compact list (remaining 7 projects):**
- Thin horizontal divider rows
- Each row: `Company • Project Title` (left) | tech badges (center, max 3) | `→` (right)
- Hover: row bg tints to `rgba(139,92,246,0.05)`, title turns `#F1F5F9`
- Click → opens same modal
- Category-based filtering applies here too

**Case Study Modal:**
- Full-screen overlay, dark backdrop (`rgba(8,8,16,0.9)`)
- Modal panel: `max-w-3xl`, centered, `bg: #0F0F1A`, `rounded-2xl`
- Close button (×) top right
- Structure inside:
  ```
  Company (Mono, cyan) · Year (Mono, muted)
  Project Title (text-3xl, bold)
  ─────────────────────────────────
  [Full-width screenshot]
  
  Problem
  1-2 line problem statement
  
  Solution & Approach
  2-3 sentences on how it was built
  
  Key Features
  • Feature 1
  • Feature 2
  • Feature 3
  
  Tech Stack
  [badge] [badge] [badge] [badge]
  
  [GitHub ↗]   [Live Demo ↗]
  ```
- Open animation: scale 0.95→1 + opacity 0→1, 0.3s
- Escape key closes

### 5.5 Experience Section

**Section title:** "Professional Journey"

**Timeline design:**
- Left: continuous vertical line in `rgba(139,92,246,0.2)`
- Each item: dot on the line + content to the right
- Current role (DigitalHire): dot in `#8B5CF6` with soft pulse glow, line segment above in violet
- Past roles: dot in `#475569`, line in `rgba(139,92,246,0.2)`

**Each timeline item:**
```
● [Company — cyan, Mono, xs]          [Date — Mono, muted, right-aligned]
  [Role Title — text-xl, bold, white]
  [2-3 bullet points of responsibilities/achievements]
  • Built real-time video conferencing with WebRTC for 1000+ concurrent users
  • Developed WhatsApp chatbot flow builder with drag-and-drop interface
  [React.js] [WebRTC] [SignalR]   ← tech badges
```

**Entries (4 total):**

1. **DigitalHire** — Software Engineer — Jan 2023–Present
   - Leading frontend development for a modern hiring & recruitment platform using React, Next.js & TypeScript
   - Built reusable component library and complex multi-step application flows
   - Focused on performance optimization, clean code architecture and exceptional user experience

2. **MILETAP / E-OCEAN** — Senior Frontend Developer — 2020–2024
   - Developed Konnect.im — real-time video conferencing platform using WebRTC and SignalR
   - Built WhatsApp ChatBot Simulator with visual drag-and-drop flow builder
   - Architected real-time messaging and communication infrastructure

3. **Freelance & Contract** — Full-Stack Developer — 2018–2020
   - Delivered 10+ custom web and mobile applications for clients across Pakistan
   - Specialized in Flutter mobile apps with PHP/MySQL backend
   - Built service booking platforms with live tracking and payment integration (Helpers App)

4. **Career Start** — Junior Developer — 2016–2018
   - Started professional journey mastering modern JavaScript, React and web fundamentals
   - Developed internal tools and web applications for local businesses

**Scroll animation:** each item slides in from left (`x: -30→0`), staggered 0.15s apart.

### 5.6 Skills Section

**Section title:** "Skills & Expertise"

**5 categories in a responsive grid:**

| Category | Skills |
|---|---|
| Frontend | React.js, Next.js, TypeScript, JavaScript, Tailwind CSS, Redux |
| Mobile | Flutter, Dart |
| Real-Time | WebRTC, SignalR, WebSocket |
| Backend & DB | Node.js, PHP, MySQL, PostgreSQL, MongoDB |
| Tools & Platforms | Git, GitHub, Vercel, Figma, VS Code |

**Layout:**
- Category label: uppercase, JetBrains Mono, `text-xs`, `#8B5CF6`, `letter-spacing: 0.1em`
- Thin violet rule under label
- Skill pills: `bg: rgba(139,92,246,0.08)`, `border: 1px solid rgba(139,92,246,0.2)`, text `#94A3B8`, JetBrains Mono `text-xs`, `rounded-full`, `px-3 py-1`
- On hover: border brightens to `rgba(139,92,246,0.5)`, text → `#F1F5F9`

### 5.7 Contact Section

**Section title:** "Let's work together"

**Layout:** 50/50 split desktop, stacked mobile.

**Left — Contact info:**
- Heading + 2-line subtext: "Have a project in mind? I'm currently open to new opportunities."
- Email (clickable, cyan on hover): `fahaddoc600@gmail.com`
- Phone (clickable): `+92 304 2186009`
- Social links: GitHub + LinkedIn — SVG icons, `#475569` default, `#F1F5F9` on hover

**Right — Form:**
- Fields: Name, Email, Subject, Message (textarea)
- Input style: no box, just bottom border `1px solid rgba(139,92,246,0.2)`, bg transparent
- Focus state: border bottom animates to full violet `#8B5CF6`
- Submit button: full-width, violet bg, white text, `rounded-xl`
- Powered by EmailJS (service/template IDs from `.env.local`)

### 5.8 Footer

**Three-column, single row:**
```
SF                    About · Projects ·         © 2026 Shah Fahad.
Building experiences  Experience · Contact        All rights reserved.
that scale.
```
- Logo "SF" in violet
- Tagline in `#475569`
- Nav links in `#475569`, hover `#F1F5F9`
- Copyright in `#475569`
- Top border: `1px solid rgba(139,92,246,0.1)`

---

## 6. Data Structure (`data/projects.ts`)

```typescript
export interface Project {
  id: string
  title: string
  company: string
  category: 'web' | 'mobile' | 'realtime'
  year: string
  featured: boolean
  tagline: string           // 1-line hook
  description: string       // 2-3 sentence overview
  problem: string           // 1-2 line problem statement (modal)
  solution: string          // 2-3 sentence approach (modal)
  features: string[]        // bullet points for modal
  tech: string[]
  image: string             // path to screenshot
  color: string             // accent color for SVG fallback
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
```

---

## 7. Environment Variables

```env
# .env.local
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```

---

## 8. Out of Scope

- Blog / writing section
- Dark/light theme toggle (dark-only — consistent with editorial aesthetic)
- Admin panel / CMS
- Analytics beyond Vercel built-in
- Three.js or WebGL background
- Internationalization

---

## 9. Existing Assets to Migrate

Project screenshots already exist at `assets/projects/` (verified present):
- `chatbot.jpg` — WhatsApp ChatBot Simulator
- `konnect.im.jpg` — Konnect.im Video Conferencing
- `helpers.jpg` — Helpers Service Booking App
- `khawateen.jpg` + `khawateen_rozgar_services_cover.jpeg` — Khawateen Rozgar (2 images)
- `kistpay-portal.jpg` — Kistpay Admin Portal
- `opd-entry.jpg` — OPD Entry Software
- `reap-agro.jpg` — Reap Agro Loan Management
- `screening.jpg` — Digital Display Manager
- `leave-applications-system.jpg` — Leave Management System

These move to `public/images/projects/` in the new structure.

Resume PDF (`assets/Shah_Fahad_Resume.pdf`) moves to `public/Shah_Fahad_Resume.pdf`.

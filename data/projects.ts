import { engineeringDemos } from './engineering-demos'

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

// Shipped work — client, employer and personal projects. Authored in any order;
// the exported `projects` array below is what every surface actually reads.
const shippedWork: Project[] = [
  {
    id: 'as-saqib',
    title: 'AS Saqib — Perfume Storefront',
    company: 'Freelance client · AS Saqib Perfume Fragrance',
    category: 'web',
    year: '2026',
    featured: true,
    tagline: 'Live Pakistani e-commerce storefront — cash on delivery, orders over WhatsApp',
    description:
      'A production storefront for a Pakistani perfume brand, live on the client\'s own domain. Twelve fragrances across men\'s and women\'s ranges, a full cart and checkout, and a cash-on-delivery order flow that hands the finished order to the shop over WhatsApp. Built on Next.js 16 and React 19, deployed on Vercel with DNS at Cloudflare.',
    problem:
      'The brand was selling entirely through Instagram and WhatsApp DMs. Every order arrived as a scattered conversation — the customer would ask the price, send an address in pieces, and the shop had to reassemble it by hand. There was no product catalogue, no delivery rules a customer could read, and no page to send anyone to. A conventional shop would have meant a payment gateway, a merchant account and a database, none of which the business wanted or needed for cash on delivery.',
    solution:
      'I built the catalogue as a static site and moved only the last step — the order itself — onto WhatsApp, which the shop already lives in. The cart is client-side in localStorage and syncs across tabs; checkout validates the Pakistani phone formats customers actually type; pressing "Place order" formats the whole basket, totals and delivery address into a single WhatsApp message and opens wa.me with it prefilled. Nothing is stored on a server, so there is no database, no API route and no running cost beyond hosting. Prices, delivery rules and contact details all sit in one config file the client can have changed in minutes.',
    features: [
      'Twelve products across men\'s and women\'s ranges, each with a statically generated detail page',
      'Cart in localStorage via useSyncExternalStore — survives refresh, stays in sync across tabs',
      'COD checkout that builds the full order into a prefilled WhatsApp message — no gateway, no database',
      'Phone validation accepting 0300…, +92300…, 92300… and dashed or spaced variants',
      'Delivery rules from one config: Rs 200 flat, free above Rs 3,000 — drives the ticker, cart progress bar, checkout and policy page',
      'Build-time image pipeline: raw WhatsApp JPEGs to WebP, logo alpha derived from its own luminance',
      'Product photography never cropped — fixed 3:4 frames with object-contain throughout',
      'SEO built in: sitemap, robots, Organization JSON-LD, policy and about pages',
      '30 automated checks over checkout validation and pricing, plus Playwright screenshot runs at three viewports',
      'Shipped to assaqibscents.com — Cloudflare DNS to Vercel, www redirected to apex, Let\'s Encrypt TLS',
    ],
    tech: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS v4', 'Vercel', 'Playwright'],
    image: '/images/projects/as-saqib.jpg',
    color: '#d4af37',
    liveUrl: 'https://assaqibscents.com',
    githubUrl: null,
  },
  {
    id: 'agent-shah-3d',
    title: 'Agent Shah — 3D Portfolio Game',
    company: 'Personal · Vibe Jam 2026',
    category: 'web',
    year: '2026',
    featured: true,
    tagline: 'Three.js + Rapier 3D physics — a playable agent-themed portfolio',
    description:
      'A top-down 3D stealth shooter where the playable agent is me. Players move through neon-lit sectors, pick up briefings on each of my projects, and fight through enemies with pistols, machine guns, and even a pencil. Built from scratch on Three.js + Rapier physics — no React, no game engine.',
    problem:
      'A static scrollable portfolio is forgettable. I wanted recruiters and visitors to actually play through my work — turn passive reading into something they remember.',
    solution:
      'Built a fully physics-driven 3D shooter on the web. Each sector is a project briefing pad — interact with it to read about the project, then push north to the next sector. Multi-weapon gunplay, AI patrol with line-of-sight, stealth takedowns, and a sector-based HUD make it actually fun to navigate. Vite compiles it to a tiny bundle that runs at 60fps in any modern browser.',
    features: [
      '3D top-down shooter built from scratch in Three.js — no game engine',
      'Rapier 3D physics for character movement, bullet collision, and ragdolls',
      'Multi-weapon system — pistol, machine gun, pencil, hand-to-hand fight',
      'Sector-based level flow with south entry / north exit per round',
      'Briefing pads tie each in-game sector to a real project from my career',
      'AI enemy patrol with line-of-sight detection and stealth assassinations',
      'Neon-lit pathways, HDR ambient lighting, decrypting-dossier intro',
      'Agent identity HUD — name, sector, weapon, ammo, target counter',
    ],
    tech: ['Three.js', 'Rapier 3D', 'GSAP', 'Vite', 'WebGL'],
    image: '/images/projects/ashah.png',
    color: '#22d3ee',
    liveUrl: 'https://agentshah.shahfahad.dev',
    githubUrl: null,
  },
  {
    id: 'konnect',
    title: 'Konnect.im — Video Conferencing',
    company: 'Miletap',
    category: 'realtime',
    year: '2021',
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
    year: '2021',
    featured: true,
    tagline: 'Visual flow builder for designing and testing WhatsApp bots',
    description:
      'A drag-and-drop flow builder that lets teams design, preview and test WhatsApp chatbot conversations before deploying them to production customers.',
    problem:
      'E-OCEAN\'s support team was spending hours debugging chatbot flows in production. There was no safe environment to design and validate bot logic before it went live.',
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
    company: 'Miletap',
    category: 'mobile',
    year: '2020',
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
    company: 'Entertech Solutions',
    category: 'web',
    year: '2019',
    featured: false,
    tagline: 'Women\'s empowerment job portal for re-entering the workforce',
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
    company: 'Kistpay',
    category: 'web',
    year: '2022',
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
    company: 'Freelance client · Khadim-e-Insaniyat',
    category: 'mobile',
    year: '2024',
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
    company: 'Entertech Solutions',
    category: 'web',
    year: '2019',
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
    title: 'Screening — Digital Display Manager',
    company: 'Miletap',
    category: 'web',
    year: '2020',
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
    year: '2018',
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

// Shipped work first, newest first; the AI-assisted demos sit at the end.
// sort() is stable, so projects sharing a year keep the order they are written in.
export const projects: Project[] = [
  ...[...shippedWork].sort((a, b) => Number(b.year) - Number(a.year)),
  ...engineeringDemos,
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
    id: 'kistpay',
    role: 'React.js / Front-End Developer',
    company: 'Kistpay',
    period: 'Jan 2022 – Dec 2022',
    current: false,
    bullets: [
      'Built the complete admin portal for a Shariah-compliant BNPL fintech platform in React, Redux and Tailwind CSS',
      'Delivered installment management, role-based access control and real-time analytics dashboards',
      'Reworked data fetching and component memoization, cutting perceived load time on key dashboards',
    ],
    tech: ['React.js', 'Redux', 'Tailwind CSS'],
  },
  {
    id: 'miletap',
    role: 'React.js Developer',
    company: 'Miletap',
    period: 'Nov 2018 – Dec 2021',
    current: false,
    bullets: [
      'Developed Konnect.im — real-time video conferencing platform using WebRTC and SignalR, and architected the real-time messaging infrastructure',
      'Shipped Helpers (service booking) and Screening (digital signage) for Miletap',
      'Worked part-time for E-OCEAN and Entertech Solutions over the same period — the WhatsApp ChatBot Simulator, Reap Agro and Khawateen Rozgar came out of that',
    ],
    tech: ['React.js', 'WebRTC', 'SignalR'],
  },
  {
    id: 'career-start',
    role: 'Junior Developer',
    company: 'Career Start',
    period: '2016 – 2018',
    current: false,
    bullets: [
      'Started professional journey mastering modern JavaScript, React and web fundamentals',
      'Built the Leave Management System for Civil Hospital Karachi in PHP, MySQL, Bootstrap and jQuery',
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

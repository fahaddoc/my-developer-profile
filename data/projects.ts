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

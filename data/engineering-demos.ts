import type { Project } from './projects'

export const engineeringDemos: Project[] = [
  {
    "id": "dealdesk",
    "title": "DealDesk",
    "company": "Independent portfolio demo",
    "category": "web",
    "year": "2026",
    "featured": false,
    "tagline": "Customer and deal pipeline with exact monetary values.",
    "description": "A React interface backed by a validated Node API and SQLite, with amounts stored as integer cents. An independent, AI-assisted portfolio demo with synthetic data.",
    "problem": "Keep customer records, deal stages and amounts together in a small sales workspace.",
    "solution": "A React interface backed by a validated Node API and SQLite, with amounts stored as integer cents.",
    "features": [
      "Customer and deal creation",
      "Stage changes, search and filters",
      "Validated API and SQLite persistence"
    ],
    "tech": [
      "React",
      "TypeScript",
      "Node.js",
      "SQLite"
    ],
    "image": "/images/projects/dealdesk.svg",
    "color": "#36a882",
    "liveUrl": null,
    "githubUrl": "https://github.com/fahaddoc/dealdesk"
  },
  {
    "id": "speakloop",
    "title": "SpeakLoop",
    "company": "Independent portfolio demo",
    "category": "mobile",
    "year": "2026",
    "featured": false,
    "tagline": "A local Spanish speaking-practice notebook.",
    "description": "Flutter lessons pair optional recording and playback with honest self-ratings and locally saved practice history. An independent, AI-assisted portfolio demo with synthetic data.",
    "problem": "Make short speaking practice repeatable without pretending that a generated score measures pronunciation.",
    "solution": "Flutter lessons pair optional recording and playback with honest self-ratings and locally saved practice history.",
    "features": [
      "Three bilingual lessons",
      "Optional recording and playback",
      "Self-ratings and local practice history"
    ],
    "tech": [
      "Flutter",
      "Dart"
    ],
    "image": "/images/projects/speakloop.svg",
    "color": "#e96452",
    "liveUrl": null,
    "githubUrl": "https://github.com/fahaddoc/speakloop"
  },
  {
    "id": "voicetrace",
    "title": "VoiceTrace",
    "company": "Independent portfolio demo",
    "category": "realtime",
    "year": "2026",
    "featured": false,
    "tagline": "Inspect simulated voice events, timing and reconnect replay.",
    "description": "A deterministic event simulator feeds a reducer that orders events, buffers paused updates and deduplicates reconnect replay. An independent, AI-assisted portfolio demo with synthetic data.",
    "problem": "Understand how event ordering, buffering and duplicate delivery affect a diagnostic interface.",
    "solution": "A deterministic event simulator feeds a reducer that orders events, buffers paused updates and deduplicates reconnect replay.",
    "features": [
      "Session and transcript inspection",
      "Pause, reconnect and replay controls",
      "Metrics derived from synthetic events"
    ],
    "tech": [
      "React",
      "TypeScript"
    ],
    "image": "/images/projects/voicetrace.svg",
    "color": "#34d7d8",
    "liveUrl": null,
    "githubUrl": "https://github.com/fahaddoc/voicetrace"
  },
  {
    "id": "markettrail",
    "title": "MarketTrail",
    "company": "Independent portfolio demo",
    "category": "web",
    "year": "2026",
    "featured": false,
    "tagline": "Seller orders that remain usable when connectivity drops.",
    "description": "A durable local queue and cached order snapshot synchronize through an idempotent SQLite API; a service worker precaches the production shell. An independent, AI-assisted portfolio demo with synthetic data.",
    "problem": "Keep order notes and fulfilment changes available during interruptions without duplicating updates on retry.",
    "solution": "A durable local queue and cached order snapshot synchronize through an idempotent SQLite API; a service worker precaches the production shell.",
    "features": [
      "Offline notes and queued updates",
      "Idempotent synchronization and retry",
      "Production app-shell caching"
    ],
    "tech": [
      "React",
      "TypeScript",
      "Node.js",
      "SQLite",
      "Service Worker"
    ],
    "image": "/images/projects/markettrail.svg",
    "color": "#818cf8",
    "liveUrl": null,
    "githubUrl": "https://github.com/fahaddoc/markettrail"
  },
  {
    "id": "clientlane",
    "title": "ClientLane",
    "company": "Independent portfolio demo",
    "category": "web",
    "year": "2026",
    "featured": false,
    "tagline": "Project requests, comments and an auditable status history.",
    "description": "A React request portal uses a Node API and transactional SQLite records to persist comments and audit entries. An independent, AI-assisted portfolio demo with synthetic data.",
    "problem": "Keep the request itself, its discussion and status changes in one inspectable workspace.",
    "solution": "A React request portal uses a Node API and transactional SQLite records to persist comments and audit entries.",
    "features": [
      "Request creation and filtering",
      "Comments and status changes",
      "Transactional audit history"
    ],
    "tech": [
      "React",
      "TypeScript",
      "Node.js",
      "SQLite"
    ],
    "image": "/images/projects/clientlane.svg",
    "color": "#6097d2",
    "liveUrl": null,
    "githubUrl": "https://github.com/fahaddoc/clientlane"
  },
  {
    "id": "sprintdock",
    "title": "SprintDock",
    "company": "Independent portfolio demo",
    "category": "web",
    "year": "2026",
    "featured": false,
    "tagline": "A focused task board with persistent planning workflows.",
    "description": "A React board supports creating, editing and moving tasks through a validated Node and SQLite persistence layer. An independent, AI-assisted portfolio demo with synthetic data.",
    "problem": "Track priorities and next actions without losing edits when requests fail or overlap.",
    "solution": "A React board supports creating, editing and moving tasks through a validated Node and SQLite persistence layer.",
    "features": [
      "Task creation and editing",
      "Priority filters and workflow stages",
      "Pending-action guards and SQLite persistence"
    ],
    "tech": [
      "React",
      "TypeScript",
      "Node.js",
      "SQLite"
    ],
    "image": "/images/projects/sprintdock.svg",
    "color": "#f0b95c",
    "liveUrl": null,
    "githubUrl": "https://github.com/fahaddoc/sprintdock"
  }
]

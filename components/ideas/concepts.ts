// components/ideas/concepts.ts — the Work-section concepts shown under /ideas.
// Each one is a different take on the same job: present the shipped projects
// (data/projects.ts + engineering demos) and open the case-study drawer.

import { projects, type Project } from '@/data/projects'
import { engineeringDemos } from '@/data/engineering-demos'

export interface Concept { slug: string; title: string; blurb: string }

export const CONCEPTS: Concept[] = [
  { slug: 'current',   title: 'Lit screen',  blurb: 'Today’s version: the featured project on a lit screen, a project library beside it.' },
  { slug: 'orbit',     title: 'Orbit',       blurb: 'Projects ride a slow 3D ring around you. Drag, scroll or use the arrows to bring one to the front.' },
  { slug: 'deck',      title: 'Deck',        blurb: 'Projects fanned out like a hand of cards. Pick one and it flies to the centre and opens up.' },
  { slug: 'postcards', title: 'Postcards',   blurb: 'Every project is a postcard from an island, with a stamp and a postmark. Flip it for the story.' },
  { slug: 'reel',      title: 'Film reel',   blurb: 'A cinema strip of frames. The chosen frame is projected big, with a warm projector beam.' },
]

/** Shipped products first, then the engineering demos (projects already ends with them). */
export const IDEA_PROJECTS: Project[] = projects
export const SHIPPED_COUNT = projects.length - engineeringDemos.length

/** Open the global case-study drawer for a project (same event as the HUD). */
export function openCaseStudy(id: string) {
  window.dispatchEvent(new CustomEvent('project-drawer-open', { detail: id }))
}

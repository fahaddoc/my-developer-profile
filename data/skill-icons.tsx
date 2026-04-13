// data/skill-icons.tsx
// Maps skill names to react-icons + brand colors

import {
  SiReact, SiNextdotjs, SiTypescript, SiJavascript,
  SiTailwindcss, SiRedux, SiFlutter, SiDart,
  SiNodedotjs, SiPhp, SiMysql, SiPostgresql, SiMongodb,
  SiGit, SiGithub, SiVercel, SiFigma,
  SiDotnet, SiWebrtc,
} from 'react-icons/si'
import { TbBroadcast } from 'react-icons/tb'
import { VscVscode } from 'react-icons/vsc'

interface SkillIconEntry {
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>
  color: string
}

export const skillIconMap: Record<string, SkillIconEntry> = {
  'React.js':      { icon: SiReact,              color: '#61DAFB' },
  'Next.js':       { icon: SiNextdotjs,           color: '#E2E8F0' },
  'TypeScript':    { icon: SiTypescript,          color: '#3178C6' },
  'JavaScript':    { icon: SiJavascript,          color: '#F7DF1E' },
  'Tailwind CSS':  { icon: SiTailwindcss,         color: '#06B6D4' },
  'Redux':         { icon: SiRedux,               color: '#764ABC' },
  'Flutter':       { icon: SiFlutter,             color: '#54C5F8' },
  'Dart':          { icon: SiDart,                color: '#00B4AB' },
  'WebRTC':        { icon: SiWebrtc,              color: '#E2E8F0' },
  'SignalR':       { icon: SiDotnet,              color: '#512BD4' },
  'WebSocket':     { icon: TbBroadcast,           color: '#22D3EE' },
  'Node.js':       { icon: SiNodedotjs,           color: '#339933' },
  'PHP':           { icon: SiPhp,                 color: '#777BB4' },
  'MySQL':         { icon: SiMysql,               color: '#4479A1' },
  'PostgreSQL':    { icon: SiPostgresql,          color: '#4169E1' },
  'MongoDB':       { icon: SiMongodb,             color: '#47A248' },
  'Git':           { icon: SiGit,                 color: '#F05032' },
  'GitHub':        { icon: SiGithub,              color: '#E2E8F0' },
  'Vercel':        { icon: SiVercel,              color: '#E2E8F0' },
  'Figma':         { icon: SiFigma,               color: '#F24E1E' },
  'VS Code':       { icon: VscVscode,             color: '#007ACC' },
}

export function getSkillIcon(label: string): SkillIconEntry | null {
  return skillIconMap[label] ?? null
}

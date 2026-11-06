'use client'

import Link from 'next/link'
import { IdeasShell } from './IdeasShell'
import { CONCEPTS } from './concepts'

export function IdeasIndex() {
  return (
    <IdeasShell title="Work section concepts" back={false}>
      <section className="ix">
        <h1 className="t-title ix-title">Five ways to show the work.</h1>
        <p className="t-lead ix-lead">Same projects, same case-study drawer, different stage. Open each, try it in dark and light, then pick one.</p>
        <ol className="ix-list">
          {CONCEPTS.map((c, i) => (
            <li key={c.slug}>
              <Link href={`/ideas/${c.slug}`} className="ix-item">
                <span className="t-data ix-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ix-body">
                  <span className="t-subtitle ix-name">{c.title}{c.slug === 'current' && <span className="t-label ix-tag">live now</span>}</span>
                  <span className="t-lead ix-blurb">{c.blurb}</span>
                </span>
                <span className="ix-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <style>{`
        .ix { max-width: 860px; margin: 6vh auto 0; }
        .ix-title { font-size: clamp(36px, 5vw, 64px); margin: 0 0 16px; }
        .ix-lead { max-width: 56ch; margin: 0 0 40px; font-size: 18px; }
        .ix-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid rgb(var(--line)); }
        .ix-item {
          display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 20px;
          padding: 22px 8px; border-bottom: 1px solid rgb(var(--line));
          background: rgb(var(--space-0) / 0.35);
          transition: background-color var(--dur-1) var(--ease-out);
        }
        .ix-num { color: rgb(var(--ink-3)); }
        .ix-body { display: grid; gap: 6px; }
        .ix-name { font-size: 22px; display: flex; align-items: center; gap: 12px; }
        .ix-tag { color: rgb(var(--accent-text)); }
        .ix-blurb { font-size: 15px; margin: 0; }
        .ix-arrow { color: rgb(var(--ink-3)); font-size: 20px; transition: transform var(--dur-2) var(--ease-out), color var(--dur-1) var(--ease-out); }
        @media (hover: hover) and (pointer: fine) {
          .ix-item:hover { background: rgb(var(--surface) / 0.7); }
          .ix-item:hover .ix-arrow { transform: translateX(4px); color: rgb(var(--accent-text)); }
        }
        :root[data-theme='light'] .ix-item { background: rgb(var(--surface) / 0.55); }
      `}</style>
    </IdeasShell>
  )
}

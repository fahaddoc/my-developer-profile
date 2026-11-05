'use client'

// components/featured/FeaturedAchievement.tsx
// The rotating pull-request card in the Open source station of the classic /
// mobile experience (MobileSpace renders the station title and the merged
// count above it). Reads every contribution from data/open-source.ts, newest
// first, and steps through them with previous / next. No autoplay.
//
// Actions match the desktop HUD: "View pull request" (primary) then "Read case
// study" (ghost). At >=1024px MobileSpace puts this card in the right column.
//
// Colour rules (DESIGN.md §2): ember only through the shared .btn--primary and
// link hover; --flutter-accent is the Flutter logo only; --status-merged is the
// "Merged" pill only. Everything else is ink on a solid surface.

import { useState } from 'react'
import Link from 'next/link'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import { contributions, type Contribution } from '@/data/open-source'
import { FlutterLogo, MergedGlyph } from '@/components/featured/BrandLogos'

const STATUS_LABEL: Record<Contribution['status'], string> = {
  merged: 'Merged',
  'in-review': 'In review',
  open: 'Open',
}

export function FeaturedAchievement() {
  const [index, setIndex] = useState(0)
  const n = contributions.length
  if (n === 0) return null
  const step = (d: number) => setIndex((v) => (v + d + n) % n)

  return (
    <div className="fa">
      {/* Every card sits in the same grid cell, so the block keeps the height
          of the tallest one and the controls never jump. */}
      <div className="fa-stack" aria-live="polite">
        {contributions.map((c, i) => (
          <article
            key={c.id}
            className={`fa-card${i === index ? ' is-active' : ''}`}
            aria-hidden={i !== index}
            aria-labelledby={`fa-title-${c.id}`}
          >
            <header className="fa-head">
              {c.org === 'Flutter' ? (
                <FlutterLogo size={20} title="Flutter" className="fa-logo" />
              ) : (
                <span className="fa-org">{c.org}</span>
              )}
              <span className="t-data fa-repo">{c.repo}</span>
              <span className={`fa-pill${c.status === 'merged' ? ' fa-pill--merged' : ''}`}>
                {c.status === 'merged' && <MergedGlyph size={12} />}
                {STATUS_LABEL[c.status]}
              </span>
            </header>

            <h3 id={`fa-title-${c.id}`} className="t-subtitle fa-title">{c.prTitle}</h3>
            <p className="t-data fa-meta">
              <span>#{c.prNumber}</span>
              <span className="fa-dot" aria-hidden="true">·</span>
              <time dateTime={c.mergedOn ?? c.openedOn}>{c.displayDate}</time>
            </p>
            <p className="fa-summary">{c.summary}</p>
            <p className="t-data fa-diff">
              {c.filesChanged} files<span className="fa-dot" aria-hidden="true">·</span>+{c.additions}
              <span className="fa-dot" aria-hidden="true">·</span>&minus;{c.deletions}
            </p>

            {/* Same order and labels as the desktop HUD: the merged PR on
                GitHub is the verifiable proof, so it is the primary action. */}
            <div className="fa-actions">
              <a
                href={c.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary btn--sm"
                aria-label={`View pull request #${c.prNumber} on GitHub`}
                tabIndex={i === index ? undefined : -1}
              >
                View pull request <span className="btn-arrow" aria-hidden="true">↗</span>
              </a>
              <Link
                href={`/achievements/${c.id}`}
                className="btn btn--ghost btn--sm"
                tabIndex={i === index ? undefined : -1}
              >
                Read case study <span className="btn-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="fa-nav">
        {n > 1 && (
          <>
            <button type="button" className="btn btn--ghost fa-icon" aria-label="Previous pull request" onClick={() => step(-1)}>
              <FaChevronLeft aria-hidden />
            </button>
            <span className="t-data fa-count" aria-hidden="true">
              {index + 1} / {n}
            </span>
            <button type="button" className="btn btn--ghost fa-icon" aria-label="Next pull request" onClick={() => step(1)}>
              <FaChevronRight aria-hidden />
            </button>
          </>
        )}
        <Link href="/open-source" className="link-quiet fa-all">
          All open-source work
        </Link>
      </div>

      <style jsx>{`
        .fa { margin-top: 28px; }
        /* minmax(0, 1fr): the line-clamped summary (legacy -webkit-box) would
           otherwise report its max-content width and push the card off-screen. */
        .fa-stack { display: grid; grid-template-columns: minmax(0, 1fr); }
        .fa-card {
          grid-area: 1 / 1;
          min-width: 0;
          padding: 18px 18px 20px;
          border-radius: 18px;
          border: 1px solid rgb(var(--line));
          background: rgb(var(--surface) / 0.88);
          box-shadow: 0 28px 60px -34px rgb(var(--space-0) / 0.9);
          opacity: 0;
          visibility: hidden;
          transition: opacity var(--dur-2) var(--ease-out), visibility 0s linear var(--dur-2);
        }
        .fa-card.is-active {
          opacity: 1;
          visibility: visible;
          transition: opacity var(--dur-2) var(--ease-out);
        }
        :global(:root[data-theme='light']) .fa-card {
          box-shadow: 0 24px 48px -30px rgb(var(--ink) / 0.28);
        }

        .fa-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .fa-head :global(.fa-logo) { flex: none; color: rgb(var(--flutter-accent)); }
        .fa-org { font-size: 14px; font-weight: 600; color: rgb(var(--ink)); }
        .fa-repo {
          min-width: 0;
          color: rgb(var(--ink-2));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fa-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex: none;
          margin-left: auto;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
          color: rgb(var(--ink-2));
          border: 1px solid rgb(var(--line));
        }
        .fa-pill--merged {
          color: rgb(var(--status-merged));
          background: rgb(var(--status-merged) / 0.1);
          border-color: rgb(var(--status-merged) / 0.38);
        }

        .fa-title { margin-top: 16px; font-size: 19px; color: rgb(var(--ink)); }
        .fa-meta { margin-top: 8px; color: rgb(var(--ink-3)); }
        .fa-meta time { white-space: nowrap; }
        .fa-dot { margin: 0 0.5em; color: rgb(var(--ink-3)); }
        .fa-summary {
          margin-top: 12px;
          font-size: 15px;
          line-height: 1.6;
          color: rgb(var(--ink-2));
          text-wrap: pretty;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .fa-diff { margin-top: 12px; color: rgb(var(--ink-3)); }
        .fa-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
        @media (min-width: 640px) {
          .fa-card { padding: 24px 24px 26px; }
          .fa-title { font-size: 22px; }
        }

        .fa-nav { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
        .fa-nav :global(.fa-icon) { --btn-h: 44px; width: 44px; padding: 0; flex: none; }
        .fa-nav :global(.fa-icon svg) { width: 15px; height: 15px; }
        .fa-count { min-width: 3.5em; text-align: center; color: rgb(var(--ink-2)); }
        .fa-nav :global(.fa-all) {
          margin-left: auto;
          padding: 12px 0;
          font-size: 14px;
          font-weight: 500;
        }

        @media (prefers-reduced-motion: reduce) {
          .fa-card,
          .fa-card.is-active { transition: none; }
        }
      `}</style>
    </div>
  )
}

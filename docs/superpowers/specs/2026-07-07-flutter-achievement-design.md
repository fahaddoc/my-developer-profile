# Featured Achievement + Open Source — Design Spec

**Date:** 2026-07-07 · **Branch:** `feat/flutter-achievement` (off `main`)

## Goal
Add a permanent, premium "Featured Achievement" asset highlighting Shah Fahad's first
merged contribution to the Flutter framework — on the home surface, a dedicated case-study
page, a scalable Open Source hub, complete technical SEO, and social share images.

## Ground truth (verified via `gh`, not memory)
- PR **flutter/flutter#187294** — *"Explain asynchronous causes in the setState() called
  after dispose() error"* — **MERGED 2026-07-07** (commit `8580e15`), fixes issue #177615.
- 2 files, **+34 / −1**: expanded the `ErrorDescription` in `State.setState()`'s
  "called after dispose" assertion (`packages/flutter/lib/src/widgets/framework.dart`) to
  name async gaps as a cause, plus a new widget test in `framework_test.dart`.
- Approved by two Flutter team reviewers; merged by the project's auto-submit bot.
- **Every claim on the site is limited to the above. No exaggeration.**

## Architecture facts that shape the design
- Home is a **dual WebGL experience**: desktop `TunnelScene`+`TunnelHUD` OR `MobileSpace`
  (mobile/touch/low-end), plus a **sr-only `SeoContent`** crawlable HTML twin.
- `components/sections/*` (About/Projects/…) are **orphaned** (not rendered). Internal
  links target the *active* surfaces + `SeoContent`, not those files.
- Navbar/Footer are **not mounted** on home; "Open Source" nav is wired into the active
  chrome (mobile `StationRail`, desktop HUD nav via the `STATIONS` array).
- Sub-pages (`/projects/[slug]`) are **server components** with full `generateMetadata` +
  JSON-LD — the template mirrored for the new pages.
- Dynamic OG via `next/og` `ImageResponse` (`lib/seo/og.tsx`) — no binary assets.

## Deliverables (files)
1. `data/open-source.ts` — single source of truth: `Contribution[]` + `openSourceStats()`.
   Future contributions auto-propagate to every surface.
2. `components/featured/BrandLogos.tsx` — `FlutterLogo`, `GitHubLogo`, `MergedBadge`.
3. `components/featured/FeaturedAchievement.tsx` — shared home card (token-styled, a11y).
4. `app/achievements/[slug]/page.tsx` (+ `opengraph-image.tsx`, `twitter-image.tsx`) —
   dynamic case study: Story · Problem · What I changed · Review · Merge · Why it matters ·
   Lessons. Server component. TechArticle + Breadcrumb JSON-LD.
5. `app/open-source/page.tsx` (+ `opengraph-image.tsx`) — hub: intro, stats, timeline,
   GitHub links. CollectionPage JSON-LD. Scales to N contributions.
6. `lib/seo/jsonld.ts` — `+techArticleSchema`, `+openSourceCollectionSchema`.
7. `lib/seo/og.tsx` — `+renderAchievementOg`, `+renderOpenSourceOg` (Flutter+GitHub+name+
   "Official Flutter Contributor"+Merged).
8. `app/sitemap.ts` — `/open-source` + iterated `/achievements/*`.
9. `data/nav-links.ts` — `+ Open Source`.
10. `components/seo/SeoContent.tsx` — crawlable Open Source block w/ real internal links.
11. `components/mobile/MobileSpace.tsx` — new Featured Achievement station between Work & Exp.
12. `components/r3f/TunnelScene.tsx` + `TunnelHUD.tsx` — new `opensource` station at t≈0.63.

## Non-goals / honest limits
- Existing WebGL home mobile perf (~91) is out of scope; new **static pages** are built to
  LH 100 A11y/SEO and 95+ Perf, verified by build + Lighthouse where feasible.
- No push to `main` — branch, build, test, then hand back for review.

## Keywords (woven naturally, no stuffing)
Flutter contributor · Flutter open source contributor · Flutter framework contribution ·
Flutter GitHub PR · Flutter developer Pakistan · Flutter open source · Software Engineer
Pakistan · React and Flutter developer · Full Stack Engineer Pakistan.

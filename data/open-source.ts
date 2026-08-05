// data/open-source.ts
// Single source of truth for open-source contributions. Every surface that shows
// the Flutter achievement — the home Featured Achievement card, /open-source hub,
// /achievements/[slug] case study, the sitemap, JSON-LD, and the OG images — reads
// from this array. Adding a new object here makes a future contribution appear on
// every one of those surfaces automatically (scalable by design).
//
// ACCURACY RULE: every field below is limited to what is verifiably true of the
// merged PR. No embellishment. Verified via `gh pr view <number> --repo flutter/flutter`.
//
// ORDER: newest merge first. `contributions[0]` is what the home Featured
// Achievement card and the tunnel HUD show, so the latest merged PR leads.

export type ContributionStatus = 'merged' | 'in-review' | 'open'

export interface Contribution {
  /** URL slug → /achievements/[slug] and the OG route. */
  id: string
  /** Portfolio-facing title. */
  title: string
  /** Short role label used on chips / hub. */
  role: string
  org: string
  /** Human project name, e.g. "Flutter framework". */
  project: string
  /** owner/name, e.g. "flutter/flutter". */
  repo: string
  repoUrl: string
  status: ContributionStatus

  prNumber: number
  prTitle: string
  prUrl: string
  issueNumber?: number
  issueUrl?: string
  mergeCommit?: string
  mergeCommitUrl?: string

  /** ISO dates for <time> + JSON-LD. */
  openedOn: string
  mergedOn?: string
  /** Pre-formatted display date, e.g. "July 7, 2026". */
  displayDate: string

  filesChanged: number
  additions: number
  deletions: number

  language: string
  tech: string[]
  /** Short file/area labels touched by the PR. */
  area: string[]

  /** One sentence used on cards + OG + meta description. */
  summary: string
  /** Short, accurate highlight bullets (home card + hub + OG alt). */
  bullets: string[]

  caseStudy: {
    story: string
    problem: string
    /** "What I changed" — accurate bullet list. */
    changed: string[]
    /**
     * Real diff, shown verbatim on the case-study page. Omit `codeBefore` for an
     * addition-only PR — rendering unchanged context under a red "−" would read
     * as a removal and contradict the +N/−0 stat.
     */
    codeBefore?: string
    codeAfter: string
    review: string
    merge: string
    whyItMatters: string
    lessons: string[]
  }

  /** Page-level SEO keywords (used naturally, not stuffed). */
  keywords: string[]
}

export const contributions: Contribution[] = [
  {
    id: 'flutter-didchangedependencies-docs',
    title: 'Documented a Flutter lifecycle convention',
    role: 'Open-source contribution',
    org: 'Flutter',
    project: 'Flutter framework',
    repo: 'flutter/flutter',
    repoUrl: 'https://github.com/flutter/flutter',
    status: 'merged',

    prNumber: 185945,
    prTitle: 'Document super call order for State.didChangeDependencies',
    prUrl: 'https://github.com/flutter/flutter/pull/185945',
    issueNumber: 28925,
    issueUrl: 'https://github.com/flutter/flutter/issues/28925',
    mergeCommit: '8ef2fe4',
    mergeCommitUrl: 'https://github.com/flutter/flutter/commit/8ef2fe42554dbd8fb60098208c4ac5925f117a3a',

    openedOn: '2026-05-03',
    mergedOn: '2026-08-05',
    displayDate: 'August 5, 2026',

    filesChanged: 1,
    additions: 3,
    deletions: 0,

    language: 'Dart',
    tech: ['Flutter', 'Dart'],
    area: ['packages/flutter/lib/src/widgets/framework.dart'],

    summary:
      'Documented where overrides of State.didChangeDependencies should place their super call, closing a Flutter documentation issue that had been open since 2019.',
    bullets: [
      'Documented the super call order for State.didChangeDependencies in the Flutter framework',
      'Closed flutter/flutter issue #28925, open since March 2019',
      'Mirrored the wording already used on the sibling lifecycle hook State.initState, so the two read consistently',
      'Merged into the official flutter/flutter repository',
    ],

    caseStudy: {
      story:
        'State.didChangeDependencies is marked @mustCallSuper, but its doc comment never said where the super call belongs — first line or last. Its sibling hook, State.initState, has documented that convention for years. Someone had filed an issue about the inconsistency in 2019 and it was still open, so I sent a small documentation PR to close it.',
      problem:
        'A method annotated with @mustCallSuper tells you that you have to call the inherited implementation, but not when. For didChangeDependencies that ordering is not obvious from the signature, and the dartdoc said nothing about it, so anyone overriding it for the first time had to guess or go read the framework source. initState already documented the same convention, which made the pair of lifecycle hooks read inconsistently.',
      changed: [
        'Added a note to the dartdoc for State.didChangeDependencies (packages/flutter/lib/src/widgets/framework.dart) telling implementations to start with a call to the inherited method.',
        'Mirrored the wording already used on State.initState so both lifecycle hooks document the convention the same way.',
        'Wrote the super reference as a code span without parentheses after review, which is what keeps dartdoc from emitting an unresolved-reference warning.',
        'Net change: 1 file, +3 / −0. Documentation only — no behaviour change, no API change, no new public surface.',
      ],
      // Addition-only PR (+3 / −0): no `codeBefore`, the three added dartdoc lines
      // are the entire diff.
      codeAfter:
        '///\n/// Implementations of this method should start with a call to the inherited\n/// method, as in `super.didChangeDependencies`.',
      review:
        'This one took three months. Two Flutter reviewers looked at it, and the discussion was not really about the sentence — it was about whether the super call should be documented as going first at all, and then about how to format the reference so dartdoc resolves it. I rewrote the wording, rebased the branch onto master to clear a stale CI failure and a pile of merge commits, and fixed the dartdoc warning. It was approved on August 3 and again on August 4.',
      merge:
        'The PR was squash-merged into flutter/flutter on August 5, 2026 (merge commit 8ef2fe4), which closed issue #28925 after it had been open since March 2019.',
      whyItMatters:
        'Lifecycle ordering bugs are quiet ones — nothing crashes, the inherited work just happens in the wrong order. The convention is now written where people actually look for it: the API docs for the method itself, on the same terms as initState. Three lines, but they answer a question the framework had been leaving to guesswork for seven years.',
      lessons: [
        'A stale issue is not a dead issue. #28925 sat open since 2019 because nobody had sent the patch, not because the fix was hard.',
        'On a large repo, most of the work after "the change is right" is process: rebasing off a stale master, clearing CI, keeping the history readable for reviewers.',
        'Review feedback on a three-line PR can still be substantive. The reviewers questioned the rule itself, not just the wording, and answering that honestly was what moved it forward.',
      ],
    },

    keywords: [
      'Flutter contributor',
      'Flutter open source contributor',
      'Flutter framework contribution',
      'Flutter GitHub PR',
      'didChangeDependencies',
      'Flutter State lifecycle',
      'mustCallSuper',
      'Shah Fahad Flutter',
      'Flutter developer Pakistan',
    ],
  },
  {
    id: 'flutter-framework-contributor',
    title: 'Improved a Flutter diagnostic message',
    role: 'Open-source contribution',
    org: 'Flutter',
    project: 'Flutter framework',
    repo: 'flutter/flutter',
    repoUrl: 'https://github.com/flutter/flutter',
    status: 'merged',

    prNumber: 187294,
    prTitle: 'Explain asynchronous causes in the setState() called after dispose() error',
    prUrl: 'https://github.com/flutter/flutter/pull/187294',
    issueNumber: 177615,
    issueUrl: 'https://github.com/flutter/flutter/issues/177615',
    mergeCommit: '8580e15',
    mergeCommitUrl: 'https://github.com/flutter/flutter/commit/8580e15ba560f9dcda1be127ab821a67f9826e6e',

    openedOn: '2026-05-29',
    mergedOn: '2026-07-07',
    displayDate: 'July 7, 2026',

    filesChanged: 2,
    additions: 34,
    deletions: 1,

    language: 'Dart',
    tech: ['Flutter', 'Dart'],
    area: [
      'packages/flutter/lib/src/widgets/framework.dart',
      'packages/flutter/test/widgets/framework_test.dart',
    ],

    summary:
      'Improved the "setState() called after dispose()" diagnostic message in Flutter to explain a common asynchronous cause, added a framework test, and merged it into flutter/flutter.',
    bullets: [
      'Improved the "setState() called after dispose()" diagnostic message in Flutter',
      'Explained a common asynchronous cause in that message — an awaited request or Future resolving after the widget is gone — alongside the existing timer and animation-callback causes',
      'Added a framework test covering the new message',
      'Merged into the official flutter/flutter repository',
    ],

    caseStudy: {
      story:
        'I build with Flutter, and "setState() called after dispose()" is an assertion nearly every Flutter developer runs into eventually. The framework already explained two ways to trigger it — a timer or an animation callback — but not the way I saw it happen most often in real apps: an async gap. I opened a small PR to the Flutter framework to close that gap in the error message itself.',
      problem:
        'The assertion in State.setState() said the error "can occur when code calls setState() from a timer or an animation callback." In practice the most common trigger is different: you await a network request or a Future inside a State, the user navigates away so the widget is disposed, then the await resolves and its callback calls setState() on a State that no longer has a place in the tree. Because the message never mentioned asynchronous gaps, developers hitting it through async code often did not recognise their own bug.',
      changed: [
        'Expanded the ErrorDescription in State.setState()’s "called after dispose" assertion (packages/flutter/lib/src/widgets/framework.dart) to add asynchronous operations — an awaited network request or other Future completing after the widget has been removed from the tree — alongside the existing timer and animation-callback causes.',
        'Added a widget test (packages/flutter/test/widgets/framework_test.dart) that removes a StatefulBuilder from the tree, calls setState() on the now-defunct State, and asserts the thrown FlutterError message explains the asynchronous cause.',
        'Net change: 2 files, +34 / −1.',
      ],
      codeBefore:
        "'This error can occur when code calls '\n'setState() from a timer or an animation callback.',",
      codeAfter:
        "'This error can occur when code calls '\n'setState() from a timer, from an animation callback, or after an '\n'asynchronous operation (such as an awaited network request or other '\n'Future) completes after the widget has been removed from the tree.',",
      review:
        'I opened the pull request against Flutter’s master branch and signed the contributor licence agreement. Two members of the Flutter team reviewed it; I addressed their feedback over a couple of iterations, and once it was approved and the required CI checks passed, it was merged.',
      merge:
        'Once the approvals and required checks were in place, the PR was merged into flutter/flutter on July 7, 2026 by the project’s auto-submit bot (merge commit 8580e15).',
      whyItMatters:
        'framework.dart ships with Flutter, so the message reaches anyone who hits this error. The next time someone triggers "setState() called after dispose()" from an async callback, the text now points at the likely cause instead of leaving them guessing. It is a small change to a diagnostic message that Flutter developers read when something breaks.',
      lessons: [
        'A clearer error message is a real, mergeable contribution — you do not have to touch the engine to help the next person who hits the same assertion.',
        'Match a repository’s conventions exactly: sign the CLA, use the real PR template, and add a test even for a message-only change.',
        'Respond to review feedback quickly and precisely — small, well-aimed revisions are what keep a PR moving toward merge.',
      ],
    },

    keywords: [
      'Flutter contributor',
      'Flutter open source contributor',
      'Flutter framework contribution',
      'Flutter GitHub PR',
      'Flutter open source',
      'Flutter framework GitHub',
      'setState called after dispose',
      'Shah Fahad Flutter',
      'Flutter developer Pakistan',
    ],
  },
]

// ── derived helpers ───────────────────────────────────────────────────────────

export function getContribution(slug: string): Contribution | undefined {
  return contributions.find((c) => c.id === slug)
}

export interface OpenSourceStats {
  merged: number
  total: number
  repos: number
  additions: number
  deletions: number
}

export function openSourceStats(): OpenSourceStats {
  const repos = new Set(contributions.map((c) => c.repo))
  return {
    merged: contributions.filter((c) => c.status === 'merged').length,
    total: contributions.length,
    repos: repos.size,
    additions: contributions.reduce((s, c) => s + c.additions, 0),
    deletions: contributions.reduce((s, c) => s + c.deletions, 0),
  }
}

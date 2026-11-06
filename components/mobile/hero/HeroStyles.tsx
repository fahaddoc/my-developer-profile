'use client'

// The hero's styles: MobileSpace's first station (components/mobile/hero/Hero)
// and its server-rendered stand-in (<HeroShell/>, app/page.tsx). One block for
// both, so the two always lay out the same. Rendered by every <Hero/>; styled-jsx
// keeps one copy and the server render ships it in the HTML (app/registry.tsx).
//
// Order matters inside this block: the stand-in's frame comes first, the hero's
// own rules after it. The hero's section rules use `.ms-st.ms-st--hero`, one
// class more than MobileSpace's `.ms-st`, so they win wherever styled-jsx puts
// MobileSpace's block.

export function HeroStyles() {
  return (
    <style jsx global>{`
      /* ── the server-rendered stand-in (app/page.tsx) ───────────────────── */
      /* Only on the screens AppShell sends to MobileSpace: not (min-width:
         1024px and hover: hover), or reduced motion. Keep in sync with
         MOBILE_EXPERIENCE_MEDIA (components/mobile/hero/media.ts). Desktop
         never lays it out. It sits where MobileSpace's scroller will be (the
         same layer, over AppShell's boot frame) at scroll 0. */
      .ms-hero-shell { display: none; }
      @media not all and (min-width: 1024px) and (hover: hover), (prefers-reduced-motion: reduce) {
        .ms-hero-shell {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 100svh;
          z-index: var(--z-content);
          overflow: hidden;
          overflow: clip;
          pointer-events: none;
        }
      }
      .ms-hero-shell[hidden] { display: none !important; }
      /* MobileSpace's .ms-st / .ms-inner frame, for the stand-in only (the
         live hero gets them from MobileSpace). Keep the two in sync; in
         development the handoff warns if the two heroes ever lay out apart. */
      .ms-hero-shell .ms-st {
        --pad-t: 92px;
        --pad-b: 76px;
        --pad-l: max(20px, env(safe-area-inset-left));
        --pad-r: max(20px, env(safe-area-inset-right));
        position: relative;
        min-height: 100svh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: var(--pad-t) var(--pad-r) var(--pad-b) var(--pad-l);
        color: rgb(var(--ink));
      }
      .ms-hero-shell .ms-inner { position: relative; z-index: 1; width: 100%; max-width: 560px; }
      @media (min-width: 640px) {
        .ms-hero-shell .ms-st {
          --pad-t: 104px;
          --pad-b: 88px;
          --pad-l: max(40px, env(safe-area-inset-left));
          --pad-r: max(40px, env(safe-area-inset-right));
        }
        .ms-hero-shell .ms-inner { max-width: 880px; margin-inline: auto; }
      }
      @media (min-width: 1024px) {
        .ms-hero-shell .ms-st { --pad-t: 112px; --pad-b: 96px; }
        .ms-hero-shell .ms-inner { max-width: 1120px; }
      }

      /* The live hero waits, invisible, until it can take over from the
         stand-in in one frame (handoff.ts). A box-less wrapper: the hero's
         parts lay out as children of .ms-inner. */
      .ms-hero { display: contents; }
      .ms-hero[data-hero-hold] { visibility: hidden; }

      /* ── 0 · intro ───────────────────────────────────────────────────── */
      .ms-st.ms-st--hero {
        --top: 60px;
        --scene-h: clamp(180px, calc(100svh - 400px), 380px);
        --horizon: calc(var(--top) + var(--scene-h));
        --photo-h: calc(var(--scene-h) * 1.1);
        --photo-w: calc(var(--photo-h) * 0.7534);
        --sink: 0.16; /* share of the photo hidden behind the horizon */
        --apex: 60%;
        /* Planet diameter. Wide enough that the rim drops less than
           --copy-gap across the copy's left edge, so it never crosses it. */
        --orb: max(300vw, 1000px);
        --copy-gap: 36px;
        /* The ledge in front of the photo (SeaIslands .isle-front): 1.6x the
           photo, but never wider than the room on either side of the apex,
           so neither end runs off a narrow phone. Still wider than the
           person standing on it. */
        --isle-w: min(calc(var(--photo-w) * 1.6), calc((100% - var(--apex)) * 2 - 20px), calc(var(--apex) * 2 - 20px));
        justify-content: flex-start;
        padding-top: var(--top);
        overflow: hidden;
        overflow: clip;
      }
      .ms-hero-scene {
        position: relative;
        height: var(--scene-h);
        margin-left: calc(-1 * var(--pad-l));
        margin-right: calc(-1 * var(--pad-r));
      }
      .ms-sunrise {
        position: absolute;
        left: var(--apex);
        bottom: -40px;
        width: min(150%, 760px);
        height: 120%;
        transform: translateX(-50%);
        pointer-events: none;
        background:
          radial-gradient(42% 46% at 50% 100%, rgb(var(--accent) / 0.34), rgb(var(--accent) / 0.1) 48%, transparent 74%);
      }
      .ms-intro {
        position: absolute;
        left: calc(var(--apex) - var(--photo-w) / 2);
        bottom: calc(var(--photo-h) * var(--sink) * -1);
        width: var(--photo-w);
        height: var(--photo-h);
      }
      .ms-intro-card {
        position: absolute;
        inset: 0;
        display: block;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
        perspective: 900px;
        -webkit-tap-highlight-color: transparent;
      }
      .ms-intro-card:focus-visible { outline-offset: 6px; border-radius: 14px; }
      .ms-intro-inner {
        position: absolute;
        inset: 0;
        display: block;
        transform-style: preserve-3d;
        transition: transform 560ms var(--ease-in-out);
      }
      .ms-intro[data-flipped='true'] .ms-intro-inner { transform: rotateY(180deg); }
      .ms-intro-face {
        position: absolute;
        inset: 0;
        display: block;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .ms-intro-back { transform: rotateY(180deg); }
      .ms-intro-media {
        filter: drop-shadow(0 0 1px rgb(var(--accent) / 0.5)) drop-shadow(-4px -3px 14px rgb(var(--accent) / 0.22));
      }
      .ms-intro-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: bottom;
      }
      .ms-intro-ctl {
        position: absolute;
        left: -18px;
        bottom: calc(var(--photo-h) * var(--sink) + 18px);
        z-index: 4;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 14px 0 12px;
        border-radius: 999px;
        border: 1px solid rgb(var(--ink) / 0.22);
        background: rgb(var(--space-0) / 0.74);
        color: rgb(var(--ink));
        font-family: var(--font-body), system-ui, sans-serif;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        cursor: pointer;
        transition:
          border-color var(--dur-1) var(--ease-out),
          background-color var(--dur-1) var(--ease-out),
          transform var(--dur-1) var(--ease-out);
      }
      .ms-intro-ctl::before { content: ''; position: absolute; inset: -5px -2px; }
      .ms-intro-ctl svg { width: 11px; height: 11px; flex: none; }
      .ms-intro-ctl--sound svg { width: 14px; height: 14px; }
      .ms-intro-card:active .ms-intro-ctl,
      .ms-intro-ctl:active { transform: scale(0.97); transition-duration: 80ms; }
      @media (hover: hover) and (pointer: fine) {
        .ms-intro-card:hover .ms-intro-ctl,
        .ms-intro-ctl:hover { border-color: rgb(var(--ink) / 0.42); }
      }
      .ms-intro-ctl:focus-visible { outline-offset: 3px; border-radius: 999px; }
      /* Reduced motion: no 3D turn, the two faces crossfade instead. */
      @media (prefers-reduced-motion: reduce) {
        .ms-intro-inner { transition: none; transform: none !important; }
        .ms-intro-face { transition: opacity var(--dur-2) linear; }
        .ms-intro-back { transform: none; opacity: 0; }
        .ms-intro[data-flipped='true'] .ms-intro-back { opacity: 1; }
        .ms-intro[data-flipped='true'] .ms-intro-front { opacity: 0; }
      }

      .ms-planet {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(var(--horizon) - 160px);
        bottom: 0;
        z-index: 2;
        overflow: hidden;
        pointer-events: none;
        -webkit-mask-image: linear-gradient(#000 calc(100% - 140px), transparent);
        mask-image: linear-gradient(#000 calc(100% - 140px), transparent);
      }
      .ms-planet-orb {
        position: absolute;
        top: 160px;
        left: var(--apex);
        width: var(--orb);
        aspect-ratio: 1;
        border-radius: 50%;
        transform: translateX(-50%);
        background: linear-gradient(180deg, rgb(var(--surface-2)) 0px, rgb(var(--space-1)) 70px, rgb(var(--space-0)) 240px);
        box-shadow:
          inset 0 1.5px 0 rgb(var(--accent) / 0.9),
          inset 0 16px 26px -16px rgb(var(--accent) / 0.55),
          0 -1px 10px rgb(var(--accent) / 0.35),
          0 -22px 70px -8px rgb(var(--accent) / 0.2);
      }
      /* The scene, planet and copy position against the section itself. */
      .ms-st--hero .ms-inner { position: static; max-width: none; }
      .ms-hero-copy { position: relative; z-index: 3; margin-top: var(--copy-gap); max-width: 560px; }
      /* Daylight: the name starts below the ledge's waterline instead of
         over it (ledge height = width x 100/464, waterline at 87% of that,
         its top sits photo-h x 0.0208 above the horizon). */
      :root[data-theme='light'] .ms-hero-copy {
        margin-top: max(var(--copy-gap), calc(var(--isle-w) * 0.1875 - var(--photo-h) * 0.0208 + 12px));
      }
      .ms-hero-name {
        font-size: clamp(44px, 13.5vw, 64px);
        color: rgb(var(--ink));
      }
      .ms-hero-lead { font-size: 16px; margin-top: 14px; max-width: 36ch; }
      .ms-ctas { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }

      :root[data-theme='light'] .ms-intro-media {
        filter: drop-shadow(0 14px 20px rgb(var(--ink) / 0.16)) drop-shadow(-2px -2px 10px rgb(var(--accent) / 0.16));
      }
      :root[data-theme='light'] .ms-sunrise {
        background: radial-gradient(42% 46% at 50% 100%, rgb(var(--accent) / 0.2), rgb(var(--accent) / 0.06) 50%, transparent 74%);
      }
      :root[data-theme='light'] .ms-planet-orb {
        background: linear-gradient(180deg, rgb(var(--surface)) 0px, rgb(var(--surface-2)) 80px, rgb(var(--space-1)) 260px);
        box-shadow:
          inset 0 1.5px 0 rgb(var(--accent) / 0.7),
          inset 0 16px 26px -16px rgb(var(--accent) / 0.32),
          0 -1px 10px rgb(var(--accent) / 0.22),
          0 -22px 70px -8px rgb(var(--accent) / 0.12);
      }
      :root[data-theme='light'] .ms-intro-ctl { background: rgb(var(--surface) / 0.86); }

      /* Daylight is the sea (SeaBackground + SeaIslands): the hero planet
         gives way to the ledge, so the orb and its mask step aside. Dark
         keeps the planet exactly as it is. */
      :root[data-theme='light'] .ms-planet-orb { display: none; }
      :root[data-theme='light'] .ms-planet {
        -webkit-mask-image: none;
        mask-image: none;
      }
      :root[data-theme='light'] .ms-sunrise { opacity: 0.45; }

      /* Tablets and narrow windows: the portrait stands centred on a flatter
         planet and the copy sits below the rim's lowest point across its own
         width (a 4x-viewport planet drops < 48px over half the screen). */
      @media (min-width: 640px) and (min-height: 541px) {
        .ms-st.ms-st--hero {
          --top: 72px;
          --scene-h: clamp(240px, calc(100svh - 500px), 640px);
          --apex: 50%;
          --orb: max(400vw, 1600px);
          --copy-gap: 72px;
        }
        .ms-st--hero .ms-inner { width: 100%; max-width: 880px; margin-inline: auto; }
        .ms-hero-scene { position: absolute; left: 0; right: 0; top: var(--top); margin: 0; }
        .ms-hero-copy { margin-top: calc(var(--scene-h) + var(--copy-gap)); max-width: 640px; }
        .ms-hero-name { font-size: clamp(64px, 9vw, 88px); }
        .ms-hero-lead { font-size: 18px; margin-top: 18px; max-width: 44ch; }
        .ms-ctas { margin-top: 28px; }
        .ms-sunrise { width: min(120%, 980px); }
      }

      /* >=1024px: two columns in a centred 1120px frame. The name sits left,
         centred in the sky above the horizon; the portrait stands on the
         planet on the right. The horizon is below the copy, so the rim can
         only ever pass under it. */
      @media (min-width: 1024px) and (min-height: 541px) {
        .ms-st.ms-st--hero {
          --inner: min(1120px, calc(100vw - 112px));
          --scene-h: min(calc(82svh - var(--top)), 640px);
          --apex: calc(50% + 16px + var(--inner) * 0.26);
          --sink: 0.12;
          --orb: max(250vw, 2400px);
          justify-content: center;
          padding-bottom: calc(100svh - var(--horizon) + 48px);
        }
        .ms-st--hero .ms-inner { max-width: var(--inner); }
        .ms-hero-copy { margin-top: 0; max-width: calc(var(--inner) * 0.52); }
        .ms-hero-name { font-size: clamp(56px, 5.6vw, 88px); }
        /* Fade only below the photo's hidden lower edge (the planet's top is
           160px above the horizon), so the cut never shows through. */
        .ms-planet {
          -webkit-mask-image: linear-gradient(#000 calc(176px + var(--photo-h) * var(--sink)), transparent);
          mask-image: linear-gradient(#000 calc(176px + var(--photo-h) * var(--sink)), transparent);
        }
      }

      /* Landscape phones: copy sits in the sky on the left, the planet rises
         across the bottom and the photo stands on it to the right. */
      @media (orientation: landscape) and (max-height: 540px) {
        .ms-st.ms-st--hero {
          --top: 56px;
          --scene-h: calc(100svh - var(--top) - 56px);
          --apex: 76%;
          --sink: 0.1;
          justify-content: center;
          padding-bottom: 72px;
        }
        .ms-hero-scene { position: absolute; left: 0; right: 0; top: var(--top); margin: 0; }
        /* Only ~56px of planet below the horizon: a short fade keeps the
           body opaque over the photo's cut-off edge. */
        .ms-planet {
          -webkit-mask-image: linear-gradient(#000 calc(100% - 20px), transparent);
          mask-image: linear-gradient(#000 calc(100% - 20px), transparent);
        }
        .ms-hero-copy { margin-top: 0; max-width: min(52%, 420px); }
        .ms-hero-name { font-size: 44px; }
        .ms-hero-lead { margin-top: 10px; font-size: 15px; }
        .ms-ctas { margin-top: 16px; }
      }
    `}</style>
  )
}

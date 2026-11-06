// components/ideas/palette/palettes.ts — colour + material directions shown
// under /ideas/palette, all on the cockpit HUD type with its zero-g titles.
// Each palette is one CSS module whose `.root` class goes on <html> while
// its page is open (see CONTRACT.md for what a palette may set).

import ember from './ember.module.css'
import arkham from './arkham.module.css'
import crimson from './crimson.module.css'
import titanium from './titanium.module.css'
import nightvision from './nightvision.module.css'

export interface Palette {
  slug: string
  name: string
  /** where the look comes from */
  from: string
  /** the materials and colours, for the caption */
  cast: string
  className: string
}

export const PALETTES: Palette[] = [
  {
    slug: 'ember', name: 'Ember (today)',
    from: 'What the site uses now, for comparison.',
    cast: 'Deep space navy · ember orange',
    className: ember.root,
  },
  {
    slug: 'arkham', name: 'Arkham detective',
    from: 'Detective-mode vision: a matte black suit, gunmetal, and an ice-blue HUD that lights up what matters.',
    cast: 'Matte black · gunmetal · carbon weave · ice blue',
    className: arkham.root,
  },
  {
    slug: 'crimson', name: 'Crimson noir',
    from: 'A rain-soaked Gotham night: black leather, wet asphalt and one hard red light.',
    cast: 'Black leather · wet asphalt · signal red',
    className: crimson.root,
  },
  {
    slug: 'titanium', name: 'Titanium armour',
    from: 'Armour plating with no colour at all: brushed titanium, chrome edges, black.',
    cast: 'Brushed titanium · chrome · black · no hue',
    className: titanium.root,
  },
  {
    slug: 'nightvision', name: 'Night vision',
    from: 'Seeing in the dark through a phosphor scope: rubberised black and a green that glows.',
    cast: 'Rubberised black · phosphor green',
    className: nightvision.root,
  },
]

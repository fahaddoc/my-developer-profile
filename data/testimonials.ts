// data/testimonials.ts
// Real LinkedIn recommendations (linkedin.com/in/fahaddoc600). `short` is a
// punchy excerpt used in compact UI; `full` is the complete recommendation.

export interface Testimonial {
  name:     string
  role:     string   // trimmed headline for display
  relation: string   // how they worked with Shah
  short:    string   // 1–2 line excerpt
  full:     string   // full recommendation text
}

export const testimonials: Testimonial[] = [
  {
    name:     'Ishaq Hassan',
    role:     'Engineering Manager · DigitalHire',
    relation: 'Managed Shah directly · 3+ years',
    short:    "One of the most reliable frontend engineers I've had on a team. Animations, edge cases, loading states, accessibility — I've stopped worrying about interaction polish on anything he owns.",
    full:     "I've worked with Shah Fahad at DigitalHire for over three years, and he's one of the most reliable frontend engineers I've had on a team. Fahad is a true frontend specialist. Whether it's React, Next.js, or Flutter, his work ships clean and holds up in production. He handles complex UI with the kind of attention to detail most engineers skip — animations, edge cases, loading states, accessibility, all of it. I've stopped worrying about interaction polish on anything he owns. What really sets him apart is ownership. He doesn't just take a ticket and close it. He'll push back on bad specs, flag issues early, and deliver with full context. Calm under pressure, clear in reviews, and a genuinely good teammate. Any team would be lucky to have him.",
  },
  {
    name:     'Haider Ali Khan',
    role:     'Design Engineer · DigitalHire',
    relation: 'Worked on the same team',
    short:    "He turns complex Figma handoffs into clean, production-ready UIs without breaking a sweat. React, Next.js, Flutter — he just gets it done, and raises the bar around him.",
    full:     "I've had the pleasure of working with Shah Fahad at DigitalHire, and honestly, he's the kind of engineer every team hopes to land. I've watched him turn complex Figma handoffs into clean, production-ready UIs without breaking a sweat. React, Next.js, Flutter, whatever the stack, he just gets it done. What sets Fahad apart isn't only the technical depth — six years in the frontend ecosystem, sharp instincts for performance, reusable component design — it's how he collaborates. He asks the right questions, pushes back when it matters, and genuinely cares about shipping something users will actually love, not just closing a ticket. If you're hiring for frontend and want someone who ships quality work, raises the bar around him, and makes the team genuinely enjoy showing up, Fahad is that hire.",
  },
  {
    name:     'Arbaz Pirwani',
    role:     'AI Engineer · Botim (ex-DigitalHire)',
    relation: 'Managed Shah directly · 2 companies',
    short:    "Technically sharp, reliable, with a great eye for detail in building seamless UIs. His work ethic and ability to deliver under pressure make him a standout developer.",
    full:     "I have had the opportunity to work with Shah Fahad across two different organizations. During our time at DigitalHire, I directly managed him and saw firsthand his growth into an exceptional Frontend Engineer. Fahad is technically sharp, reliable, and has a great eye for detail when it comes to building seamless user interfaces. Beyond his coding skills, his work ethic and ability to deliver under pressure make him a standout developer. I highly recommend him to any team looking for a strong frontend talent who is both a dedicated engineer and a great team player.",
  },
]

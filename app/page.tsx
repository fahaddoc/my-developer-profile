// app/page.tsx

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Projects } from '@/components/sections/Projects'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Contact } from '@/components/sections/Contact'
import { DepthScene } from '@/components/ui/DepthScene'
import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema } from '@/lib/seo/jsonld'

export default function Page() {
  return (
    <>
      <JsonLd data={profilePageSchema()} />
      <JsonLd data={projectsItemListSchema()} />
      <Navbar />
      <main className="overflow-x-hidden w-full" style={{ perspective: '1600px', perspectiveOrigin: 'center 45%' }}>
        <Hero />
        <DepthScene><About /></DepthScene>
        <DepthScene><Projects /></DepthScene>
        <DepthScene><Experience /></DepthScene>
        <DepthScene><Skills /></DepthScene>
        <DepthScene strength={0.7}><Contact /></DepthScene>
      </main>
      <Footer />
    </>
  )
}

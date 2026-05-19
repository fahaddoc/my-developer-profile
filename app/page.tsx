// app/page.tsx

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Projects } from '@/components/sections/Projects'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Contact } from '@/components/sections/Contact'
import { ScrollStack } from '@/components/ui/ScrollStack'
import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema } from '@/lib/seo/jsonld'

export default function Page() {
  return (
    <>
      <JsonLd data={profilePageSchema()} />
      <JsonLd data={projectsItemListSchema()} />
      <Navbar />
      <main className="w-full">
        <Hero />
        <ScrollStack>
          <About />
          <Projects />
          <Experience />
          <Skills />
          <Contact />
        </ScrollStack>
      </main>
      <Footer />
    </>
  )
}

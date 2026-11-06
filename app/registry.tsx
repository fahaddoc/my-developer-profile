// app/registry.tsx
//
// styled-jsx registry for the App Router. Without it the `<style jsx>` blocks
// (sea, starfield, islands, mobile space, featured achievement) are only
// injected on the client at hydration, so the first paint shows those layers
// unstyled and in flow and <main> jumps when the rules land. The registry
// collects every rule rendered on the server and flushes it into the HTML
// stream through useServerInsertedHTML; on the client styled-jsx adopts the
// server <style id="__jsx-…"> tags instead of inserting them again.

'use client'

import { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { StyleRegistry, createStyleRegistry } from 'styled-jsx'

export function StyledJsxRegistry({ children }: { children: React.ReactNode }) {
  // One registry per request (server) or per page load (client).
  const [registry] = useState(() => createStyleRegistry())

  useServerInsertedHTML(() => {
    const styles = registry.styles()
    registry.flush()
    return <>{styles}</>
  })

  return <StyleRegistry registry={registry}>{children}</StyleRegistry>
}

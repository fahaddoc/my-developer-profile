// components/ui/drawerPrefetch.ts — warm the shared drawer chunk (framer-motion
// + the shell) before the first open, so the first tap on "Write to me" is not
// dead while the chunk downloads. Safe to call many times; the import is cached.

let warmed: Promise<unknown> | null = null

export function prefetchDrawer(): Promise<unknown> {
  if (!warmed) warmed = import('@/components/ui/Drawer').catch(() => { warmed = null })
  return warmed
}

/** Window events the drawer shell dispatches so heavy layers (the WebGL
 *  RenderDriver) can pause while a drawer covers them. */
export const DRAWER_OPEN_EVENT  = 'sf:drawer-open'
export const DRAWER_CLOSE_EVENT = 'sf:drawer-close'

'use client'

// ContactDrawerProvider — floating holographic CONTACT panel. Same visual
// language as ProjectDrawerProvider (right-side glass HUD on desktop, bottom
// sheet on mobile). Contains a contact form that opens the user's email
// client via mailto: when submitted (no backend required).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { lenisInstance } from '@/components/providers/SmoothScroll'

interface CtxValue {
  isOpen: boolean
  open:   () => void
  close:  () => void
}

const Ctx = createContext<CtxValue>({ isOpen: false, open: () => {}, close: () => {} })
export function useContactDrawer() { return useContext(Ctx) }

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const ACCENT = '#5EEAD4'
const EMAIL  = 'hello@shahfahad.dev'

export function ContactDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen]         = useState(false)
  const [openCount, setCount]   = useState(0)
  const [mounted, setMounted]   = useState(false)
  const [isMobile, setMobile]   = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setMobile(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  const doOpen  = useCallback(() => { setOpen(true); setCount((c) => c + 1) }, [])
  const doClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') doClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, doClose])

  useEffect(() => {
    if (!open) return
    lenisInstance?.stop?.()
    return () => { lenisInstance?.start?.() }
  }, [open])

  useEffect(() => {
    const onOpen = () => doOpen()
    window.addEventListener('contact-drawer-open', onOpen)
    return () => window.removeEventListener('contact-drawer-open', onOpen)
  }, [doOpen])

  const value = useMemo<CtxValue>(() => ({ isOpen: open, open: doOpen, close: doClose }), [open, doOpen, doClose])

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted && createPortal(<Panel open={open} onClose={doClose} isMobile={isMobile} openKey={openCount} />, document.body)}
    </Ctx.Provider>
  )
}

function Panel({ open, onClose, isMobile, openKey }: {
  open: boolean
  onClose: () => void
  isMobile: boolean
  openKey: number
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 4, 10, 0.35)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              zIndex: 999,
              cursor: 'pointer',
            }}
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Contact form"
            data-lenis-prevent
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            initial={isMobile
              ? { y: '100%', opacity: 0 }
              : { x: 40, y: '-50%', opacity: 0, scale: 0.97 }}
            animate={isMobile
              ? { y: 0, opacity: 1 }
              : { x: 0, y: '-50%', opacity: 1, scale: 1 }}
            exit={isMobile
              ? { y: '100%', opacity: 0 }
              : { x: 40, y: '-50%', opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{
              position: 'fixed',
              ...(isMobile ? {
                left: 0, right: 0, bottom: 0,
                width: '100vw',
                maxHeight: '85vh',
                borderRadius: '20px 20px 0 0',
              } : {
                right: 24,
                top: '50%',
                width: 'min(480px, calc(100vw - 48px))',
                maxHeight: 'calc(100vh - 48px)',
                borderRadius: 18,
              }),
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(94,234,212,0.10) 0%, transparent 55%),
                linear-gradient(180deg, rgba(10,14,22,0.72) 0%, rgba(6,8,14,0.68) 100%)
              `,
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              border: '1px solid rgba(94, 234, 212, 0.22)',
              boxShadow: `
                0 0 0 1px rgba(94,234,212,0.04),
                0 20px 60px rgba(0,0,0,0.55),
                0 0 80px rgba(94,234,212,0.08)
              `,
              zIndex: 1000,
              overflowY: 'auto',
              color: '#ffffff',
              fontFamily: 'var(--font-body), system-ui, sans-serif',
            }}
          >
            <div aria-hidden style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                rgba(94,234,212,0.04) 0px,
                rgba(94,234,212,0.04) 1px,
                transparent 1px,
                transparent 3px
              )`,
              mixBlendMode: 'overlay',
              opacity: 0.5,
              borderRadius: 'inherit',
            }} />

            {isMobile && (
              <div aria-hidden style={{
                position: 'sticky', top: 0,
                display: 'flex', justifyContent: 'center', paddingTop: 10,
              }}>
                <span style={{
                  width: 44, height: 4, borderRadius: 2,
                  background: 'rgba(94,234,212,0.35)',
                }} />
              </div>
            )}

            <ContactBody key={openKey} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function ContactBody({ onClose }: { onClose: () => void }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent]       = useState(false)

  const canSubmit = name.trim().length > 1 && /^\S+@\S+\.\S+$/.test(email) && message.trim().length > 4

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const subj = subject.trim() || `New message from ${name}`
    const body = `${message}\n\n— ${name}\n${email}`
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <div style={{ position: 'relative', padding: '22px 24px 28px' }}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(94,234,212,0.22)',
          borderRadius: 6,
          color: '#fff',
          fontSize: 18, lineHeight: 1, cursor: 'pointer',
          transition: 'color 200ms, border-color 200ms, background 200ms',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = ACCENT
          e.currentTarget.style.borderColor = ACCENT
          e.currentTarget.style.background = 'rgba(94,234,212,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.borderColor = 'rgba(94,234,212,0.22)'
          e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
        }}
      >
        ×
      </button>

      <div style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
        color: ACCENT, marginBottom: 10,
        textShadow: '0 0 10px rgba(94,234,212,0.45)',
      }}>
        04 · CONTACT
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 800, fontSize: 26, lineHeight: 1.15,
        letterSpacing: '-0.01em',
        margin: '0 0 8px 0', paddingRight: 32,
      }}>
        Let&apos;s talk
      </h2>
      <p style={{ color: 'rgba(245,245,247,0.72)', fontSize: 13, lineHeight: 1.6, margin: '0 0 18px 0' }}>
        Drop a message and I&apos;ll reply within 24 hours. Open to senior frontend & real-time roles, full-time or contract.
      </p>

      {sent ? (
        <div style={{
          padding: '20px 18px',
          borderRadius: 10,
          border: '1px solid rgba(94,234,212,0.4)',
          background: 'rgba(94,234,212,0.06)',
          color: '#fff',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: 8,
          }}>SENT</div>
          <p style={{ margin: '0 0 14px 0', fontSize: 13, lineHeight: 1.55 }}>
            Your email client should have opened with the message pre-filled.
            Hit send and I&apos;ll get back to you soon.
          </p>
          <button
            type="button"
            onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage('') }}
            style={{
              padding: '8px 12px',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: ACCENT,
              background: 'transparent',
              border: '1px solid rgba(94,234,212,0.4)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 200ms, color 200ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(94,234,212,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Send another →
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="NAME">
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" autoComplete="name" required
              style={inputStyle}
            />
          </Field>
          <Field label="EMAIL">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" required
              style={inputStyle}
            />
          </Field>
          <Field label="SUBJECT (OPTIONAL)">
            <input
              type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              style={inputStyle}
            />
          </Field>
          <Field label="MESSAGE">
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell me about your project / role / idea…"
              rows={5} required
              style={{ ...inputStyle, resize: 'vertical', minHeight: 110, fontFamily: 'inherit' }}
            />
          </Field>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              marginTop: 6,
              padding: '12px 16px',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#ffffff',
              background: canSubmit
                ? 'linear-gradient(135deg, rgba(94,234,212,0.22), rgba(99,102,241,0.26))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${canSubmit ? 'rgba(94,234,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.55,
              boxShadow: canSubmit ? '0 0 28px rgba(94,234,212,0.22)' : 'none',
              transition: 'background 220ms, box-shadow 220ms, border-color 220ms',
            }}
          >
            Send Message →
          </button>

          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 8,
            fontFamily: 'var(--font-mono), monospace', fontSize: 10,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'rgba(245,245,247,0.55)',
          }}>
            <a href={`mailto:${EMAIL}`} style={{ color: ACCENT, textDecoration: 'none' }}>{EMAIL}</a>
            <span>Karachi · Pakistan</span>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 9, letterSpacing: '0.25em',
        color: 'rgba(245,245,247,0.55)',
      }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(8,12,20,0.55)',
  border: '1px solid rgba(94,234,212,0.18)',
  borderRadius: 8,
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 180ms, box-shadow 180ms, background 180ms',
}

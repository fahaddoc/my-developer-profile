'use client'

// ContactDrawerProvider — the "Let's talk" drawer with the EmailJS form.
//
// Opened by useContactDrawer().open() or the window event
// 'contact-drawer-open' (dispatched from the tunnel HUD). The shell (overlay,
// panel, focus trap, motion) is the shared components/ui/Drawer, loaded on
// first open so framer-motion stays out of the initial bundle. EmailJS is also
// imported on submit only.

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { FaCircleExclamation } from 'react-icons/fa6'
import styles from '@/components/ui/Drawer.module.css'

interface CtxValue {
  isOpen: boolean
  open:   () => void
  close:  () => void
}

const Ctx = createContext<CtxValue>({ isOpen: false, open: () => {}, close: () => {} })
export function useContactDrawer() { return useContext(Ctx) }

const EMAIL = 'hello@shahfahad.dev'
const CITY  = 'Karachi, Pakistan'

const loadDrawer = () => import('@/components/ui/Drawer')
const Drawer = dynamic(() => loadDrawer().then((m) => m.Drawer), { ssr: false })

/** Warm the drawer chunk on idle, desktop pointers only (the mobile path
 *  loads it on first open so it never pays for framer-motion up front). */
function usePrefetchDrawer() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let idle = 0
    const timer = window.setTimeout(() => {
      const run = () => { loadDrawer().catch(() => {}) }
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 4000 })
      else run()
    }, 6000)
    return () => {
      window.clearTimeout(timer)
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle)
    }
  }, [])
}

export function ContactDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen]           = useState(false)
  const [everOpened, setEverOpen] = useState(false)
  const titleId = useId()

  usePrefetchDrawer()

  const doOpen  = useCallback(() => { setEverOpen(true); setOpen(true) }, [])
  const doClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onOpen = () => doOpen()
    window.addEventListener('contact-drawer-open', onOpen)
    return () => window.removeEventListener('contact-drawer-open', onOpen)
  }, [doOpen])

  const value = useMemo<CtxValue>(() => ({ isOpen: open, open: doOpen, close: doClose }), [open, doOpen, doClose])

  return (
    <Ctx.Provider value={value}>
      {children}
      {everOpened && (
        <Drawer open={open} onClose={doClose} labelledBy={titleId} width={480}>
          <ContactBody titleId={titleId} />
        </Drawer>
      )}
    </Ctx.Provider>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────────

type FieldName = 'name' | 'email' | 'subject' | 'message'
type Values = Record<FieldName, string>
type Errors = Partial<Record<'name' | 'email' | 'message', string>>
type Status = 'idle' | 'sending' | 'sent' | 'error'

const EMPTY: Values = { name: '', email: '', subject: '', message: '' }

// A half-written message survives closing the drawer by accident; it is
// cleared only after a successful send.
let draft: Values = { ...EMPTY }

function validate(v: Values): Errors {
  const e: Errors = {}
  if (v.name.trim().length < 2) e.name = 'Add your name so I know who to reply to.'
  const email = v.email.trim()
  if (!email) e.email = 'Add your email so I can reply.'
  else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'That email address looks incomplete.'
  if (v.message.trim().length < 5) e.message = 'Write a line or two about what you have in mind.'
  return e
}

function ContactBody({ titleId }: { titleId: string }) {
  const [values, setValues]     = useState<Values>(() => draft)
  const [attempted, setAttempt] = useState(false)
  const [status, setStatus]     = useState<Status>('idle')
  const [sentTo, setSentTo]     = useState('')
  // Fine pointer: start in the first field. Touch: start on the heading, so
  // the keyboard does not jump up over the sheet before it has slid in.
  // Read synchronously: the Drawer moves focus in the same commit this body
  // mounts in (this component only ever renders client-side, inside Drawer).
  const [autofocusInput] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  )

  const fieldRefs = {
    name:    useRef<HTMLInputElement>(null),
    email:   useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  }
  const sentRef  = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  useEffect(() => { draft = values }, [values])

  const errors = attempted ? validate(values) : {}

  const set = (k: FieldName) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value
    setValues((prev) => ({ ...prev, [k]: v }))
    if (status === 'error') setStatus('idle')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    setAttempt(true)
    const found = validate(values)
    const firstBad = (['name', 'email', 'message'] as const).find((k) => found[k])
    if (firstBad) {
      fieldRefs[firstBad].current?.focus()
      return
    }

    setStatus('sending')
    const serviceId  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
    const publicKey  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

    if (!serviceId || !templateId || !publicKey) {
      console.error('[contact] EmailJS env vars missing — restart `npm run dev` after editing .env.local', { serviceId: !!serviceId, templateId: !!templateId, publicKey: !!publicKey })
      setStatus('error')
      requestAnimationFrame(() => errorRef.current?.focus())
      return
    }

    try {
      const { send } = await import('@emailjs/browser')
      const name = values.name.trim()
      const res = await send(
        serviceId,
        templateId,
        {
          from_name:  name,
          from_email: values.email.trim(),
          reply_to:   values.email.trim(),
          subject:    values.subject.trim() || `New message from ${name}`,
          message:    values.message,
        },
        { publicKey },
      )
      console.info('[contact] EmailJS ok', res.status, res.text)
      setSentTo(name.split(/\s+/)[0] ?? name)
      setStatus('sent')
      setAttempt(false)
      setValues({ ...EMPTY })
      requestAnimationFrame(() => sentRef.current?.focus({ preventScroll: true }))
    } catch (err) {
      console.error('[contact] EmailJS send failed', err)
      setStatus('error')
      requestAnimationFrame(() => errorRef.current?.focus())
    }
  }

  const errId = (k: keyof Errors) => `${baseId}-${k}-error`
  const sending = status === 'sending'

  return (
    <div className={styles.contact}>
      <h2
        id={titleId}
        className={`t-title ${styles.contactTitle} ${styles.focusTarget}`}
        tabIndex={-1}
        data-autofocus={autofocusInput || status === 'sent' ? undefined : ''}
      >
        Let&apos;s talk
      </h2>
      <p className={`t-lead ${styles.contactLead}`}>
        Tell me about the role or the project. I reply within 24 hours.
      </p>

      {status === 'sent' ? (
        <div className={styles.sent} role="status">
          <h3 ref={sentRef} tabIndex={-1} className={`t-subtitle ${styles.sentTitle} ${styles.focusTarget}`}>
            Message sent.
          </h3>
          <p className={`t-lead ${styles.sentText}`}>
            Thanks{sentTo ? `, ${sentTo}` : ''}. It&apos;s in my inbox, and you&apos;ll hear back within 24 hours.
          </p>
          <div className={styles.sentAction}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStatus('idle')}>
              Write another message
            </button>
          </div>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate aria-busy={sending}>
          <div className={styles.field}>
            <label htmlFor={`${baseId}-name`} className={`t-label ${styles.label}`}>Name</label>
            <input
              ref={fieldRefs.name}
              id={`${baseId}-name`}
              className={styles.input}
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              value={values.name}
              onChange={set('name')}
              required
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? errId('name') : undefined}
              data-autofocus={autofocusInput ? '' : undefined}
            />
            {errors.name && <FieldError id={errId('name')}>{errors.name}</FieldError>}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${baseId}-email`} className={`t-label ${styles.label}`}>Email</label>
            <input
              ref={fieldRefs.email}
              id={`${baseId}-email`}
              className={styles.input}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@company.com"
              value={values.email}
              onChange={set('email')}
              required
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? errId('email') : undefined}
            />
            {errors.email && <FieldError id={errId('email')}>{errors.email}</FieldError>}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${baseId}-subject`} className={`t-label ${styles.label}`}>
              Subject <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id={`${baseId}-subject`}
              className={styles.input}
              type="text"
              name="subject"
              placeholder="Senior frontend role, a Flutter app, a quick question"
              value={values.subject}
              onChange={set('subject')}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={`${baseId}-message`} className={`t-label ${styles.label}`}>Message</label>
            <textarea
              ref={fieldRefs.message}
              id={`${baseId}-message`}
              className={`${styles.input} ${styles.textarea}`}
              name="message"
              rows={5}
              placeholder="What are you building, and where could I help?"
              value={values.message}
              onChange={set('message')}
              required
              aria-required="true"
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? errId('message') : undefined}
            />
            {errors.message && <FieldError id={errId('message')}>{errors.message}</FieldError>}
          </div>

          {status === 'error' && (
            <div ref={errorRef} className={`${styles.notice} ${styles.focusTarget}`} role="alert" tabIndex={-1}>
              <FaCircleExclamation aria-hidden="true" focusable="false" />
              <span>
                That didn&apos;t send. Your message is still here, so you can try again, or email me
                at{' '}
                <a className={styles.inlineLink} href={`mailto:${EMAIL}`}>{EMAIL}</a>.
              </span>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="submit"
              className={`btn btn--primary ${styles.submit}`}
              disabled={sending}
              aria-disabled={sending || undefined}
            >
              {sending ? 'Sending…' : (<>Send message <span className="btn-arrow" aria-hidden="true">→</span></>)}
            </button>
          </div>
          <p className={styles.srOnly} role="status" aria-live="polite">
            {sending ? 'Sending your message.' : ''}
          </p>
        </form>
      )}

      <div className={styles.contactFooter}>
        <div className={styles.contactFooterRow}>
          <a className={styles.footerLink} href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <span>{CITY}</span>
        </div>
      </div>
    </div>
  )
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className={styles.fieldError}>
      <FaCircleExclamation aria-hidden="true" focusable="false" />
      <span>{children}</span>
    </p>
  )
}

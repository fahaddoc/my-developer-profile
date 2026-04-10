// components/sections/Contact.tsx

'use client'

import { useState, FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import { RevealText } from '@/components/ui/RevealText'

type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<FormStatus>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return

    setStatus('sending')

    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
          from_name: form.name,
          from_email: form.email,
          subject: form.subject,
          message: form.message,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      )
      setStatus('sent')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const inputClass = `
    w-full bg-transparent border-b border-[rgba(139,92,246,0.2)] py-3 text-text-primary text-sm
    placeholder:text-text-muted outline-none transition-all duration-300
    focus:border-accent-violet
  `

  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="max-w-content mx-auto px-6">

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">

          {/* Left — info */}
          <div className="flex-1">
            <RevealText>
              <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Contact</span>
              <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2 mb-4">
                Let's work together
              </h2>
              <p className="text-text-secondary leading-relaxed max-w-sm">
                Have a project in mind? I'm currently open to new opportunities and exciting projects.
              </p>
            </RevealText>

            <RevealText delay={0.15} className="mt-8 flex flex-col gap-4">
              <a
                href="mailto:fahaddoc600@gmail.com"
                className="flex items-center gap-3 text-text-secondary hover:text-accent-cyan transition-colors duration-200 group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-violet flex-shrink-0" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-sm">fahaddoc600@gmail.com</span>
              </a>
              <a
                href="tel:+923042186009"
                className="flex items-center gap-3 text-text-secondary hover:text-accent-cyan transition-colors duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-violet flex-shrink-0" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span className="text-sm">+92 304 2186009</span>
              </a>
            </RevealText>

            <RevealText delay={0.25} className="mt-8 flex items-center gap-4">
              <a href="https://github.com/fahaddoc" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/fahaddoc600" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </RevealText>
          </div>

          {/* Right — form */}
          <RevealText delay={0.1} className="flex-1">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={form.subject}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <textarea
                name="message"
                placeholder="Tell me about your project..."
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                className={`${inputClass} resize-none`}
              />

              <button
                type="submit"
                disabled={status === 'sending' || status === 'sent'}
                className="w-full py-4 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Message Sent ✓' : 'Send Message'}
              </button>

              {status === 'error' && (
                <p className="text-sm text-red-400 text-center">
                  Something went wrong. Please email directly at fahaddoc600@gmail.com
                </p>
              )}
            </form>
          </RevealText>

        </div>
      </div>
    </section>
  )
}

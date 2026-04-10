// components/layout/Footer.tsx

const footerLinks = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[rgba(139,92,246,0.1)] mt-24">
      <div className="max-w-content mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div>
            <span className="font-display font-bold text-lg text-accent-violet">SF</span>
            <p className="text-text-muted text-sm mt-1">Building experiences that scale.</p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-sm text-text-muted">
            © {year} Shah Fahad. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

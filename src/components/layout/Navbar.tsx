'use client';

import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Home',     id: 'hero' },
  { label: 'Services', id: 'services' },
  { label: 'Process',  id: 'process' },
  { label: 'FAQ',      id: 'faq' },
  { label: 'Contact',  id: 'contact' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface NavbarProps {
  onAuditClick: () => void;
}

export function Navbar({ onAuditClick }: NavbarProps) {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
      className={`fixed top-0 left-0 right-0 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button onClick={() => scrollTo('hero')} className="text-lg font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Naunas<span className="text-[var(--accent)]">.</span>
        </button>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <button
                onClick={() => scrollTo(link.id)}
                className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onAuditClick}
            className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            AI Audit
          </button>
          <a
            href="https://calendly.com/its-naunas/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] text-sm font-semibold px-5 py-2.5 rounded-full transition-colors glow-accent"
          >
            Book your free audit
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[var(--fg)]"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M17 5L5 17M5 5l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--bg)] border-b border-[var(--border)] px-6 pb-6">
          <ul className="flex flex-col gap-4 pt-4">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <button
                  onClick={() => { scrollTo(link.id); setMenuOpen(false); }}
                  className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={() => { setMenuOpen(false); onAuditClick(); }}
              className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors text-left"
            >
              AI Audit
            </button>
            <a
              href="https://calendly.com/its-naunas/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--fg)] text-sm font-medium px-5 py-2.5 rounded-full transition-colors text-center glow-accent"
            >
              Book your free audit
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

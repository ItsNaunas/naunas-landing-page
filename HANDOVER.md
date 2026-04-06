# Naunas Systems — Landing Page Handover Document

## What This Project Is

A conversion-focused agency landing page for **Naunas Systems** — a done-for-you systems agency that installs client lifecycle infrastructure, custom automations, and bespoke builds for service businesses. The page has two goals: **book discovery calls** and **capture leads via a free AI audit**.

Live dev server: `http://localhost:3000` (run `npm run dev` in the project root)

---

## Business Context

**Positioning:** "We install client lifecycle infrastructure that turns chaotic lead flow into controlled revenue."

**Three service pillars:**
1. Lifecycle Infrastructure — end-to-end client lifecycle (intake → retention), built on Airtable + n8n
2. Custom Automations — n8n, Make, or custom pipelines for any manual/repetitive ops
3. Bespoke Builds — internal tools, client portals, AI agents, data pipelines

**Target client:** Agencies, coaches, and service operators with an established offer who want to scale without burning out.

**CTAs:**
- Book a Call → `https://calendly.com/placeholder` (swap with real Calendly link)
- Free AI Audit → opens modal lead capture form (name, email, business type, message)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Fonts | Clash Display (headings) + Satoshi (body) via Fontshare CDN |
| Package manager | npm |
| Deployment target | Vercel |

---

## File Structure

```
src/
  app/
    layout.tsx                  — metadata, global font/body setup
    page.tsx                    — page orchestrator, modal state
    globals.css                 — FULL design token system (read this first)
    api/
      audit-lead/route.ts       — POST handler, logs to console (wire to Airtable later)
  components/
    layout/
      Navbar.tsx                — fixed, transparent → frosted on scroll, mobile hamburger
      Footer.tsx                — brand, nav links, both CTAs, scroll animation
    sections/
      Hero.tsx                  — full hero with floating cards (desktop) / stacked layout (mobile)
      SocialProof.tsx           — 4 stats strip
      Problem.tsx               — pain points list (NEEDS REDESIGN — see below)
      HowItWorks.tsx            — 3-step process cards
      WhatYouGet.tsx            — 3 service pillar cards
      CtaBanner.tsx             — mid-page CTA push
      Faq.tsx                   — accordion FAQ
    ui/
      Button.tsx                — primary / outline / ghost variants
      AuditModal.tsx            — lead capture modal with labelled form + success state
  hooks/
    useInView.ts                — IntersectionObserver hook, fires once, drives scroll animations
```

---

## Design System (globals.css — never bypass this)

### Colours — always use CSS variables, never raw hex
```css
--bg:             #0C0C0C    /* page background */
--card:           #111111    /* section cards */
--card-raised:    #1A1A1A    /* elevated/inner cards */
--border:         #2A2A2A    /* card borders */
--border-subtle:  #1F1F1F    /* very subtle borders */
--fg:             #FFFFFF    /* primary text */
--text-secondary: #CCCCCC    /* secondary body text */
--muted:          #999999    /* muted text — WCAG AA compliant */
--label:          #808080    /* section labels, nav sub-text — WCAG AA compliant */
--placeholder:    #444444    /* input placeholders (decorative, WCAG exempt) */
--accent:         #F2613F    /* brand orange */
--accent-hover:   #D94E2E    /* hover state for accent */
--error:          #EF4444    /* error states */
```

### Shadows
```css
--shadow-card:    0 4px 24px rgba(0,0,0,0.40)
--shadow-float:   0 8px 40px rgba(0,0,0,0.55)   /* floating cards, hover lift */
--shadow-modal:   0 24px 64px rgba(0,0,0,0.75)
```

### Z-Index Scale
```css
--z-base:     0
--z-float:    10    /* floating hero cards */
--z-sticky:   40    /* navbar */
--z-backdrop: 50    /* modal backdrop */
--z-modal:    51    /* modal content */
```

### Fonts
```css
--font-display: 'Clash Display', 'Arial Black', 'Helvetica Neue', sans-serif
--font-body:    'Satoshi', 'Inter', system-ui, -apple-system, sans-serif
```
**Rule:** All `h1–h6` use `font-family: var(--font-display)` automatically via globals.css. Body elements use `var(--font-body)`. Never set `fontFamily` inline unless overriding for a specific reason.

### Typography Scale (responsive pattern)
| Role | Mobile | Desktop |
|------|--------|---------|
| Hero display | `text-[38px]` | `lg:text-[88px]` |
| Section heading (H2) | `text-3xl` | `lg:text-5xl` |
| Card heading (H3) | `text-xl` | `text-xl` |
| Body | `text-base` (16px) | `text-base` |
| Small/muted | `text-sm` (14px) | `text-sm` |
| Section label | `text-[11px] uppercase tracking-widest font-medium` | same |

### Spacing Rules (4px base system)
- **Card internal padding:** `p-6` (24px) minimum. Never `p-4` on cards.
- **Section vertical padding:** `py-16 md:py-24`
- **Section heading → content gap:** `mb-8 md:mb-16`
- **Page horizontal padding:** `px-6` (24px) — applied on inner container, not section
- **Max content width:** `max-w-7xl mx-auto` for sections, `max-w-xl` or `max-w-2xl` for reading content

### Animations
Elements animate in when scrolled into view. Pattern:
```tsx
const { ref, inView } = useInView();
<section ref={ref as React.RefObject<HTMLElement>}>
  <h2 className={`will-animate ${inView ? 'is-visible animate-fade-in-up' : ''}`}>
  {/* stagger children with delay-100, delay-200, delay-300... */}
```
- `will-animate` — sets `opacity: 0`
- `is-visible animate-fade-in-up` — triggers `fadeInUp` keyframe (0.6s cubic-bezier)
- `is-visible animate-fade-in` — triggers `fadeIn` (0.5s ease)
- Stagger delays: `delay-100` through `delay-500`

### Card Hover Lift
Add `card-hover` class to any interactive card:
```html
<div className="card-hover ...">
```
This applies `translateY(-4px)` + `shadow-float` on hover (desktop only, uses `@media (hover: hover)`).

---

## Component Rules

### Buttons
- Always `rounded-full`
- Min height 44px (touch target)
- Font size always `text-sm` (14px)
- Three variants: `primary` (accent bg), `outline` (border), `ghost` (text only)
- Use `<Button>` component from `src/components/ui/Button.tsx` or inline with matching classes

### Cards
- `rounded-2xl` (16px radius)
- `p-6` minimum internal padding
- `border border-[var(--border)]`
- `bg-[var(--card)]` for standard, `bg-[var(--card-raised)]` for elevated
- Add `card-hover` for interactive cards
- Add `boxShadow: 'var(--shadow-card)'` inline for floating cards

### Form Inputs
- `min-h-[48px]` — mandatory touch target
- `rounded-xl` (12px radius — slightly less than cards)
- Always have a visible `<label>` with matching `htmlFor` / `id` pair (WCAG 1.3.1)
- Focus state: `focus:border-[var(--accent)]` — no custom outline needed (globals.css handles `:focus-visible`)

### Section Labels (the small orange uppercase text)
```html
<span className="text-[11px] font-medium text-[var(--accent)] uppercase tracking-widest">
  Section Name
</span>
```

### SVG Icons
- All `strokeWidth="1.5"` — no exceptions
- Decorative squiggles/accents can use `strokeWidth="2"` only

---

## WCAG Compliance Status

| Check | Status |
|-------|--------|
| `--muted` (#999) on dark bg | ✅ 6.98:1 — passes AA |
| `--label` (#808) on dark bg | ✅ 4.95:1 — passes AA |
| `--accent` (#F2613F) as text | ✅ 6.34:1 — passes AA |
| Form labels (htmlFor/id) | ✅ all modal inputs have visible labels |
| Focus ring (:focus-visible) | ✅ 2px solid accent, 3px offset |
| Touch targets | ✅ all buttons/inputs ≥44px |
| Placeholder text (#444) | ⚠️ decorative only, WCAG exempt |

---

## Current Build Status

### Done
- [x] Full page scaffolded and running
- [x] Design token system in globals.css
- [x] Navbar (sticky, frosted scroll, mobile hamburger)
- [x] Hero (floating cards desktop, stacked mobile)
- [x] SocialProof strip (4 stats)
- [x] Problem section (pain cards — **layout to be redesigned**)
- [x] How It Works (3-step cards)
- [x] What You Get (3 service pillar cards)
- [x] CTA Banner
- [x] FAQ (accordion)
- [x] Footer
- [x] Audit Modal (lead form, labelled, success state)
- [x] `/api/audit-lead` route handler (logs to console)
- [x] Scroll reveal animations on all sections
- [x] Card hover lift
- [x] Mobile responsive

### Still To Do
- [ ] **Problem section redesign** — rebuild to two-column layout (copy left, stacked icon cards right). Agreed layout direction: Option 1 from oratory.co inspiration (two-column, section wrapped in `var(--card)` panel)
- [ ] Swap Calendly placeholder with real URL
- [ ] Add real photo/graphic to Hero center placeholder
- [ ] Wire `/api/audit-lead` to Airtable or email notification
- [ ] Real testimonials/social proof for SocialProof strip
- [ ] SEO: OG tags, sitemap, robots.txt
- [ ] Deployment to Vercel

---

## Key Decisions & Rationale

| Decision | Why |
|----------|-----|
| Airtable as CRM, not a DB | Existing stack — lifecycle-api already uses it |
| No component library (Radix, Shadcn etc.) | Keeps bundle small, full design control |
| Fontshare CDN for fonts | Clash Display + Satoshi not on Google Fonts |
| `useInView` fires once, disconnects | Prevents re-animation on scroll-back — intentional |
| Modal state in page.tsx | Single source of truth, passed as prop — no global state needed |
| `card-hover` uses `@media (hover: hover)` | Prevents sticky hover state on touchscreens |
| `--label` bumped to #808080 | #555 failed WCAG AA (2.62:1), #808 passes (4.95:1) |

---

## Running the Project

```bash
cd naunas-systems-landing-page
npm run dev        # starts on http://localhost:3000
npm run build      # production build
npm run lint       # ESLint check
```

Dev server config: `.claude/launch.json`

# Project Status

**Last updated**: 2026-06-11
**State**: Landing page live + /audit rebuilt as a multi-step branching wizard (one question per screen, Q1 forks Services vs Builder) → /api/qualify → Baserow + 3 outcome screens (qualified→inline Calendly embed, not-qualified→lead magnet, builder→waitlist). Real testimonials swapped in. Clean `next build`. NOT deployed — Baserow fields + Vercel env vars still pending.

## Next steps
- [ ] Create 14 text fields in Baserow table 919893 via the UI (token can't alter schema; unknown keys silently dropped until they exist): Business Type, Leads Per Month, Monthly Revenue, Lead Handling, Top Fix, Decision Maker, Website, Source, Qualified, Date, Path, Building, Experience. (Phone already exists.)
- [ ] Add NEXT_PUBLIC_BOOKING_URL + NEXT_PUBLIC_LEAD_MAGNET_URL to Vercel env (lead magnet URL is still a "#" placeholder; booking URL = https://calendly.com/its-naunas/30min)
- [ ] Testimonials header still reads "Outcomes, not promises" / "every result came from a full done-for-you install" — real testimonials aren't metric-based, so consider softening that subcopy.
- [ ] Decide whether Navbar/Footer/CtaBanner/RevenueCalculator "Book your free audit" CTAs should also route via /audit (currently still direct Calendly)

## Recent sessions
### 2026-06-11 (wizard rebuild)
- Rewrote AuditQualifyForm.tsx as a one-question-per-screen branching wizard (plain React state, framer-motion slide transitions, progress bar, Back button, mobile-first large tap targets). Q1 forks: Services path (7 Qs: business→leads→revenue→lead-handling→top-fix→decision-maker→contact) vs Builder path (3 Qs: building→experience→contact). Progress bar computes per-path length. ?src= + utm_* still captured and submitted.
- 3 outcome screens, first-name personalised: Services+Qualified → inline Calendly embed (next/script loads widget.js, .calendly-inline-widget data-url=NEXT_PUBLIC_BOOKING_URL) + Shuheyb testimonial + "reply with your link to pre-audit" + new-tab fallback link; Services+Not-qualified → honest thank-you + lead magnet + @naunas_builds; Builder → waitlist confirmation + @naunas_builds.
- Conversion elements: Haider testimonial on the fork screen, trust microcopy ("2 minutes · no spam · goes straight to Naufal") on fork + contact steps.
- /api/qualify extended for both paths: adds Path, Building, Experience; Qualified = "yes"/"no" (services) or "n/a" (builder). Builder rows are never services-qualified. Verdict logic smoke-tested across 7 boundary cases (all correct). Live Baserow POST verified clean (HTTP 200, unknown keys dropped, test row deleted).
- Replaced 3 fabricated testimonials (James/Sophie/Tom) with real ones — Haider (featured), Shuheyb, Fesal — kept the existing layout/styling, only swapped data. Avoided inventing fake metrics: metric slot now carries a short verbatim-ish label, not a fake number.
- Inline Calendly embed used (not redirect). Clean `next build`.

### 2026-06-11
- Built the audit qualification funnel: new /audit page (src/app/audit/page.tsx + src/components/sections/AuditQualifyForm.tsx) — 7 questions, plain React state, ?src= + utm_* capture, on-brand styling.
- New /api/qualify route saves all answers to Baserow and returns the server-side verdict (qualified = Agency/Coach/Service/Creative AND £2–5k+ AND 5–20+ leads AND decision-maker Yes/Partly).
- Qualified → success state + auto-redirect to Calendly (NEXT_PUBLIC_BOOKING_URL); not qualified → honest thank-you + lead magnet (NEXT_PUBLIC_LEAD_MAGNET_URL) + @naunas_builds follow line.
- Hero's two "Book your free audit" CTAs now link to /audit (other Calendly CTAs untouched).
- Blocker: Baserow database token can write rows but returned 401 on field creation (schema needs JWT/UI) — unknown payload keys are silently dropped until the 11 fields exist, so leads still save Name/Email/Phone meanwhile.
- Verified: clean `next build`; smoke-tested both verdicts against `next start` and deleted the test rows.

### 2026-06-10
- Seeded this file. State reconstructed from git history.

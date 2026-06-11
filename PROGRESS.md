# Project Status

**Last updated**: 2026-06-11
**State**: Landing page live + /audit qualification funnel built (7-question form → /api/qualify → Baserow + qualified/not-qualified routing); hero CTAs point to /audit; NOT yet deployed — Baserow fields + Vercel env vars pending.

## Next steps
- [ ] Create 11 text fields in Baserow table 919893 via the UI (token can't alter schema): Business Type, Leads Per Month, Monthly Revenue, Lead Handling, Lead Handling Notes, Top Fix, Decision Maker, Website, Source, Qualified, Date
- [ ] Add NEXT_PUBLIC_BOOKING_URL + NEXT_PUBLIC_LEAD_MAGNET_URL to Vercel env (lead magnet URL is still a "#" placeholder)
- [ ] Decide whether Navbar/Footer/CtaBanner/RevenueCalculator "Book your free audit" CTAs should also route via /audit (currently still direct Calendly)

## Recent sessions
### 2026-06-11
- Built the audit qualification funnel: new /audit page (src/app/audit/page.tsx + src/components/sections/AuditQualifyForm.tsx) — 7 questions, plain React state, ?src= + utm_* capture, on-brand styling.
- New /api/qualify route saves all answers to Baserow and returns the server-side verdict (qualified = Agency/Coach/Service/Creative AND £2–5k+ AND 5–20+ leads AND decision-maker Yes/Partly).
- Qualified → success state + auto-redirect to Calendly (NEXT_PUBLIC_BOOKING_URL); not qualified → honest thank-you + lead magnet (NEXT_PUBLIC_LEAD_MAGNET_URL) + @naunas_builds follow line.
- Hero's two "Book your free audit" CTAs now link to /audit (other Calendly CTAs untouched).
- Blocker: Baserow database token can write rows but returned 401 on field creation (schema needs JWT/UI) — unknown payload keys are silently dropped until the 11 fields exist, so leads still save Name/Email/Phone meanwhile.
- Verified: clean `next build`; smoke-tested both verdicts against `next start` and deleted the test rows.

### 2026-06-10
- Seeded this file. State reconstructed from git history.

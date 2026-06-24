# Project Status

**Last updated**: 2026-06-24
**State**: **SHIPPED — funnel live on www.naunas.co.uk.** Vercel project = `naunas-landing-page` (git-connected, auto-deploys master). Full funnel verified end-to-end against the real domain: /audit wizard → /api/qualify → Baserow row with Qualified/Source/Date populated. All 14 Baserow fields exist; all 5 env vars on the project. Built locally, NOT yet committed/deployed: /newsletter + /api/subscribe (MailerLite; MAILERLITE_API_TOKEN needs adding to Vercel first), Vercel Web Analytics in root layout, /links link-in-bio page (Carrd replacement, rebuilt 2026-06-12 UI/UX pass: avatar + proof chip + mentorship Calendly link), and the audit/newsletter UI/UX fixes from the same pass.

## Next steps
- [ ] Deploy newsletter signup: commit, add MAILERLITE_API_TOKEN to the `naunas-landing-page` Vercel project (use the temp-file + `cmd /c "vercel env add ... < file"` trick — see 2026-06-12 SHIPPED entry), push
- [ ] Delete test subscriber newsletter-test@naunas.co.uk from MailerLite (group 190096378194560944)
- [ ] Lead magnet URL is a placeholder — NEXT_PUBLIC_LEAD_MAGNET_URL currently carries the .env.local value; replace when the real asset exists
- [ ] Testimonials header still reads "Outcomes, not promises" / "every result came from a full done-for-you install" — real testimonials aren't metric-based, so consider softening that subcopy.
- [ ] Decide whether Navbar/Footer/CtaBanner/RevenueCalculator "Book your free audit" CTAs should also route via /audit (currently still direct Calendly)

## Recent sessions
### 2026-06-24 (Managed waitlist — formerly "Roster")
- New /managed waitlist page (`src/app/managed/page.tsx` + `src/components/sections/ManagedWaitlist.tsx`) for the Managed app (AI talent manager for creators; **renamed from Roster mid-session, no "roster" left in src**). Mirrors /newsletter visual language (radial glow, framer-motion fade-up, same input/button classes). Email (required) + optional @handle, success state. Reads ?src= (default 'managed').
- New `/api/managed-waitlist` route: validates email, writes to the EXISTING Baserow Contacts table (919893) with `Path: 'managed-waitlist'` (Name=handle||email, Website=handle, Source=src, Date=ISO). Plain-text fields, so no new table/fields needed — Baserow MCP can't create tables/fields anyway (token is row-only; schema needs UI/JWT). Reuses BASEROW_TOKEN + BASEROW_TABLE_ID already on Vercel → works in prod on deploy, no new env vars. Filter waitlist signups in the CRM by `Path = managed-waitlist`.
- /links (LinksHub.tsx): added a "Managed: AI talent manager" secondary button after the newsletter (→ /managed?src=links-<src>, track('link_click', target:'managed')). No em dash (used colon) per brand rule.
- Verified: clean `next build` (/managed prerenders static, /api/managed-waitlist dynamic); live Baserow write smoke-tested via MCP under the old name (row 108, Path populated, then deleted). NOT committed, NOT deployed.

### 2026-06-12 (UI/UX pass: /links rebuild + /audit + /newsletter)
- New shared `src/components/ui/Avatar.tsx` + new `public/assets/sections/hero/avatar.png` (256px face crop derived from the hero image via sharp — the full hero PNG is 2.2MB, too heavy for a 96px avatar). Circular, accent ring.
- /links rebuilt (LinksHub.tsx): avatar → wordmark → one-liner → the homepage hero's "12+ systems installed" proof chip (same markup as Hero mobile) → solid-accent primary "Book a call about your business" (→ /audit?src=links-<src>) → visible card-raised secondaries "Book a mentorship intro" (→ Calendly 30min ?utm_source=links-<src>&utm_medium=mentorship, new tab) and "The newsletter" → row of 3 inline-SVG social icon buttons (IG/TikTok/LinkedIn) → "Email me" text link. ?src= forwarding + track('link_click') kept on every link (mentorship target = 'mentorship'); subtexts at var(--muted) minimum.
- /audit fixes (surgical): fork screen no longer shows "Step 1 of 1" + full bar — the whole progress header is hidden until a path is chosen (counts after the fork unchanged: Step 2 of 8 / 2 of 4, verified in browser); value line added above the fork options; builder outcome screen gains a secondary "Book a mentorship intro" button (Calendly ?utm_source=audit-builder&utm_medium=mentorship, new tab, tracked) with the @naunas_builds line kept.
- /newsletter: avatar (80px) added above the headline, nothing else.
- ONE Calendly event for everything (calendly.com/its-naunas/30min); mentorship distinguished by UTM, not a separate event.
- Verified: clean `next build`; all four screens screenshot-checked at 390px against `next start` (builder path walked with /api/qualify mocked — no test rows). Not committed, not deployed.

### 2026-06-12 (analytics + /links page)
- Vercel Web Analytics site-wide: `@vercel/analytics` installed, `<Analytics />` from `@vercel/analytics/next` in `src/app/layout.tsx`. Custom events need "Web Analytics" enabled on the Vercel project (and custom events require a plan that supports them) — check before relying on link_click data.
- New /links page (`src/app/links/page.tsx` + `src/components/sections/LinksHub.tsx`): one-screen mobile-first link-in-bio replacing Carrd. Naunas. wordmark + "AI systems for service businesses", stacked buttons: audit (accent CTA) → newsletter → Instagram → TikTok → LinkedIn → mailto:contact@naunas.co.uk. Matches /newsletter visual language (radial glow, framer-motion fade-up, same button/input classes).
- Source forwarding: reads `?src=` (window.location in useEffect, same pattern as NewsletterSignup); internal links forward as `/audit?src=links-<src>` (default `links`) → feeds existing Baserow Source attribution. Every click fires `track('link_click', { target, src: <incoming or 'direct'> })`; navigation unaffected.
- TikTok (`tiktok.com/@naunas_builds`) and LinkedIn (`linkedin.com/in/naufal-nassor-0a1b6936b`) URLs taken from existing Footer.tsx/layout JSON-LD — already in the repo, not guessed.
- Clean `next build`; /links prerenders static. Not committed, not deployed. After deploy: repoint the IG/TikTok bio links from Carrd to www.naunas.co.uk/links (with ?src=ig / ?src=tt) and retire the Carrd.

### 2026-06-12 (newsletter signup)
- New /newsletter page (`src/app/newsletter/page.tsx` + `src/components/sections/NewsletterSignup.tsx`) — one-screen, mobile-first, matches /audit styling (radial glow, Naunas. header, accent CTA, plain React state). Email input → success state ("You're in" + @naunas_builds). Captures ?src= and posts it to the API.
- New `/api/subscribe` route: validates email server-side, POSTs to MailerLite (`connect.mailerlite.com/api/subscribers`, group 190096378194560944, Bearer MAILERLITE_API_TOKEN). MailerLite upserts, so already-subscribed = 200 = success. `src` accepted but not forwarded to MailerLite (custom fields must pre-exist in the account; revisit if attribution matters).
- MAILERLITE_API_TOKEN added to .env.local (copied from projects/tools/mailerlite/.env; .env* gitignored). **Token is NOT on Vercel yet** — must be added before deploy or the route 500s.
- Verified: clean `next build`; live-tested against `next start` — invalid email → 400, valid → 200, duplicate → 200. Test subscriber newsletter-test@naunas.co.uk needs deleting from MailerLite.
- Not committed, not deployed (main session handles deploy).

### 2026-06-12 (favicon)
- Replaced the default Next.js favicon with a brand icon: dark rounded square, white "N", orange dot (matches the navbar "Naunas." wordmark). New `src/app/icon.svg` (source of truth) + regenerated `src/app/favicon.ico` (16/32/48 multi-size) + new `src/app/apple-icon.png` (180px) via `scripts/gen-favicon.mjs` (sharp; rerun it if the SVG changes). Clean `next build`, all three routes served.

### 2026-06-12 (SHIPPED)
- Created the 14 funnel fields in Baserow table 919893 (Naufal via UI after token 401 on schema; Website kept as text not URL so IG handles don't fail validation; Date = date+time, accepts the code's ISO writes — verified).
- Fixed the Baserow token's create permission (was read-only for the table → ERROR_NO_PERMISSION_TO_TABLE; Naufal flipped create on).
- ⚠️ **Project-name trap (don't repeat):** the local folder is `naunas-systems-landing-page` but the real Vercel project is **`naunas-landing-page`** (git-connected, owns www.naunas.co.uk). A bare `vercel link --yes` matched the folder name and created an empty duplicate project; env vars + a deploy went there before the mistake was caught. Duplicate project deleted, repo relinked with `--project naunas-landing-page`.
- Real project already had BASEROW_TOKEN/BASEROW_TABLE_ID/OPENAI_API_KEY (67d old, still valid). Added the missing NEXT_PUBLIC_BOOKING_URL + NEXT_PUBLIC_LEAD_MAGNET_URL (build-time — the qualified screen's Calendly embed had no URL without them) and redeployed.
- Env-var gotcha: piping values via PowerShell appends CRLF → function throws TypeError building the Authorization header; write value to a temp file and `cmd /c "vercel env add NAME production < file"`.
- Upgraded Vercel CLI 46→54 (deploy endpoint rejects old versions; npm needed full remove+reinstall).
- Verified end-to-end on **www.naunas.co.uk**: POST /api/qualify → 200, row landed with all fields, all test rows (79–83) deleted. Note: deployment-specific *.vercel.app URLs are SSO-protected; test the real domain.

## Recent sessions (older)
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

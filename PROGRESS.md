# Project Status

**Last updated**: 2026-10-11
**State**: Live site remains deployed; local changes include the white Dot hero, case-study pages, testimonial updates, and revised enquiry flow. Not committed or deployed.

## Next steps
- [ ] Review the local white Dot hero at http://localhost:3000 (desktop/mobile checked), then commit/deploy with the other pending changes when ready.
- [x] **LIVE 2026-10-11** (c1b6e46, c3b1d05). Verified on prod with its.naunas+funneltest@gmail.com: /api/leak-map → MailerLite 'Leak Map' group (+ PDF email fallback), /api/enquiry → contact@ + auto-reply, signed Cal.com webhook removed the tester from the group. `CAL_WEBHOOK_SECRET` set on Vercel; Cal.com webhook registered on event 7431234 → /api/cal-webhook.
- [ ] MailerLite: build the 'Leak Map' automation (10 emails, vault 09-Content/leak-map-emails), sender domain auth (DNS at phase8, merge SPF), postal address; then set `LEAK_MAP_COURSE_LIVE=true` on Vercel to stop the PDF fallback email.
- [ ] Hero redesign (Hero.tsx + Hero.module.css) is UNCOMMITTED in the working tree on purpose: not Claude's work, kept out of the 2026-10-11 push.
- [ ] Unverified figures still live (Naufal said add-only for now): Alira/E-ctrl case studies (£22K, 20hrs/wk, <48hrs, +40% retention, quotes not in their videos), StatBar £18K+, About £18K+/+18.2%/12+, WhatYouGet £22K/94%/40hrs+. Source of truth for real proof: vault `09-Content/case-study-drafts.md`.
- [ ] Testimonials header still reads "Outcomes, not promises" / "every result came from a full done-for-you install" — real testimonials aren't metric-based, so consider softening that subcopy.
- [ ] Decide whether Navbar/Footer/CtaBanner/RevenueCalculator "Book your free audit" CTAs should also route via /audit (currently still direct Calendly)

## Recent sessions
### 2026-10-11 (site-wide repositioning + HubSpot priority) — Claude
- Home order: Hero (user's, uncommitted) → IntegrationBar → Problem → NEW LeakMapSection (8 layers, opens the Leak Map pop-up via `open-leak-map` event) → WhatYouGet rebuilt as "The Client System" (5 blocks with flow terminals, real proof only: $250, $26,736) → CaseStudies → Testimonials → HowItWorks (free audit → written scope → build & handover) → Comparison → About (real story/stats) → FAQ (rewritten for broad high-ticket ICP) → Contact ("Prefer to write?") → CtaBanner (9 builds · $26,736 · built in your accounts; secondary = Leak Map).
- Removed from home: Pricing (£), RevenueCalculator (£), StatBar (fake numbers). Files kept. Problem mock-ups now "$ example". Metadata/OG/JSON-LD → Client System, areaServed US+UK. Footer + nav updated.
- HubSpot: contact `naunas_priority` + deal `naunas_deal_priority` (high/normal/small via `priorityOf()` in lib/booking). Vault: daily brief gets a 📈 PIPELINE block (stale-deal rules), email engine logs outbound to HubSpot; 5 already-emailed US studios backfilled as companies+contacts.
- Hero.tsx / Hero.module.css deliberately NOT committed (another session's in-progress white Dot hero).

### 2026-10-11 (white mascot hero, local only)
- Follow-up: removed the service-business eyebrow and bottom client-work strip at user request. Interactive workflow-card/Dot behavior discussed, not yet implemented.
- Replaced portrait hero with white split layout, original Clash Display/Satoshi fonts, shared rounded magnetic orange button, CSS Dot with breathing/blinks, SVG orbit rings and workflow cards. Added real Derick testimonial and ringed initial avatars, plus client-work links.
- Navbar uses dark text while over the white hero and restores dark-site theme below it. Existing enquiry flow kept; no AI audit restored. Other pending changes preserved.
- Desktop 1440px and mobile 390px checked; primary CTA opens enquiry dialog. Hero/Navbar lint passes. Production build checked. No deployment or commit.

### 2026-10-11 (questionnaire-first audit + Leak Map pop-up + course plumbing)
- `/audit` + every "Free audit"/book button → `AuditFlow`: questions first (name, email, business type, client value, monthly revenue, website, what's not working) → `/api/enquiry` emails contact@ + auto-reply → if qualified, Cal.com inline embed (`naunas/free-audit`) with every answer prefilled; under $5k/client AND under $20k/mo → "I'll reply by email" (no calendar). Option strings must match the Cal.com booking fields exactly. `BOOKING_URL` now = `/audit`; `CAL_URL` for emails.
- `LeadMagnetPopup` (root layout): Leak Map offer 5s after landing, once per visitor (localStorage), hidden on /audit + old builder pages; skips if another dialog is open. Posts to `/api/leak-map` → MailerLite group "Leak Map" (found/created at runtime, fields `client_value` + `source` auto-created). Until `LEAK_MAP_COURSE_LIVE=true`, also emails the PDF link from contact@ so sign-ups always get it.
- `/api/cal-webhook`: Cal.com BOOKING_CREATED (HMAC `x-cal-signature-256`, env `CAL_WEBHOOK_SECRET`) → removes attendee from the Leak Map group (stops the course).
- `public/leak-map.pdf` (24pp, built in vault `09-Content/leak-map/`) + `public/leak-map-cover.png`.
- Env to add on Vercel before it fully works: `CAL_WEBHOOK_SECRET` (then register the webhook on the Cal.com event), `LEAK_MAP_COURSE_LIVE=true` once the MailerLite automation is built. Existing: `MAILERLITE_API_TOKEN`, `ZOHO_SMTP_*`.

### 2026-10-11 (AI audit + Baserow removed → simple book-or-message funnel)
- Removed: AuditModal (9-question AI audit), /api/ai-audit (OpenAI), lib/industryData, AuditQualifyForm (learner fork), /api/qualify + /api/audit-lead (Baserow). Build no longer needs OPENAI_API_KEY. /api/managed-waitlist still writes Baserow (the /managed page, untouched).
- New `EnquiryPanel` (primary: "Book a free 30-minute audit call" → booking link; secondary: name/email/website/message form) used by the new `EnquiryModal` (all "Free audit" buttons), `/audit` page (now a simple two-column page, same panel) — Contact section posts to the same endpoint.
- New `/api/enquiry`: emails contact@ (reply-to = lead; awaited, so a failed send shows an error) + instant auto-reply to the lead with the booking link (via `after()`). Shared `lib/mailer.ts` (Zoho SMTP env as /api/subscribe).
- `lib/booking.ts`: single BOOKING_URL = `NEXT_PUBLIC_BOOKING_URL` || Calendly. Switch to Cal.com by setting the env var on Vercel. Navbar/Footer/CtaBanner/RevenueCalculator use it.
- All "AI audit" wording → "free audit" (hero, nav, footer, CTA banner, FAQ, metadata, OG image).
- Not testable locally (no Zoho creds in .env.local); verify with one real submission after deploy.

### 2026-10-11 (case studies → cards + own pages; testimonials → one-row slider)
- New `src/lib/caseStudies.ts` = single source for all 9 case studies (SITH, Nelia, SNAEB, SAAFI full; RT Spaces, TPC, 360CR short; Alira + E-ctrl kept with their existing copy/figures at Naufal's request). Home `CaseStudies` = 3 featured cards (SITH, Nelia, SNAEB) + "See all work". New routes `/case-studies` (grid) and `/case-studies/[slug]` (static via generateStaticParams; sections render only if present). Shared `CaseStudyShell` (logo header + audit CTA). Sitemap now lists them.
- `Testimonials` rewritten as a single horizontal scroll-snap row (6 quotes, arrows on sm+, swipe on mobile); old CTA row dropped to shorten the section.
- Build passes locally (needs any `OPENAI_API_KEY` value at build time because /api/ai-audit instantiates the client at import). Not committed/deployed — awaiting Naufal's review.

### 2026-10-10 (real case studies + testimonials, add-only)
- CaseStudies.tsx: added Soul in the Horn, Nelia Rose Designs, SNAEB, SAAFI ahead of the existing two (now 6 tabs; switcher wraps). `quote`/`author` optional (SNAEB has none). Numbers from the vault drafts: SITH $26,736 (Jul 31 gross, Eventbrite), 37→269 tickets (Oct 2), 100+ dancer purchases, $250 from 2 campaigns.
- Testimonials.tsx: added Uche (Nelia), Derick (SITH), Abdullah Said (SAAFI) first; stacked column now borders every row but the last.
- Naufal's instruction: add only, don't fix existing content. Not built (npm registry unreachable), not committed, not deployed.
### 2026-07-12 (newsletter welcome email)
- `/api/subscribe`: new MailerLite subscribers (201) now get a welcome/confirmation email from `Naufal at Naunas <contact@naunas.co.uk>` via Zoho SMTP (nodemailer, `after()`, never blocks the signup). Existing subscribers (200 upsert) are NOT re-mailed. Copy: confirmed + what-you-get + six-leaks PDF link + reply invite. Env: ZOHO_SMTP_HOST/PORT/USER/PASS (Vercel prod + .env.local).
- **Verified e2e on prod** with a Gmail plus-address (fresh 201): welcome landed in the inbox; test subscriber deleted from MailerLite after. Also verified the 200 path correctly skips (its.naunas@gmail.com has existed in the account since 06-12).
- Newsletter health check: group has 10 real active subscribers, latest 07-10; live subscribe→MailerLite→delete round-trip clean.
- Note: if a native MailerLite "on joining group" automation is ever set up in their UI, remove this code path to avoid double welcomes.

### 2026-07-12 (CRM Build Guide live on /kit)
- KitShowcase.tsx: "Build a CRM That Survives Real Users" (£100, gumroad l/ivsdmt) added as the second product card (after Prompt Pack $39, before free Setup Kit — paid-first order kept). Tagline from crm-build-guide-spec positioning. Removed from the "Landing soon" teaser (Automation Pack remains). Same kit_click tracking + ?src forwarding as the other cards.
- Context: Naufal considered closing Gumroad thinking products weren't linked; confirmed the 07-02 one-slot-on-/links → /kit architecture is live, so the fix was just publishing the third product card. Gumroad stays.

### 2026-07-12 (instant lead alert + lead-magnet fix)
- `/api/qualify`: `after()` now generates the brief (returns it) then fires `sendLeadAlert` → POST to the Naunas Notification Relay (ops lane): subject "Qualified lead: X (£rev)" or "WHALE LEAD: …" for the £15k+ band (whales alert even when not fully qualified; brief only generates for qualified). HTML = answers summary + brief inline. Best-effort, never blocks. Env: NOTIFY_RELAY_URL + NOTIFY_RELAY_SECRET (Vercel prod + .env.local).
- **Verified e2e on prod**: test submit 10:48:01 → relay email in inbox 10:48:07 with brief; Baserow rows deleted after. Gotcha: piping `£` through bash curl mangles UTF-8 → server-side enum match fails and the lead silently disqualifies; test with a UTF-8 JSON file (`--data-binary @file`).
- **Lead-magnet placeholder fixed**: prod `NEXT_PUBLIC_LEAD_MAGNET_URL` was `#` (baked into the bundle — the `?? '/six-leaks.pdf'` fallback never fires because `#`/empty isn't nullish). Re-set to `/six-leaks.pdf` (the real 4-page PDF already in public/ and serving), redeployed, verified the string in the live chunk.
- MailerLite test subscriber confirmed already deleted (API 404 on lookup).
### 2026-07-02 (Gumroad products → new /kit page)
- Decision: don't stack each Gumroad product on /links (congests the tree, catalog grows to 4). Collapse into ONE enticing linktree slot → dedicated /kit showcase page. Own-brand, scales, keeps source attribution.
- New /kit page (`src/app/kit/page.tsx` + `src/components/sections/KitShowcase.tsx`): hook as H1 ("You vibe-coded an app. Now make it survive real users."), product cards paid-first / free-at-bottom per Naufal — Builder Prompt Pack $39 (l/fuxpbw, "Start here" text tag) then Setup Kit Free (l/vzrehp). Each card → Gumroad new-tab, ?src=kit-<src> forwarded, track('kit_click', target). "Landing soon" teaser lists CRM Build Guide + Automation Pack. Footer cross-sell → /newsletter. No pills/rounded-full (brand rule), no em dash. Matches /managed visual language.
- /links (LinksHub.tsx): the two direct product buttons I'd added earlier were REPLACED by one secondary "Make your app survive real users" → /kit?src=links-<src> (track 'kit'). Unused URL consts removed.
- Note: Gumroad doesn't surface arbitrary ?src= params in its dashboard — real attribution is the Vercel kit_click/link_click events. Products per digital-products-spec.md (Prompt Pack = Phase 1 paid validator, Setup Kit = free newsletter feeder).
- Verified: clean `tsc --noEmit` + `next build` (/kit and /links both prerender static). Committed + deployed (Vercel auto-deploys master).

### 2026-06-24 (Managed waitlist — formerly "Roster")
- New /managed waitlist page (`src/app/managed/page.tsx` + `src/components/sections/ManagedWaitlist.tsx`) for the Managed app (AI talent manager for creators; **renamed from Roster mid-session, no "roster" left in src**). Mirrors /newsletter visual language (radial glow, framer-motion fade-up, same input/button classes). Email (required) + optional @handle, success state. Reads ?src= (default 'managed').
- New `/api/managed-waitlist` route: validates email, writes to the EXISTING Baserow Contacts table (919893) with `Path: 'managed-waitlist'` (Name=handle||email, Website=handle, Source=src, Date=ISO). Plain-text fields, so no new table/fields needed — Baserow MCP can't create tables/fields anyway (token is row-only; schema needs UI/JWT). Reuses BASEROW_TOKEN + BASEROW_TABLE_ID already on Vercel → works in prod on deploy, no new env vars. Filter waitlist signups in the CRM by `Path = managed-waitlist`.
- /links (LinksHub.tsx): added a "Managed: AI talent manager" secondary button after the newsletter (→ /managed?src=links-<src>, track('link_click', target:'managed')). No em dash (used colon) per brand rule.
- Verified: clean `next build` (/managed prerenders static, /api/managed-waitlist dynamic); live Baserow write smoke-tested via MCP under the old name (row 108, Path populated, then deleted). NOT committed, NOT deployed.




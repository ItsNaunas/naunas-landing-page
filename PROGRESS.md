# Project Status

**Last updated**: 2026-10-20
**State**: The Client System funnel is live end to end (capture → sequences → booking → brief → deposit → onboarding, Telegram alerts, daily health, Monday scoreboard, daily Claude operator). Productised: one config (src/config/funnel.ts) + docs/client-system/RUNBOOK.md + scripts/funnel-test.mjs. Instagram webhook built, inert until the Meta app exists.

## Next steps
- [ ] **Content engine** (docs/content-engine/PLAN.md): Phase 1 + 3 shipped (composer at /dashboard/content). QStash scheduling verified live 2026-10-18 (Test scheduling ping → Telegram; EU endpoint via QSTASH_URL); Phase 2 needs the Meta publish permission + new IG token; Phase 4 (AI Adapt) shipped on OpenAI. Phase 5 (Monday MailerLite newsletter DRAFT, never sent; Build draft button on Content) + Phase 6 (post leaderboard: clicks/leads/deals/IG insights; reply reminder 30 min after posting via QStash; 'Worth posting again' >90d with leads) shipped 2026-10-18, unverified live. Deferred: studio drop endpoint, LinkedIn analytics xlsx import, TikTok stats (after approval). TikTok posts are held until TIKTOK_APPROVED=1.
- [x] **Instagram DM playbook** (2026-10-20): Outreach → Today has the Instagram sequence (warm up day 1 → opener day 2 → follow-ups day 5/9 → stop; 'They replied' stops IG + email). lib/dmLint.ts blocks placeholders ([...], {...}) in DMs and emails (schedule action + daily send skip) and warns on >25 words / links. Routine Job 6 now qualifies firms and writes 3 opener styles (dms A/B/C); Results tab shows reply rate per style. IG DM audit: 13 warm contacts imported to HubSpot (instagram_dm, notes).
- [x] **Dashboard UX merge** (2026-10-18): sidebar 13 → 8 items with red badges (Content: held/failed/overdue posts; Outreach: assets owed + nudges due). Tabs as real routes via (tabs) route groups: Content = Plan · Performance · Newsletter · Keyword DMs; Outreach = Today · Prospects · Sequences · Results; Pipeline = Deals · Calls; System = Health · Connections · Automations. Old /dashboard/instagram|email|calls|automations redirect. LinkedIn composer removed (post from Content); TikTok composer kept for the app audit; /dashboard/tiktok + /linkedin are connection pages linked from System → Connections. **Asset owed** tracker on Outreach → Today (Telegram at 20h if unsent, nudge reminder 5 days after sending, via QStash). Health check 'Instagram publishing' proves the publish permission without posting.
- [ ] **Outreach → Today's reps** (2026-10-18): the daily-brief checklist lives on the dashboard now: emails/DMs/posts count themselves, warm-ups/follow-ups/LinkedIn/list-building/Zanzibar ticked with +; 'Warm up today' list of drafted firms with IG; 7-day touches → replies replaces the vault tally line.
- [ ] **TikTok**: app "Naunas" on developers.tiktok.com (sandbox keys in Vercel). Connect at /dashboard/tiktok, test-post privately, record the demo video (scripted, blurred, subtitled), then submit for review + Direct Post audit. Remove user.info.profile from the app (not requested) and keep the scopes in lib/tiktok.ts SCOPES identical to the app. Until audited, posts can only be SELF_ONLY.
- [ ] Turn on IMAP in Zoho Mail (Settings → Mail Accounts → IMAP Access) — outreach sequences refuse to send without it (stop-on-reply safety).
- [ ] Fathom webhook: Fathom → API Access → Manage → Add Webhook → https://www.naunas.co.uk/api/fathom-webhook (summary + action items) → put its whsec_ secret in Vercel as FATHOM_WEBHOOK_SECRET.
- [ ] Outreach: run a first search, approve, review the routine's drafts next day, then flip Sending ON at /dashboard/outreach. Vault email engine finishes wave-1 E4s only (email-engine.md banner).
- [ ] Optional dashboard keys: `CAL_API_KEY` (Calls tab) and `STRIPE_READ_KEY` (Money tab, restricted read-only). Tabs show a Connect card until set.
- [ ] Phase 5 setup (Naufal): Vercel → Storage → Blob (**private**) → connect to naunas-landing-page; set `DASHBOARD_PASSWORD` (Vercel + Bitwarden); redeploy. Until Blob is connected the health check flags "Blob store" and campaigns can't be edited (default LEAK campaign still works).
- [ ] Verify phase 5 live: login, add an AUDIT test campaign, comment it from @nnfl.88, click /go link, check HubSpot instagram_campaign/instagram_post; first routine run report (ops-log@naunas.co.uk note) shows on the dashboard; Monday 19 Oct content drafts.
- [x] **Instagram LIVE 2026-10-15**: comment LEAK from @nnfl.88 (test account) → DM sent + HubSpot contact 892579131614 (delete: test). Gotcha: the per-account "Webhook Subscription" toggle in API setup §2 must be On or Meta sends nothing. If real public commenters don't trigger, App Review for Advanced Access is next.
- [ ] Run `node scripts/funnel-test.mjs` with ML + HubSpot keys from Bitwarden (never run yet: no local keys).
- [ ] MailerLite UI: add "Action → add to group Naunas Newsletter" as the last step of "map leak".
- [ ] Review the local white Dot hero at http://localhost:3000 (desktop/mobile checked), then commit/deploy with the other pending changes when ready.
- [x] **LIVE 2026-10-11** (c1b6e46, c3b1d05). Verified on prod with its.naunas+funneltest@gmail.com: /api/leak-map → MailerLite 'Leak Map' group (+ PDF email fallback), /api/enquiry → contact@ + auto-reply, signed Cal.com webhook removed the tester from the group. `CAL_WEBHOOK_SECRET` set on Vercel; Cal.com webhook registered on event 7431234 → /api/cal-webhook.
- [ ] MailerLite: build the 'Leak Map' automation (10 emails, vault 09-Content/leak-map-emails), sender domain auth (DNS at phase8, merge SPF), postal address; then set `LEAK_MAP_COURSE_LIVE=true` on Vercel to stop the PDF fallback email.
- [ ] Hero redesign (Hero.tsx + Hero.module.css) is UNCOMMITTED in the working tree on purpose: not Claude's work, kept out of the 2026-10-11 push.
- [ ] Unverified figures still live (Naufal said add-only for now): Alira/E-ctrl case studies (£22K, 20hrs/wk, <48hrs, +40% retention, quotes not in their videos), StatBar £18K+, About £18K+/+18.2%/12+, WhatYouGet £22K/94%/40hrs+. Source of truth for real proof: vault `09-Content/case-study-drafts.md`.
- [ ] Testimonials header still reads "Outcomes, not promises" / "every result came from a full done-for-you install" — real testimonials aren't metric-based, so consider softening that subcopy.
- [ ] Decide whether Navbar/Footer/CtaBanner/RevenueCalculator "Book your free audit" CTAs should also route via /audit (currently still direct Calendly)

## Recent sessions
### 2026-10-17 (content engine phase 4: AI)
- Write all 3 with AI in the composer (lib/adapt.ts via lib/ai.ts, OpenAI structured JSON, gpt-4.1-mini default): LinkedIn post + first comment, Instagram caption with the campaign keyword CTA, TikTok caption, 3 platform hooks each (tap to swap), newsletter blurb, ICP note. Transcript field (paste or .srt/.vtt/.txt). Repurpose: copy as text-only LinkedIn post.
- Guardrails: prompt forbids new specifics; pre-flight warns on any number not in the idea/transcript (handles list numbering and number words). Tested live: gpt-4.1 embellished, gpt-4.1-mini stayed faithful; voice examples stripped of numbers after one leaked into a hook.
- Note: OPENAI_API_KEY is stored as Config (visible) in Vercel; switch it to Secret.
### 2026-10-17 (content engine phase 1 + 3)
- Post everywhere: content posts in Blob (lib/content.ts), per-channel adapters + independent runner (lib/publish.ts; each result saved as it lands, Telegram summary), pre-flight checks with acknowledgeable warnings, TikTok held until approved, LinkedIn first-comment link, per-post tracked links /go/p-<id>-<li|ig|tt> (utm_campaign = post id), QStash exact-time scheduling (/api/content/fire, signature-verified, no retries), short-lived public media links /m/<token> for Instagram, Instagram Reels/image publishing code (untested until the permission exists).
- Composer at /dashboard/content/<id>; Content tab: New post, week calendar with real posts, held TikTok tray, Scheduled + Recent lists. Weekly target now 7 (about 1 post a day).
### 2026-10-17 (LinkedIn)
- LinkedIn inbox audit: Claude-in-Chrome read 134 conversations; 20 imported to HubSpot (lead source linkedin, summary notes), Madison Wallace deal at Scope sent. Finding: zero wave-1 ICP in the inbox.
- /dashboard/linkedin: Connect (OIDC + Share on LinkedIn, self-serve), post text/image/video to Naufal's profile on Publish only (Posts/Images/Videos APIs, Linkedin-Version 202609). 60-day token, no refresh: health check fails 7 days before expiry. Shared lib/sealed.ts now holds TikTok + LinkedIn tokens; shared upload route /dashboard/media/upload.
- TikTok: demo video recorded (sandbox, private test account @milno62) and app submitted for review.
### 2026-10-17 (TikTok)
- /terms page + footer/sitemap; TikTok URL-prefix verification file in public/.
- /dashboard/tiktok: Login Kit connect (state cookie, callback at /api/tiktok/callback), tokens AES-GCM encrypted in Blob and auto-refreshed (daily health check keeps them alive), stats + recent videos, Direct Post composer following TikTok UX rules (creator_info, no default privacy, interaction toggles off, commercial disclosure, consent line). Video goes browser → private Blob (client upload) → server action → TikTok FILE_UPLOAD, then our copy is deleted.
- Decided: TikTok has no comment/DM API for us; IG keeps keyword DMs, TikTok gets link-in-bio + optional ManyChat (comment trigger only in a few regions).
### 2026-10-16 (outreach moved into the site + lead profile)
- /dashboard/outreach: Apify Google Maps search (compass/crawler-google-places, website-only + contact enrichment, per-run charge cap + monthly cap) → fit score 0-7 → approve/skip → routine JOB 6 drafts (reads /api/outreach/feed/<key>, writes NAUNAS_OUTREACH_DRAFTS notes on ops-log) → review/edit → schedule → daily cron /api/outreach/run 14:00 UTC sends E1–E4 (days 0/3/7/14, threaded, 15 new/25 total a day, 7am–8pm their time), stops on reply via IMAP + Telegram; E1 creates the HubSpot contact/company (cold_email). Sending OFF by default. Prospects/searches/settings in Blob (outreach/*.json). IG DMs stay manual (copy opener, mark sent).
- Lead profile page /dashboard/leads/[id]: journey strip, next-step banner, tabs Overview (their words, research brief, last call, details) / Emails (IMAP thread + reply box sending from contact@ on click, logged to HubSpot) / Calls (Fathom summaries, action items, recordings) / Timeline; side panel: deal stage (+lost reason), outreach status, MailerLite sequences take-out/add, notes, booking link.
- Fathom webhook /api/fathom-webhook (standard-webhooks signature) → HubSpot note + Telegram. Health/System now check IMAP, Fathom, Apify. HubSpot: naunas_outreach_status property; 5 wave-1 contacts set followed_up. Routine: owns all replies (drafts only), JOB 6 outreach drafts. Vault email-engine.md: winding down (finish wave-1 E4s, no new firms, no replies).
- Content: weekly plan, posting count, Leak Map coverage, idea bank from leads' words, hook bank.

### 2026-10-16 (Ops v3 finish)
- 2-minute read-through cache on every dashboard API call (src/lib/ops/cache.ts, unstable_cache tag "ops"); any logged event expires it (revalidateTag in lib/events), Refresh purges it (updateTag server action). Time windows rounded to 2 min (nowish) so keys repeat.
- Range pickers: Pipeline (30/90/180/365d), Instagram (7/30/90/all; posts + leads), Money (3/6/12 months; Stripe charges paginated to 500). Email notes MailerLite totals are lifetime.
- Per-section error states (SectionError/errFor) + collapsible page summary. Verified: with every source failing, all 10 pages still render.
- Instagram reach/profile views via /me/insights when the Meta app has instagram_business_manage_insights; otherwise a hint.

### 2026-10-16 (Naunas Ops v3)
- /dashboard rebuilt around usability: grouped sidebar (Run the day: Today, Leads, Pipeline, Calls · Channels: Instagram, Email, Content · Business: Money, Automations, System), mobile bottom tabs + More sheet, global people search (Ctrl K or /), refresh button, loading skeletons.
- Today: action queue (calls, routine needs-you, payment issues, failing checks, deals quiet 7d+), "since you last looked" (cookie), KPIs, goal ring, live activity, upcoming calls in both time zones.
- Leads: filterable list (range/source/stage) with deal stage per person; person drawer = one timeline across HubSpot notes, MailerLite, Cal.com, Stripe + quick actions.
- Pipeline: board with days-quiet badges, 90-day conversion, win rate by source, lost reasons. Email: per-automation and per-email open/click from MailerLite. Instagram: campaigns (moved from /campaigns) + recent posts with leads attributed. Money/Calls: Stripe/Cal read-only (Connect cards until keys). Automations: routine runs, ML automations, webhook/cron freshness, filterable activity log. System: checks + connected tools.
- Activity feed: src/lib/events.ts (Blob events.json, last 500) logged from every form, webhook, /go click and alertError. Data layer split into src/lib/ops/{common,sources,tabs,demo}.ts; old src/lib/dashboard*.ts removed; /dashboard/{campaigns,routine,health} redirect.

### 2026-10-16 (dashboard redesign)
- /dashboard rebuilt as an app: sidebar (tabs on mobile) + pages Overview (KPIs w/ week-on-week + sparkline, 30-day leads bars, goal ring, funnel, sources + lost reasons, needs-you, latest leads, last routine run), Pipeline (board), Campaigns (KPIs + table + slide-over editor with Instagram-style DM preview), Content, Routine (run history), Health. SVG charts server-rendered (src/components/dashboard/). Demo mode: DASHBOARD_DEMO=1 shows fictional sample data (design work + showing prospects); never set it in production.

### 2026-10-16 (phase 5: Naunas Ops dashboard + keyword campaigns)
- `/dashboard` (password via DASHBOARD_PASSWORD; `src/proxy.ts` gate + page/server-action re-check; noindex + robots disallow): Today, This week, Goal (£5k/mo from vault goals.md, pipeline coverage 3×), Pipeline, Comment & DM campaigns (editor + stats), Content (top posts by leads, routine drafts), Routine runs, System health (shared `src/lib/health.ts`). Each HubSpot query fails independently and shows a warning.
- Instagram keyword campaigns (`src/lib/campaigns.ts`, stored in Vercel Blob `campaigns.json`, counters in `stats/campaigns.json`): comment and/or DM keywords, optional post scope, end date, DM text with {link} → `/go/<id>` (counts click, adds utm). Default "leak-map" campaign lives in funnel.ts so LEAK works without Blob. HubSpot contact props `instagram_campaign`, `instagram_post` created. DM keyword replies are allowed (they messaged first).
- Routine reports: changed from the planned POST endpoint to HubSpot notes on internal contact ops-log@naunas.co.uk (body `NAUNAS_ROUTINE_REPORT {json}`), because cloud routines' network sandbox may block naunas.co.uk and it avoids a new secret. Routine gained JOB 5 (Monday content drafts: 3 posts, Track A leak + hot take, Track B build-in-public, CTA keyword, [PROOF] placeholders, no invented numbers) + the run-report step.
- Scoreboard: top Instagram campaign line + Dashboard button. RUNBOOK §8b.

### 2026-10-15 (phase 3 rest + phase 4)
- `src/config/funnel.ts`: every business-specific ID/name/link (HubSpot portal/owner/stages, ML groups + expected automations, Cal link, owner tz, PDF, logs URL, IG keywords/DM, vault email). Libs re-export from it, so imports are unchanged.
- `/api/instagram-webhook` + `src/lib/instagram.ts`: Meta verify handshake, X-Hub-Signature-256 check, comment keyword (LEAK/MAP) → one private-reply DM with the Leak Map link + HubSpot contact by handle + Telegram; first DM → HubSpot contact (lead source instagram_dm) + Telegram. Returns 503 until env set. Health cron checks the IG token when set and refreshes it on the 1st of the month.
- `docs/client-system/RUNBOOK.md` (install from zero, env table, free limits, Vercel Hobby non-commercial warning) and `scripts/funnel-test.mjs` (throwaway +ftest sign-up → checks ML groups + HubSpot → deletes both).
- Routine "Naunas funnel operator" gained JOB 4 retention: Won deals at 21 days → testimonial/case-study ask draft, 60 days → referral ask draft; digest only, never sent.

### 2026-10-15 (phase 2 loose ends + phase 3 start)
- Stripe connector = account "naunas" (acct_1RbXWWEYEJRPyjHS, live). Our endpoint has all 10 events. **n8n endpoint we_1ThE1r… DISABLED** in Stripe (reversible) so nothing sends from info@soulinthehorn.com any more. Test payment link: buy.stripe.com/aFa00j9Xr8MC0NSceUbsc01.
- HubSpot deal property `naunas_lost_reason` (dropdown) created.
- Phase 3: footer newsletter sign-up (`NewsletterSignup` + `/api/subscribe`, required opt-in tick) → ML "Naunas Newsletter" (starts "Newsletter: welcome") + HubSpot contact (lead source "Other": the dropdown has no Newsletter option, the connector can't edit existing properties). Weekly scoreboard (`src/lib/scoreboard.ts`) sent Mondays via the health cron: new leads by source, won (£), lost + reasons, pipeline snapshot by stage. HubSpot's API doesn't expose stage-entered dates for the custom pipeline, so it's a snapshot, not stage-movement counts. Health env check now includes STRIPE_WEBHOOK_SECRET.

### 2026-10-15 (Stripe webhook covers everything; n8n Stripe alerts retired)
- Live £1 test reached `/api/stripe-webhook` (signature OK, Telegram "Payment received… no deal matched": link opened without client_reference_id, paid as its.naunas@gmail.com). Matched path (Won + onboarding) still to test with `?client_reference_id=526993965271&prefilled_email=its.naunas%2Bstripe1015%40gmail.com`.
- Webhook now handles: checkout completed/async succeeded (deposit) + async failed + expired (opened link, didn't pay, only when tied to a person), payment_intent.payment_failed, invoice.paid, invoice.payment_failed, customer.subscription.deleted, charge.dispute.created, charge.refunded. Each → Telegram + the vault-sync email (`Stripe: <event>`, "PAYMENT RECEIVED" / "ACTION NEEDED — …") to VAULT_ALERT_TO (default its.naunas@gmail.com) from contact@.
- Replaces n8n "Stripe Alerts to Email (Naunas)" (id Mfy0QMJ5DzJ8sOe1), which sent from info@soulinthehorn.com and reported amount 0 / customer unknown. Vault inconsistency: spec-instant-vs-pulse.md says the n8n "SITH" Gmail cred = its.naunas@gmail.com; live email proves it's info@soulinthehorn.com.

### 2026-10-15 (phase 2: conversion)
- `/api/stripe-webhook`: checkout.session.completed/async_payment_succeeded, manual HMAC verify (no SDK) with STRIPE_WEBHOOK_SECRET → deal Won + amount (client_reference_id = deal id, else payer's open deal by email) → onboarding email (Zoho) → HubSpot note → 💰 Telegram. Idempotent (already-Won skips). Unmatched payment → Telegram asking to handle by hand. Inactive until STRIPE_WEBHOOK_SECRET is set + endpoint created in Stripe.
- Pre-call brief (`src/lib/brief.ts`): on booking, emailed to BRIEF_TO (default contact@) + note on the deal: answers, likely leaks (their words vs the 8 layers), questions, links. Claude routine adds research.
- No-show: Cal webhook now subscribed to BOOKING_NO_SHOW_UPDATED → rebook email + HubSpot note + Telegram.
- HubSpot: deals/companies owned by Naufal (owner 100890550); company linked by website domain on enquiry + booking; notes can attach to deals; markDealWon/openDealForEmail.
- Claude routine "Naunas funnel operator" (trig_01N9LKgkPiRCBtzTgJuWeQCX, daily 10:00 UTC = 13:00 Zanzibar, Sonnet 5.5): reply triage in contact@ (stops ML sequences, HubSpot note, drafts reply), pre-call web research for calls in next 30h (Google Calendar → HubSpot note), post-call recap + proposal Google Doc from Fathom (deal → Audit done); one digest email to its.naunas@gmail.com only when there's something. Never contacts leads. Cal.com isn't a claude.ai connector, so calls come from Google Calendar.
- Proposal research: best performer = Soul in the Horn (won $1,500 + retainer; same-day "next steps + contract + deposit invoice" email mirroring the call's scope bullets). Template + SOP in vault (99-Templates/template-proposal.md, 04-Business-Brain/SOPs/sop-proposal-generation.md); price from pricing.md, USD pricing undecided → flag, never invent.

### 2026-10-15 (phase 1 live + readable alerts)
- Pushed 648c427 / 246b991 / 467c99a. Live: pre-call email from the site (ML "before we talk" paused, "Newsletter: welcome" active = 3/3 free slots), Telegram alerts, daily health cron (06:00 UTC, `?ping=1` forces all-green). TELEGRAM_* + CRON_SECRET set in Vercel (Naufal didn't save CRON_SECRET: Vercel "Run" works without it; regenerate + save in Bitwarden for manual runs).
- Alerts redesigned (`src/lib/alert.ts` notify(): Telegram HTML, bold title, icon-labelled lines, quote block, 👉 next step, inline buttons). Lead alerts now fire after HubSpot and link to the deal/contact; errors show Where / Error / Impact + Open logs; health check is a ✓/✗ checklist. Live test (high-value enquiry) sent with no Telegram errors.
- HubSpot test records to delete by hand: Hubspot Tester, Telegram Test, Sarah Example (+ deals).

### 2026-10-15 (Client System plan, phase 1 code)
- Plan approved: `~/.claude/plans/abundant-jumping-dijkstra.md` (free stack: MailerLite = sequences only, 3 slots: course · nudges · newsletter welcome; one-off emails from the site via Zoho; Telegram alerts; Vercel cron health check; Stripe deposits; IG later). Phases 1-4.
- Phase 1 code (committed, NOT yet pushed: push only after Naufal pauses the MailerLite "Audit booked: before we talk" automation, or bookings get the pre-call email twice):
  - `src/lib/emails.ts` preCallEmail(); `cal-webhook` now sends it from contact@ on CREATED/RESCHEDULED.
  - `src/lib/alert.ts` (Telegram, no-op + log until TELEGRAM_BOT_TOKEN/CHAT_ID set); every catch in enquiry/leak-map/cal-webhook now alerts; ⭐ alerts for high-priority enquiries, bookings and $25k+ Leak Map sign-ups.
  - `src/app/api/health/route.ts` + `vercel.json` cron 06:00 UTC: env vars, HubSpot key, MailerLite EXPECTED_AUTOMATIONS enabled, Zoho verify; Telegram on failure, Monday all-green. Needs CRON_SECRET.
- tsc + next build clean.

### 2026-10-15 (booking flow verified, welcome email rebuilt, HubSpot sync broken)
- Booking flow verified end to end on prod by Naufal's own test: booked → "Audit booked" with call_time "Thursday 15 October at 11:00 am (Dar es Salaam time)" → "Before we talk" delivered; cancelled → removed from group.
- New MailerLite automation "Newsletter: welcome" (id 201346641278534822) in the Leak Map design, from contact@, subject "You're in (and here's the Leak Map)"; copy in docs/emails/newsletter-welcome.html. Created OFF. Old one renamed "OLD welcome (replaced, safe to delete)". Nothing feeds the Naunas Newsletter group yet (no site form, no ML forms).
- **HubSpot sync has never worked**: every call 401 "Authentication credentials not found" (Vercel logs, LeakMap + CalWebhook). Code sends Bearer correctly and the custom properties exist in portal 149523755, so the HUBSPOT_TOKEN value on Vercel is wrong. Errors are caught, so sign-ups/emails were unaffected. Cause: the value was the HubSpot *Developer API Key* (app config only). **FIXED same night:** private/legacy apps are disabled on this new portal, so Naufal created a HubSpot *Service key* (contacts/deals/companies read+write, owners.read) → HUBSPOT_TOKEN → redeploy. Live questionnaire test created contact (lead source, client value, priority High) + note + deal, no errors. HubSpot connector can't delete records: test contact "Hubspot Tester" + its deal to delete by hand.
- Cal.com host profile tz is Europe/London (explains 04:00–11:30 New York availability).

### 2026-10-15 (shipped + live tests)
- Pushed `ab216e4` to master (hero, Dot, video, popup, funnel phase 1); Vercel prod deploy Ready, live site serves new hero + video. Video re-encoded to 720p (9.3 MB): the 15 MB 1080p file kept dropping the GitHub push over the Zanzibar connection.
- Live: LEAK_MAP_COURSE_LIVE=true on Vercel; MailerLite automations ON: map leak, Audit enquiry: booking nudge, Audit booked: before we talk. Newsletter "Simple welcome email" still OFF.
- Tested on prod: Leak Map sign-up → exactly one email 1 from MailerLite, inbox, dkim=pass (naunas.co.uk) + spf=pass + dmarc=pass. Questionnaire → "Audit enquiry: not booked" with fields, nudge queued. Test booking blocked by Claude's permission guard: Naufal to book with its.naunas+aq1015@gmail.com to verify booked→pre-call + nudge removal, then cancel.
- Found: footer `{$address}` renders blank (postal address not set / wrong tag). Cal.com availability is 04:00–11:30 New York = 01:00–08:30 LA, poor for US buyers. Test HubSpot contacts/deal (Leak Test, Audit Tester) to delete after the booking test.

### 2026-10-14 (funnel phase 1: nudges + pre-call)
- Plan agreed with Naufal: HubSpot deal stage = source of truth; site webhooks move people between MailerLite groups (option B) + Claude as operator for briefs/drafts (option C). No HubSpot Workflows (Pro tier); no n8n.
- Code: `/api/enquiry` adds qualified questionnaire leads to MailerLite group "Audit enquiry: not booked" (first name, business_type, whats_not_working). `/api/cal-webhook` now handles CREATED (→ "Audit booked" with call_time in booker's tz, removes from Leak Map + not-booked), RESCHEDULED (updates call_time), CANCELLED (removes from booked). New fields auto-created in `lib/mailerlite.ts`. Email copy + builder in `docs/emails/` (nudge-1, nudge-2, pre-call). tsc clean.
- MailerLite (via connector): groups + fields created; automations "Audit enquiry: booking nudge" (1d → email, 2d → email) and "Audit booked: before we talk" (instant) built with HTML, exit-on-removal ON, all emails eligible. Both DISABLED until this code is deployed.
- Cal.com webhook on event 7431234 now subscribes to BOOKING_CREATED + RESCHEDULED + CANCELLED (live code ignores the new two until deploy).
- Next: pre-call brief + daily reply triage + proposal drafts from Fathom (needs a past proposal as template); Cal.com reminders (Workflows not exposed via API: check in dashboard).

### 2026-10-13 (video section CTA → audit)
- JourneyVideo's orange button "Watch the walkthrough ↗" (played the video) is now "Book your free audit →" and opens the EnquiryModal (new `onAuditClick` prop wired from page.tsx). The centred play button on the player still plays the video. Click-tested in headless Chrome: opens the "Free audit" dialog. Open question: white "Watch the system in motion" overlay text sits on the light poster frame and is hard to read.

### 2026-10-13 (hero play circle removed)
- Removed the play circle + pulse from the hero "See how it works" link (Naufal's call); back to text + trailing arrow, still smooth-scrolls to the walkthrough video, underline-on-hover under the label. Play-circle CSS deleted. tsc clean. Local only.

### 2026-10-13 (new walkthrough video)
- Swapped the JourneyVideo for Naufal's new CapCut cut (`~/Videos/capcut final/desktop.mp4`, 135.6 MB, 1080p, 3:28). Re-encoded with Remotion's bundled ffmpeg (naunas-studio node_modules; no system ffmpeg): x264 CRF 24, maxrate 1.8M, AAC 96k, +faststart → `public/media/naunas-client-system.mp4` (14.5 MB, frame crops visually identical to source). New poster from 0:03 (Instagram enquiry frame) → `naunas-client-system-poster.jpg`. Label now "3 min 28 sec". Old video/poster moved to the session scratchpad, not shipped. tsc clean, both files serve 200 locally. Local only.

### 2026-10-12 (Leak Map popup copy + 10s delay)
- Popup now opens 10s after landing (was 5s, which landed on top of Dot's hero intro). Copy: eyebrow "Free · email course + PDF"; small print "A free email course with the 24-page PDF as your resource" (dropped the "8 short emails" promise); success "You're in. The PDF is on its way… the course starts tomorrow". **Don't deploy this copy until the MailerLite automation is ON**: the success line promises the course.
- Checked live state: DNS at phase8, SPF `include:zohomail.eu` only, no MailerLite DKIM yet; DMARC is `p=quarantine; adkim=s; aspf=s`, so MailerLite DKIM on naunas.co.uk is mandatory or every course email is quarantined. Vercel prod has MAILERLITE_API_TOKEN; LEAK_MAP_COURSE_LIVE unset (fallback PDF email still active, correct for now). Setup steps: vault `09-Content/leak-map-emails/MAILERLITE-SETUP.md`.
- DNS done same day at names.co.uk (phase8): SPF merged to `v=spf1 include:_spf.mlsend.com include:zohomail.eu ~all` (single record), DKIM CNAME `litesrv._domainkey` → `litesrv._domainkey.mlsend.com` (resolves to MailerLite's key), MailerLite verification TXT. Verified publicly via Google + Cloudflare DNS; Zoho MX untouched. MailerLite account is on the Free plan, so Custom HTML may be unavailable (fallback: rebuild the 10 emails in drag-and-drop).
- MailerLite automation "map leak" (id 201140911097251330) built by Naufal with all 10 Custom HTML emails; order/delays verified via API (1-day gaps, 3 days before the closer), all eligible_for_sending. Claude fixed email 1 subject and turned on trigger exit_when_no_longer_matches (Cal.com booking stops the course). Automation currently DISABLED. Live test sign-up 18:19 reached the Leak Map group (site side OK) but no course email since it was off; test subscriber deleted. To go live: Naufal activates → set LEAK_MAP_COURSE_LIVE=true on Vercel + redeploy (Claude's attempt was blocked by the permission guard) → re-test. Newsletter "Simple welcome email" automation found disabled (was enabled earlier today).

### 2026-10-12 (Dot moods)
- Ported moods from the video Dot (naunas-studio `docs/dot.md`) via `data-mood` on the scene: **delighted** (∩ arc eyes, blush, wider) while the hero audit CTA (`data-cta="audit"`) is hovered/focused; stage arrivals react for 1.8s then relax to curious — Enquiry **focused** (lids 46%), Signed **determined** (lids 42%, inner down 24°), Onboarded **delighted**. Lids are clipped inside each eye (#f97a32) so they never patch the gradient body. Far-away cursor: whole body tilts up to 9° towards it (`--tilt` → `rotate` on .personality); eye travel now scales with Dot size (0.1D x / 0.075D y). Worried/deflated deliberately left out of the hero. Verified with headless-Chrome screenshots. Next candidates: bored after ~8s idle, surprised on first Dot click. tsc clean. Local only.

### 2026-10-12 (Dot follows the cursor)
- Dot's eyes now track the mouse anywhere in the hero (was: only over the illustration, aimed from scene centre). Aimed from Dot's real position with a soft falloff (max ~15px x / 10px y — first pass at 7/5 was too subtle to notice; eye highlights shift too, and stage changes no longer reset the gaze while tracking). Note: the Leak Map popup (~4s in) overlays the hero, so tracking pauses until it's closed. After 2.5s without movement or on leaving the hero, eyes reset and the idle curiousLook resumes (`data-tracking` on .scene). Mouse only, off under reduced motion. tsc clean. Local only.

### 2026-10-12 (proof row hover → reviews)
- Hero "Trusted by" proof row (already an <a> to #testimonials) now has a hover/focus state: peach card behind it (pseudo-element, no layout shift), avatars fan out, "Read the reviews ↓" cue fades in beside the stars (always shown on touch). Smooth-scrolls via shared `scrollToHash` (also used by See how it works). Reduced motion respected. tsc clean. Local only.

### 2026-10-12 (hero secondary CTA → See how it works)
- Hero secondary CTA "See our client work" (/case-studies) → "See how it works" with a peach play circle + slow pulse ring; smooth-scrolls to the walkthrough video (#see-the-system), instant scroll + no pulse under reduced motion. Underline now sits under the label only. Smaller circle at the mobile/short-screen breakpoints. tsc clean. Local only.

### 2026-10-12 (double underline)
- Added a second curved orange headline underline with slightly staggered draw timing. Local only.

### 2026-10-12 (drawn headline underline)
- Changed Less chasing. to black with curved orange SVG underline: draws on arrival and redraws on hover, disabled for reduced motion. CTA text/arrows stay black. Local only.

### 2026-10-12 (case studies order and video microcopy)
- Moved Case Studies immediately above The Client System; removed duration/sound microcopy below the walkthrough CTA. Local only.

### 2026-10-12 (centred video play button)
- Centred circular play control precisely in the video frame, with label and duration underneath. Local only.

### 2026-10-12 (trusted-by avatar badge)
- Added Trusted by label above hero avatars and user-requested +10 badge at the cluster top-right. Kept quote and stars alongside. Local only.

### 2026-10-12 (annotated refinements)
- Removed video and problem section eyebrows, removed problem row divider lines (interpreting marked line break), and replaced hero review-link text with five decorative orange stars at user request. No numeric rating or count added. Discussed selectable existing client testimonials as next option. Local only.

### 2026-10-12 (working card previews and review link)
- Added enquiry message, drawn signature and sequential onboarding checklist previews; clearer titles, consistent padding, single status pills, short bead connectors and hover/focus/tap explanations. Removed duplicate title checks.
- Added Read client reviews with a speech-bubble icon beneath the quote, linking to testimonials rather than suggesting an unsupported five-star rating. Desktop/mobile fit, tap details, TypeScript and lint pass. Local only.

### 2026-10-12 (Dot personality and dark video layout)
- Restored integration banner directly after hero, removed cross-section rope, and changed video to black two-column text-left/video-right layout with walkthrough CTA; stacked on mobile. Hero rope now exits right.
- Added idle breathing/blinks/glances, anticipation before travel, curve lean, stage reactions, responsive shadow, scroll departure and return bounce. Stage cards stay stationary; user interaction interrupts intro; reduced motion disables gestures.
- TypeScript/lint pass. Verified section order, desktop/phone fit, scroll departure/return and video CTA playback with sound plus keyboard pause. Local only.

### 2026-10-12 (complete journey interactions and video)
- Extended rope beyond top viewport and continuously into new video section; smoothed bend, refined lighting, softened grid and enlarged card text. Dot travels using actual SVG curve coordinates, reacts to pointer and clicks, and settles centrally after a single intro sequence. Pulse arrival triggers enquiry, signature and checklist animations; reduced-motion preferences disable those animations.
- Added supplied 3:27 MP4 and extracted poster under public/media. Playback requires explicit click, starts with sound and exposes native controls; no video autoplay/preload. Desktop playback and keyboard pause verified; desktop/phone hero fit and TypeScript/lint checks pass. No deployment.

### 2026-10-12 (CTA and proof grouping)
- Moved hero CTAs directly below supporting copy, with testimonial proof beneath the buttons in the left column. Mobile follows the same content order before the illustration. Local only.


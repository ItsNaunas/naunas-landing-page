# Content engine: "Post everywhere" from the Naunas dashboard

## Context
Naufal posts about once a day and wants each post made once, then sent to **LinkedIn, Instagram and TikTok**. Each channel should get its own version (LinkedIn format, Instagram caption with the keyword call to action, TikTok caption), published right away or at an **exact scheduled time**. The week's best posts should become a **weekly newsletter draft**.

**What exists today:**
- LinkedIn posting (built today).
- TikTok posting: works in sandbox, but the app is **unaudited**, so it can only post to private accounts. Posts for the public account must **wait**, while the other channels still go out.
- Instagram: comment→DM only, no publishing yet.
- MailerLite: stats only.

**House rules:**
- Nothing posts or sends without Naufal's click. A scheduled post counts as his click, because he pressed Schedule.
- The newsletter is a draft only.
- No invented numbers or claims.
- One channel failing never blocks the others.

**Decided with Naufal:**
- about 1 post a day;
- **exact-time scheduling** via Upstash QStash (free tier);
- weekly Monday newsletter draft.

The reference copy of the plan lives at `docs/content-engine/PLAN.md` and gets updated to match this one.

## Architecture

### Data (private Blob through `src/lib/store.ts`)
`content/posts/<id>.json`, plus `content/index.json` (id, date, overall status, channel statuses) for lists and the calendar.

```
id, createdAt, status: draft | scheduled | publishing | done | partial
master: { idea, media?: { path, kind, durationSec, width, height, sizeBytes }, transcript?, srt? }
scheduledFor?: ISO, qstashMessageId?
channels.linkedin  { enabled, text, visibility, firstComment, status, url?, urn?, error?, attempts, postedAt? }
channels.instagram { enabled, caption, campaignId?, status, url?, mediaId?, error?, attempts, postedAt? }
channels.tiktok    { enabled, caption, privacy, allowComment, allowDuet, allowStitch, yourBrand, brandedContent, status, publishId?, error?, attempts, postedAt? }
flags: string[]   (pre-flight and guardrail warnings Naufal acknowledged)
newsletterBlurb?
```

**Channel status values:**
- `off`: not ticked.
- `ready`
- `scheduled`
- `publishing`
- `posted`
- `failed`: the error is kept and a Retry button is shown.
- `held`: TikTok while unaudited, sent later in bulk.

The media file is kept until every enabled channel is `posted`, `off` or discarded (Retry needs it), then deleted.

### New modules
- `src/lib/content.ts`: the post store (create/get/save/list/index), `publishPost(id, channels?)`, overall status roll-up, and media clean-up.
- `src/lib/channels/{linkedin,instagram,tiktok}.ts`: adapters with one interface: `preflight(post): Issue[]` and `publish(post): Promise<{ status, url?, ids?, error? }>`. They wrap the existing libraries:
  - LinkedIn: `publishPost`, `escapeLittle`, `postUrl` in `src/lib/linkedin.ts`, plus a new `commentOnPost(urn, text)` (`POST /rest/socialActions/{urn}/comments`).
  - TikTok: `creatorInfo`, `publishVideo`, `publishStatus` in `src/lib/tiktok.ts`. When the post can't go public yet, it returns `held` instead of `failed`. Detected two ways: the `unaudited_client_can_only_post_to_private_accounts` error, or a `TIKTOK_APPROVED` flag that is unset.
  - Instagram: `ig()` in `src/lib/instagram.ts` plus new `publishReel` and `publishImage`.
- `src/lib/mediaLink.ts` and route `src/app/m/[token]/route.ts`: **short-lived public links** for Instagram's fetch. The token is an HMAC of path and expiry (1 hour, key derived from `DASHBOARD_PASSWORD`, like `src/lib/dashAuth.ts`). It only serves `content/media/*`, streaming from the private Blob with `get()`. robots disallows `/m/`.
- `src/lib/qstash.ts`:
  - `schedule(postId, at)` calls `POST https://qstash.upstash.io/v2/publish/{site}/api/content/fire` with `Upstash-Not-Before`, and returns the message id.
  - `cancel(messageId)` calls `DELETE /v2/messages/{id}`.
  - `verify(req)` checks QStash's signature JWT (HS256 with the current/next signing keys, checking the body hash). No SDK; Web Crypto, like `dashAuth`.
- Route `src/app/api/content/fire/route.ts`: QStash-signed only. It loads the post, re-checks it's still `scheduled` (so cancelled posts are ignored), and runs `publishPost`. Each channel is saved as it finishes, so a timeout loses nothing.
- `src/lib/ai.ts` (Phase 4): a minimal Anthropic Messages API call through `fetch`, with no SDK, matching the repo's no-SDK pattern.
- `src/lib/newsletter.ts` (Phase 5): MailerLite campaign **draft** through `ml()` in `src/lib/mailerlite.ts`.

### Reused pieces
- Browser→Blob upload route `src/app/dashboard/(app)/media/upload/route.ts`: add the `content/media/` prefix, allowing video and images.
- The `/go/[id]` tracked links (`src/app/go/[id]/route.ts`): extended so a `p-<postId>-<li|ig|tt>` id resolves to the post's link with `utm_source=<channel>&utm_medium=social&utm_campaign=<postId>`. Site attribution (`src/lib/attribution.ts`) already writes `first_touch_campaign` to HubSpot (`src/lib/hubspot.ts:105`), so leads tie back to the post.
- Keyword campaigns (`src/lib/campaigns.ts`): after an Instagram publish, the media id is added to the chosen campaign's `postIds`, or a per-post campaign is created.
- `logEvent` (`src/lib/events.ts`, new kind `content`), `notify` (`src/lib/alert.ts`) for Telegram, and `runChecks` (`src/lib/health.ts`) for the QStash and Instagram publish-permission checks.
- `requireSession` and the `useActionState` patterns in `src/app/dashboard/actions.ts`.
- UI kit: `Card`, `Badge`, `Kpi`, `SectionTitle`, `Drawer`, `Chips` (`src/components/dashboard/ui.tsx`, `kit.tsx`).
- Demo mode (`src/lib/ops/demo.ts`) gets content fixtures.

### Config (`src/config/funnel.ts` → `content`)
- `weeklyTarget: 7`
- `defaultTimes` as US East suggestions (09:00 / 12:00 / 18:00), shown as quick picks in the scheduler
- `newsletterDay: 'monday'`
- `linkedinFirstComment: true`
- `replyReminderMin: 30`

## Phases

**Phase 1: Engine (needs QStash keys; everything else works without new keys)**
1. `content.ts` store and index; channel adapters for LinkedIn (with the first comment) and TikTok (with `held`).
2. **Pre-flight**: 9:16 and duration limits per channel; caption limits (LinkedIn 3,000, Instagram 2,200, TikTok 2,200); a link inside the LinkedIn text (suggest the first comment); Instagram missing the keyword CTA; LinkedIn token under 7 days; image posts skip TikTok; TikTok held notice.
3. Publish runner: `Promise.allSettled` per channel, with each result saved straight away. Telegram: "Posted 2/3: LinkedIn ✅ Instagram ✅ TikTok ⏳ held", with links and failure reasons.
4. QStash scheduling: the fire route, cancel and reschedule.
5. Per-post `/go` links.
6. Server actions: `createContentPost`, `saveContentPost`, `publishContentNow`, `scheduleContent`, `cancelSchedule`, `retryChannel`, `sendHeldTikTok`, `discardHeld`.

**Phase 2: Instagram publishing (needs the `instagram_business_content_publish` permission and a new token)**
- Reels: `POST /me/media` (`REELS`, `video_url` = the `/m/` link, `caption`, `share_to_feed`), then poll `status_code` until `FINISHED` (up to about 5 min), then `POST /me/media_publish`, then fetch the permalink.
- Images: the same with `image_url`.
- Link the post to its keyword campaign. Add a health check for the permission.

**Phase 3: Composer UI (`/dashboard/content`)**
- **New post** opens a full-width editor:
  - media upload with a preview, showing its 9:16 and duration;
  - the idea / master caption;
  - an optional transcript or SRT upload.
- **Three channel cards** (stacked on mobile), each with a tick box, editable text, a platform-style preview, its options, and a pre-flight list. The TikTok card keeps the audit-required controls (privacy with no default, interactions off by default, disclosure, consent line), reusing the logic in `src/app/dashboard/(app)/tiktok/TikTokComposer.tsx`.
- Footer: **Publish now** or **Schedule** (a date and time picker in Zanzibar time, with US East shown alongside, plus the quick-pick times).
- **Post detail drawer**: each channel's status, link, error and Retry; the tracked links; cancel or reschedule.
- **Calendar**: the week view with scheduled, posted and held posts, the 7/week target meter, and gaps highlighted. The list view has filters.
- **Held TikTok tray**: "N waiting for TikTok approval", with **Send all** (enabled once `TIKTOK_APPROVED=1`) and **Discard**.
- The existing `/dashboard/tiktok` and `/dashboard/linkedin` stay for stats and one-offs.

**Phase 4: AI (shipped 2026-10-17 on OpenAI: existing `OPENAI_API_KEY`, model gpt-4.1-mini, override with `OPENAI_MODEL`; gpt-5 models need OpenAI org verification)**
- **Adapt**: one call to Sonnet 5.5 with structured JSON returns the LinkedIn text, the Instagram caption with the keyword CTA, the TikTok caption, **three hooks per channel**, the newsletter blurb, and a suggested first comment.
- Inputs: the idea, the transcript, `src/config/voice.md` (about 10 example posts from Naufal), and the ICP (US high-ticket project businesses, interior design first).
- **Guardrails**: numbers, names or claims not in the source are flagged ⚠️ and must be acknowledged. It also flags off-ICP copy.
- **Repurpose**:
  - a text-only LinkedIn post (as a new draft);
  - a **LinkedIn carousel**: Claude writes the slide text, the server renders a branded PDF (satori + resvg, or pdf-lib), and it's posted through the Documents API;
  - the newsletter blurb.
- **Captions**: when an SRT is attached (from the local `naunas-studio` faster-whisper pipeline), LinkedIn video gets a caption upload. Burned-in subtitles for TikTok and Reels stay in the studio pipeline.

**Phase 5: Weekly newsletter draft** (shipped 2026-10-18 · `src/lib/newsletter.ts`; if MailerLite refuses API HTML on the free plan, the draft is made without a body and the HTML is copied from Content → Weekly newsletter)
- The existing 06:00 UTC health cron runs it on **Mondays only**.
- Last week's posted items are ranked by tracked clicks and leads.
- The MailerLite **draft campaign** for the Newsletter group contains a subject, an intro (AI, or a template if there's no key), the best post first, the others below, and a "Book your free audit" CTA.
- Telegram sends a "draft ready" link. If nothing was posted that week, there's no draft and Telegram says so. It's never sent automatically.

**Phase 6: Performance and habits** (shipped 2026-10-18 · `src/lib/performance.ts`: leaderboard, IG insights in the daily cron, reply reminder, re-post suggestions. Deferred: studio drop, LinkedIn xlsx import, TikTok stats until approval)
- **Leaderboard** on the Content tab: per post, clicks per channel, leads, bookings and deals (HubSpot `first_touch_campaign = postId`), and Instagram keyword DMs, sorted by leads.
- **Stats pulled back**: Instagram media insights, and TikTok `video.list` matched by id once approved. LinkedIn has no API, so its monthly analytics xlsx is uploaded and matched by date and text.
- Telegram **reply reminder** 30 minutes after posting, using a QStash delayed message.
- **Evergreen re-post** suggestions: older than 90 days and produced leads.
- A **studio drop**: a token-protected endpoint so `naunas-studio` can upload a finished video and SRT as a draft post.

## What Naufal provides
| Phase | Item |
|---|---|
| 1 | Upstash account (free), then QStash: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` in Vercel + Bitwarden |
| 2 | Meta app: add `instagram_business_content_publish`, regenerate the token, update `IG_ACCESS_TOKEN` |
| 4 | `ANTHROPIC_API_KEY`, plus about 10 past posts he likes for `voice.md` |
| On TikTok approval | Production `TIKTOK_CLIENT_KEY` / `_SECRET`, set `TIKTOK_APPROVED=1`, reconnect, pass the Direct Post audit, then **Send all held** |

## Build order
Phase 1 → Phase 3 (usable with hand-written versions and LinkedIn alone) → Phase 2 → Phase 4 → Phase 5 → Phase 6. Each phase is shipped and verified before the next.

## Verification (each phase)
- `npx tsc --noEmit`, `npx next build`, and demo-mode Playwright screenshots of `/dashboard/content` at 1440px and 390px (no horizontal scroll).
- Push and check the deploy is Ready.
- **Phase 1:**
  - an unsigned `POST /api/content/fire` returns 401, and a `/m/` link with a bad or expired token returns 404;
  - a real post with LinkedIn ticked (connections-only) is published and its first comment appears;
  - TikTok shows `held`; Telegram shows "Posted 1/2 · TikTok held";
  - a 2-minute-ahead schedule fires on time, and cancelling one stops it.
- **Phase 2:** a test Reel publishes, a keyword comment from @nnfl.88 triggers the DM, and the lead shows `first_touch_campaign = postId`.
- **Phase 4:** Adapt on a sample transcript gives three versions; an inserted made-up figure gets flagged.
- **Phase 5:** run the digest on demand (dashboard button) → a draft appears in MailerLite, unsent.
- Each phase updates PROGRESS.md, RUNBOOK §8b (new env vars) and `docs/content-engine/PLAN.md`.

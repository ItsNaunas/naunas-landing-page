# The Client System: install runbook

How to stand the whole funnel up for a business, from zero, on free tiers. Naunas runs on exactly this. The point of the runbook is that a fresh install follows it top to bottom with no memory of how ours was built.

**What the client ends up with:**
- A site that captures leads: a lead-magnet pop-up, a questionnaire that books into a calendar, and a newsletter sign-up.
- Email sequences that start and stop themselves.
- A CRM where every person's deal stage is accurate without anyone typing.
- Deposits that close the deal.
- An alert on their phone for every lead, payment and failure.
- A Monday scoreboard.

## 0. How it fits together

| Job | Tool | Free limit to watch |
|---|---|---|
| Multi-email sequences only | MailerLite | 3 active automations, 1,000 subscribers, 12k emails/mo, ML logo in footer |
| One-off emails (pre-call, no-show, onboarding, brief, fallbacks) | The site, through the client's own mailbox SMTP (Zoho) | provider daily send cap |
| CRM, the source of truth (deal stage = where a person is) | HubSpot free + service key | no Workflows on free: the site drives emails |
| Booking, confirmations, reminders | Cal.com | no-show has to be marked by hand |
| Deposits | Stripe Payment Links | per-transaction fees only |
| Alerts | Telegram bot | — |
| Daily health check + weekly scoreboard | Vercel cron | daily granularity on Hobby |
| Judgement work (reply triage, pre-call research, recap + proposal drafts) | Claude routine + connectors | keep the prompt lean |
| Instagram comment → DM, DM → CRM | Meta Instagram API + site webhook | token lasts 60 days (auto-refreshed monthly) |

**Movement rule:** a person moves through the funnel by **group membership** (MailerLite) and **deal stage** (HubSpot). Each automation is triggered by joining a group and exits when the person leaves it. The site adds and removes people; nobody does it by hand.

**Hosting:** Vercel **Hobby is non-commercial**. For a paying client use Vercel Pro or Cloudflare Workers/Pages. Naunas itself is fine on Hobby only while it proves the system.

## 1. Config file

Copy the repo, then edit **`src/config/funnel.ts`**. Every business-specific ID, name and link lives there:

| Key | What to put |
|---|---|
| `site`, `leadMagnetPdf` | Client domain and their lead-magnet PDF URL |
| `ownerTz` | Owner's IANA time zone (call times in alerts and briefs) |
| `logsUrl` | Their Vercel project's runtime logs URL |
| `cal.link` | Cal.com `user/event` slug |
| `hubspot.portalId`, `ownerId`, `stages` | Read from HubSpot (step 4) |
| `mailerlite.groups`, `automations` | Names exactly as created in step 3 |
| `instagram.keywords`, `dmLink`, `dmText` | Comment keyword(s) and the DM they trigger |
| `alerts.vaultEmail` | Where the "Stripe: <event>" record emails go |

Also swap the copy:
- **Email copy** lives in `src/lib/emails.ts` (pre-call, no-show, onboarding) and `src/lib/brief.ts` (the owner's pre-call brief).
- **MailerLite sequence HTML** lives in `docs/emails/`. Edit it, run `node docs/emails/build.mjs`, then paste into MailerLite.

## 2. Domain email (do this first: everything else sends through it)

1. **Mailbox:** create it at the client's provider (Zoho free works). Add Zoho's SPF, DKIM and MX records.
2. **MailerLite → Domains:** add the domain and its DKIM CNAME (`litesrv._domainkey`). **Merge** MailerLite's SPF include into the existing SPF record. Never add a second SPF record: two SPF records fail both.
3. **DMARC:** start with `p=none`. Once a test email shows `dkim=pass spf=pass dmarc=pass` in its raw headers, tighten it.
4. **Postal address:** add it in MailerLite → Account → Company. Without it, the email footers render blank, which is a legal problem.

## 3. MailerLite

**API key:**
1. Integrations → API → new token.
2. Store it as `MAILERLITE_API_TOKEN` in Vercel and Bitwarden, nowhere else.

The site creates the groups and custom fields on first use. Create the **3 automations**, each triggered by joining a group, with "exit when no longer matches" switched on:

1. **Lead-magnet course** (trigger: `groups.leakMap`): day 0 delivers the PDF, then the course emails.
   - Last step: an **Action → add to group `groups.newsletter`**, so finishers roll into the newsletter.
   - This step has to be added in the UI; the API can only add emails and delays.
   - Until the course is on, leave `LEAK_MAP_COURSE_LIVE` unset. The site then emails the PDF directly so no sign-up gets nothing.
2. **Booking nudge** (trigger: `groups.enquired`): 2 emails pushing qualified questionnaire leads to book. Booking removes them from the group, which stops the sequence.
3. **Newsletter welcome** (trigger: `groups.newsletter`).

Automation names must match `mailerlite.automations` exactly. The health check alerts by name if any is off.

## 4. HubSpot

1. **Service key:** Settings → Integrations → Service keys (private apps are disabled on new portals).
   - Scopes: `crm.objects.contacts` read+write, `crm.objects.deals` read+write, `crm.objects.companies` read+write, `crm.objects.owners.read`.
   - Store it as `HUBSPOT_TOKEN`.
   - **Do not** use the Developer API key. It returns 401 for everything. That was the cause of our 3 days of silent failures.
2. **Pipeline:** create stages New enquiry → Contacted → Audit booked → Audit done → Scope sent → Won / Lost, then copy their IDs into `hubspot.stages`.
3. **Custom properties** (the Claude HubSpot connector can create them):

   | Object | Property | Type and options |
   |---|---|---|
   | Contact | `naunas_lead_source` | dropdown: audit_questionnaire, leak_map_popup, cold_email, instagram_dm, linkedin, referral, contact_form, other (add `newsletter` if wanted) |
   | Contact | `naunas_priority` | dropdown: high/normal/small |
   | Contact | `client_value`, `monthly_revenue_band`, `business_type`, `whats_not_working` | text |
   | Contact | `first_touch_*`, `last_touch_*` (source, medium, campaign), `first_landing_page`, `converted_on_page` | text |
   | Contact | `instagram_handle` | text |
   | Deal | `deal_lead_source`, `deal_source` | text |
   | Deal | `naunas_deal_priority` | dropdown: high/normal/small |
   | Deal | `naunas_lost_reason` | dropdown: price, timing, competitor, diy, no_fit, ghosted, other |

4. **IDs:** owner ID comes from Settings → Users (or the connector's `search_owners`). Portal ID is in any HubSpot URL.

## 5. Cal.com

1. Profile time zone = the owner's. Set availability to their call hours. Ours are 16:00–22:00 Zanzibar, which is US morning.
2. Settings → Developer → Webhooks, scoped to the audit event:
   - URL: `https://<domain>/api/cal-webhook`
   - Triggers: **Booking created, Rescheduled, Cancelled, No-show updated**
   - Generate a secret and store it as `CAL_WEBHOOK_SECRET`.
3. Questionnaire answers are prefilled into Cal by `/audit`. Keep the booking question slugs the same, or update `src/app/api/cal-webhook/route.ts`.

## 6. Stripe

1. Developers → Webhooks → add endpoint `https://<domain>/api/stripe-webhook` with these events:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`;
   - `payment_intent.payment_failed`;
   - `invoice.paid`, `invoice.payment_failed`;
   - `customer.subscription.deleted`;
   - `charge.dispute.created`, `charge.refunded`.

   Store its signing secret as `STRIPE_WEBHOOK_SECRET`. No API key is needed: the site only receives events.
2. **Deposit link convention:** a Payment Link per deal, sent as
   `https://buy.stripe.com/<link>?client_reference_id=<HubSpot deal id>&prefilled_email=<their email>`.
   On payment:
   - the deal moves to Won with the amount;
   - the onboarding email goes out;
   - Telegram 💰 fires.
   
   Without the deal ID, the site falls back to matching by email. When neither matches, it alerts instead of onboarding a stranger.
3. Turn off any older Stripe → email automation (Zapier/n8n), or customers get two emails.

## 7. Telegram alerts

1. In Telegram, @BotFather → `/newbot`. Store the token as `TELEGRAM_BOT_TOKEN`.
2. The owner sends the bot `/start`. Then `https://api.telegram.org/bot<token>/getUpdates` shows `chat.id`. Store it as `TELEGRAM_CHAT_ID`.

## 8. Instagram (optional)

1. developers.facebook.com → create app → add **Instagram API with Instagram Login**. The account must be professional (Business or Creator).
2. Permissions: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.
   - The app can stay in development mode while only the owner's own account is connected.
3. Generate a long-lived token for the account and store it as `IG_ACCESS_TOKEN`. Store the app secret (Instagram app secret, not the Facebook one) as `META_APP_SECRET`. Pick any random string as `IG_VERIFY_TOKEN`.
4. Webhooks:
   - callback `https://<domain>/api/instagram-webhook`, using that verify token;
   - subscribe to **comments** and **messages**.
5. In the Instagram app: Settings → Messages → Connected tools → allow access to messages.

**What it does:**
- A comment containing a keyword → one DM with the lead-magnet link, plus a CRM contact and Telegram.
- A first DM from someone new → CRM contact (by handle) plus Telegram.
- The token is refreshed on the 1st of each month by the health cron. If Instagram ever issues a new value, Telegram says so.

## 8b. Dashboard, campaigns and storage
1. **Blob store:** Vercel → Storage → Create → **Blob**, set to **private**, then connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically.
2. Set `DASHBOARD_PASSWORD`. The owner signs in at `/dashboard`. Changing the password signs everyone out.
3. **Comment and DM campaigns** are edited on the dashboard and go live with no deploy:
   - Each campaign has keywords, comments and/or DMs, optional post IDs, the DM text with `{link}`, the destination URL and an end date.
   - `{link}` becomes `/go/<campaign>`, which counts the click and adds the utm tags.
   - The default campaign lives in `funnel.ts` and keeps working if Blob is down.
4. **Routine reports:** the routine logs each run as a HubSpot note on the internal contact `routine.logEmail` (body starts with `NAUNAS_ROUTINE_REPORT` + JSON), and the dashboard reads them. No extra secret, and nothing for the routine's network sandbox to block.

## 9. Env vars (Vercel → Settings → Environment Variables, Production; copy each into Bitwarden)

| Var | From | Required |
|---|---|---|
| `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS` | mailbox app password (step 2) | yes |
| `MAILERLITE_API_TOKEN` | step 3 | yes |
| `HUBSPOT_TOKEN` | step 4 service key | yes |
| `CAL_WEBHOOK_SECRET` | step 5 | yes |
| `STRIPE_WEBHOOK_SECRET` | step 6 | yes |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | step 7 | yes |
| `CRON_SECRET` | any long random string; Vercel cron sends it | yes |
| `LEAK_MAP_COURSE_LIVE` | `true` once the course automation is on | when live |
| `BRIEF_TO` | where pre-call briefs go (default: the mailbox) | no |
| `VAULT_ALERT_TO` | overrides `alerts.vaultEmail` | no |
| `IG_ACCESS_TOKEN`, `META_APP_SECRET`, `IG_VERIFY_TOKEN` | step 8 | Instagram only |
| `BLOB_READ_WRITE_TOKEN` | step 8b (auto) | dashboard editing + stats (used until `DATABASE_URL` is set) |
| `STRIPE_LINKS_KEY` | Stripe restricted key: WRITE on Products, Prices, Payment Links; nothing else | proposals make their own deposit link on publish (optional) |
| `DATABASE_URL` | Neon → project → Connection string (pooled) | dashboard store on Postgres: safe under concurrent writes; press “Copy from Blob” on System → Health once after setting it |
| `DASHBOARD_PASSWORD` | step 8b | dashboard |
| `CAL_API_KEY` | Cal.com → Settings → Developer → API keys | dashboard Calls tab (optional) |
| `STRIPE_SECRET_KEY` (or a restricted `STRIPE_KEY`) | Stripe secret key; a restricted key also works with READ: Charges, PaymentIntents, Checkout Sessions, Subscriptions, Balance. WRITE: Invoices, Products, Prices, Payment Links. Everything else None | Money tab, overdue-invoice reminders, proposal deposit links (optional; replaces STRIPE_READ_KEY + STRIPE_LINKS_KEY, which still work) |
| `FATHOM_API_KEY` | Fathom → Settings → API Access | call recordings + recaps on lead pages (optional) |
| `FATHOM_WEBHOOK_SECRET` | Fathom → API Access → Manage → Add Webhook (URL `/api/fathom-webhook`, include summary + action items) | same-day recap to HubSpot + Telegram (optional) |
| `APIFY_TOKEN` | Apify → Settings → Integrations | Outreach → Find prospects (optional, monthly cap in dashboard) |
| (none) IMAP | Zoho Mail → Settings → Mail Accounts → IMAP Access ON (same app password) | email threads, outreach replies, sequence stop-on-reply |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | developers.tiktok.com → app → Credentials (Sandbox until approved, then Production) | TikTok tab + content engine (optional) |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | linkedin.com/developers → app → Auth (products: OpenID Connect + Share on LinkedIn) | LinkedIn tab + content engine; reconnect every 60 days (optional) |
| `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (+ `QSTASH_URL` if shown) | console.upstash.com → QStash → Request builder / Signing keys | exact-time scheduled posts (optional; without it, Publish now only) |

Secrets never go in the repo, in chat, or in `funnel.ts`. Redeploy after changing env vars.

## 10. Claude operator routine

One daily routine (claude.ai → Code → Routines) with these connectors: HubSpot, the mailbox, Gmail (owner digest), Fathom, MailerLite, Google Calendar and Google Drive.

**Jobs:**
- reply triage (a real reply → removed from sequences, deal updated, answer **drafted**);
- next-24h pre-call research;
- post-call recap and proposal draft as a Google Doc;
- retention asks (testimonial, case study, referral) at milestones after Won.

Everything comes back as **one digest email to the owner**. The routine never messages leads or clients; it only drafts. The prompt to copy is Naunas's "Naunas funnel operator" routine; swap in the names.

## 11. Prove it

1. `vercel deploy`, then wait for Ready.
2. `MAILERLITE_API_TOKEN=… HUBSPOT_TOKEN=… CRON_SECRET=… node scripts/funnel-test.mjs https://<domain> <owner gmail>`. It signs up a throwaway `+ftest` address, checks MailerLite and HubSpot, then deletes it.
3. Book a real test call: the pre-call email arrives from the mailbox, the brief arrives to the owner, the deal shows Audit booked, and Telegram fires. Cancel it, and they're removed from the booked group.
4. Pay a £1 test with `client_reference_id` set to a test deal: the deal goes Won, onboarding arrives, Telegram 💰 fires. Then refund it.
5. `GET /api/health?ping=1&job=scoreboard` with the cron secret: Telegram shows all green plus the scoreboard. `?job=<name>` runs one of the 09:00 jobs on its own (deals, asks, triage, topup, backup, insights, scoreboard, newsletter, igtoken, briefing, brief; see `src/lib/dailyJobs.ts`). Without `job`, the cron hands each of today's jobs to QStash as its own call, so one slow service can't time out the rest; with no QStash keys they run one after another.
6. Delete the test contacts and deals in HubSpot.
7. Before any change ships: `npm run test:e2e` (or `npm run test:e2e -- e2e3 e2e10` for some). 15 browser suites run against local dev servers with every real key blanked and HubSpot/OpenAI mocked; nothing reaches a real service. Needs Chrome (`CHROME_PATH` if it isn't in the Windows default place). Logs and screenshots land in `tests/e2e/.out/`.

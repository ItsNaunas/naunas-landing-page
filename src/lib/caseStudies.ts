// Case study content. Source of truth for real numbers + quotes: vault 09-Content/case-study-drafts.md.
// Real numbers only, each traceable to a client call, Eventbrite or WhatsApp. No invented figures.

export type CaseStudy = {
  slug: string;
  client: string;
  sector: string;
  /** One line for cards. */
  summary: string;
  /** The headline number or outcome on the card. */
  metric: { value: string; label: string };
  layers?: string[];
  results?: { value: string; label: string }[];
  started?: { intro: string; bullets?: string[] };
  approach?: string;
  built?: { title: string; text: string }[];
  steps?: string[];
  decisions?: { title: string; text: string }[];
  changed?: string[];
  quote?: { text: string; author: string };
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'soul-in-the-horn',
    client: 'Soul in the Horn',
    sector: 'Live music brand · Brooklyn',
    summary: 'Five tools, one screen. Every sale, every channel, every campaign, and the follow-ups run themselves.',
    metric: { value: '$26,736', label: 'one event’s gross, campaigns I planned' },
    layers: ['Follow-up', 'Retention', 'Attribution'],
    results: [
      { value: '$26,736', label: 'Summer flagship gross (Eventbrite)' },
      { value: '37 → 269', label: 'Tickets, four days out to the night' },
      { value: '100+', label: 'Dancer track purchases, first month' },
      { value: '$250', label: 'From 2 campaigns to the inactive list, in 2–3 days' },
    ],
    started: {
      intro: 'Soul in the Horn has a loyal crowd, the same faces at every event. But the team was running the business across five tools that didn’t talk to each other: Eventbrite, Stripe, Shopify, Klaviyo and Instagram.',
      bullets: [
        'Every campaign was written and sent by hand, so the list got too many emails and sales from email kept dropping.',
        'Nobody could say which post, email or ad actually sold a ticket.',
        'Dancers got in by buying a track, and every receipt was checked by hand, with discount codes typed out one at a time.',
        'Social posting through a third-party scheduler had been failing for weeks.',
      ],
    },
    approach: 'Don’t add another tool. Put everything they already use on one screen, then automate only the campaigns the data showed actually sell tickets.',
    built: [
      { title: 'The Control Center', text: 'Every event shows whether it’s on pace or behind, and why, compared against past events.' },
      { title: 'Campaigns that arm themselves', text: 'The system checks Eventbrite every 30 minutes. When a ticket tier changes, a new act is announced or an event falls behind pace, the right email or SMS is ready. The team previews it, tests it and arms it.' },
      { title: 'Attribution', text: 'Tagged links on Instagram, email and ads, so every ticket shows where it came from, with a chart marking the sales each campaign produced.' },
      { title: 'The dancer portal', text: 'Dancers submit their receipt, AI checks it, rejects duplicates and emails a unique ticket link automatically.' },
      { title: 'Content DNA', text: 'Reads their Instagram and shows which formats and themes sell. For them: videos, and lineup drops above all.' },
    ],
    steps: [
      'A new event goes up on Eventbrite.',
      'Pre-sale, lineup, last-chance, BOGO and recap campaigns are lined up for it automatically.',
      'The team previews and arms them from one screen.',
      'As tickets sell, the dashboard shows which channel sold each one.',
      'If the event falls behind pace, a pace-push campaign is ready to go.',
      'After the event: a recap for people who came, a “you missed it” for people who didn’t, early access for regulars.',
    ],
    decisions: [
      { title: 'Fewer, meaningful emails', text: 'The data showed that sending less, and only what matters, beat the old volume.' },
      { title: 'People stay in control', text: 'Nothing sends until someone on the team arms it.' },
      { title: 'Built on their own accounts', text: 'Eventbrite, Klaviyo and Instagram stay theirs. The dashboard sits on top.' },
    ],
    changed: [
      'June: a post that had failed for weeks went live on Instagram and TikTok in one click, on the call.',
      'June: two campaigns to people who had stopped opening emails brought in $250 in 2–3 days.',
      'July: I built the full campaign plan for The Real Summer Party. It grossed $26,736.',
      'October: an event sitting at 37 tickets against 600 capacity four days out. We changed the ticket tiers so they move up after 50 sales instead of by date and ran daily email and SMS through the system. It finished at 269 tickets, $7,666 gross.',
      'The dancer receipt check flagged 2 reused receipts, and shared dancer codes were replaced with single-use ones.',
      'When a funded AI ticketing company pitched them, the founders’ question was what it could do that “our Control Center” couldn’t.',
    ],
    quote: { text: 'I appreciate your brain, man. You’re making things make sense. I’m part of the team at this point.', author: 'Derick Prosper, Founder' },
  },
  {
    slug: 'nelia-rose-designs',
    client: 'Nelia Rose Designs',
    sector: 'Design studio',
    summary: 'The client system for a design studio. Pay the deposit and onboarding happens on its own.',
    metric: { value: 'Deposit → portal', label: 'contract, portal and next steps, automatic' },
    layers: ['Capture', 'Conversion', 'Fulfilment', 'Retention'],
    results: [
      { value: 'Deposit', label: 'Contract, portal and next steps sent automatically' },
      { value: 'Portal', label: 'White-label client portal for every project' },
      { value: 'Instalments', label: 'Big projects paid in stages on Stripe' },
      { value: 'Referral', label: 'Review and referral asks after final payment' },
    ],
    started: {
      intro: 'The studio was moving up to high-ticket brand experiences, and the founder wanted to focus on the creative work. Around it:',
      bullets: [
        'There was no proper website to sell a premium service.',
        'Every new client was onboarded by hand: contract, booking, welcome, next steps.',
        'Finishing a project ended with nothing: no review request, no referral ask.',
      ],
    },
    approach: 'Map the client’s journey from first visit to final payment, then make every step after “yes” happen on its own.',
    built: [
      { title: 'A custom website', text: 'With an admin page, so the founder edits her own content without a developer.' },
      { title: 'Lead capture', text: 'A service quiz that steers visitors to the right package, plus a first-booking offer.' },
      { title: 'After the deposit', text: 'The booking link, contract, client portal and a “next steps” email go out automatically.' },
      { title: 'A white-label client portal', text: 'Where each client sees their project.' },
      { title: 'Instalment billing', text: 'On Stripe, so big projects can be paid in stages.' },
      { title: 'After the final payment', text: 'A review request and referral information go out automatically.' },
    ],
    steps: [
      'A visitor takes the quiz and lands on the right package.',
      'They enquire and pay the deposit.',
      'Contract, booking link, portal access and next steps arrive within minutes.',
      'The project runs through the portal, and instalments are collected on schedule.',
      'The final payment triggers the review and referral asks.',
    ],
    decisions: [
      { title: 'Automate after the money, not before', text: 'The sales conversation stays personal. Everything after the deposit is a system.' },
      { title: 'Owner-editable', text: 'An admin page instead of a developer for every change.' },
    ],
    quote: { text: 'I’ve had a play around and just know you are never leaving. You are so amazing at what you do!', author: 'Uche Ibeh, Founder' },
  },
  {
    slug: 'snaeb',
    client: 'SNAEB',
    sector: 'B2B subscription platform',
    summary: 'A subscription business built end to end. Payments, payouts and failed-payment recovery run on their own.',
    metric: { value: '4 roles', label: 'one platform, pen-tested' },
    layers: ['Conversion', 'Fulfilment', 'Retention'],
    results: [
      { value: '4', label: 'User roles: customer, HR, owner, admin' },
      { value: 'Pen-tested', label: 'External test, fixes shipped same day' },
      { value: 'Auto', label: 'Payouts and failed-payment recovery' },
      { value: 'UK + UAE', label: 'Multi-region from day one' },
    ],
    started: {
      intro: 'The founder had 25 years of running businesses, including 65+ care homes, plus the idea and the market. What he didn’t have was the platform or a tech team. He handed over the whole technical build so he could go and run the business.',
    },
    approach: 'Treat it like a business, not an app: money in, money out, and what happens when a payment fails, before anything cosmetic.',
    built: [
      { title: 'Subscriptions', text: 'On Stripe, with monthly resets and failed-payment recovery.' },
      { title: 'Payouts', text: 'To partners, automatically, through Stripe Connect.' },
      { title: 'Four roles', text: 'Each with their own view: customer, HR, business owner, admin.' },
      { title: 'Fraud protection', text: 'Business verification so fake companies can’t sign up, plus checks on QR redemptions.' },
      { title: 'Dashboards and regions', text: 'Management dashboards, with support for the UK and UAE.' },
    ],
    steps: [
      'A business signs up and is verified.',
      'HR adds staff, and staff subscribe and redeem.',
      'Billing runs monthly, and failed payments are retried and recovered automatically.',
      'Partners are paid out automatically.',
      'The owner sees the whole business on one dashboard.',
    ],
    decisions: [
      { title: 'Security first', text: 'An external pen test before launch, with every finding fixed the same day.' },
      { title: 'Stripe for the money', text: 'Billing, payouts and verification on infrastructure built for it.' },
    ],
    changed: [
      'A founder went from an idea to a production platform without hiring a tech team.',
      'With the platform ready, he’s bringing on a marketing team to push it.',
    ],
  },
  {
    slug: 'saafi-cleaning',
    client: 'SAAFI Cleaning',
    sector: 'Home cleaning · Oxfordshire',
    summary: 'From booking request to assigned job, without a phone call.',
    metric: { value: 'Book online', label: 'priced, paid and assigned' },
    layers: ['Capture', 'Pipeline', 'Fulfilment'],
    results: [
      { value: 'Online', label: 'Price and book without a phone call' },
      { value: '1 link', label: 'Per cleaner, no login' },
      { value: 'GPS', label: 'Clock-in check at start and finish' },
      { value: 'Upfront', label: 'Payment, with pay-the-difference links' },
    ],
    started: {
      intro: 'Cleaning companies usually quote by phone. SAAFI wanted booking to take a few clicks while staying profitable and keeping a team of cleaners organised.',
    },
    approach: 'Build pricing logic the owners trust, then make the cleaners’ side as simple as a single link.',
    built: [
      { title: 'A booking calculator', text: 'Recommended hours by home size, a deep-clean option, extras, and availability based on which cleaners actually work that day.' },
      { title: 'Pay up front', text: 'The customer pays when booking. If the job turns out bigger, the admin adjusts the price and the customer gets a link to pay the difference.' },
      { title: 'An admin CRM', text: 'Pipeline, calendar, customers, pricing controls, refunds and service-area limits.' },
      { title: 'One job link per cleaner', text: 'Sent on WhatsApp, with their schedule and no login.' },
      { title: 'Clock-in and clock-out', text: 'With a GPS check at start and finish, for accurate pay and billing.' },
    ],
    steps: [
      'The customer picks home size, clean type and extras, and sees the price.',
      'They pick a day a cleaner is available, and pay.',
      'The admin assigns a cleaner from the pipeline.',
      'The cleaner sees the job on their link and clocks in on site.',
      'Clock-out moves the job to done, and any price change goes out as a pay-the-difference link.',
    ],
    decisions: [
      { title: 'Upfront payment instead of card holds', text: 'After spotting that holds can be withdrawn.' },
      { title: 'Links, not logins', text: 'For the cleaners.' },
      { title: 'Deep cleans priced by the home, not the hour', text: 'A deep clean has to cover the whole house, so it’s priced by size.' },
    ],
    quote: { text: 'Oh my days… that gives us better options of different cleaners. That’s cold, that is cold.', author: 'Abdullah Said, SAAFI' },
  },
  {
    slug: 'rt-spaces',
    client: 'RT Spaces',
    sector: 'Studio hire',
    summary: 'From “message us to book” to book-and-pay online.',
    metric: { value: 'Book + pay', label: 'online, with owner-run offers' },
    layers: ['Attention', 'Capture', 'Conversion'],
    started: { intro: 'A studio-hire business taking bookings by message.' },
    built: [
      { title: 'Website rebuild', text: 'With “Studio Session” booking and Stripe payments.' },
      { title: 'Offers the owners run', text: 'Discount codes, a launch-offer pop-up and block-booking pricing, all changed from an admin dashboard.' },
      { title: 'The back office', text: 'An enquiries mailbox, T&Cs, and booking moved onto Cal.com.' },
    ],
  },
  {
    slug: 'the-peoples-circle',
    client: 'The People’s Circle',
    sector: 'Community events · Oxford',
    summary: 'From DMs and flyers to a sign-up system the organisers run themselves.',
    metric: { value: 'Live', label: 'events site + admin dashboard' },
    layers: ['Attention', 'Capture', 'Pipeline'],
    started: { intro: 'People joined by DM and QR-code flyers.' },
    built: [
      { title: 'An events site', text: 'Where people find events and sign up.' },
      { title: 'An admin dashboard', text: 'For events, sign-ups and content, run by the organisers.' },
    ],
    quote: { text: 'We are so live.', author: 'Founder, at launch' },
  },
  {
    slug: '360cr',
    client: '360CR',
    sector: 'Recovery supplements',
    summary: 'A store launched against a fixed international deadline.',
    metric: { value: 'On deadline', label: 'national-team sponsorship launch' },
    layers: ['Attention', 'Conversion'],
    started: { intro: 'A recovery-supplement brand sponsoring the Curaçao national team, with a fixed launch date.' },
    built: [
      { title: 'Rebrand and domain migration', text: 'Moved to the new name and domain.' },
      { title: 'A custom storefront', text: 'A headless Shopify store with a custom front end.' },
      { title: 'A customer waitlist', text: 'To capture demand before stock landed.' },
    ],
  },
  {
    slug: 'alira-partners',
    client: 'Alira Partners',
    sector: 'Growth agency',
    summary: 'A unified CRM, automatic follow-up and contracts triggered on agreement.',
    metric: { value: '< 48hrs', label: 'lead to signed contract' },
    results: [
      { value: '< 48hrs', label: 'Lead to signed contract' },
      { value: '20hrs/wk', label: 'Admin eliminated' },
      { value: '£22K', label: 'Revenue recovered' },
      { value: '3×', label: 'Faster lead response' },
    ],
    started: { intro: 'Leads were captured across 3 different channels with no central CRM. Follow-up was manual — whoever remembered to call, called. Signed contracts took 5–7 days on average. Two salespeople were spending 20+ hours a week on admin.' },
    approach: 'Installed a unified Airtable CRM pulling from all lead sources. Built n8n workflows to auto-qualify leads, send timed follow-up sequences, and trigger contract generation on verbal agreement. Connected Stripe for deposit collection.',
    quote: { text: 'Leads were falling through the cracks daily. Now the whole flow runs without us touching it.', author: 'Shuhayb Ramjany, Founder' },
  },
  {
    slug: 'e-ctrl',
    client: 'E-ctrl',
    sector: 'Technology',
    summary: 'A client onboarding flow triggered the moment a contract is signed.',
    metric: { value: '< 2hrs', label: 'onboarding time (was 2 weeks)' },
    results: [
      { value: '< 2hrs', label: 'Onboarding time (was 2 weeks)' },
      { value: '12hrs/wk', label: 'Founder time reclaimed' },
      { value: '+40%', label: 'Client retention' },
      { value: '100%', label: 'Consistent experience' },
    ],
    started: { intro: 'A 6-person creative agency with no standardised onboarding. New clients would wait up to 2 weeks for access, briefs, and kick-off calls to be arranged manually. The founder was personally handling all project setup and follow-up.' },
    approach: 'Built a full client onboarding flow triggered the moment a contract was signed. Automated welcome sequences, portal access provisioning, brief templates, and kick-off scheduling via Calendly. Created a Slack workspace structure that auto-populated per client.',
    quote: { text: 'The onboarding flow made us look like a proper operation. Clients notice the difference immediately.', author: 'Fesal Saleh, Founder' },
  },
];

export const FEATURED_SLUGS = ['soul-in-the-horn', 'nelia-rose-designs', 'snaeb'];

export function getCaseStudy(slug: string) {
  return CASE_STUDIES.find((c) => c.slug === slug);
}

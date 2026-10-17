// The Client System: every business-specific value the funnel code uses, in one place.
// Installing the system for a client = copy the repo, change this file, set the env vars in
// docs/client-system/RUNBOOK.md. Secrets never go here (env only); these are IDs, names and links.

export const FUNNEL = {
  site: 'https://www.naunas.co.uk',
  /** Owner's time zone: call times in alerts and briefs are shown in it. */
  ownerTz: 'Africa/Dar_es_Salaam',
  /** Leak Map PDF (delivered by the course's first email, or emailed directly as a fallback). */
  leadMagnetPdf: 'https://www.naunas.co.uk/leak-map.pdf',
  /** Vercel runtime logs, linked from every error alert. */
  logsUrl: 'https://vercel.com/itsnaunas-projects/naunas-landing-page/logs',

  cal: {
    /** Cal.com event slug ("user/event"). Its webhook must send CREATED, RESCHEDULED, CANCELLED, NO_SHOW_UPDATED. */
    link: 'naunas/free-audit',
  },

  hubspot: {
    portalId: '149523755',
    /** New deals and companies are assigned to this owner. */
    ownerId: '100890550',
    pipeline: 'default',
    /** Stage IDs of the sales pipeline, in order (HubSpot → Settings → Objects → Deals → Pipelines). */
    stages: {
      newEnquiry: '6213348567',
      contacted: '6213348568',
      auditBooked: '6213348569',
      auditDone: '6213348570',
      scopeSent: '6213348571',
      won: '6213348572',
      lost: '6213348573',
    },
  },

  mailerlite: {
    /** Groups are found or created by name at runtime. Joining a group starts its automation. */
    groups: {
      leakMap: 'Leak Map',
      enquired: 'Audit enquiry: not booked',
      booked: 'Audit booked',
      newsletter: 'Naunas Newsletter',
    },
    /** The automations that must stay on (free plan = 3). The daily health check alerts if any is off. */
    automations: ['map leak', 'Audit enquiry: booking nudge', 'Newsletter: welcome'],
  },

  instagram: {
    /** Default comment keywords (whole words, any case). More campaigns are added from /dashboard. */
    keywords: ['LEAK', 'MAP'],
    /** Always-on fallback campaign; an edited copy saved from /dashboard takes over. */
    defaultCampaign: {
      id: 'leak-map',
      name: 'Leak Map (default)',
      url: 'https://www.naunas.co.uk/#leak-map',
      message:
        'Here you go 👇\n\nThe Leak Map: the 8 places client businesses lose leads, with a short email course that walks you through it.\n\n{link}\n\nAny questions, just reply here.',
    },
  },

  /** Targets the dashboard measures against (from the vault's goals.md). */
  goals: { monthlyRevenue: 5000, mrr: 1000, pipelineCoverage: 3 },
  /** The vault cockpit (delivery, invoices, capacity), linked from /dashboard. */
  cockpitUrl: 'https://claude.ai/code/artifact/0ac0a36b-0a85-46ee-8fd4-50c1a283ae5b',

  outreach: {
    /** Path secret for the feed the Claude routine reads (approved prospects needing drafts; public business data only). */
    feedKey: 'cb2df696a4278612e3bc835e',
  },

  routine: {
    /** Internal HubSpot contact the Claude routine logs each run on (as a note). Excluded from stats. */
    logEmail: 'ops-log@naunas.co.uk',
    url: 'https://claude.ai/code/routines/trig_01N9LKgkPiRCBtzTgJuWeQCX',
  },

  alerts: {
    /** "Stripe: <event>" emails for the owner's own records (vault sync). */
    vaultEmail: 'its.naunas@gmail.com',
  },

  /** Content engine ("Post everywhere", docs/content-engine/PLAN.md). */
  content: {
    weeklyTarget: 7,
    /** Quick-pick schedule times, US Eastern (the ICP's morning, lunch and evening). */
    defaultTimes: ['09:00', '12:00', '18:00'],
    usTz: 'America/New_York',
    /** Where a post's tracked links send people (utm tags are added per channel). */
    linkUrl: 'https://www.naunas.co.uk/',
    /** LinkedIn shows posts with links to fewer people, so the link goes in the first comment. */
    linkedinFirstComment: true,
    newsletterDay: 1, // Monday (0 = Sunday)
    replyReminderMin: 30,
  },
} as const;

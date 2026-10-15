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
    /** Comment keywords that trigger the lead-magnet DM (matched as whole words, any case). */
    keywords: ['LEAK', 'MAP'],
    /** Where the DM sends them. utm tags let HubSpot credit Instagram. */
    dmLink: 'https://www.naunas.co.uk/?utm_source=instagram&utm_medium=comment#leak-map',
    dmText: (link: string) =>
      `Here you go 👇\n\nThe Leak Map: the 8 places client businesses lose leads, with a short email course that walks you through it.\n\n${link}\n\nAny questions, just reply here.`,
  },

  alerts: {
    /** "Stripe: <event>" emails for the owner's own records (vault sync). */
    vaultEmail: 'its.naunas@gmail.com',
  },
} as const;

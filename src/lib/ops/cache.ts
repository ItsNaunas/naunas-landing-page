import { unstable_cache } from 'next/cache';
import { routineReports, notesForContact } from '@/lib/hubspot';
import * as raw from './sources';

// Read-through cache for the dashboard's external API calls: 2 minutes, tag "ops". The Refresh button
// purges it (updateTag), and every logged event expires it (revalidateTag in lib/events), so new
// activity shows up straight away while repeat page views stay fast and inside free API limits.
// Failures aren't cached (unstable_cache only stores resolved values).

export const OPS_TAG = 'ops';

const c = <A extends unknown[], R>(name: string, fn: (...a: A) => Promise<R>) =>
  (...a: A): Promise<R> => unstable_cache(() => fn(...a), ['ops', name, JSON.stringify(a)], { tags: [OPS_TAG], revalidate: 120 })();

export const src = {
  searchContacts: c('searchContacts', raw.searchContacts),
  searchDeals: c('searchDeals', raw.searchDeals),
  openDeals: c('openDeals', raw.openDeals),
  closedDeals: c('closedDeals', raw.closedDeals),
  dealsCreatedSince: c('dealsCreatedSince', raw.dealsCreatedSince),
  dealsForContacts: c('dealsForContacts', raw.dealsForContacts),
  getContact: c('getContact', raw.getContact),
  notesForContact: c('notesForContact', notesForContact),
  routineReports: c('routineReports', routineReports),
  instagramLeads: c('instagramLeads', raw.instagramLeads),
  mlAutomations: c('mlAutomations', raw.mlAutomations),
  mlAutomation: c('mlAutomation', raw.mlAutomation),
  mlGroups: c('mlGroups', raw.mlGroups),
  mlSubscriber: c('mlSubscriber', raw.mlSubscriber),
  igProfileStats: c('igProfileStats', raw.igProfileStats),
  igRecentMedia: c('igRecentMedia', raw.igRecentMedia),
  igInsights: c('igInsights', raw.igInsights),
  calBookings: c('calBookings', raw.calBookings),
  stripeCharges: c('stripeCharges', raw.stripeCharges),
  stripeChargesFor: c('stripeChargesFor', raw.stripeChargesFor),
  stripeBalance: c('stripeBalance', raw.stripeBalance),
  stripeOpenInvoices: c('stripeOpenInvoices', raw.stripeOpenInvoices),
  stripeSubscriptions: c('stripeSubscriptions', raw.stripeSubscriptions),
  stripeSessions: c('stripeSessions', raw.stripeSessions),
};

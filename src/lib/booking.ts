// Questions come before booking: every on-site "book" link goes to /audit (questionnaire first),
// which then shows the Cal.com calendar with the answers prefilled.
export const BOOKING_URL = '/audit';

// The Cal.com event itself (used inside /audit and in emails sent after someone has answered).
export const CAL_LINK = 'naunas/free-audit';
export const CAL_URL = `https://cal.com/${CAL_LINK}`;

// Answers below both of these get an email reply instead of the calendar.
export function isQualified(clientValue: string, revenue: string) {
  return !(clientValue === 'Under $5k' && revenue === 'Under $20k');
}

// HubSpot "Lead priority": high = client worth $25k+ or $250k+/mo; small = below the booking threshold.
export function priorityOf(clientValue?: string, revenue?: string): 'high' | 'normal' | 'small' | undefined {
  if (!clientValue && !revenue) return undefined;
  if (clientValue === '$25k-100k' || clientValue === '$100k+' || revenue === '$250k+') return 'high';
  if (clientValue && revenue && !isQualified(clientValue, revenue)) return 'small';
  return 'normal';
}

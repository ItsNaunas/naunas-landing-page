import { redirect } from 'next/navigation';

// Sequences folded into Prospects → In outreach (2026-10-23): the same table, one place.
export default function OutreachSequences() {
  redirect('/dashboard/outreach/prospects?step=outreach');
}

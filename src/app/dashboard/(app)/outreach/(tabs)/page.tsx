import { redirect } from 'next/navigation';

// Outreach → Today merged into the Today page (2026-10-23). Old links, Telegram buttons and bookmarks land there.
export default function OutreachIndex() {
  redirect('/dashboard');
}

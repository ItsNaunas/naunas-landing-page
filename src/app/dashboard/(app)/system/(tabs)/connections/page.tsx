import { redirect } from 'next/navigation';

// Connections merged into System → Health & connections (2026-10-23).
export default function ConnectionsPage() {
  redirect('/dashboard/system#connections');
}

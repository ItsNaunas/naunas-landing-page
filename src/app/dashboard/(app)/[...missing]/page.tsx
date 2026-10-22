import { notFound } from 'next/navigation';

// Any unknown /dashboard/... URL gets the dashboard's own "Nothing here" (inside the shell), not the marketing 404.
export default function MissingDashboardPage() {
  notFound();
}

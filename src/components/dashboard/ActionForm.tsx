'use client';

import { useTransition } from 'react';

/**
 * A <form> for dashboard buttons that call a server action. When the action finishes, the page reloads.
 * Why not rely on the action's own re-render (or router.refresh)? Click tests on 2026-10-21 showed the
 * Outreach tabs often kept the old screen after a successful save (Today tab: every time; System: never):
 * the server sent the fresh page but the client didn't apply it. A full reload was correct every time, and
 * the browser keeps the scroll position. The button greys out while it saves, so a tick can't be sent twice.
 */
export function ActionForm({ action, className, children }: { action: (form: FormData) => Promise<unknown>; className?: string; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <form className={className} aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        // Instant tick: a list item disappears straight away (the reload then confirms it).
        const item = e.currentTarget.closest<HTMLElement>('[data-item]');
        if (item && (e.nativeEvent as SubmitEvent).submitter?.textContent?.match(/Done|Sent|Connected|Request sent|Accepted|Nudged|Approve|Skip|Drop|replied|Undo/i)) item.style.opacity = '0.35';
        start(async () => { await action(form); window.location.reload(); });
      }}>
      <fieldset disabled={pending} className={`contents ${pending ? '[&_button]:opacity-50 [&_button]:cursor-wait' : ''}`}>{children}</fieldset>
    </form>
  );
}

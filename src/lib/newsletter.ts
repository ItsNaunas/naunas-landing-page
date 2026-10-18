// Weekly newsletter DRAFT (content engine Phase 5). Mondays, the daily health cron gathers last week's posted
// items, ranks them by leads and clicks, and creates an unsent MailerLite campaign for the Newsletter group:
// best post first, the rest below, one "free audit" call to action. It never sends; Naufal reviews and
// presses Send in MailerLite. The copy is only what he already wrote (blurbs / post text): nothing invented.
//
// MailerLite only accepts email HTML through the API on paid plans. If it refuses, the draft is still made
// (subject, sender, group) and the HTML is kept here so the dashboard can copy it into the editor.

import { getPost, type ContentPost } from '@/lib/content';
import { postPerformance } from '@/lib/performance';
import { ml, getOrCreateGroup, NEWSLETTER_GROUP } from '@/lib/mailerlite';
import { getJSON, putJSON } from '@/lib/store';
import { notify } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';

export type Digest = {
  week: string; createdAt: string; subject: string; html: string; postIds: string[];
  campaignId?: string; editUrl?: string; contentIncluded: boolean; error?: string;
};

const TZ = 'Africa/Dar_es_Salaam';
const LATEST = 'content/newsletter/latest.json';
export const latestDigest = () => getJSON<Digest | null>(LATEST, null);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (s: string) => s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const weekKey = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });

/** The words for one post: the newsletter blurb when there is one, else the LinkedIn text, else the idea. */
function body(p: ContentPost) {
  return (p.newsletterBlurb || p.channels.linkedin.text || p.channels.instagram.caption || p.master.idea).trim();
}
const firstLine = (s: string) => s.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
const linkOf = (p: ContentPost) => p.channels.linkedin.url || p.channels.instagram.url || p.channels.tiktok.url;

function render(posts: ContentPost[]) {
  const [best, ...rest] = posts;
  const audit = `${FUNNEL.site}/audit?utm_source=newsletter&utm_medium=email&utm_campaign=weekly`;
  const block = (p: ContentPost, lead: boolean) => {
    const url = linkOf(p);
    return `<div style="margin:0 0 28px">${lead ? '' : `<p style="margin:0 0 8px;font-weight:600">${esc(firstLine(body(p)).slice(0, 120))}</p>`}
${paras(lead ? body(p) : body(p).split('\n').slice(1).join('\n').trim() || body(p))}
${url ? `<p style="margin:0"><a href="${esc(url)}" style="color:#F2613F">See the post →</a></p>` : ''}</div>`;
  };
  return `<!doctype html><html><body style="margin:0;background:#f6f5f3">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;background:#ffffff">
<p style="margin:0 0 20px;color:#666;font-size:13px">Naunas · this week</p>
${block(best, true)}
${rest.length ? `<hr style="border:0;border-top:1px solid #eee;margin:8px 0 24px"><p style="margin:0 0 16px;color:#666;font-size:13px">Also this week</p>${rest.map((p) => block(p, false)).join('\n')}` : ''}
<div style="margin:32px 0 0;padding:20px;background:#fff4f0;border-radius:8px">
<p style="margin:0 0 12px">Want me to map where your enquiries leak? It's a free audit call.</p>
<p style="margin:0"><a href="${audit}" style="display:inline-block;background:#F2613F;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Book your free audit</a></p>
</div>
<p style="margin:32px 0 0;color:#999;font-size:12px">Naufal at Naunas · naunas.co.uk<br>You're getting this because you signed up at naunas.co.uk. <a href="{$unsubscribe}" style="color:#999">Unsubscribe</a></p>
</div></body></html>`;
}

/** Build this week's draft. Without `force` it runs once per week (the cron), and says so if there's nothing. */
export async function buildWeeklyDraft(opts: { force?: boolean } = {}): Promise<Digest | { empty: true } | { exists: Digest }> {
  const week = weekKey();
  const prev = await latestDigest();
  if (prev && prev.week === week && !opts.force) return { exists: prev };

  const { rows } = await postPerformance(7);
  const posts = (await Promise.all(rows.slice(0, 5).map((r) => getPost(r.id)))).filter((p): p is ContentPost => !!p && !!body(p));
  if (!posts.length) {
    await notify({ level: 'ok', title: 'Newsletter: nothing to send this week', lines: ['No posts went out in the last 7 days, so there is no draft. Post this week and next Monday’s draft builds itself.'] });
    return { empty: true };
  }

  const subject = firstLine(body(posts[0])).replace(/[#*_]/g, '').slice(0, 120);
  const html = render(posts);
  const d: Digest = { week, createdAt: new Date().toISOString(), subject, html, postIds: posts.map((p) => p.id), contentIncluded: false };
  const group = await getOrCreateGroup(NEWSLETTER_GROUP);
  const email = { subject, from_name: 'Naufal at Naunas', from: 'contact@naunas.co.uk', reply_to: 'its.naunas@gmail.com' };
  const create = (withHtml: boolean) => ml<{ data: { id: string } }>('/campaigns', {
    method: 'POST',
    body: JSON.stringify({ name: `Weekly · ${week}`, type: 'regular', groups: [group], emails: [withHtml ? { ...email, content: html } : email] }),
  });
  try {
    try {
      d.campaignId = (await create(true)).data.id;
      d.contentIncluded = true;
    } catch (err) {
      d.error = err instanceof Error ? err.message.slice(0, 200) : String(err);
      d.campaignId = (await create(false)).data.id; // free plan: draft without the body, HTML copied from the dashboard
    }
    d.editUrl = `https://dashboard.mailerlite.com/campaigns/status/draft?campaign=${d.campaignId}`;
  } catch (err) {
    d.error = err instanceof Error ? err.message.slice(0, 300) : String(err);
  }
  await putJSON(`content/newsletter/${week}.json`, d);
  await putJSON(LATEST, d);

  await notify({
    level: d.campaignId ? 'ok' : 'error',
    title: d.campaignId ? 'Newsletter draft ready (not sent)' : 'Newsletter draft failed',
    lines: [
      `Subject: ${subject}`,
      `${posts.length} post${posts.length > 1 ? 's' : ''}, best one first.`,
      d.campaignId && !d.contentIncluded ? 'MailerLite didn’t take the email body through the API. Copy it from the dashboard (Content → Newsletter) into the editor.' : '',
      d.campaignId ? '' : (d.error ?? ''),
    ].filter(Boolean),
    next: d.campaignId ? 'Read it, tweak it, then press Send in MailerLite. Nothing goes out on its own.' : 'Open the dashboard and press Build draft again.',
    buttons: [
      ...(d.editUrl ? [{ text: 'Open in MailerLite', url: d.editUrl }] : []),
      { text: 'Dashboard', url: `${FUNNEL.site}/dashboard/content#newsletter` },
    ],
  });
  return d;
}

import { get } from '@vercel/blob';
import { readMediaToken } from '@/lib/mediaLink';

// Serves one private media file to Instagram (or another platform) while its signed link is valid.
// Anything else is a plain 404, so links can't be guessed or reused after they expire.
async function serve(token: string, head: boolean) {
  const path = readMediaToken(token);
  if (!path) return new Response('Not found', { status: 404 });
  const blob = await get(path, { access: 'private', useCache: false }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'Content-Type': blob.blob.contentType ?? 'application/octet-stream',
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
    ...(blob.blob.size ? { 'Content-Length': String(blob.blob.size) } : {}),
  });
  return new Response(head ? null : blob.stream, { status: 200, headers });
}

export async function GET(_req: Request, ctx: RouteContext<'/m/[token]'>) {
  return serve((await ctx.params).token, false);
}

export async function HEAD(_req: Request, ctx: RouteContext<'/m/[token]'>) {
  return serve((await ctx.params).token, true);
}

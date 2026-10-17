import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';

// Issues a short-lived token so the browser uploads media straight to the private Blob store (Vercel
// functions can't take bodies over 4.5 MB). The publish actions (TikTok, LinkedIn) read it server-side
// and delete it after posting.
const RULES: Record<string, string[]> = {
  'tiktok/uploads/': ['video/mp4', 'video/quicktime', 'video/webm'],
  'linkedin/uploads/': ['video/mp4', 'image/jpeg', 'image/png', 'image/gif'],
};

export async function POST(req: NextRequest) {
  if (!(await validSession(req.cookies.get(DASH_COOKIE)?.value))) return NextResponse.json({ error: 'Signed out' }, { status: 401 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      request: req, body,
      onBeforeGenerateToken: async (pathname) => {
        const prefix = Object.keys(RULES).find((p) => pathname.startsWith(p));
        if (!prefix) throw new Error('Bad path');
        return { allowedContentTypes: RULES[prefix], maximumSizeInBytes: 250 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 400 });
  }
}

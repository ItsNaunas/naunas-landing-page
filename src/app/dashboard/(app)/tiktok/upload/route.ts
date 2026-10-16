import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';

// Issues a short-lived token so the browser uploads the video straight to the private Blob store
// (Vercel functions can't take bodies over 4.5 MB). The publish action then reads it server-side.
export async function POST(req: NextRequest) {
  if (!(await validSession(req.cookies.get(DASH_COOKIE)?.value))) return NextResponse.json({ error: 'Signed out' }, { status: 401 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      request: req, body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('tiktok/uploads/')) throw new Error('Bad path');
        return { allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm'], maximumSizeInBytes: 250 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 400 });
  }
}

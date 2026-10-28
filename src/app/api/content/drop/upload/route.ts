import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';
import { studioAuthed } from '@/lib/studioDrop';

// Studio drop, step 1: a short-lived token so naunas-studio uploads the finished video straight to the
// private Blob store (functions can't take bodies over 4.5 MB). Same rules as the dashboard's own upload.
export async function POST(req: NextRequest) {
  if (!studioAuthed(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const json = await handleUpload({
      request: req, body: (await req.json()) as HandleUploadBody,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('content/media/')) throw new Error('Bad path');
        return { allowedContentTypes: ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'], maximumSizeInBytes: 250 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 400 });
  }
}

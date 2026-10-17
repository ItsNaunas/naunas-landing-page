// OAuth tokens for the social connections (TikTok, LinkedIn) live in the private Blob store, AES-256-GCM
// encrypted with a key derived from that app's client secret: a leaked Blob read token alone can't use them.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getJSON, putJSON } from '@/lib/store';

const keyFor = (name: string, secret: string) => createHash('sha256').update(`naunas-${name}:${secret}`).digest();

export function sealedStore<T>(name: string, path: string, secret: () => string | undefined) {
  const key = () => keyFor(name, secret() ?? '');
  return {
    async load(): Promise<T | null> {
      const s = await getJSON<{ sealed?: string }>(path, {});
      if (!s.sealed) return null;
      try {
        const [iv, tag, body] = s.sealed.split('.').map((p) => Buffer.from(p, 'base64'));
        const d = createDecipheriv('aes-256-gcm', key(), iv);
        d.setAuthTag(tag);
        return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString('utf8')) as T;
      } catch { return null; }
    },
    async save(value: T) {
      const iv = randomBytes(12);
      const c = createCipheriv('aes-256-gcm', key(), iv);
      const body = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]);
      await putJSON(path, { sealed: [iv, c.getAuthTag(), body].map((b) => b.toString('base64')).join('.'), savedAt: new Date().toISOString() });
    },
    clear: () => putJSON(path, {}),
  };
}

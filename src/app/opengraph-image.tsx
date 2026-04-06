import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Naunas Systems — Done-For-You Business Automation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: '#0C0C0C',
          padding: '72px 80px',
          position: 'relative',
        }}
      >
        {/* Orange glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(242,97,63,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(242,97,63,0.15)',
            border: '1px solid rgba(242,97,63,0.3)',
            borderRadius: 999,
            padding: '6px 16px',
            marginBottom: 32,
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F2613F' }} />
          <span style={{ color: '#F2613F', fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>
            NAUNAS SYSTEMS
          </span>
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.1,
            marginBottom: 24,
            maxWidth: 800,
          }}
        >
          Done-For-You
          <br />
          <span style={{ color: '#F2613F' }}>Business Automation</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 620,
            lineHeight: 1.5,
            marginBottom: 48,
          }}
        >
          Stop losing leads between the cracks. We install the systems that run your client lifecycle end to end.
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#F2613F',
              borderRadius: 999,
              padding: '14px 28px',
            }}
          >
            <span style={{ color: '#0C0C0C', fontSize: 16, fontWeight: 700 }}>
              Get your free AI audit
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>naunas.co.uk</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

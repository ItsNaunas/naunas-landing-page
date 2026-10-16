import type { NextConfig } from "next";

// Short tracked links for bios, DMs and signatures. Each forwards to the site with UTM tags,
// which the attribution tracker stores and every form sends to HubSpot. Bio links open the
// link-in-bio page (/links); DM and signature links go straight to the home page.
const SHORT_LINKS: { path: string; source: string; medium: string; to: string }[] = [
  { path: '/ig', source: 'instagram', medium: 'bio', to: '/links' },
  { path: '/tt', source: 'tiktok', medium: 'bio', to: '/links' },
  { path: '/li', source: 'linkedin', medium: 'profile', to: '/links' },
  { path: '/yt', source: 'youtube', medium: 'channel', to: '/links' },
  { path: '/x', source: 'x', medium: 'bio', to: '/links' },
  { path: '/fb', source: 'facebook', medium: 'bio', to: '/links' },
  { path: '/th', source: 'threads', medium: 'bio', to: '/links' },
  { path: '/dm', source: 'instagram', medium: 'dm', to: '/' },
  { path: '/sig', source: 'email', medium: 'signature', to: '/' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      ...SHORT_LINKS.map(({ path, source, medium, to }) => ({
        source: path,
        destination: `${to}?utm_source=${source}&utm_medium=${medium}`,
        permanent: false,
      })),
      // Retired builder-era pages (2026-10-11): send old links to the home page.
      // Dashboard pages renamed in the v3 layout.
      { source: '/dashboard/campaigns', destination: '/dashboard/instagram', permanent: false },
      { source: '/dashboard/routine', destination: '/dashboard/automations', permanent: false },
      { source: '/dashboard/health', destination: '/dashboard/system', permanent: false },
      ...['/managed', '/newsletter', '/kit'].map((p) => ({ source: p, destination: `/?utm_source=old-link&utm_medium=${p.slice(1)}`, permanent: true })),
    ];
  },
};

export default nextConfig;

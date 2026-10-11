import type { NextConfig } from "next";

// Short tracked links for bios, DMs and signatures. Each forwards to the site with UTM tags,
// which the attribution tracker stores and every form sends to HubSpot.
const SHORT_LINKS: { path: string; source: string; medium: string }[] = [
  { path: '/ig', source: 'instagram', medium: 'bio' },
  { path: '/dm', source: 'instagram', medium: 'dm' },
  { path: '/tt', source: 'tiktok', medium: 'bio' },
  { path: '/li', source: 'linkedin', medium: 'profile' },
  { path: '/yt', source: 'youtube', medium: 'channel' },
  { path: '/sig', source: 'email', medium: 'signature' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return SHORT_LINKS.map(({ path, source, medium }) => ({
      source: path,
      destination: `/?utm_source=${source}&utm_medium=${medium}`,
      permanent: false,
    }));
  },
};

export default nextConfig;

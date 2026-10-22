import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/go/', '/m/', '/r/', '/p/'],
    },
    sitemap: 'https://www.naunas.co.uk/sitemap.xml',
  };
}

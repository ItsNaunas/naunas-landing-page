import type { MetadataRoute } from 'next';
import { CASE_STUDIES } from '@/lib/caseStudies';

const BASE = 'https://www.naunas.co.uk';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${BASE}/case-studies`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...CASE_STUDIES.map((c) => ({
      url: `${BASE}/case-studies/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}

import type { MetadataRoute } from 'next'
import { caseDetailSlugs } from '@/data/cases'
import { SITE_URL } from '@/lib/site'

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] =
  [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/aanpak', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/cases', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/pricing', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/algemene-voorwaarden', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/legal', changeFrequency: 'yearly', priority: 0.3 },
  ]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    ...STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
      url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
      lastModified,
      changeFrequency,
      priority,
    })),
    ...caseDetailSlugs.map((slug) => ({
      url: `${SITE_URL}/cases/${slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}

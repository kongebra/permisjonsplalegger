import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://perm-planlegger.vercel.app'

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/planlegger`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/planlegger/kalender`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/personvern`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/om`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ]
}

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/ingest/'] }],
    sitemap: 'https://perm-planlegger.vercel.app/sitemap.xml',
  }
}

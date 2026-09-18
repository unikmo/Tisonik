import fs from 'node:fs'

const raw = process.env.SITE_URL || process.argv.find((a) => a.startsWith('--site-url='))?.split('=')[1]
if (!raw) {
  console.error('Set SITE_URL or pass --site-url=https://your-domain.com')
  process.exit(1)
}
const site = raw.replace(/\/$/, '')
const lastmod = new Date().toISOString().slice(0, 10)
const paths = ['/', '/passenger-experience/', '/crew-recognition/', '/service-recovery/', '/engagement/', '/ancillary-revenue/', '/cruise-dashboard/', '/integration/', '/pilot/', '/contact/', '/all-inclusive-resorts/', '/resort-live-demo/', '/resort-pilot/', '/resort-guest-engagement-software/', '/hotel-service-recovery-software/', '/resort-upselling-software/', '/hotel-ancillary-revenue-software/', '/resort-experience-discovery/', '/hotel-guest-rating-software/', '/imprint/', '/privacy/', '/terms/', '/cookies/']
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${site}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`
fs.writeFileSync('public/sitemap.xml', xml)
fs.writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)
console.log(`Generated sitemap for ${site}`)

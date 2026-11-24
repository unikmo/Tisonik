import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'

const routes = ['/', '/hotels/', '/hospitality/', '/integration/', '/security/', '/passenger-experience/', '/crew-recognition/', '/service-recovery/', '/ancillary-revenue/', '/engagement/', '/social-commerce/', '/cruise-dashboard/', '/pilot/', '/contact/', '/resort-pilot/', '/resort-live-demo/', '/resort-guest-engagement-software/', '/hotel-service-recovery-software/', '/resort-upselling-software/', '/hotel-ancillary-revenue-software/', '/resort-experience-discovery/', '/hotel-guest-rating-software/']

for (const route of routes) {
  test(`layout rhythm and screenshot: ${route}`, async ({ page }, info) => {
    await page.goto(route)
    await expect(page.locator('main').first()).toBeVisible()
    await page.evaluate(async () => {
      await document.fonts.ready
      for (const video of document.querySelectorAll('video')) { video.pause(); }
    })
    const defects = await page.evaluate(() => {
      const result: string[] = []
      const root = document.documentElement
      if (root.scrollWidth > root.clientWidth + 1) result.push('Horizontal overflow')
      const rhythm = parseFloat(getComputedStyle(root).getPropertyValue('--section-gap'))
      // Resolve the responsive CSS expression via a temporary, non-layout probe.
      const probe = document.createElement('div')
      probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--section-gap);width:0;pointer-events:none'
      document.body.append(probe)
      const gap = probe.getBoundingClientRect().height || rhythm || 72
      probe.remove()
      const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section, main > .resort-feature-wrap > .resort-feature, main > .trust-block'))
      const standard = '.story-section,.quiet-proof,.buyer-readiness,.pilot-section,.detail-next,.detail-facts,.contact-form-section,.trust-block,.trust-hero,.home-steps,.hosp-compare,.resort-why,.resort-intro,.resort-integration,.resort-related-pages,.resort-contact-section,.resort-feature'
      for (const el of sections) {
        if (!el.matches(standard) || !el.getClientRects().length) continue
        const css = getComputedStyle(el)
        for (const side of ['paddingTop','paddingBottom'] as const) {
          if (Math.abs(parseFloat(css[side]) - gap/2) > 2) result.push(el.className + ': ' + side + ' = ' + css[side] + ', expected ' + gap/2)
        }
      }
      for (let i = 1; i < sections.length; i++) {
        const a = sections[i-1], b = sections[i]
        if (a.parentElement !== b.parentElement || !a.getClientRects().length || !b.getClientRects().length) continue
        if (!a.matches(standard) || !b.matches(standard)) continue
        const rectGap = b.getBoundingClientRect().top - a.getBoundingClientRect().bottom
        const combined = rectGap + parseFloat(getComputedStyle(a).paddingBottom) + parseFloat(getComputedStyle(b).paddingTop)
        if (Math.abs(combined-gap)>4) result.push(a.className + ' to ' + b.className + ': ' + combined.toFixed(1) + 'px, expected ' + gap)
      }
      return result
    })
    expect(defects, defects.join('\n')).toEqual([])
    const name = (route === '/' ? 'home' : route.replaceAll('/','')) + '.png'
    const options = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const, mask: [page.locator('video')], maxDiffPixelRatio: 0.005 }
    // Never silently approve a new reference in CI. Candidate screenshots are
    // artifacts for review until an approved baseline is checked into Git.
    if (process.env.VISUAL_BASELINE_CANDIDATES === '1') {
      await page.screenshot({ ...options, path: info.outputPath(name) })
      await info.attach('baseline-candidate', { path: info.outputPath(name), contentType: 'image/png' })
    } else {
      expect(existsSync(info.snapshotPath(name)), 'Approved screenshot missing: ' + info.snapshotPath(name)).toBe(true)
      await expect(page).toHaveScreenshot(name, options)
    }
  })
}

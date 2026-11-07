import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const publicRoutes = [
  '/',
  '/passenger-experience/',
  '/crew-recognition/',
  '/service-recovery/',
  '/engagement/',
  '/ancillary-revenue/',
  '/integration/',
  '/pilot/',
  '/hotels/',
  '/resort-live-demo/',
  '/resort-pilot/',
  '/resort-guest-engagement-software/',
  '/hotel-service-recovery-software/',
  '/resort-upselling-software/',
  '/hotel-ancillary-revenue-software/',
  '/resort-experience-discovery/',
  '/hotel-guest-rating-software/',
]

for (const route of publicRoutes) test(`${route} has no serious accessibility or overflow defects`, async ({ page }) => {
  await page.goto(route)
  await expect(page.locator('main')).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const material = results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')
  expect(material, material.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
})

test('executive carousel exposes all product steps and one pilot destination', async ({ page }) => {
  await page.goto('/product-app/')
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(12)
  for (let index = 0; index < 12; index++) {
    await tabs.nth(index).click({ force: true })
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true')
  }
  await expect(page.getByRole('link', { name: /request a pilot/i }).first()).toHaveAttribute('href', '/pilot/#contact')
})

test('pilot form is labelled, first-party and keyboard reachable', async ({ page }) => {
  await page.goto('/pilot/#contact')
  await expect(page.getByLabel('Work email')).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Cruise line or company')).toBeVisible()
  await expect(page.getByRole('button', { name: /request a pilot conversation/i })).toBeEnabled()
  await expect(page.locator('form.pilot-contact-form')).not.toHaveAttribute('action', /formsubmit/i)
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
})

test('resort pillar contains no unapproved hotel-chain logos or affiliations', async ({ page }) => {
  await page.goto('/hotels/')
  const body = await page.locator('body').innerText()
  for (const unapprovedBrand of ['Atlantis', 'RIU', 'Barceló', 'Iberostar', 'Secrets']) expect(body).not.toContain(unapprovedBrand)
  await expect(page.getByText('ENGINEERED FOR PREMIUM & LUXURY HOSPITALITY')).toBeVisible()
})

test('resort pillar makes ancillary revenue opportunity explicit', async ({ page }) => {
  await page.goto('/hotels/#revenue')
  await expect(page.getByText('More of the stay can become bookable.')).toBeVisible()
  for (const opportunity of ['Spa & wellness', 'Speciality dining', 'Excursions', 'Cabanas & daybeds', 'Private transfers', 'Celebrations', 'Watersports']) await expect(page.getByText(opportunity, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /ancillary revenue use case/i })).toHaveAttribute('href', '/hotel-ancillary-revenue-software/')
})

test('resort rating demo uses eight scored questions plus two written wrap-up questions', async ({ page }) => {
  await page.goto('/resort-live-demo/')
  await page.getByRole('button', { name: /2 · Stay rating/i }).click()
  for (let question = 0; question < 8; question++) {
    await expect(page.getByText(new RegExp(`QUESTION ${question + 1} OF 10`))).toBeVisible()
    const scoreButtons = page.getByRole('button', { name: /Rate \d+ out of 10/ })
    await expect(scoreButtons).toHaveCount(10)
    await page.getByRole('button', { name: 'Rate 8 out of 10' }).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
  await expect(page.getByText('QUESTION 9 OF 10 · DEMO')).toBeVisible()
  const good = page.getByLabel(/Your answer/).first()
  await expect(good).toHaveAttribute('maxlength', '400')
  await good.fill('Warm staff, beautiful pool and excellent breakfast.')
  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(page.getByText('QUESTION 10 OF 10 · DEMO')).toBeVisible()
  const improve = page.getByLabel(/Your answer/).first()
  await expect(improve).toHaveAttribute('maxlength', '400')
  await improve.fill('Dinner waiting time could be shorter.')
  await page.getByRole('button', { name: /submit & publish demo rating/i }).click()
  await expect(page.getByText('Rating published. The resort can still act while you are here.')).toBeVisible()
  await expect(page.getByText(/cannot selectively hold back a rating because it is poor/i)).toBeVisible()
})

test('resort rating copy explains the 10-question format and publication rule', async ({ page }) => {
  await page.goto('/hotel-guest-rating-software/')
  await expect(page.getByText(/eight guest pain-point questions scored 1–10/i).first()).toBeVisible()
  await expect(page.getByText(/questions 9–10: context/i).first()).toBeVisible()
  await expect(page.getByText(/participation does not include a right to suppress poor ratings/i).first()).toBeVisible()
})

test('resort live demo uses a clear three-step buyer flow', async ({ page }) => {
  await page.goto('/resort-live-demo/')
  await expect(page.getByRole('button', { name: /1 · Guest journey/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /2 · Stay rating/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /3 · Resort team/i })).toBeVisible()
  await page.getByRole('button', { name: /3 · Resort team/i }).click()
  await expect(page.getByText(/Ancillary revenue/).first()).toBeVisible()
})

test('TSquare is the public operator identity and the service-recovery image is replaced', async ({ page }) => {
  const legacyBrand = ['Planet', 'Hike'].join('')
  for (const route of ['/', '/hotels/', '/resort-pilot/', '/imprint/', '/privacy/', '/terms/', '/cookies/']) {
    await page.goto(route)
    expect(await page.locator('body').innerText()).not.toContain(legacyBrand)
  }
  await page.goto('/imprint/')
  await expect(page.getByText('TSquare Ventures LLC', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/30 N Gould St Ste R/).first()).toBeVisible()
  await expect(page.getByText(/Sheridan, WY 82801, USA/).first()).toBeVisible()
  await page.goto('/hotels/')
  const recoveryImage = page.locator('.resort-feature').filter({ hasText: 'SERVICE RECOVERY' }).locator('img')
  await expect(recoveryImage).toHaveAttribute('src', /photo-1759143545924-beb85b33c0f1/)
  expect(await recoveryImage.getAttribute('src')).not.toContain('photo-1776977507261-81e4ab0dd806')
})

test('resort pilot form uses the existing first-party enquiry endpoint', async ({ page }) => {
  await page.goto('/resort-pilot/#contact')
  await expect(page.getByLabel('Work email')).toBeVisible()
  await expect(page.getByLabel('Property or hotel group')).toBeVisible()
  await expect(page.locator('form.resort-contact-form')).not.toHaveAttribute('action', /formsubmit/i)
  await expect(page.getByRole('button', { name: /request a live demo or pilot/i })).toBeEnabled()
})

test('offline shell keeps a previously visited public page available', async ({ page, context }) => {
  await page.goto('/?offline-test=1')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForTimeout(500)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()
  await context.setOffline(false)
})

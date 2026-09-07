import { expect, test } from '@playwright/test'

const operatorStatement = 'Tisonik is operated by TSquare Ventures LLC, a Wyoming (USA) limited liability company.'

test('homepage exposes the hotel and resort vertical and canonical operator identity', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Hotel/Resorts' }).first()).toHaveAttribute('href', '/all-inclusive-resorts/')
  await expect(page.locator('.site-footer')).toContainText(operatorStatement)
  await expect(page.locator('.entity-links')).toContainText('Hotel/Resorts')
})

test('resort vertical is the approved PR14 experience and links back to Tisonik home', async ({ page }) => {
  await page.goto('/all-inclusive-resorts/')

  await expect(page.getByRole('heading', { name: /Make more of.*every stay/i })).toBeVisible()
  await expect(page.getByText('Help guests get more from every day of their stay.')).toHaveCount(0)
  await expect(page.locator('.resort-phone')).toBeVisible()
  await expect(page.getByText('More ancillary revenue moments.')).toBeVisible()
  await expect(page.locator('.resort-header .brand')).toHaveAttribute('href', '/')
  await expect(page.locator('.site-footer')).toContainText(operatorStatement)
})

test('imprint uses the canonical operator wording', async ({ page }) => {
  await page.goto('/imprint/')

  await expect(page.locator('#operator')).toContainText(operatorStatement)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', new RegExp('operated by TSquare Ventures LLC'))
})

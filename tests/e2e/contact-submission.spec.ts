import { test, expect } from '@playwright/test'

for (const path of ['/contact/', '/pilot/']) {
  test(`enquiry submission shows success and clears fields on ${path}`, async ({ page }) => {
    await page.route('**/api/pilot-requests', async route => {
      await new Promise(resolve => setTimeout(resolve, 100))
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ accepted: true }) })
    })
    await page.goto(path)
    const form = page.locator('form.pilot-contact-form')
    await form.locator('[name=email]').fill('qa@example.com')
    await form.locator('[name=name]').fill('Website QA')
    await form.locator('[name=company]').fill('QA Hospitality')
    await form.locator('[name=message]').fill('We would like to discuss the Tisonik experience for our hotel.')
    await form.locator('[name=privacy_consent]').check()
    await form.locator('button[type=submit]').click()
    await expect(form.getByRole('status')).toContainText('safely recorded')
    await expect(form.locator('[name=email]')).toHaveValue('')
    await expect(form.locator('button[type=submit]')).toBeDisabled()
  })

  test(`enquiry submission reports provider error on ${path}`, async ({ page }) => {
    await page.route('**/api/pilot-requests', route => route.fulfill({ status:503, contentType:'application/json', body:'{"error":"enquiry_temporarily_unavailable"}' }))
    await page.goto(path)
    const form = page.locator('form.pilot-contact-form')
    await form.locator('[name=email]').fill('qa@example.com')
    await form.locator('[name=name]').fill('Website QA')
    await form.locator('[name=company]').fill('QA Hospitality')
    await form.locator('[name=message]').fill('We would like to discuss the Tisonik experience for our hotel.')
    await form.locator('[name=privacy_consent]').check()
    await form.locator('button[type=submit]').click()
    await expect(form.getByRole('alert')).toContainText('temporarily unavailable')
    await expect(form.locator('button[type=submit]')).toBeEnabled()
  })
}

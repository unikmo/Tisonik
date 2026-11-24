import { test, expect } from '@playwright/test'

for (const path of ['/contact/', '/pilot/']) {
  test(`enquiry submission replaces the form with confirmation on ${path}`, async ({ page }) => {
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
    await expect(page.locator('.pilot-contact-form[role=status]')).toContainText('safely recorded')
    await expect(form).toHaveCount(0)
    await expect(page.locator('.pilot-contact-form input, .pilot-contact-form textarea, .pilot-contact-form button')).toHaveCount(0)
  })

  test(`browser autofill cannot populate hidden spam field on ${path}`, async ({ page }) => {
    let payload: { website?: string } | undefined
    await page.route('**/api/pilot-requests', async route => {
      payload = route.request().postDataJSON()
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"accepted":true}' })
    })
    await page.goto(path)
    const form = page.locator('form.pilot-contact-form')
    await expect(form.locator('input[name="_honey"], input[name="website"]')).toHaveCount(0)
    await form.locator('[name=email]').fill('qa@example.com')
    await form.locator('[name=name]').fill('Website QA')
    await form.locator('[name=company]').fill('QA Hospitality')
    await form.locator('[name=message]').fill('Short enquiry')
    await form.locator('[name=privacy_consent]').check()
    await form.locator('button[type=submit]').click()
    await expect(page.locator('.pilot-contact-form[role=status]')).toBeVisible()
    expect(payload?.website).toBe('')
  })

  test(`suppressed enquiry must never show success on ${path}`, async ({ page }) => {
    await page.route('**/api/pilot-requests', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":true}' }))
    await page.goto(path)
    const form = page.locator('form.pilot-contact-form')
    await form.locator('[name=email]').fill('qa@example.com')
    await form.locator('[name=name]').fill('Website QA')
    await form.locator('[name=company]').fill('QA Hospitality')
    await form.locator('[name=message]').fill('Short enquiry')
    await form.locator('[name=privacy_consent]').check()
    await form.locator('button[type=submit]').click()
    await expect(form.getByRole('alert')).toContainText('temporarily unavailable')
    await expect(page.locator('.pilot-contact-form[role=status]')).toHaveCount(0)
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

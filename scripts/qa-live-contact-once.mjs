import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
for (const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/pilot-requests',async route=>{await new Promise(r=>setTimeout(r,150));await route.fulfill({status:201,contentType:'application/json',body:'{"accepted":true}'})});
 await page.goto('https://tisonik.com/contact/#contact',{waitUntil:'networkidle'});
 const form=page.locator('form.pilot-contact-form');
 await form.locator('[name=email]').fill('qa@example.com');
 await form.locator('[name=name]').fill('Website QA');
 await form.locator('[name=company]').fill('QA Hospitality');
 await form.locator('[name=message]').fill('I would like information about a Tisonik hotel pilot and your guest experience software.');
 await form.locator('[name=privacy_consent]').check();
 await form.locator('button[type=submit]').click();
 await page.waitForTimeout(500);
 console.log('FORM_DIAG',JSON.stringify({width,formText:(await form.innerText()).slice(-400),statusText:await form.locator('[role=status]').allTextContents(),errorText:await form.locator('[role=alert]').allTextContents(),buttonText:await form.locator('button[type=submit]').innerText(),errors}));
 await form.getByRole('status').getByText('safely recorded',{exact:false}).waitFor({timeout:8000});
 assert.equal(await form.locator('[name=email]').inputValue(),'');
 assert.deepEqual(errors,[]);
 console.log('PASS LIVE CONTACT UI',width);
 await page.close();
}
await browser.close();

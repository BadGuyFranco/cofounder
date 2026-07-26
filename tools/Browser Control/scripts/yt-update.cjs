const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const profileDir = path.join(require('os').homedir(), '.browser-control', 'profiles', 'default');
  const context = await chromium.launchPersistentContext(profileDir, { headless: true });
  const page = await context.newPage();
  await page.goto('https://studio.youtube.com/video/M6wrzM2MYLM/edit', { waitUntil: 'networkidle' });
  
  // click skip if present
  const skip = page.locator('text="Skip to YouTube Studio"');
  if (await skip.count() > 0) await skip.click();

  await page.waitForTimeout(3000);
  
  const textboxes = page.locator('#textbox[contenteditable="true"]');
  await textboxes.nth(0).focus();
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('207 Are You Scaling to Win or Just to Hide?');
  
  await textboxes.nth(1).focus();
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  
  const desc = `In 2011, a photo-sharing app raised $41 million before it launched, turned down a $200 million buyout from Google, and was dead within sixteen months. The money didn't save it. The money hid what was broken.

Chris Franks and Stephanie Hays pull apart one of the most misunderstood decisions a founder ever makes: when to scale, and whether you should at all. They dig into the difference between growth and scaling, why only one type of business genuinely has to scale, and how to tell whether you're holding a scale-up or a perfectly good company that more money would only inflate. They get into the founder-to-CEO paradox, the identity crisis that ambushes technical founders, and the quiet trap of being the hero who fixes every 2 a.m. problem.

Before you take the round and light the thing on fire, run the exercise they lay out. What would $41 million actually do to your cash flow, your product, and the people who signed up for a smaller company than the one you're about to build?

Keywords: premature scaling, when to scale a business, growth vs scaling, scale-up, founder to CEO, startup funding, venture capital, product-market fit, company culture`;
  await page.keyboard.type(desc);
  
  await page.waitForTimeout(2000);
  const saveBtn = page.locator('button[aria-label="Save"]');
  if (!await saveBtn.isDisabled()) {
    await saveBtn.click();
    console.log("Clicked save!");
    await page.waitForTimeout(3000);
  } else {
    console.log("Save button disabled.");
  }
  
  await context.close();
})();

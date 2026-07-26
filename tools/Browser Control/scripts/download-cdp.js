import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  page.on('request', request => {
    if (request.url().includes('storage.googleapis.com')) {
      console.log("FOUND URL: " + request.url());
    }
  });
  console.log("Opening modal...");
  const mainDownload = page.locator('button', { hasText: 'Download' }).first();
  await mainDownload.click();
  await page.waitForTimeout(2000);
  console.log("Clicking video download...");
  const buttons = await page.$$('[aria-label="Download"]');
  if (buttons.length >= 2) {
    await buttons[1].click();
  } else {
    console.log("Not enough download buttons found");
  }
  await page.waitForTimeout(5000);
  console.log("Done");
  process.exit(0);
})();

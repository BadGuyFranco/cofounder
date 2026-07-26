import { connect } from './utils.js';
(async () => {
  const { browser, page } = await connect();
  page.on('request', request => {
    if (request.url().includes('storage.googleapis.com')) {
      console.log("FOUND URL: " + request.url());
    }
  });
  console.log("Opening modal...");
  // Use exact locator for the first download button
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
  
  console.log("Requesting transcript generation...");
  const transcriptType = page.locator('select');
  if (await transcriptType.count() > 0) {
    await transcriptType.selectOption('txt');
  }
  if (buttons.length >= 4) {
    await buttons[3].click();
  }
  await page.waitForTimeout(5000);
  
  console.log("Done");
  process.exit(0);
})();

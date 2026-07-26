import { connect } from './utils.js';
(async () => {
  const { browser, page } = await connect();
  page.on('download', async download => {
    console.log("Download intercepted: " + download.suggestedFilename());
    await download.saveAs('/tmp/' + download.suggestedFilename());
    console.log("Saved to /tmp");
  });
  console.log("Opening modal...");
  const mainDownload = page.locator('button', { hasText: 'Download' }).first();
  await mainDownload.click();
  await page.waitForTimeout(2000);
  console.log("Clicking transcript download...");
  const buttons = await page.$$('button:has-text("Download")');
  // Usually it's the 4th button (1 is main, 2 is video, 3 is audio, 4 is transcript)
  if (buttons.length >= 4) {
    await buttons[3].click();
  } else {
    console.log("Not enough buttons: " + buttons.length);
  }
  await page.waitForTimeout(15000);
  console.log("Done");
  process.exit(0);
})();

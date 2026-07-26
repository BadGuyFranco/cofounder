import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  page.on('download', async download => {
    console.log("Download event! " + download.url());
    const path = "/Volumes/NAS/Shared/Hermes/runtime/links/how-to-founder-nas/Episodes/207 The Danger of Premature Scaling with Anthony, Chris, Stephanie/preshow/207 Are You Scaling to Hide? with Anthony, Chris, Stephanie.txt";
    await download.saveAs(path);
    console.log("Saved to " + path);
    process.exit(0);
  });
  console.log("Clicking button...");
  const btn = page.locator('[data-testid="download-row-download-button-vtt"]');
  await btn.click();
  setTimeout(() => {
    console.log("Timeout waiting for download.");
    process.exit(1);
  }, 10000);
})();

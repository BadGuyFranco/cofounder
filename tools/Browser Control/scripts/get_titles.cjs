const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  const list = await page.$$eval('div', els => {
    // try to find text and view links
    return Array.from(document.querySelectorAll('a:has-text("View")')).map(a => {
      return a.closest('div').parentElement.innerText;
    });
  });
  console.log(JSON.stringify(list, null, 2));
  process.exit(0);
})();

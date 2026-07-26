import { chromium } from 'playwright';

async function evaluate() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  
  const args = process.argv.slice(2);
  const result = await page.evaluate(args[0]);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
evaluate().catch(console.error);

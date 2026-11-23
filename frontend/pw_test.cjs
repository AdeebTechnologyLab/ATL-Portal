const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleMsgs = [];
  page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => consoleMsgs.push(`[PAGEERROR] ${e.message}`));
  page.on('requestfailed', r => consoleMsgs.push(`[REQFAILED] ${r.url()} ${r.failure()?.errorText}`));
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'aurangzaib985432@gmail.com');
  await page.fill('input[type="password"]', '123456');
  // select role if needed
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:5173/job/tasks');
  await page.waitForTimeout(5000);
  const text = await page.textContent('body');
  console.log('=== CONSOLE ===');
  consoleMsgs.forEach(m => console.log(m));
  console.log('=== PAGE TEXT (relevant) ===');
  console.log(text.slice(0, 800));
  await browser.close();
})();

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { localStorage.setItem('tema','acik'); });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const dark = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log('koyu mu:', dark);
  // buton satır kayması kontrolü
  const h = await p.locator('a.btn-call').first().evaluate((el) => el.getBoundingClientRect().height);
  console.log('ara butonu yüksekliği:', Math.round(h), 'px (tek satır ~42)');
  await p.screenshot({ path: '/tmp/f1-mobil-acik.png', fullPage: true });
  const d = await b.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: 'light' });
  const dp = await d.newPage();
  await dp.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await dp.evaluate(() => localStorage.setItem('tema','acik'));
  await dp.reload({ waitUntil: 'networkidle' });
  await dp.waitForTimeout(1000);
  await dp.screenshot({ path: '/tmp/f2-desktop-acik.png', fullPage: true });
  await b.close();
})();

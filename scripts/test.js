const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push('[desktop] ' + m.text()));
  page.on('pageerror', (e) => errors.push('[desktop pageerror] ' + e.message));

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  console.log('baslik :', await page.title());
  console.log('hash   :', await page.evaluate(() => location.hash));
  console.log('baslik2:', (await page.locator('h2').first().textContent().catch(()=>'YOK'))?.trim());
  console.log('kart   :', await page.locator('ul li').count());
  await page.screenshot({ path: '/tmp/s1-desktop.png', fullPage: true });

  await page.selectOption('#il', 'ankara');
  await page.waitForTimeout(1200);
  console.log('ankara :', (await page.locator('h2').first().textContent())?.trim());
  console.log('ankara kart:', await page.locator('ul li').count());

  await page.fill('input[type=search]', 'eczane');
  await page.waitForTimeout(400);
  console.log('arama sonucu:', await page.locator('ul li').count());
  await page.fill('input[type=search]', 'zzzqqq');
  await page.waitForTimeout(400);
  console.log('bos arama :', (await page.locator('main').textContent())?.includes('Aramana uyan') ? 'mesaj var' : 'YOK');
  await page.screenshot({ path: '/tmp/s2-ankara.png', fullPage: true });

  await page.click('[aria-label="Tema değiştir"]');
  await page.waitForTimeout(500);
  console.log('koyu mod:', await page.evaluate(() => document.documentElement.classList.contains('dark')));
  await page.screenshot({ path: '/tmp/s3-dark.png', fullPage: true });

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('[mobile pageerror] ' + e.message));
  await mp.goto('http://127.0.0.1:4173/#/istanbul/gungoren', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(1200);
  console.log('mobil h2:', (await mp.locator('h2').first().textContent())?.trim());
  console.log('mobil kart:', await mp.locator('ul li').count());
  console.log('yatay tasma:', await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'px');
  await mp.screenshot({ path: '/tmp/s4-mobile.png', fullPage: true });

  await browser.close();
  console.log('konsol hatalari:', errors.length ? errors : 'YOK');
})();

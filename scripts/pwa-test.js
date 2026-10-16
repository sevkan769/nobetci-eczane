const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);

  const sw = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r ? { scope: r.scope, active: !!r.active } : null;
  });
  console.log('service worker:', JSON.stringify(sw));

  const mf = await p.evaluate(async () => {
    const l = document.querySelector('link[rel=manifest]');
    if (!l) return 'YOK';
    const r = await fetch(l.href);
    const j = await r.json();
    return { ad: j.name, display: j.display, ikon: j.icons.length, start: j.start_url };
  });
  console.log('manifest:', JSON.stringify(mf));

  // kurulabilirlik kriterleri
  const kurulabilir = await p.evaluate(() => ({
    name: !!document.querySelector('link[rel=manifest]'),
    icon192: !!document.querySelector('link[rel=apple-touch-icon], link[rel=icon]'),
    sw: 'serviceWorker' in navigator,
    startUrl: location.pathname,
  }));
  console.log('kurulabilirlik:', JSON.stringify(kurulabilir));

  // çevrimdışı test
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(2000);
  const off = await p.evaluate(() => ({
    baslik: document.querySelector('h1')?.textContent?.trim(),
    ilce: document.querySelector('h2')?.textContent?.trim(),
    kart: document.querySelectorAll('ul li').length,
  }));
  console.log('ÇEVRİMDIŞI:', JSON.stringify(off));
  await p.screenshot({ path: '/tmp/p1-offline.png', fullPage: true });
  await ctx.setOffline(false);

  console.log('hata:', errs.length ? errs : 'YOK');
  await b.close();
})();

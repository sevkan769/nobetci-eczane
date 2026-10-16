const { chromium } = require('playwright');
const U = 'https://tarv91yp4yygz.space.minimax.io';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type()==='error' && errs.push('console: '+m.text()));

  await p.goto(U, { waitUntil: 'networkidle', timeout: 45000 });
  await p.waitForTimeout(3000);
  console.log('baslik   :', await p.title());
  console.log('h2       :', (await p.locator('h2').first().textContent().catch(()=>'-'))?.trim());
  console.log('eczane   :', await p.locator('ul li').count());

  const sw = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r ? !!r.active : false;
  });
  console.log('SW aktif :', sw);

  // il değiştir
  await p.selectOption('#il', 'izmir');
  await p.waitForTimeout(2000);
  console.log('izmir    :', (await p.locator('h2').first().textContent())?.trim(), '| kart:', await p.locator('ul li').count());

  await p.screenshot({ path: '/tmp/live1.png', fullPage: true });

  // kurulum butonu var mı (beforeinstallprompt tetiklenmedi headless'de ama UI mount oldu mu)
  console.log('ilk kart :', (await p.locator('ul li h3').first().textContent())?.trim());
  console.log('tel btn  :', await p.locator('a.btn-call').count());
  console.log('hata     :', errs.length ? errs : 'YOK');
  await b.close();
})();

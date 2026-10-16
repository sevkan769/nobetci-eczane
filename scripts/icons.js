// PWA ikonlarını HTML/SVG render edip PNG üretir (Playwright ile).
// Çıktı: frontend/public/icons/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'frontend', 'public', 'icons');

function html(size, maskable) {
  // maskable: güvenli alan payı ~%80, kenarlar kırpılabilir
  const pad = maskable ? size * 0.16 : 0;
  const r = maskable ? 0 : size * 0.22;
  const inner = size - pad * 2;
  return `<!doctype html><html><body style="margin:0">
  <div style="width:${size}px;height:${size}px;border-radius:${r}px;
              background:linear-gradient(135deg,#0ea5e9,#0284c7);
              display:flex;align-items:center;justify-content:center;">
    <div style="width:${inner}px;height:${inner}px;display:flex;align-items:center;justify-content:center;">
      <svg width="${inner}" height="${inner}" viewBox="0 0 24 24" fill="none">
        <g transform="rotate(-45 12 12)">
          <rect x="8.4" y="4.2" width="7.2" height="15.6" rx="3.6" fill="#fff"/>
        </g>
      </svg>
    </div>
  </div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const targets = [
    { file: 'icon-192.png', size: 192, maskable: false },
    { file: 'icon-512.png', size: 512, maskable: false },
    { file: 'icon-maskable-512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
    { file: 'favicon-64.png', size: 64, maskable: false },
  ];
  for (const t of targets) {
    const ctx = await browser.newContext({ viewport: { width: t.size, height: t.size } });
    const page = await ctx.newPage();
    await page.setContent(html(t.size, t.maskable));
    await page.screenshot({ path: path.join(OUT, t.file), omitBackground: true });
    await ctx.close();
    console.log('✓', t.file, `${t.size}x${t.size}`);
  }
  await browser.close();
})();

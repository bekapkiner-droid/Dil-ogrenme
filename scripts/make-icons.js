// Uygulama simgesi ve açılış ekranı görsellerini üretir: node scripts/make-icons.js
// Çıktı: assets/ (Capacitor Assets bunları Android boyutlarına çevirir)
const { chromium } = require('playwright');
const fs = require('fs');

const FLOWER = `
  <ellipse cx="32" cy="62" rx="22" ry="7" fill="#8a6a4f"/>
  <path d="M32 58V26" stroke="#12261f" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M32 48C20 48 15 40 18 33C28 33 33 40 32 48Z" fill="#bff0d4"/>
  <path d="M32 42C44 42 49 34 46 27C36 27 31 34 32 42Z" fill="#bff0d4"/>
  ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="32" cy="14" rx="4" ry="7" transform="rotate(${a} 32 22)" fill="#f0b429"/>`).join('')}
  <circle cx="32" cy="22" r="4" fill="#d4553f"/>`;
const STROKE = 'stroke="#12261f" stroke-width="1.4" stroke-linejoin="round"';

// size: tuval, scale: çiçeğin tuvale oranı, bg: arka plan SVG parçası (boşsa saydam)
const svg = (size, frac, bg) => {
  const h = 70, w = 64, k = (size * frac) / h;
  const tx = (size - w * k) / 2, ty = (size - h * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <g transform="translate(${tx} ${ty}) scale(${k})" ${STROKE}>${FLOWER}</g></svg>`;
};
const grad = (size) => `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fb27c"/><stop offset="1" stop-color="#1f7650"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/>`;
const solid = (size, c) => `<rect width="${size}" height="${size}" fill="${c}"/>`;

(async () => {
  fs.mkdirSync('assets', { recursive: true });
  const b = await chromium.launch();
  const jobs = [
    ['icon-only.png', 1024, svg(1024, 0.66, grad(1024)), false],
    ['icon-foreground.png', 1024, svg(1024, 0.5, ''), true],
    ['icon-background.png', 1024, solid(1024, '#2c9a68'), false],
    ['splash.png', 2732, svg(2732, 0.28, solid(2732, '#eef3f0')), false],
    ['splash-dark.png', 2732, svg(2732, 0.28, solid(2732, '#0e1a16')), false],
  ];
  for (const [name, size, markup, transparent] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0;background:transparent">${markup}</body>`);
    await p.screenshot({ path: 'assets/' + name, omitBackground: transparent });
    await p.close();
    console.log('assets/' + name);
  }
  await b.close();
})();

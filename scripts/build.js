// index.html (artifact biçimi) -> www/index.html (uygulama biçimi)
const fs = require('fs');
const src = fs.readFileSync('index.html', 'utf8');
const head =
  '<!doctype html><html lang="tr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>html{padding-top:env(safe-area-inset-top,0px)}body{margin:0}</style>';
fs.mkdirSync('www', { recursive: true });
if (fs.existsSync('audio')) {
  require('child_process').execSync('node scripts/audio-pack.js', { stdio: 'inherit' });
  fs.mkdirSync('www/audio', { recursive: true });
  for (const f of fs.readdirSync('audio').filter(f => f.startsWith('pack-'))) fs.copyFileSync('audio/' + f, 'www/audio/' + f);
}
fs.writeFileSync('www/index.html', head + src + '</html>');
console.log('www/index.html yazıldı', (head.length + src.length) + ' karakter');

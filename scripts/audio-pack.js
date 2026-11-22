// audio/<dil>/*.mp3 dosyalarını dil başına tek bir pakete (audio/pack-<dil>.json: {slug: base64}) toplar.
const fs = require('fs');
const path = require('path');
const root = 'audio';
let total = 0;
for (const lang of fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
  const pack = {};
  for (const f of fs.readdirSync(path.join(root, lang)).filter(f => f.endsWith('.mp3')).sort()) {
    pack[f.slice(0, -4)] = fs.readFileSync(path.join(root, lang, f)).toString('base64');
  }
  const out = path.join(root, 'pack-' + lang + '.json');
  fs.writeFileSync(out, JSON.stringify(pack));
  total += Object.keys(pack).length;
  console.log(out, Object.keys(pack).length, 'kayıt', (fs.statSync(out).size / 1024) | 0, 'KB');
}
console.log('toplam', total);

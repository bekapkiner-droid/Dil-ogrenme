// Ses dosyaları: her kelime için dosya var mı, çalma doğru yolu kullanıyor mu. node test/audio.test.js (önce npm run build)
const {chromium}=require('playwright');
const path=require('path');
const fs=require('fs');
const assert=require('assert');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const L=eval('('+html.match(/const L = (\{[\s\S]*?\n\});/)[1]+')');
  const man={};for(const k of Object.keys(L))man[k]=fs.readdirSync(path.join(root,'audio',k)).filter(f=>f.endsWith('.mp3')).map(f=>f.slice(0,-4));
  const b=await chromium.launch();const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{window.__played=[];window.Audio=function(src){this.src=src;this.pause=()=>{};this.play=()=>{__played.push(src);return Promise.resolve()}}});
  await p.goto('file://'+path.join(root,'www/index.html'));await p.waitForTimeout(400);
  // her dilde her kelimenin dosyası manifestte olmalı (sluglar JS ile Python'da aynı çıkıyor mu)
  for(const k of Object.keys(L)){
    const slugs=await p.evaluate(ws=>ws.map(slugT),L[k].g.flatMap(g=>g.w.map(w=>w[1])));
    const missing=slugs.filter(s=>!man[k].includes(s));
    assert.deepStrictEqual(missing,[],k+' eksik: '+missing.join(','));
  }
  for(const k of ['de','es'])await p.evaluate(([k,pk])=>{PACK[k]=pk},[k,JSON.parse(fs.readFileSync(path.join(root,'www/audio/pack-'+k+'.json'),'utf8'))]);
  await p.evaluate(()=>{S.lang='de';speak('Straße')});
  await p.evaluate(()=>{S.lang='es';speak('fin de semana')});
  const played=await p.evaluate(()=>__played);
  assert(played.length===2&&played.every(s=>s.startsWith('data:audio/mpeg;base64,')),'çalınan: '+played.map(s=>s.slice(0,30)));
  assert.deepStrictEqual(Object.keys(await p.evaluate(()=>PACK.de)).length,96);
  assert(fs.existsSync(path.join(root,'www/audio/pack-de.json')),'www/audio paketi yok');
  assert.deepStrictEqual(errs,[]);
  console.log('tamam: 288 kelimenin dosyası var, çalma yolu doğru');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

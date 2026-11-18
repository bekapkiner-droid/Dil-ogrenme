// Playwright duman testi: node test/lesson.test.js  (index.html ile aynı klasörün bir üstünden)
const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:480,height:860}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../index.html'));
  const wait=()=>p.waitForTimeout(260);

  // 1) ders: baştan sona
  await p.click('[data-act=lesson]');
  let done=false;
  for(let i=0;i<300&&!done;i++){
    await wait();
    if(await p.$('.lesson h2')){done=true;break}
    if(await p.$('.fb')){await p.click('.fb [data-act=next]');continue}
    if(await p.$('#ty')){await p.fill('#ty','x');await p.click('[data-act=check]');continue}
    if(await p.$('.tray')){const t=await p.$$('[data-tile]');await t[0].click();await p.click('[data-act=check]');continue}
    const o=await p.$$('.opt');if(o.length){await o[0].click();continue}
    if(await p.$('.lesson [data-act=next]')){await p.click('.lesson [data-act=next]');continue}
  }
  assert(done,'ders bitmedi');
  await p.click('[data-act=home]');await wait();await wait();

  // 2) bahçe: bitkiye dokun, panel açılsın
  await p.click('[data-tab=bahce]');await wait();await wait();
  await p.click('.plant');await wait();
  assert(await p.$('.detail'),'bitki paneli yok');

  // 3) hikaye: 2. sahne
  await p.click('[data-tab=hikaye]');await wait();await wait();
  const cards=await p.$$('[data-act=story]');assert.strictEqual(cards.length,2);
  await cards[1].click();
  for(let i=0;i<3;i++){await wait();await wait();await p.click('[data-ch="0"]');await wait();await p.click('[data-act=snext],[data-act=sdone]')}
  await wait();await wait();
  assert((await p.textContent('.lesson h2')).includes('6 kibarlık'),'hikaye puanı');

  // 4) ana ekrana dönüş hatasız
  await p.click('[data-act=home]');await wait();await wait();
  assert.deepStrictEqual(errs,[]);
  console.log('tamam');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

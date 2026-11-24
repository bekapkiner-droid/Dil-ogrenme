// Seri hesabı ve canlı ders bildirimi, sahte eklentiyle: node test/live.test.js (önce npm run build)
const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    window.__live=[];
    window.Capacitor={isNativePlatform:()=>true,Plugins:{
      FilizLive:{show:async a=>{__live.push(['show',a]);return{promoted:true}},cancel:async()=>{__live.push(['cancel'])},setStreak:async a=>{__live.push(['setStreak',a])},hideStreak:async()=>{__live.push(['hideStreak'])}},
      LocalNotifications:{checkPermissions:async()=>({display:'granted'}),requestPermissions:async()=>({display:'granted'}),cancel:async()=>{},schedule:async a=>{__live.push(['schedule',a])}}}};
    const d=n=>{const x=new Date();x.setDate(x.getDate()-n);return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate()};
    localStorage.setItem('filiz2',JSON.stringify({lang:'en',goal:60,notify:true,words:{},custom:{},story:{},min:{[d(1)]:5,[d(2)]:3,[d(3)]:2},ts:1}));
  });
  await p.goto('file://'+path.resolve(__dirname,'../www/index.html'));
  await p.waitForTimeout(600);
  const st=await p.evaluate(()=>streakInfo());
  assert.strictEqual(st.n,3,'seri 3 olmalı');assert(st.atRisk,'bugün çalışılmadı, risk var');
  assert((await p.textContent('.week')).includes('Seri 3 gün'),'seri metni yok');
  assert((await p.textContent('.week')).includes('sonra sıfırlanır'),'sıfırlanma süresi yok');
  await p.click('.dock-fab');await p.waitForTimeout(900);
  let calls=await p.evaluate(()=>__live);
  const show=calls.filter(c=>c[0]==='show').pop();
  assert(show,'canlı bildirim gösterilmedi');
  assert(show[1].countDown===true&&show[1].whenMs>Date.now(),'geri sayım gece yarısına olmalı');
  assert(/Seri 3 gün, bitirirsen 4 olur/.test(show[1].text),'metin: '+show[1].text);
  assert(/soru kaldı/.test(show[1].title),'kalan soru yok');
  const first=show[1].max-show[1].progress;
  await p.click('[data-act=next]');await p.waitForTimeout(700);
  calls=await p.evaluate(()=>__live);
  const show2=calls.filter(c=>c[0]==='show').pop();
  assert(show2[1].progress===1,'ilerleme güncellenmedi');
  // ders başlayınca sabit seri bildirimi kalkmış olmalı (ders bildirimi var)
  assert((await p.evaluate(()=>__live)).filter(c=>c[0]==='hideStreak').length>=1,'ders sırasında seri bildirimi gizlenmedi');
  // dersi çık: bildirim kalkmalı
  await p.click('[data-act=quit]');await p.waitForTimeout(700);
  calls=await p.evaluate(()=>__live);
  assert(calls.filter(c=>c[0]==='cancel').length>=1,'çıkınca bildirim kalkmadı');
  // ayar: seri bildirimini aç
  await p.click('[data-tab=yol]');await p.waitForTimeout(700);
  await p.click('[data-act=streakn]');await p.waitForTimeout(800);
  calls=await p.evaluate(()=>__live);
  const ss=calls.filter(c=>c[0]==='setStreak').pop();
  assert(ss&&ss[1].enabled===true,'seri bildirimi açılmadı');
  assert(ss[1].n===3&&ss[1].fromHour===18&&ss[1].toHour===23&&ss[1].resetAt>Date.now(),'seri bildirimi içeriği: '+JSON.stringify(ss[1]));
  // saat aralığını değiştir
  await p.selectOption('#sn-from','20');await p.waitForTimeout(600);
  const s2=(await p.evaluate(()=>__live)).filter(c=>c[0]==='setStreak').pop();
  assert(s2[1].fromHour===20&&s2[1].toHour===23,'aralık güncellenmedi: '+JSON.stringify(s2[1]));
  await p.selectOption('#sn-to','24');await p.waitForTimeout(600);
  const s3=(await p.evaluate(()=>__live)).filter(c=>c[0]==='setStreak').pop();
  assert(s3[1].toHour===24,'bitiş 24 olmadı');
  // kapat
  await p.click('[data-act=streakn]');await p.waitForTimeout(600);
  const s4=(await p.evaluate(()=>__live)).filter(c=>c[0]==='setStreak').pop();
  assert(s4[1].enabled===false,'kapatınca etkin kalmış');
  // seri hatırlatması planlandı mı (gece yarısına 3 saat kala, gelecekteyse)
  assert.deepStrictEqual(errs,[]);
  console.log('tamam: seri',st.n,'gün, canlı bildirim ve güncelleme, çıkışta kapanma');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

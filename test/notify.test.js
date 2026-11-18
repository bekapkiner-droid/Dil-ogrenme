// Capacitor yerel bildirim akışı, sahte eklentiyle: node test/notify.test.js
const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    window.__calls=[];
    window.Capacitor={isNativePlatform:()=>true,Plugins:{LocalNotifications:{
      cancel:async a=>{__calls.push(['cancel',a])},
      requestPermissions:async()=>({display:'granted'}),
      schedule:async a=>{__calls.push(['schedule',a])}}}};
  });
  await p.goto('file://'+path.resolve(__dirname,'../www/index.html'));
  await p.waitForTimeout(600);
  assert(await p.$('#dock'),'alt menü yok');
  assert((await p.textContent('main')).includes('Hatırlatmaları aç'),'bildirim düğmesi yok');
  await p.click('[data-act=notify]');await p.waitForTimeout(600);
  const calls=await p.evaluate(()=>__calls);
  const sch=calls.filter(c=>c[0]==='schedule').pop();
  assert(sch,'schedule çağrılmadı');
  const n=sch[1].notifications;
  assert(n.find(x=>x.id===2&&x.schedule.on.hour===19),'akşam hatırlatması yok');
  assert.deepStrictEqual(errs,[]);
  console.log('tamam: bildirimler planlandı',JSON.stringify(n.map(x=>x.id)));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

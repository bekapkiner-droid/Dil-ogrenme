// Ses hatası bildirimi: eklenti reddedince toast çıkmalı. node test/tts.test.js (önce npm run build)
const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    window.Capacitor={isNativePlatform:()=>true,Plugins:{
      TextToSpeech:{isLanguageSupported:async()=>({supported:false}),speak:async()=>{throw new Error('x')}},
      LocalNotifications:{cancel:async()=>{},schedule:async()=>{},requestPermissions:async()=>({display:'granted'})}}};
  });
  await p.goto('file://'+path.resolve(__dirname,'../www/index.html'));
  await p.waitForTimeout(500);
  await p.click('[data-tab=bahce]');await p.waitForTimeout(700);
  await p.click('.plant');await p.waitForTimeout(500);
  const t=await p.textContent('#toast');
  assert(/ses verisi yok/.test(t),'toast çıkmadı: '+t);
  assert.deepStrictEqual(errs,[]);
  console.log('tamam: ses hatası gösterildi');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

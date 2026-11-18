// Google girişi ve bulut eşitleme akışı, sahte eklentilerle: node test/cloud.test.js (önce npm run build)
const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    window.__sets=[];
    const remote={words:{'en:hello':{lvl:3,due:9e12,wrong:0}},min:{},story:{'en:0':4},custom:{en:[['x','y','']]},ts:1};
    window.Capacitor={isNativePlatform:()=>true,Plugins:{
      FirebaseAuthentication:{getCurrentUser:async()=>({user:null}),
        signInWithGoogle:async()=>({user:{uid:'u1',displayName:'Test Kişi',email:'t@example.com'}}),signOut:async()=>{}},
      FirebaseFirestore:{getDocument:async()=>({snapshot:{data:{state:JSON.stringify(remote),ts:1}}}),
        setDocument:async a=>{__sets.push(a)}},
      LocalNotifications:{cancel:async()=>{},schedule:async()=>{},requestPermissions:async()=>({display:'granted'})}}};
    localStorage.setItem('filiz2',JSON.stringify({lang:'en',goal:60,words:{'en:hello':{lvl:1,due:5,wrong:2}},custom:{},min:{},story:{},ts:5}));
  });
  await p.goto('file://'+path.resolve(__dirname,'../www/index.html'));
  await p.waitForTimeout(600);
  assert((await p.textContent('main')).includes('Google ile giriş yap'),'giriş düğmesi yok');
  await p.click('[data-act=gin]');await p.waitForTimeout(800);
  assert((await p.textContent('main')).includes('Test Kişi'),'kullanıcı gösterilmedi');
  const st=await p.evaluate(()=>S);
  assert.strictEqual(st.words['en:hello'].lvl,3,'bulut seviyesi korunmadı');
  assert.strictEqual(st.story['en:0'],4,'hikaye puanı birleşmedi');
  assert.deepStrictEqual(st.custom.en,[['x','y','']],'özel kelime birleşmedi');
  const sets=await p.evaluate(()=>__sets);
  assert(sets.length>=1&&sets[0].reference==='users/u1','bulutta yazılmadı');
  await p.click('[data-act=gout]');await p.waitForTimeout(600);
  assert((await p.textContent('main')).includes('Google ile giriş yap'),'çıkış olmadı');
  assert.deepStrictEqual(errs,[]);
  console.log('tamam: giriş, birleştirme ve çıkış');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

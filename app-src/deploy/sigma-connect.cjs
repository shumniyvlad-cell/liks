// Подключить кассу SIGMA: офлайн-токен ATOL ID из сессии владельца в Chrome рабочего сервера (CDP :9222).
// Владелец входит на cloud.sigma.ru в этом Chrome, затем: node deploy/sigma-connect.cjs
// Токен — в ~/.config/liks-sigma-offline.json (600), в вывод идут только сроки. Дальше его продлевает sigma-relay.mjs.
const {chromium}=require(process.env.PLAYWRIGHT ?? process.env.HOME + '/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const crypto=require('crypto'),fs=require('fs');
const KC='https://id.atol.ru/auth/realms/ATOL-ID-External/protocol/openid-connect';
(async()=>{
 const b=await chromium.connectOverCDP('http://localhost:9222');
 const ctx=b.contexts()[0]; const pg=await ctx.newPage();
 const ver=crypto.randomBytes(32).toString('base64url'), ch=crypto.createHash('sha256').update(ver).digest('base64url');
 const redirect='https://cloud.sigma.ru/dashboard';
 let code=null;
 await pg.route('https://cloud.sigma.ru/**',r=>{const u=new URL(r.request().url()); if(u.searchParams.get('code')){code=u.searchParams.get('code');} r.abort()});
 const url=`${KC}/auth?client_id=sigma_cloud_client&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&response_mode=query&scope=${encodeURIComponent('openid offline_access')}&prompt=none&state=x&code_challenge=${ch}&code_challenge_method=S256`;
 await pg.goto(url).catch(()=>{}); await pg.waitForTimeout(3000);
 {const fu=new URL(pg.url()); console.log('keys',[...fu.searchParams.keys()], 'hash', fu.hash.replace(/=[^&]+/g,'=…')); if(!code) code=fu.searchParams.get('code');}
 console.log('final url host:',new URL(pg.url()).host, 'error:',new URL(pg.url()).searchParams.get('error'), 'code?',!!code);
 await pg.close();
 if(code){
  const r=await fetch(KC+'/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:'sigma_cloud_client',code,redirect_uri:redirect,code_verifier:ver})});
  const j=await r.json(); console.log(r.status,{scope:j.scope,expires_in:j.expires_in,refresh_expires_in:j.refresh_expires_in,err:j.error,typ:j.refresh_token&&JSON.parse(Buffer.from(j.refresh_token.split('.')[1],'base64url')).typ});
  if(j.refresh_token){fs.writeFileSync(process.env.HOME+'/.config/liks-sigma-offline.json',JSON.stringify({refresh_token:j.refresh_token}),{mode:0o600});console.log('saved')}
 }
 await b.close().catch(()=>{});
})();

const ASSETS = /* SITE_ASSETS */;
const encoder=new TextEncoder(),attempts=new Map();
const COOKIE='__Host-politics_session',MAX_AGE=7*24*3600;
const security={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; media-src 'self' blob:; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'"};
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8',...extra}});
function bytes64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function from64(text){return Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function signingKey(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function mac(key,message){return bytes64(await crypto.subtle.sign('HMAC',key,encoder.encode(message)));}
async function isActivated(request,env){try{if(!env.SESSION_SECRET||!env.ACTIVATION_CODE)return false;const raw=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!raw||raw.length>250)return false;const [exp,nonce,sig,extra]=raw.split('.');const time=Number(exp);if(extra||!/^\d+$/.test(exp)||!nonce||!sig||time<Date.now()/1000||time>Date.now()/1000+MAX_AGE+60)return false;const key=await signingKey(env.SESSION_SECRET),revision=await mac(key,'code:'+env.ACTIVATION_CODE);return await crypto.subtle.verify('HMAC',key,from64(sig),encoder.encode(exp+'.'+nonce+'.'+revision));}catch{return false;}}
function sameOrigin(request){try{return request.headers.get('Origin')===new URL(request.url).origin;}catch{return false;}}
function limited(ip,max=8){const now=Date.now(),windowMs=15*60*1000;for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);let item=attempts.get(ip);if(!item){if(attempts.size>=5000)return true;item={n:0,until:now+windowMs};attempts.set(ip,item);}item.n++;return item.n>max;}

async function speech(request,env){
 if(request.method!=='POST')return json({error:'仅支持 POST'},405);
 if(!sameOrigin(request)||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'请求来源无效'},403);
 if(!await isActivated(request,env))return json({error:'请先输入激活码。'},401);
 if(limited('speech:'+(request.headers.get('CF-Connecting-IP')||'unknown'),180))return json({error:'朗读请求较多，请稍后重试。'},429);
 if(Number(request.headers.get('Content-Length')||0)>12000)return json({error:'请求过大'},413);
 const raw=await request.text();if(raw.length>12000)return json({error:'请求过大'},413);
 let b;try{b=JSON.parse(raw);}catch{return json({error:'请求格式错误'},400);}
 if(typeof b.apiKey!=='string'||b.apiKey.length<10||b.apiKey.length>1000||/[\r\n]/.test(b.apiKey))return json({error:'请填写有效的阿里云 API Key。'},400);
 if(typeof b.text!=='string'||!b.text.trim()||b.text.length>2000)return json({error:'题干为空或过长。'},400);
 if(typeof b.host!=='string'||!/^ws-[a-z0-9]+\.cn-beijing\.maas\.aliyuncs\.com$/.test(b.host))return json({error:'请检查北京地域的业务空间地址。'},400);
 if(!['longshuo_v3','longshu_v3'].includes(b.voice))return json({error:'不支持的音色。'},400);
 const controller=new AbortController(),abort=()=>controller.abort();request.signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,45000);let stage='connect';
 try{
 const upstream=await fetch('https://'+b.host+'/api/v1/services/audio/tts/SpeechSynthesizer',{method:'POST',headers:{Authorization:'Bearer '+b.apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:'cosyvoice-v3-flash',input:{text:b.text,voice:b.voice,format:'mp3',sample_rate:24000,rate:1}}),signal:controller.signal,redirect:'manual'});
 if(!upstream.ok){const status=upstream.status;return json({error:status===401||status===403?'阿里云鉴权或权限校验失败，请检查 Key、业务空间和模型权限。':status===429?'阿里云额度或请求频率受限，请检查免费额度及账户状态。':'阿里云合成未成功，请检查模型开通状态后重试。'},502);}
 stage='response';const data=await upstream.json();let u;try{u=new URL(data.output.audio.url);}catch{return json({error:'阿里云未返回可播放的音频。'},502);}
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||!/^dashscope-result[-a-z0-9]*\.oss-cn-beijing\.aliyuncs\.com$/.test(u.hostname))return json({error:'音频地址校验失败。'},502);
 stage='audio';u.protocol='https:';const audio=await fetch(u,{signal:controller.signal,redirect:'manual'});if(!audio.ok)return json({error:'音频下载失败，请重试。'},502);
 if(Number(audio.headers.get('Content-Length')||0)>8*1024*1024)return json({error:'音频过大。'},502);
 const bytes=await audio.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>8*1024*1024)return json({error:'音频为空或过大。'},502);
 return new Response(bytes,{headers:{...security,'Content-Type':'audio/mpeg'}});
 }catch(e){const timedOut=controller.signal.aborted;console.error(JSON.stringify({event:'speech_failure',stage,kind:timedOut?'aborted':String(e.name||'Error'),redirectMode:'manual',detail:String(e.message||'').split(b.apiKey).join('[redacted]').split(b.text).join('[text]').replace(/https?:\/\/[^\s]+/g,'[url]').slice(0,180)}));return json({error:timedOut?'语音请求已取消或超过 45 秒，请点击重读重试。':stage==='audio'?'音频获取失败，请稍后重读。':'本站连接阿里云语音接口失败，请稍后重试。'},502);}finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
}

export default {async fetch(request,env){try{const url=new URL(request.url),path=url.pathname;
 if(path==='/auth/login'){
  if(request.method!=='POST')return json({error:'仅支持 POST'},405);
  if(!sameOrigin(request)||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'请求来源无效'},403);
  if(!env.ACTIVATION_CODE||!env.SESSION_SECRET)return json({error:'激活服务尚未配置，请稍后再试。'},503);
  if(Number(request.headers.get('Content-Length')||0)>1024)return json({error:'请求过大'},413);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(limited(ip)||limited('__all__',120))return json({error:'尝试过于频繁，请 15 分钟后再试。'},429,{'Retry-After':'900'});
  const body=await request.text();if(body.length>1024)return json({error:'请求过大'},413);let code;try{code=JSON.parse(body).code;}catch{return json({error:'请求格式错误'},400);}
  if(typeof code!=='string'||code.length>64)return json({error:'激活码格式错误'},400);
  const key=await signingKey(env.SESSION_SECRET),expected=await crypto.subtle.sign('HMAC',key,encoder.encode(env.ACTIVATION_CODE));
  if(!await crypto.subtle.verify('HMAC',key,expected,encoder.encode(code)))return json({error:'激活码不正确，请重新输入。'},401);
  const exp=String(Math.floor(Date.now()/1000)+MAX_AGE),nonce=bytes64(crypto.getRandomValues(new Uint8Array(18))),revision=await mac(key,'code:'+env.ACTIVATION_CODE),sig=await mac(key,exp+'.'+nonce+'.'+revision);
  attempts.delete(ip);return json({ok:true},200,{'Set-Cookie':COOKIE+'='+exp+'.'+nonce+'.'+sig+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+MAX_AGE});
 }
 if(path==='/auth/logout'){
  if(request.method!=='POST')return json({error:'仅支持 POST'},405);if(!sameOrigin(request))return json({error:'请求来源无效'},403);
  return json({ok:true},200,{'Set-Cookie':COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
 }
 if(path==='/api/speech')return speech(request,env);
 if(!['GET','HEAD'].includes(request.method))return json({error:'请求方式不支持'},405);
 const active=await isActivated(request,env);
 if(!active){if(path!=='/')return json({error:'请先输入激活码。'},401);return new Response(request.method==='HEAD'?null:ASSETS['/login.html'].body,{headers:{...security,'Content-Type':'text/html; charset=utf-8'}});}
 const asset=ASSETS[path==='/'?'/index.html':path];if(!asset||path==='/login.html')return json({error:'页面不存在'},404);
 return new Response(request.method==='HEAD'?null:asset.body,{headers:{...security,'Content-Type':asset.type}});
 }catch{return json({error:'服务暂时不可用，请稍后重试。'},500);}}};

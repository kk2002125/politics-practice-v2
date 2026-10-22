import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
test('standalone Node server preserves auth and protected assets',async()=>{
 const free=net.createServer();await new Promise(r=>free.listen(0,'127.0.0.1',r));const port=free.address().port;await new Promise(r=>free.close(r));const origin='http://127.0.0.1:'+port,code=randomBytes(8).toString('hex');
 const proc=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:String(port),SITE_ORIGIN:origin,ACTIVATION_CODE:code,SESSION_SECRET:randomBytes(32).toString('hex')},stdio:['ignore','pipe','pipe']});
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),5000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve();});proc.once('exit',()=>{clearTimeout(timer);reject(Error('server exited'));});});
 assert.equal((await fetch(origin+'/healthz')).status,200);assert.equal((await fetch(origin+'/speech.js')).status,401);
 const r=await fetch(origin+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({code})});assert.equal(r.status,200);const cookie=r.headers.get('Set-Cookie').split(';')[0];const app=await fetch(origin+'/',{headers:{Cookie:cookie}});assert.match(await app.text(),/__EMBEDDED_QUESTIONS__/);
 }finally{proc.kill();}
});

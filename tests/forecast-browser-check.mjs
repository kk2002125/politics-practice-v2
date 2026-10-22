import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
import worker from '../worker/index.js';
const env={ACTIVATION_CODE:'browser-test-only',SESSION_SECRET:'browser-test-session-only-0000000000000000000000000000000000000'};
const server=http.createServer(async(req,res)=>{try{let body='';for await(const c of req)body+=c;const request=new Request('http://localhost:'+server.address().port+req.url,{method:req.method,headers:req.headers,...(body?{body}:{} )});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end('test server failure');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
page.setDefaultTimeout(12000);
const url='http://localhost:'+server.address().port;

try{
await page.goto(url);await page.locator('#code').fill(env.ACTIVATION_CODE);await page.locator('#submit').click();await page.getByRole('heading',{name:'记忆掌握情况',exact:true}).waitFor();
await page.evaluate(()=>{const t=QuizMastery.forecast([],{},Date.now()).tomorrowStart;state.memory={1:{phase:'review',stage:0,dueTs:t},2:{phase:'review',stage:1,dueTs:t+3600000},3:{phase:'review',stage:0,dueTs:Date.now()-86400000},4:{phase:'learning',dueTs:null},5:{phase:'mastered',dueTs:null}};save();home();});
await page.waitForFunction(()=>document.querySelector('[data-forecast="tomorrow"] b')?.textContent==='2');assert.equal(await page.locator('[data-forecast="due"] b').textContent(),'1');
const memory=await page.evaluate(()=>JSON.stringify(state.memory));await page.locator('[data-forecast="tomorrow"]').click();assert.equal(await page.locator('.mastery-question-list article').count(),2);await page.locator('#mastery-chapter').selectOption({label:'导论'});assert.equal(await page.locator('.mastery-question-list article').count(),2);assert.equal(await page.evaluate(()=>JSON.stringify(state.memory)),memory);await page.getByRole('button',{name:'返回首页 ×',exact:true}).click();
await page.evaluate(()=>startPractice('selection',[1,2]));await page.waitForFunction(()=>document.querySelector('[data-forecast="tomorrow"] b')?.textContent==='2');const before=await page.locator('.question-navigation').boundingBox();await page.locator('.option').first().click();await page.waitForFunction(()=>document.querySelector('[data-forecast="tomorrow"] b')?.textContent==='1');assert.ok(Math.abs((await page.locator('.question-navigation').boundingBox()).y-before.y)<2);
await page.locator('[data-forecast="tomorrow"]').click();assert.equal(await page.locator('.mastery-question-list article').count(),1);await page.getByRole('button',{name:'返回首页 ×',exact:true}).click();assert.equal(await page.evaluate(()=>view),'practice');await page.getByRole('button',{name:'⌂ 首页'}).click();assert.equal(await page.locator('[data-forecast="tomorrow"] b').textContent(),'1');
await page.evaluate(()=>{state.memory[2].phase='mastered';save();});await page.waitForFunction(()=>document.querySelector('[data-forecast="tomorrow"] b')?.textContent==='0');await page.locator('[data-forecast="tomorrow"]').click();assert.equal(await page.locator('.mastery-question-list article').count(),0);await page.getByRole('button',{name:'返回首页 ×',exact:true}).click();
for(const width of [320,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/politics-forecast-'+width+'.png',fullPage:true});}
assert.deepEqual(errors,[]);console.log('PASS forecast browser: home/practice/list agree, chapter filter, answer reset updates, read-only inspection, empty plan, responsive layout.');
}finally{await browser.close();server.close();}

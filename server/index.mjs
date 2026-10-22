import http from 'node:http';
import worker from '../worker/index.js';
const {ACTIVATION_CODE,SESSION_SECRET,SITE_ORIGIN}=process.env;
if(!ACTIVATION_CODE||!SESSION_SECRET||!SITE_ORIGIN){console.error('Configure ACTIVATION_CODE, SESSION_SECRET and SITE_ORIGIN before starting.');process.exit(1);}
let origin;try{origin=new URL(SITE_ORIGIN).origin;}catch{console.error('SITE_ORIGIN must be an absolute URL.');process.exit(1);}
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>16000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
  const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
  // This deployment is behind an HTTPS reverse proxy; do not trust an incoming Cloudflare IP header.
  headers.set('CF-Connecting-IP',req.socket.remoteAddress||'unknown');
  const body=Buffer.concat(chunks),controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  const request=new Request(new URL(req.url,origin),{method:req.method,headers,signal:controller.signal,...(body.length?{body}:{} )});
  const response=await worker.fetch(request,{ACTIVATION_CODE,SESSION_SECRET});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain'});res.end('Service temporarily unavailable');}
});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Quiz server ready.'));

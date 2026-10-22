(function(root){
'use strict';
const DEFAULTS=Object.freeze({auto:false,range:'question',rate:1,voiceURI:'',source:'aliyun'});
const CUSTOM_CONTRACT=Object.freeze({status:'reserved',configFields:['provider','apiKey','voiceId','model','baseURL'],methods:['speak({text,config,signal,onStart,onEnd,onError})','cancel()'],notes:'Future providers must honor AbortSignal, discard stale generations and cache by text plus public voice settings. Never persist API keys in quiz state.'});
function settings(raw={}){return {auto:raw.auto===true,range:raw.range==='options'?'options':'question',rate:Math.max(.6,Math.min(1.8,Number(raw.rate)||1)),voiceURI:typeof raw.voiceURI==='string'?raw.voiceURI:'',source:raw.source==='system'?'system':'aliyun'};}
function textFor(q,cfg){const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();return plain(q.q)+(cfg.range==='options'&&Array.isArray(q.options)?'。选项：'+q.options.map(plain).join('。'):'');}
function cacheKey(text,cfg){return JSON.stringify([text,cfg.provider||'system',cfg.voiceId||cfg.voiceURI||'',cfg.model||'',cfg.baseURL||'',cfg.rate||1]);}
function controller({engine,Utterance,onStatus=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 let generation=0,active=null,pending=null,waitTimer=null,startTimer=null;
 const supported=!!(engine&&Utterance&&typeof engine.speak==='function'&&typeof engine.cancel==='function');
 function voices(){try{return supported?engine.getVoices().filter(v=>/^(zh|cmn)(-|_|$)/i.test(v.lang)&&v.localService===true):[];}catch{return [];}}
 function stop(){generation++;clearTimer(waitTimer);clearTimer(startTimer);waitTimer=startTimer=null;pending=null;if(active){active.onstart=active.onend=active.onerror=null;active=null;}try{engine?.cancel();}catch{}onStatus('',false);}
 function start(text,cfg,id){if(id!==generation)return;const available=voices();if(!available.length)return false;pending=null;clearTimer(waitTimer);const u=new Utterance(text);active=u;u.lang='zh-CN';u.rate=cfg.rate;u.voice=available.find(v=>v.voiceURI===cfg.voiceURI)||available.find(v=>v.default)||available[0];
  u.onstart=()=>{if(id!==generation)return;clearTimer(startTimer);onStatus('正在朗读',false);};
  u.onend=()=>{if(id!==generation)return;clearTimer(startTimer);active=null;onStatus('',false);};
  u.onerror=e=>{if(id!==generation)return;clearTimer(startTimer);active=null;if(['canceled','interrupted'].includes(e.error)){onStatus('',false);return;}onStatus(e.error==='not-allowed'?'浏览器限制了自动播放，请点击“重读”手动播放。':'系统朗读暂不可用，请检查中文语音包或点击重读。',true);};
  startTimer=setTimer(()=>{if(id!==generation||!active)return;stop();onStatus('朗读未能启动，请点击“重读”；必要时检查浏览器声音权限。',true);},5000);
  try{if(engine.paused)engine.resume?.();engine.speak(u);}catch{stop();onStatus('朗读未能启动，请点击“重读”或检查系统语音。',true);}return true;
 }
 function play(text,cfg){stop();if(!supported){onStatus('此浏览器不支持系统朗读，可换用支持朗读的浏览器。',true);return;}if(!text)return;const id=generation;if(start(text,cfg,id))return;pending={text,cfg,id};onStatus('正在加载本机中文声音…',false);waitTimer=setTimer(()=>{if(id!==generation)return;pending=null;onStatus('未发现本机中文声音，请安装系统中文语音包后点击重读。本次未发送题目到第三方。',true);},1600);}
 function voicesChanged(){if(pending)start(pending.text,pending.cfg,pending.id);}
 return {supported,voices,play,stop,voicesChanged};
}
root.QuizSpeechCore={DEFAULTS,CUSTOM_CONTRACT,settings,textFor,cacheKey,controller};
})(typeof window==='undefined'?globalThis:window);

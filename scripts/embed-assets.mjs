import {readFile,writeFile} from 'node:fs/promises';
const types={'index.html':'text/html; charset=utf-8','login.html':'text/html; charset=utf-8','ai-core.js':'text/javascript; charset=utf-8','ai.js':'text/javascript; charset=utf-8','ai.css':'text/css; charset=utf-8','mastery-core.js':'text/javascript; charset=utf-8','mastery-ui.js':'text/javascript; charset=utf-8','speech-core.js':'text/javascript; charset=utf-8','speech.js':'text/javascript; charset=utf-8','manifest.webmanifest':'application/manifest+json'};
const assets={};for(const [name,type]of Object.entries(types))assets['/'+name]={body:await readFile(new URL('../src/'+name,import.meta.url),'utf8'),type};
const template=await readFile(new URL('../worker/server-template.js',import.meta.url),'utf8');
await writeFile(new URL('../worker/index.js',import.meta.url),template.replace('/* SITE_ASSETS */',()=>JSON.stringify(assets)));
console.log('Embedded protected assets into Worker.');

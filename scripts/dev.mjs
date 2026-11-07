import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
const children=[];
const iphone=process.argv.includes('--iphone');
function start(args){const p=spawn(process.execPath,args,{stdio:'inherit'});children.push(p);return p;}
if(!existsSync('dist/index.html'))await new Promise((resolve,reject)=>start(['node_modules/vite/bin/vite.js','build']).on('exit',code=>code===0?resolve():reject(new Error('초기 빌드 실패'))));
start(['node_modules/wrangler/bin/wrangler.js','dev','--ip','127.0.0.1','--port',iphone?'8788':'8787',...(iphone?['--inspector-port','9230','--persist-to','.wrangler/iphone']:[])]);
start(['node_modules/vite/bin/vite.js',...(iphone?['--mode','iphone']:[])]);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const p of children)p.kill(signal);process.exit(0)});

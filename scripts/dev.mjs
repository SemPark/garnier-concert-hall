import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
const children=[];
function start(args){const p=spawn(process.execPath,args,{stdio:'inherit'});children.push(p);return p;}
if(!existsSync('dist/index.html'))await new Promise((resolve,reject)=>start(['node_modules/vite/bin/vite.js','build']).on('exit',code=>code===0?resolve():reject(new Error('초기 빌드 실패'))));
start(['node_modules/wrangler/bin/wrangler.js','dev','--ip','127.0.0.1','--port','8787']);
start(['node_modules/vite/bin/vite.js','--host','127.0.0.1']);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const p of children)p.kill(signal);process.exit(0)});

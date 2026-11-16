import {readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';

/** Store the selected build defaults from the development server on this machine. */
export function galaxyPresetEditor():Plugin{
 return {
  name:'pleee-galaxy-presets',
  apply:'serve',
  configureServer(server){
   const file=resolve(server.config.root,'src/scene/galaxyPresets.json');
   server.middlewares.use('/__galaxy-presets',async(req,res)=>{
    if(req.method!=='POST'){res.writeHead(405).end();return;}
    const host=req.headers.host??'';
    if(!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
     ||req.headers.origin!==`http://${host}`
     ||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'')){
     res.writeHead(403).end();return;
    }
    if(req.headers['content-type']!=='application/json'){res.writeHead(415).end();return;}
    const length=Number(req.headers['content-length']);
    if(!Number.isInteger(length)||length<1||length>1024){res.writeHead(400).end();return;}
    let data;
    try{
     let body='';
     for await(const chunk of req)body+=chunk;
     data=JSON.parse(body);
    }catch{res.writeHead(400).end();return;}
    const {device,count,size,brightness,resolution}=data??{};
    if((device!=='desktop'&&device!=='mobile')||(resolution!=='desktop'&&resolution!=='mobile')
     ||!Number.isSafeInteger(count)||count<0||!Number.isFinite(size)||size<.65||size>1.35
     ||!Number.isFinite(brightness)||brightness<0||brightness>1){
     res.writeHead(400).end();return;
    }
    try{
     const presets=JSON.parse(readFileSync(file,'utf8'));
     presets[device]={count,size,brightness,resolution};
     const pending=file+'.tmp';
     writeFileSync(pending,JSON.stringify(presets,null,2)+'\n');
     renameSync(pending,file);
     res.writeHead(204).end();
    }catch(error){
     server.config.logger.error(`은하 프리셋 저장 실패: ${String(error)}`);
     res.writeHead(500).end();
    }
   });
  },
 };
}

import {readdir,stat,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('public/audio'),files={};
for(const name of await readdir(root,{recursive:true})){const item=await stat(resolve(root,name));if(item.isFile())files['/audio/'+name.replaceAll('\\','/')]=item.size;}
await writeFile('content/audio-files.json',JSON.stringify(files,null,2)+'\n');

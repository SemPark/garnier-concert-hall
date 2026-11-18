import {createReadStream,createWriteStream} from 'node:fs';
import {readdir,rename,rm,stat,unlink,writeFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';

const maxAssetBytes=25*1024*1024;
const publicAudio=resolve('public/audio');
const files={};
const packDist=process.argv.includes('--pack-dist');
const builtOutput=resolve('.wrangler/assets-build');

for(const name of await readdir(publicAudio,{recursive:true})){
 const item=await stat(resolve(publicAudio,name));
 if(!item.isFile())continue;
 const path='/audio/'+name.replaceAll('\\','/');
 files[path]=item.size;
 const extension=extname(name);
 if(!['.m4a','.ogg','.flac'].includes(extension)||item.size<=maxAssetBytes)continue;
 const builtFile=resolve(builtOutput,'audio',name);
 for(let start=0,index=0;start<item.size;start+=maxAssetBytes,index++){
  const length=Math.min(maxAssetBytes,item.size-start);
  const suffix=`.part-${index}${extension}`;
  files[path+suffix]=length;
  if(packDist){
   await pipeline(
    createReadStream(builtFile,{start,end:start+length-1}),
    createWriteStream(builtFile+suffix),
   );
  }
 }
 if(packDist)await unlink(builtFile);
}

if(packDist){
 // The running Worker's asset watcher should only see the packed build.
 await rm('dist',{recursive:true,force:true});
 await rename(builtOutput,'dist');
}else{
 await writeFile('content/audio-files.json',JSON.stringify(files,null,2)+'\n');
}

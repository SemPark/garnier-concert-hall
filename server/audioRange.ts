import audioFiles from '../content/audio-files.json';
const sizes:Record<string,number>=audioFiles;

function byteRange(range:string,length:number){
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start=0,end=length-1;
 if(match&&(match[1]||match[2])){
  if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),length-1);}
  else start=Math.max(0,length-Number(match[2]));
 }
 if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=length||end<start)return null;
 return {start,end};
}

function invalidRange(length:number){
 return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
}

/** Reassemble byte-identical audio over static asset parts without re-encoding. */
function packedAudio(request:Request,assets:Fetcher,url:URL,length:number,extension:string){
 const range=request.headers.get('Range');
 const bounds=range?byteRange(range,length):{start:0,end:length-1};
 if(!bounds)return invalidRange(length);
 const {start,end}=bounds;
 const contentLength=end-start+1;
 const headers=new Headers({
  'Content-Type':extension==='.ogg'?'audio/ogg':extension==='.flac'?'audio/flac':'audio/mp4',
  'Accept-Ranges':'bytes',
  'Content-Length':String(contentLength),
 });
 if(range)headers.set('Content-Range',`bytes ${start}-${end}/${length}`);
 const status=range?206:200;
 if(request.method==='HEAD')return new Response(null,{status,headers});

 const {readable,writable}=new FixedLengthStream(contentLength);
 const streamParts=async()=>{
  const path=url.pathname;
  for(let offset=0,index=0;offset<=end;index++){
   const partPath=`${path}.part-${index}${extension}`;
   const size=sizes[partPath];
   if(!size)throw new Error(`Missing packed audio part: ${partPath}`);
   const from=Math.max(0,start-offset),to=Math.min(size-1,end-offset);
   offset+=size;
   if(from>to)continue;
   url.pathname=partPath;
   const part=await audioAsset(new Request(url,{headers:{Range:`bytes=${from}-${to}`}}),assets);
   if(part.status!==206||!part.body){
    await part.body?.cancel();
    throw new Error(`Unable to read packed audio part: ${partPath}`);
   }
   await part.body.pipeTo(writable,{preventClose:true});
  }
  await writable.close();
 };
 void streamParts().catch(error=>writable.abort(error).catch(()=>{}));
 return new Response(readable,{status,headers});
}

/** Add single-byte-range support when the underlying asset server returns a full file. */
export async function audioAsset(request:Request,assets:Fetcher):Promise<Response>{
 const url=new URL(request.url);
 const storedSize=sizes[url.pathname];
 const extension=/\.(m4a|ogg|flac)$/.exec(url.pathname)?.[0];
 if(storedSize&&extension&&sizes[url.pathname+'.part-0'+extension]&&(request.method==='GET'||request.method==='HEAD'))return packedAudio(request,assets,url,storedSize,extension);
 const range=request.headers.get('Range');
 const asset=await assets.fetch(new Request(request));
 if(!range||asset.status!==200)return asset;
 const length=Number(asset.headers.get('Content-Length'))||storedSize;
 if(!Number.isSafeInteger(length)||length<=0||!asset.headers.get('Content-Type')?.startsWith('audio/'))return asset;
 const bounds=byteRange(range,length);
 if(!bounds){await asset.body?.cancel();return invalidRange(length);}
 const {start,end}=bounds;
 const headers=new Headers(asset.headers);headers.set('Accept-Ranges','bytes');headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));
 if(request.method==='HEAD'||!asset.body)return new Response(null,{status:206,headers});
 const reader=asset.body.getReader();let cursor=0,done=false;
 const body=new ReadableStream<Uint8Array>({
  async pull(controller){
   while(!done){const chunk=await reader.read();if(chunk.done){done=true;controller.close();return;}
    const chunkStart=cursor;cursor+=chunk.value.byteLength;if(cursor<=start)continue;
    const from=Math.max(0,start-chunkStart),to=Math.min(chunk.value.byteLength,end+1-chunkStart);if(to>from)controller.enqueue(chunk.value.subarray(from,to));
    if(cursor>end){done=true;controller.close();await reader.cancel();}return;
   }
  },async cancel(reason){done=true;await reader.cancel(reason);}
 });
 return new Response(body,{status:206,headers});
}

import audioFiles from '../content/audio-files.json';
/** Add single-byte-range support when the underlying asset server returns a full file. */
export async function audioAsset(request:Request,assets:Fetcher):Promise<Response>{
 const range=request.headers.get('Range');
 const asset=await assets.fetch(new Request(request));
 if(!range||asset.status!==200)return asset;
 const sizes:Record<string,number>=audioFiles;
 const length=Number(asset.headers.get('Content-Length'))||sizes[new URL(request.url).pathname];
 if(!Number.isSafeInteger(length)||length<=0||!asset.headers.get('Content-Type')?.startsWith('audio/'))return asset;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start=0,end=length-1;
 if(match&&(match[1]||match[2])){
  if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),length-1);}
  else start=Math.max(0,length-Number(match[2]));
 }
 if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=length||end<start){await asset.body?.cancel();return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});}
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

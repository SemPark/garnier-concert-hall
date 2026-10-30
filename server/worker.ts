import {VenueRoom} from './VenueRoom';
import {audioAsset} from './audioRange';
export {VenueRoom};
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==='/api/health')return Response.json({ok:true,scene:'garnier-v1'});
  if(url.pathname.startsWith('/api/audio/')){const assetUrl=new URL(url);assetUrl.pathname=url.pathname.slice(4);return audioAsset(new Request(assetUrl,request),env.ASSETS);}
  if(url.pathname==='/api/presence'){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
   const origin=request.headers.get('Origin');if(origin&&new URL(origin).host!==url.host&&!['localhost','127.0.0.1'].includes(new URL(origin).hostname))return new Response('Origin rejected',{status:403});
   const preferred=url.searchParams.get('room');
   const rooms=preferred&&/^hall-\d{1,2}$/.test(preferred)?[preferred]:Array.from({length:32},(_,i)=>`hall-${i+1}`);
   for(const roomId of rooms){const target=new URL(url);target.searchParams.set('room',roomId);const response=await env.VENUES.getByName(roomId).fetch(new Request(target,request));if(response.status!==409)return response;}
   return new Response('현재 음악당이 가득 찼습니다. 잠시 후 다시 찾아주세요.',{status:503});
  }
  if(url.pathname.startsWith('/api/'))return Response.json({error:'Not found'},{status:404});
  if(url.pathname.startsWith('/audio/'))return audioAsset(request,env.ASSETS);
  return env.ASSETS.fetch(request);
 }
} satisfies ExportedHandler<Env>;

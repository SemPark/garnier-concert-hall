import {LocalConcert} from './LocalConcert';
import type {ClientMessage,ServerMessage,Snapshot} from '../../shared/protocol';

export class Presence{
 readonly local=import.meta.env.VITE_STATIC_PREVIEW==='true';
 private preview:LocalConcert|null=null;
 selfId='';state:Snapshot|null=null;status:'connecting'|'connected'|'offline'='offline';
 onState:(state:Snapshot)=>void=()=>{};onStatus:()=>void=()=>{};onError:(message:string)=>void=()=>{};
 private socket:WebSocket|null=null;private retry=0;private stopped=false;private timer=0;private heartbeat=0;
 private origin=Date.now()-performance.now();private offset=0;private bestRTT=Infinity;
 private requests=new Map<string,{resolve:(ok:boolean)=>void;timer:number}>();
 now=()=>this.origin+performance.now()+this.offset;
 connect(){
  if(this.local){this.preview=new LocalConcert();this.selfId=this.preview.visitor.id;this.status='connected';this.accept(this.preview.snapshot());this.onStatus();return;}
  this.stopped=false;this.status='connecting';this.onStatus();
  const url=new URL('/api/presence',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
  const token=sessionStorage.getItem('garnier-resume'),room=sessionStorage.getItem('garnier-room');if(token&&room){url.searchParams.set('resume',token);url.searchParams.set('room',room);}
  const socket=new WebSocket(url);this.socket=socket;
  socket.onmessage=e=>{if(this.socket!==socket)return;let msg:ServerMessage;try{msg=JSON.parse(e.data) as ServerMessage;}catch{return;}
   if(msg.type==='welcome'){
    this.selfId=msg.selfId;sessionStorage.setItem('garnier-resume',msg.resumeToken);sessionStorage.setItem('garnier-room',msg.state.roomId);
    this.offset=msg.state.serverNow-(this.origin+performance.now());this.bestRTT=Infinity;this.retry=0;this.status='connected';this.accept(msg.state);this.onStatus();this.ping();
    window.clearInterval(this.heartbeat);this.heartbeat=window.setInterval(()=>this.ping(),30000);
   }else if(msg.type==='state')this.accept(msg.state);
   else if(msg.type==='clock'){
    const end=performance.now(),rtt=end-msg.sentAt;if(rtt<this.bestRTT){this.bestRTT=rtt;this.offset=msg.serverNow-(this.origin+(msg.sentAt+end)/2);}
   }else if(msg.type==='seatResult'){
    const q=this.requests.get(msg.requestId);if(q){clearTimeout(q.timer);q.resolve(msg.ok);this.requests.delete(msg.requestId);}if(!msg.ok)this.onError(msg.reason??'이 좌석을 선택할 수 없어요.');
   }else if(msg.type==='error')this.onError(msg.message);
  };
  socket.onclose=()=>{if(this.socket!==socket)return;this.status='offline';this.onStatus();clearInterval(this.heartbeat);for(const q of this.requests.values()){clearTimeout(q.timer);q.resolve(false);}this.requests.clear();
   if(!this.stopped)this.timer=window.setTimeout(()=>this.connect(),Math.min(10000,600*2**Math.min(this.retry++,4)));};
  socket.onerror=()=>socket.close();
 }
 private accept(state:Snapshot){this.state=state;this.onState(state);}
 private ping(){this.bestRTT=Infinity;for(let i=0;i<3;i++)window.setTimeout(()=>this.send({type:'clock',sentAt:performance.now()}),i*150);}
 send(msg:ClientMessage){if(this.preview){const ok=this.preview.send(msg);this.accept(this.preview.snapshot());return ok;}if(this.socket?.readyState===WebSocket.OPEN&&this.status==='connected'){this.socket.send(JSON.stringify(msg));return true;}return false;}
 reserve(seatId:string,requestId=crypto.randomUUID()){if(this.preview){const ok=this.preview.send({type:'reserve',seatId,requestId});this.accept(this.preview.snapshot());return Promise.resolve(ok);}if(this.status!=='connected')return Promise.resolve(false);return new Promise<boolean>(resolve=>{const timer=window.setTimeout(()=>{this.requests.delete(requestId);resolve(false);},6000);this.requests.set(requestId,{resolve,timer});this.send({type:'reserve',seatId,requestId});});}
 destroy(){this.stopped=true;clearTimeout(this.timer);clearInterval(this.heartbeat);this.socket?.close();}
}

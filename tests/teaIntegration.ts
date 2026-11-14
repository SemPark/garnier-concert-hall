import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {NPC_SEATS,SEATS} from '../shared/venue';
import {applyDelta,type Snapshot,type ServerMessage,type ClientMessage} from '../shared/protocol';

const base=process.env.CONCERT_TEST_URL??'http://127.0.0.1:8787';
const sockets:WebSocket[]=[];
async function wait(check:()=>boolean,label:string){
 const until=Date.now()+8000;
 while(Date.now()<until){if(check())return;await new Promise(resolve=>setTimeout(resolve,30));}
 throw new Error(`Timed out: ${label}`);
}
async function connect(token=''){
 const url=new URL('/api/presence',base);
 url.protocol='ws:';url.searchParams.set('room','hall-96');
 if(token)url.searchParams.set('resume',token);
 const socket=new WebSocket(url,{origin:new URL(base).origin});
 sockets.push(socket);
 const client={socket,id:'',token:'',state:undefined as Snapshot|undefined,messages:[] as ServerMessage[],send:(m:ClientMessage)=>socket.send(JSON.stringify(m))};
 socket.on('message',raw=>{
  const message=JSON.parse(raw.toString()) as ServerMessage;
  client.messages.push(message);
  if(message.type==='welcome'){client.id=message.selfId;client.token=message.resumeToken;client.state=message.state;}
  if(message.type==='state')client.state=message.state;
  if(message.type==='delta'&&client.state)client.state=applyDelta(client.state,message.delta)??client.state;
 });
 await wait(()=>!!client.id,'welcome');
 return client;
}
try{
 const a=await connect(),b=await connect();
 const me=(client:typeof a)=>client.state!.visitors.find(v=>v.id===client.id)!;
 for(const [client,column] of [[a,3],[b,4]] as const){
  client.send({type:'zone',zone:'auditorium'});
  await wait(()=>me(client).zone==='auditorium','hall');
  const seat=SEATS.find(s=>s.row===23&&s.column===column)!;
  client.send({type:'reserve',seatId:seat.id,requestId:'tea-'+column});
  await wait(()=>me(client).seatId===seat.id,'reserve');
  client.send({type:'seated',seatId:seat.id});
  await wait(()=>me(client).pose==='sit','seated');
 }
 a.send({type:'dish',dish:'tea'});
 await wait(()=>me(a).drink==='tea','first tea');
 b.send({type:'dish',dish:'tea'});
 await wait(()=>me(b).drink==='tea','second tea');
 assert.equal(me(b).teaReadyAt! - me(a).teaReadyAt!,6000);
 await wait(()=>a.state!.visitors.find(v=>v.id===b.id)?.teaReadyAt===me(b).teaReadyAt,'shared queue');
 a.send({type:'gesture',gesture:'drink'});
 await new Promise(resolve=>setTimeout(resolve,300));
 assert.equal(me(a).drinkSips,0);
 b.send({type:'clearDish'});
 await wait(()=>!me(b).drink,'cancel second');
 await wait(()=>Date.now()>=me(a).teaReadyAt!,'ready');
 for(let n=1;n<=3;n++){
  await wait(()=>Date.now()-me(a).gestureAt>3300,'gesture ready');
  a.send({type:'gesture',gesture:'drink'});
  await wait(()=>me(a).drinkSips===n,'sip '+n);
 }
 await wait(()=>!me(a).drink,'empty cup removed');
 console.log('Tea multiplayer queue, early sip rejection, cancellation, three sips and expiry passed');
}finally{for(const socket of sockets)socket.close();}

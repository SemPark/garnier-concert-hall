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
 url.protocol='ws:';url.searchParams.set('room','hall-97');
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
 const a=await connect();
 a.send({type:'zone',zone:'auditorium'});
 await wait(()=>a.state?.visitors.find(v=>v.id===a.id)?.zone==='auditorium','hall');
 const visitorSeat=SEATS.find(s=>s.row===8&&s.column===1)!;
 a.send({type:'reserve',seatId:visitorSeat.id,requestId:'visitor-seat'});
 await wait(()=>a.state?.seats[visitorSeat.id]?.visitorId===a.id,'visitor reserve');
 a.send({type:'seated',seatId:visitorSeat.id});
 await wait(()=>a.state?.seats[visitorSeat.id]?.status==='seated','visitor seated');
 for(const seat of NPC_SEATS){
  a.send({type:'reserve',seatId:seat.id,requestId:seat.id});
  await wait(()=>a.messages.some(m=>m.type==='seatResult'&&m.requestId===seat.id&&!m.ok),'NPC reserve rejected');
  const errors=a.messages.filter(m=>m.type==='error').length;
  a.send({type:'seated',seatId:seat.id});
  await wait(()=>a.messages.filter(m=>m.type==='error').length>errors,'NPC seated rejected');
  assert.equal(a.state?.seats[seat.id],undefined);
 }
 const b=await connect(a.token);
 assert.equal(b.id,a.id);
 assert.equal(b.state?.visitors.find(v=>v.id===b.id)?.seatId,visitorSeat.id);
 for(const seat of NPC_SEATS)assert.equal(b.state?.seats[seat.id],undefined);
 b.send({type:'release'});
 await wait(()=>!b.state?.seats[visitorSeat.id],'release');
 console.log('PASS: all five NPC reserve/seated requests rejected; neighbouring visitor seat and authenticated resume work.');
}finally{for(const socket of sockets)socket.terminate();}

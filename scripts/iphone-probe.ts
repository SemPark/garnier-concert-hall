import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {networkInterfaces} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import type {Plugin} from 'vite';
import type {runDeviceProbe} from '../src/diagnostics/DeviceProbe';

const elementKey='element-6066-11e4-a52e-4f735466cecf';

function loopbackPort(){
 return new Promise<number>((resolve,reject)=>{
  const socket=createServer().once('error',reject).listen(0,'127.0.0.1',()=>{
   const port=(socket.address() as {port:number}).port;
   socket.close(error=>error?reject(error):resolve(port));
  });
 });
}

async function until<T>(seconds:number,message:string,read:()=>Promise<T|false>){
 const end=Date.now()+seconds*1000;
 do{
  const value=await read();
  if(value)return value;
  await delay(500);
 }while(Date.now()<end);
 throw new Error(message);
}

async function measureOnIPhone(url:string){
 const port=await loopbackPort();
 const driver=spawn('/usr/bin/safaridriver',['--port',String(port)],{stdio:['ignore','ignore','pipe']});
 let driverError='',session='';
 driver.stderr?.on('data',chunk=>{driverError+=String(chunk);});
 driver.once('error',error=>{driverError=error.message;});
 async function request<T>(path:string,method='GET',body?:unknown,timeout=8000):Promise<T>{
  const response=await fetch(`http://127.0.0.1:${port}${path}`,{
   method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),
   signal:AbortSignal.timeout(timeout),
  });
  const {value}=await response.json();
  if(!response.ok)throw new Error(value?.message||`Safari WebDriver HTTP ${response.status}`);
  return value;
 }
 const execute=<T>(script:string,args:unknown[]=[])=>request<T>(`${session}/execute/sync`,'POST',{script,args});
 async function click(selector:string){
  const element=await request<Record<string,string>>(`${session}/element`,'POST',{using:'css selector',value:selector});
  await request(`${session}/element/${element[elementKey]}/click`,'POST',{});
 }
 try{
  await until(6,'맥에서 Safari WebDriver를 시작하지 못했어요.',async()=>{
   if(driverError)throw new Error(driverError.trim());
   return request('/status','GET',undefined,1000).then(()=>true,()=>false);
  });
  const capabilities={alwaysMatch:{
   browserName:'Safari',platformName:'iOS','safari:deviceType':'iPhone','safari:useSimulator':false,
  }};
  const {sessionId}=await until(7,'Safari에서 연결된 아이폰을 열지 못했어요. USB 연결과 원격 자동화 설정을 확인해 주세요.',()=>
   request<{sessionId:string}>('/session','POST',{capabilities},20000).catch(error=>{
    // The driver can start listening before it has discovered USB devices.
    if(error instanceof Error&&error.message.trim().endsWith('Some devices were found, but could not be used:'))return false;
    if(error instanceof Error&&/Remote Automation is turned off/i.test(error.message))throw new Error('아이폰 설정 → 앱 → Safari → 고급에서 원격 자동화를 켜 주세요.');
    throw error;
   }));
  session=`/session/${encodeURIComponent(sessionId)}`;
  await request(`${session}/timeouts`,'POST',{pageLoad:30000});
  await request(`${session}/url`,'POST',{url},35000);
  await until(45,'아이폰에서 공연장을 열지 못했어요. 맥과 아이폰이 같은 네트워크인지 확인해 주세요.',()=>execute<boolean>(
   `return /iPhone/.test(navigator.userAgent) &&
     !!window.__iphoneProbe &&
     !document.querySelector('#boot-screen:not(.is-leaving)');`));
  const soundButton='button[aria-label="소리 켜기"]';
  if(await execute<boolean>('return !!document.querySelector(arguments[0]);',[soundButton])){
   await click(soundButton);
  }
  await execute('window.__iphoneProbe.start();');
  type Result={report:Awaited<ReturnType<typeof runDeviceProbe>>}|{error:string};
  const result=await until<Result>(55,'아이폰 진단 결과를 받지 못했어요. 화면 잠금을 풀고 Safari를 열어 둔 상태에서 다시 시도해 주세요.',()=>
   execute<Result|false>('return window.__iphoneProbe?.result || false;').catch(error=>{
    if(error instanceof Error&&error.name==='TimeoutError')return false;
    throw error;
   }));
  if('error' in result)throw new Error(result.error);
  return result.report;
 }finally{
  if(session)await request(session,'DELETE',undefined,3000).catch(()=>{});
  driver.kill();
 }
}

export function iphoneProbeBridge():Plugin{
 let running=false;
 return {
  name:'pleee-iphone-probe',
  apply:'serve',
  configureServer(server){
   server.middlewares.use('/__iphone-probe',(req,res)=>{
    const port=server.config.server.port;
    const localHosts=[`127.0.0.1:${port}`,`localhost:${port}`];
    const localAddresses=['127.0.0.1','::1','::ffff:127.0.0.1'];
    if(!localHosts.includes(req.headers.host??'')||!localAddresses.includes(req.socket.remoteAddress??'')||
       req.method!=='POST'||req.headers.origin!==`http://${req.headers.host}`){
     res.writeHead(403).end();
     return;
    }
    const respond=(status:number,body:unknown)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body));
    if(running){respond(409,{error:'이미 연결된 아이폰을 측정 중이에요.'});return;}
    const interfaces=networkInterfaces();
    const addresses=Object.values(interfaces).flatMap(entries=>entries??[]).filter(entry=>entry.family==='IPv4'&&!entry.internal);
    const preferred=process.env.PLEEE_IPHONE_HOST??interfaces.en0?.find(entry=>entry.family==='IPv4'&&!entry.internal)?.address;
    const host=preferred?addresses.find(entry=>entry.address===preferred)?.address:addresses[0]?.address;
    if(!host){respond(503,{error:'맥의 로컬 네트워크 주소를 찾지 못했어요. 맥과 아이폰을 같은 Wi-Fi에 연결해 주세요.'});return;}
    running=true;
    void measureOnIPhone(`http://${host}:${port}/?diag`)
     .then(report=>respond(200,{report}),error=>respond(502,{error:error instanceof Error?error.message:String(error)}))
     .finally(()=>{running=false;});
   });
  },
 };
}

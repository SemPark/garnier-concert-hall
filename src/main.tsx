import {PhotoMode} from './PhotoMode';
import {ConductingExperience} from './ConductingExperience';
import coffeeIcon from './assets/cafe/coffee.webp';
import macaronIcon from './assets/cafe/macaron.webp';
import {DISHES,isDrink} from '../shared/dishes';
import {reportLoading,reportInitialHallLoading,failLoading} from './loading';
import {Wardrobe} from './Wardrobe';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import program from './audio/playlist';
import {nextPiece,type Playlist} from '../shared/timeline';
import {createRoot} from 'react-dom/client';
import {World} from './World';
import {Presence} from './network/Presence';
import {ConcertAudio} from './audio/ConcertAudio';
import {SeatMap} from './SeatMap';
import './style.css';
import {runDeviceProbe} from './diagnostics/DeviceProbe';
import {HALL_KIND,JAZZ_HALL,type HallKind} from '../shared/hallKind';
/** The conductor experience is switched off for now; everything it needs is kept, so `true` brings it back. */
const CONDUCTING_ENABLED=false;
import {GESTURES,type Gesture} from '../shared/gestures';
reportLoading(10,'시작 화면을 준비하고 있어요');
const EMPTY_CLAIMS={};
const GLYPH:Record<Gesture,string>={wave:'〜',clap:'♪',bravo:'!',ovation:'↶',bow:'⌒',moved:'♥',shh:'…',doze:'Zz',drink:'☕',eat:'🍪'};

function Icon({name,size=20}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  train:<><rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 10h14M9 3v7M15 3v7M7 21l2-3m8 3-2-3"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></>,
  camera:<><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></>,
  hall:<><path d="m3 8 9-5 9 5M3 21h18M5 10v8m5-8v8m4-8v8m5-8v8M3 8h18"/></>,
  sound:<><path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute:<><path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 5 6m0-6-5 6"/></>,
  people:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/></>,
  stairs:<path d="M4 20h4v-4h4v-4h4V8h4V4"/>,
  conductor:<><circle cx="12" cy="4.8" r="3.1"/><path d="M8 10.2 6 11 4.6 8.2Q3.9 6.8 2.7 7.4 1.6 8 2.2 9.5L4.4 15Q4.8 16 5.8 15.6L8 14.8 7 22h10l-1-7.2 2.2.8q1 .4 1.4-.6l2.2-5.5q.6-1.5-.5-2.1-1.2-.6-1.9.8L18 11l-2-.8-4 3.4-4-3.4Z"/><path d="M21 7V1.5"/></>,
  dinner:<><path d="M7 3v6a2 2 0 0 0 4 0V3"/><path d="M9 3v18"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/></>,
  candle:<><path d="M9.5 21h5V11h-5v10Z"/><path d="M12 11V9"/><path d="M12 2.5c1.6 1.8 2.2 3 2.2 4a2.2 2.2 0 0 1-4.4 0c0-1 .6-2.2 2.2-4Z"/></>,
  walk:<><circle cx="13" cy="4.5" r="2"/><path d="M12.5 8 11 14l-2.5 7M11 14l3 3v4M8 11.5l4.2-3 3.3 2.5"/></>,
  floor1:<text x="12" y="16.6" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor" stroke="none">1F</text>,
  floor2:<text x="12" y="16.6" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor" stroke="none">2F</text>,
  stage:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6m-3-3h6"/></>,
  front:<><path d="M4 19h16M6 16V6h12v10M12 14V8m-3 3 3-3 3 3"/></>,
  back:<><path d="M4 5h16M6 8v10h12V8M12 10v6m-3-3 3 3 3-3"/></>,
  stageLow:<path d="M4 18h16M6 21h12M12 13V3m-4 4 4-4 4 4"/>,
  overview:<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M8 15h8M9 12h6M10.5 9h3"/>,
  menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
  settings:<><path d="M19.0 10.3L21.5 10.6L21.5 13.4L19.0 13.7L18.2 15.7L19.7 17.7L17.7 19.7L15.7 18.2L13.7 19.0L13.4 21.5L10.6 21.5L10.3 19.0L8.3 18.2L6.3 19.7L4.3 17.7L5.8 15.7L5.0 13.7L2.5 13.4L2.5 10.6L5.0 10.3L5.8 8.3L4.3 6.3L6.3 4.3L8.3 5.8L10.3 5.0L10.6 2.5L13.4 2.5L13.7 5.0L15.7 5.8L17.7 4.3L19.7 6.3L18.2 8.3Z"/><circle cx="12" cy="12" r="3"/></>,
  arrow:<path d="M4 12h15m-6-6 6 6-6 6"/>,
  close:<path d="m6 6 12 12M6 18 18 6"/>,
  music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
  wave:<><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-7a1.5 1.5 0 0 1 3 0v8-5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-13 4L3 13a1.7 1.7 0 0 1 2.5-2L8 14"/></>,
  clap:<><path d="m5 11 4 7a6 6 0 0 0 10-6l-3-6a1.5 1.5 0 0 0-2.5 1L16 12 10 3a1.5 1.5 0 0 0-2.5 1L12 12 6 5a1.5 1.5 0 0 0-2 2l5 7-4-3a1.5 1.5 0 0 0-2 2l4 5M18 2l1 2m3 1-2 1"/></>,
  seat:<><path d="M5 12V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M4 10v7h16v-7M6 17v4m12-4v4M4 13h16"/></>,
  ticket:<path d="M3 6h18v3.5a2.5 2.5 0 0 0 0 5V18H3v-3.5a2.5 2.5 0 0 0 0-5ZM15 6v2.5m0 2.5v2m0 2.5V18"/>,
  door:<><path d="M4 21h16M6 21V3h12v18M12 12h1"/></>,
  enter:<path d="M13 4h6v16h-6M3 12h11m-4-4 4 4-4 4"/>,
  exit:<path d="M11 4H5v16h6m-1-8h11m-4-4 4 4-4 4"/>,
  center:<><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  react:<><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.hall}</svg>;
}
function format(t:number){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
const HALL_OPTIONS=[{kind:'classic',label:'클래식 홀'},{kind:'jazz',label:'재즈 홀'}] as const;
function hallHref(kind:HallKind){
 const url=new URL(location.href);
 if(kind==='jazz')url.searchParams.set('hall','jazz');
 else url.searchParams.delete('hall');
 return url.href;
}
function App(){
 // The icon menu stays listed from the start; ☰ hides or shows it.
 const [menu,setMenu]=useState(true);
 const [hallPickerOpen,setHallPickerOpen]=useState(false);
 const hallPicker=useRef<HTMLDivElement>(null),hallPickerButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!hallPickerOpen)return;
  const dismiss=(event:PointerEvent)=>{
   if(event.target instanceof Node&&!hallPicker.current?.contains(event.target))setHallPickerOpen(false);
  };
  window.addEventListener('pointerdown',dismiss);
  return ()=>window.removeEventListener('pointerdown',dismiss);
 },[hallPickerOpen]);
 // Man/woman window shown in the lobby after entering; it closes once the visitor picks.
 const [conducting,setConducting]=useState(false);const closeConducting=useCallback(()=>setConducting(false),[]);
 const [lookPicker,setLookPicker]=useState(false);const [wardrobe,setWardrobe]=useState(false);
 const [app,setApp]=useState<{world:World;net:Presence;audio:ConcertAudio}|null>(null),[,redraw]=useState(0),[entered,setEntered]=useState(false),[settings,setSettings]=useState(false),[seats,setSeats]=useState(false),[musicExpanded,setMusicExpanded]=useState(false),[reactions,setReactions]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState('');
 const [probeProgress,setProbeProgress]=useState(''),[probeReport,setProbeReport]=useState(''),[probeMessage,setProbeMessage]=useState('');
 const [iphonePending,setIphonePending]=useState(false);
 const iphoneBridge=import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname);
 const entering=useRef(false),initialHallRequested=useRef(false);
 const [initialHallReady,setInitialHallReady]=useState(false);
 const toastTimer=useRef(0),dialog=useRef<HTMLDialogElement>(null),probeDetails=useRef<HTMLDetailsElement>(null),probeText=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{let world:World|undefined;const net=new Presence(),audio=new ConcertAudio(net.now);
  try{world=new World(document.getElementById('world')!,net,audio);const active=world;const update=()=>redraw(n=>n+1);const notify=(message:string)=>{setToast(message);clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),3500);};
   world.onChange=update;world.onToast=notify;world.onWardrobe=()=>setWardrobe(true);world.onSeatMap=()=>{world!.input.keys.clear();setSeats(true);};net.onState=s=>active.apply(s);net.onMoveBlocked=point=>active.correctMove(point);net.onRelocated=point=>active.finishHallMove(point);net.onStatus=()=>{if(net.status!=='connected')active.stopHallLoading();update();};net.onError=message=>{active.stopHallLoading();notify(message);};setApp({world,net,audio});
   if(import.meta.env.DEV)Object.assign(window,{__concert:{world,net,audio}});
  }catch(e){failLoading();setError(e instanceof Error?e.message:'3D 화면을 열지 못했어요.');}
  // Full-document hall links do not unmount React. Release the old hall before
  // Safari keeps the document in its back/forward cache alongside the next one.
  let released=false;
  const release=()=>{if(released)return;released=true;net.destroy();audio.destroy();world?.destroy();};
  const restore=(event:PageTransitionEvent)=>{if(event.persisted&&released)location.reload();};
  window.addEventListener('pagehide',release);
  window.addEventListener('pageshow',restore);
  return ()=>{window.removeEventListener('pagehide',release);window.removeEventListener('pageshow',restore);release();};
 },[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const i=Number(e.code.replace('Digit',''))-1;if(!app||!entered||settings||!(i>=0&&i<GESTURES.length)||app.net.status!=='connected'||(e.target as HTMLElement)?.closest('input,textarea,select,dialog'))return;e.preventDefault();app.world.gestureAction(GESTURES[i].id);};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);},[app,entered,settings]);
 useEffect(()=>{if(settings){dialog.current?.showModal();app?.world.input.keys.clear();}else dialog.current?.close();},[settings,app]);
 const world=app?.world,net=app?.net,audio=app?.audio,p=audio?.playback,zone=world?.zone??'lobby',connected=net?.status==='connected',sitting=world?.pose==='sit';
 useEffect(()=>{if(zone!=='lobby')setWardrobe(false);},[zone]);
 const closeSeats=useCallback(()=>setSeats(false),[]);
 const chooseMappedSeat=useCallback((id:string)=>{if(!world)return;if(world.zone==="lobby")world.chooseSeatFromLobby(id);else void world.chooseSeat(id,true);},[world]);
 useEffect(()=>{if(!world)return;world.uiObscured=(seats||settings||wardrobe)&&!probeProgress;if(world.uiObscured)world.input.keys.clear();return()=>{world.uiObscured=false;};},[world,seats,settings,wardrobe,probeProgress]);
 // Start automatically once WebGL is ready; route only the initial visit to the hall.
 useEffect(()=>{if(!app||!app.world.ready||entering.current)return;entering.current=true;app.world.start();setEntered(true);app.net.connect();},[app,world?.ready]);
 useEffect(()=>{if(!world||!connected||!world.self)return;if(world.zone==='auditorium'){initialHallRequested.current=true;setInitialHallReady(true);return;}if(!initialHallRequested.current){initialHallRequested.current=true;reportInitialHallLoading(70,'공연장으로 들어가고 있어요');void world.changeZone();}},[world,connected,zone]);
 // ConcertAudio handles gesture unlock and retries after browser autoplay blocks.
 const copyProbeReport=()=>{
  const showManualCopy=()=>{
   if(probeDetails.current)probeDetails.current.open=true;
   const field=probeText.current;
   if(field){field.focus();field.select();field.setSelectionRange(0,field.value.length);}
   setProbeMessage('결과가 선택됐어요. 길게 눌러 복사해 주세요.');
  };
  const copySelected=()=>{
   if(!probeText.current)return false;
   if(probeDetails.current)probeDetails.current.open=true;
   const field=probeText.current;field.focus();field.select();field.setSelectionRange(0,field.value.length);
   try{return document.execCommand('copy');}catch{return false;}
  };
  const copied=()=>setProbeMessage('진단 결과를 복사했습니다. 채팅에 붙여넣어 주세요.');
  // iPhone LAN addresses use HTTP, where the asynchronous clipboard API may be absent.
  if(!navigator.clipboard?.writeText){if(copySelected())copied();else showManualCopy();return;}
  try{void navigator.clipboard.writeText(probeReport).then(copied,()=>{if(copySelected())copied();else showManualCopy();});}
  catch{if(copySelected())copied();else showManualCopy();}
 };
 const measureIPhone=async()=>{
  setIphonePending(true);
  setProbeReport('');
  setProbeMessage('연결된 아이폰에서 공연장을 열고 측정하고 있어요. 아이폰 화면을 켜 두세요.');
  try{
   const response=await fetch('/__iphone-probe',{method:'POST'});
   const {report,error}=await response.json();
   if(!response.ok)throw new Error(error);
   setProbeReport(JSON.stringify(report));
   setProbeMessage(report.userSummary);
  }catch(e){
   setProbeMessage(e instanceof Error?e.message:'아이폰 진단을 완료하지 못했어요.');
  }finally{
   setIphonePending(false);
  }
 };
 const diagnose=useCallback(async(reopenSettings=true)=>{
  if(!world||!audio||world.diagnosticActive)return {error:'지금은 진단을 시작할 수 없어요.'};
  setSettings(false);
  setProbeReport('');
  setProbeMessage('');
  try{
   const report=await runDeviceProbe(world,audio,setProbeProgress);
   setProbeReport(JSON.stringify(report));
   setProbeMessage(report.userSummary);
   return {report};
  }catch(e){
   const error=e instanceof Error?e.message:'진단을 완료하지 못했어요.';
   setProbeMessage(error);
   return {error};
  }finally{
   setProbeProgress('');
   if(reopenSettings)setSettings(true);
  }
 },[world,audio]);
 useEffect(()=>{
  if(!import.meta.env.DEV||!initialHallReady||
   !new URLSearchParams(location.search).has('diag'))return;
  const probe={
   result:null as Awaited<ReturnType<typeof diagnose>>|null,
   start(){
    void diagnose(false).then(result=>{probe.result=result;});
   },
  };
  Object.assign(window,{__iphoneProbe:probe});
  return ()=>{Reflect.deleteProperty(window,'__iphoneProbe');};
 },[diagnose,initialHallReady]);

 return <>
  {world?.photoMode&&<PhotoMode world={world}/>}
  <div className="vignette"/>
  {(world?.hallLoading&&initialHallReady)&&<div className="hall-loading" role="status" aria-live="polite" aria-busy="true"><div className="hall-loading-card"><span className="hall-loading-spinner" aria-hidden="true"/><h2>공연장으로 들어가고 있어요</h2><p>무대와 좌석을 준비하고 있어요. 잠시만 기다려 주세요.</p></div></div>}

  {entered&&<header className="topbar">
   {entered&&<div className="location"><span className="location-en">{zone==='lobby'?'LOBBY':JAZZ_HALL?'pleee jazz':'pleee hall'}</span><span>{zone==='lobby'?'로비':'공연장'}<i>·</i>{net?.state?.roomId?.replace('hall-','본관 ').replace('jazz-','재즈홀 ')??'입장 중'}</span></div>}
   {zone==='auditorium'&&p&&<aside className={`now-playing ${(!world?.concertView||world?.pose==='walk'||window.innerWidth<700)&&!musicExpanded?'compact-music':''}`}><button className="music-summary" aria-label={musicExpanded?'음악 정보 접기':'음악 정보 펼치기'} aria-expanded={musicExpanded} onClick={()=>setMusicExpanded(v=>!v)}><Icon name="music" size={14}/><span>{p.playing?p.track.title:`곧 이어서 — ${nextPiece(program as Playlist,p.index)?.title??''}`}</span><span>{musicExpanded?'−':'+'}</span></button><div className="music-details"><div className="now-label"><span className={`equalizer ${audio?.enabled&&p.playing?'active':''}`}><i/><i/><i/></span>{p.playing?(p.track.stage?'ON STAGE':'NOW PLAYING'):'잠시 후'}</div><h2>{p.playing?p.track.title:`곧 이어서 — ${nextPiece(program as Playlist,p.index)?.title??''}`}</h2><p>{p.playing&&!p.track.stage?p.track.composer:`다음 곡: ${nextPiece(program as Playlist,p.index)?.title??''}`}{!p.playing&&` · ${Math.ceil(p.remaining)}초 후`}</p><div className="progress-track"><span style={{width:`${p.playing?p.offset/p.track.durationSeconds*100:0}%`}}/></div><div className="track-meta"><span>{audio?.state}</span><span>{format(p.offset)} / {format(p.track.durationSeconds)}</span></div></div></aside>}
   <nav className="tools" aria-label="음악당 설정">
    <div className="hall-picker" ref={hallPicker} onKeyDown={event=>{
     if(event.key!=='Escape'||!hallPickerOpen)return;
     event.stopPropagation();
     setHallPickerOpen(false);
     hallPickerButton.current?.focus();
    }}>
     <button type="button" ref={hallPickerButton} className="tools-brand" aria-label="플리 공연장 선택" aria-expanded={hallPickerOpen} aria-controls="hall-choices" onClick={()=>{
      if(!hallPickerOpen){setMusicExpanded(false);world?.input.keys.clear();}
      setHallPickerOpen(!hallPickerOpen);
     }}>플리 <span className="hall-picker-caret" aria-hidden="true"/></button>
     <div id="hall-choices" className="hall-choices" role="group" aria-label="공연장 선택" hidden={!hallPickerOpen}>
      {HALL_OPTIONS.map(({kind,label})=><a key={kind} href={hallHref(kind)} aria-current={kind===HALL_KIND?'page':undefined} onClick={event=>{
       if(kind!==HALL_KIND)return;
       event.preventDefault();
       setHallPickerOpen(false);
       hallPickerButton.current?.focus();
      }}>{label}{kind===HALL_KIND&&<span>현재</span>}</a>)}
     </div>
    </div>
    {entered&&<span className="visitor-count" title={connected?'함께 있는 관객':'연결을 기다리고 있어요'}><span className={`connection ${connected?'online':''}`}/><Icon name="people" size={18}/>{net?.local?'혼자 감상':net?.state?.visitors.length??'—'}</span>}
    <button className="icon-button" aria-label={audio?.enabled?'소리 끄기':'소리 켜기'} onClick={()=>{audio?.toggle();redraw(n=>n+1);}}><Icon name={audio?.enabled?'sound':'mute'}/></button>
    {entered&&<button className={`icon-button menu-button ${menu?'active':''}`} aria-label="메뉴" aria-expanded={menu} aria-haspopup="menu" onClick={()=>setMenu(v=>!v)}><Icon name={menu?'close':'menu'}/></button>}
   </nav>
  </header>}
   {world?.ready&&<SeatMap open={seats} claims={net?.state?.seats??EMPTY_CLAIMS} selfId={net?.selfId??''} connected={connected} onClose={closeSeats} onChoose={chooseMappedSeat}/>}
  {entered&&<>
   {!connected&&<div className="connection-banner" role="status">{net?.status==='connecting'?'음악당의 문을 여는 중이에요…':'연결이 잠시 끊겼어요. 다시 연결하고 있습니다.'}</div>}
   {connected&&zone==='lobby'&&lookPicker&&<div className="look-picker" role="dialog" aria-label="내 캐릭터 고르기"><span>YOUR CHARACTER</span><h2>내 캐릭터를 골라주세요</h2><div className="look-choice">{(["man","woman"] as const).map(v=><button key={v} className={world?.visitorLook===v?"active":""} onClick={()=>{try{localStorage.setItem('garnier-look',v);}catch{}if(world?.visitorLook!==v)world?.setLook(v);setLookPicker(false);}}>{v==="man"?"남자":"여자"}</button>)}</div></div>}

   {menu&&<><nav className="icon-menu" role="menu" aria-label="음악당 메뉴" title="음악당 메뉴" onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}>
    {zone==='auditorium'?<>
     <button role="menuitem" className={`icon-menu-item ${world?.ridingTrain?'active':''}`} aria-label={world?.ridingTrain?'승강장에 내리기':'열차에 타기'} title={world?.ridingTrain?'승강장에 내리기':'열차에 타기'} disabled={!connected} onClick={()=>world?.toggleTrain()}><Icon name="train" size={20}/></button>
     <button role="menuitem" className="icon-menu-item" aria-label={(world?.position.y??0)>8?'1층으로 내려가기':'2층으로 올라가기'} title={(world?.position.y??0)>8?'1층으로 내려가기':'2층으로 올라가기'} onClick={()=>{world?.goToGallery();}}><Icon name={(world?.position.y??0)>8?'floor1':'floor2'} size={20}/></button>
     <button role="menuitem" className="icon-menu-item" aria-label="무대 앞으로 바로 이동" title="무대 앞으로 바로 이동" onClick={()=>world?.goToHallPoint('front')}><Icon name="front" size={20}/></button>
     <button role="menuitem" className="icon-menu-item" aria-label="공연장 뒤로 바로 이동" title="공연장 뒤로 바로 이동" onClick={()=>world?.goToHallPoint('rear')}><Icon name="back" size={20}/></button>
     <span className="icon-menu-divider"/>
     <button role="menuitem" className={`icon-menu-item ${!world?.concertView?'active':''}`} aria-label="걷기 시점" title="걷기 시점" onClick={()=>{if(world?.concertView)world.toggleConcertView();}}><Icon name="walk" size={20}/></button>
     <button role="menuitem" className={`icon-menu-item ${world?.concertView&&world?.hallOverview?'active':''}`} aria-label="홀 전체 보기" title={world?.entranceViewLocked?"입구를 지나면 시점을 바꿀 수 있어요":"홀 전체 보기"} disabled={world?.entranceViewLocked} onClick={()=>world?.showHallOverview()}><Icon name="overview" size={20}/></button>
     <button role="menuitem" className={`icon-menu-item ${world?.concertView&&!world?.hallOverview&&world?.stageLowView?'active':''}`} aria-label="무대 올려다보기" title="무대 올려다보기" disabled={world?.entranceViewLocked} onClick={()=>world?.setStageView(true)}><Icon name="stageLow" size={20}/></button>
     <span className="icon-menu-divider"/>
     <button role="menuitem" className="icon-menu-item" aria-label="로비로 나가기" title="로비로 나가기" onClick={()=>{world?.changeZone();}}><Icon name="exit" size={20}/></button>
    </>:<>
     <button role="menuitem" className="icon-menu-item" aria-label="로비 가운데로 바로 이동" title="로비 가운데로 바로 이동" onClick={()=>world?.goToHallPoint('lobby')}><Icon name="center" size={20}/></button>
     <span className="icon-menu-divider"/>
     <button role="menuitem" className="icon-menu-item" aria-label="공연장 들어가기" title="공연장 들어가기" onClick={()=>{world?.changeZone();}}><Icon name="enter" size={20}/></button>
    </>}
    <button role="menuitem" className="icon-menu-item" aria-label="사진 모드" title="사진 모드" onClick={()=>{setHallPickerOpen(false);setReactions(false);world?.startPhotoMode();}}><Icon name="camera" size={20}/></button>
    <button role="menuitem" className="icon-menu-item" aria-label="설정" title="설정" onClick={()=>{setSettings(true);}}><Icon name="settings" size={20}/></button>
   </nav></>}

   {world?.cafeMenu&&<div className="cafe-menu" role="dialog" aria-label="카페"><button className="cafe-close" aria-label="닫기" onClick={()=>world.closeCafeMenu()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div className="cafe-choices">{!world.coffee&&<button aria-label="커피 받기" onClick={()=>world.visitCafe('coffee')} disabled={!connected}><img src={coffeeIcon} alt="" aria-hidden="true"/></button>}{!world.macaron&&<button aria-label="마카롱 받기" onClick={()=>world.visitCafe('macaron')} disabled={!connected}><img src={macaronIcon} alt="" aria-hidden="true"/></button>}</div></div>}
   {world?.dishMenu&&world.atDinnerTable&&!(world.dish&&world.drink)&&<div className="cafe-menu dish-menu" role="dialog" aria-label="요리 고르기"><button className="cafe-close" aria-label="닫기" onClick={()=>world.closeDishMenu()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div className="cafe-choices dish-choices">{DISHES.map(d=><button key={d.id} aria-label={d.label} onClick={()=>world.orderDish(d.id)} disabled={!connected||!!(isDrink(d.id)?world.drink:world.dish)}><b aria-hidden="true">{d.glyph}</b><span>{d.label}</span></button>)}</div></div>}
   <div className="bottom-center">{reactions&&<div className="reaction-panel" role="group" aria-label="리액션">{GESTURES.filter(g=>(g.id!=='drink'||world?.coffee)&&(g.id!=='eat'||world?.macaron)).map((g,n)=><button key={g.id} onClick={()=>{world?.gestureAction(g.id);setReactions(false);}} disabled={!connected}><b>{g.id==='drink'||g.id==='eat'?<img className="food-icon" src={g.id==='drink'?coffeeIcon:macaronIcon} alt="" aria-hidden="true"/>:GLYPH[g.id]}</b><span>{g.label}</span><kbd>{n+1}</kbd></button>)}</div>}{toast&&<div className="toast" role="status">{toast}</div>}{world?.atDinnerTable&&(world.dish||world.drink)&&<button className="dish-trash" aria-label="음식 모두 버리기" onClick={()=>world.clearDishes()} disabled={!connected}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></button>}<div className="actionbar" aria-label="음악당에서 할 일"><button onClick={()=>world?.gestureAction('wave')} disabled={!connected}><Icon name="wave"/><span>인사</span></button><button onClick={()=>world?.gestureAction('clap')} disabled={!connected}><Icon name="clap"/><span>박수</span></button><span className="divider"/><button className="primary-action" onClick={()=>{if(sitting)world?.stand();else if(zone==='lobby')world?.changeZone();else{world?.input.keys.clear();setSeats(true);}}} disabled={!connected}><Icon name={sitting?'seat':zone==='lobby'?'enter':'ticket'}/><span>{sitting?'일어나기':zone==='lobby'?'공연장 입장':'자리 앉기'}</span></button>{zone==='lobby'&&<button onClick={()=>world?.goToHallPoint('lobby')} disabled={!connected} aria-label="로비 가운데로 바로 이동"><Icon name="center"/><span>가운데</span></button>}{zone==='lobby'&&world?.macaron&&<button className="eat-ready" onClick={()=>world.gestureAction('eat')} disabled={!connected} aria-label="마카롱 먹기"><img className="food-icon" src={macaronIcon} alt="" aria-hidden="true"/><span>마카롱 먹기</span></button>}{zone==='lobby'&&world?.coffee&&<button className="eat-ready" onClick={()=>world.gestureAction('drink')} disabled={!connected} aria-label="커피 마시기"><img className="food-icon" src={coffeeIcon} alt="" aria-hidden="true"/><span>커피 마시기</span></button>}{world?.atDinnerTable&&world.dish&&<button className="eat-ready" onClick={()=>world.gestureAction('eat')} disabled={!connected} aria-label={DISHES.find(d=>d.id===world.dish)!.label+' 먹기'}><b className="food-icon dish-icon" aria-hidden="true">{DISHES.find(d=>d.id===world.dish)!.glyph}</b><span>{DISHES.find(d=>d.id===world.dish)!.label} 먹기</span></button>}{world?.atDinnerTable&&world.drink&&<button className="eat-ready" onClick={()=>world.gestureAction('drink')} disabled={!connected} aria-label={DISHES.find(d=>d.id===world.drink)!.label+' 마시기'}><b className="food-icon dish-icon" aria-hidden="true">{DISHES.find(d=>d.id===world.drink)!.glyph}</b><span>{DISHES.find(d=>d.id===world.drink)!.label} 마시기</span></button>}{world?.atDinnerTable&&!(world.dish&&world.drink)&&<button onClick={()=>world.openDishMenu()} disabled={!connected} aria-label="요리 고르기"><Icon name="dinner"/><span>식사</span></button>}{zone==='auditorium'&&world?.candle&&<button className={'candle-action'+(world.candle==='on'?' lit':'')} aria-pressed={world.candle==='on'} aria-label={world.candle==='on'?'촛불 끄기':'촛불 켜기'} onClick={()=>{world.toggleCandle();redraw(n=>n+1);}}><Icon name="candle"/><span>촛불</span></button>}{CONDUCTING_ENABLED&&zone==='auditorium'&&<button onClick={()=>{setReactions(false);setConducting(true);}} disabled={!connected||world?.entranceViewLocked} aria-label="지휘자 체험"><Icon name="conductor"/><span>지휘자 체험</span></button>}<span className="divider"/><button className={reactions?'active':''} aria-expanded={reactions} onClick={()=>setReactions(v=>!v)} disabled={!connected}><Icon name="react"/><span>리액션</span></button></div></div>
  </>}
  {conducting&&world&&<ConductingExperience world={world} onClose={closeConducting}/>}
  {probeProgress&&<div className="diagnostic-overlay" role="status"><p>{probeProgress}<br/><small>측정이 끝나면 이전 화면 설정으로 돌아갑니다.</small></p></div>}
  {toast&&!entered&&<div className="toast" role="status">{toast}</div>}
  {error&&<section className="fatal" role="alert"><h1>음악당을 열지 못했어요.</h1><p>WebGL을 지원하는 브라우저에서 다시 열어주세요.</p><small>{error}</small><button onClick={()=>location.reload()}>다시 열기</button></section>}
  {wardrobe&&world&&<Wardrobe look={world.visitorLook} selected={world.self?.outfit} onSelect={outfit=>world.setOutfit(outfit)} onClose={()=>setWardrobe(false)}/>}
  <dialog ref={dialog} onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)} className="settings-dialog"><div className="panel-heading"><div><span className="eyebrow">YOUR LITTLE CONCERT</span><h2>편안하게 감상하기</h2></div><button className="icon-button" aria-label="설정 닫기" onClick={()=>setSettings(false)}><Icon name="close"/></button></div><label className="setting-row"><span>음악 소리 <b>{Math.round((audio?.volume??1)*100)}</b><small>공연장에서 들리는 음량 (0~100)</small></span><input aria-label="음악 음량" type="range" min="0" max="100" value={Math.round((audio?.volume??1)*100)} onChange={e=>{if(audio)audio.volume=Number(e.target.value)/100;redraw(n=>n+1);}}/></label><label className="setting-row"><span>공간 소리 <b>{audio?.roomLevel??5}</b><small>로비와 공연장의 은은한 울림 (1~10, 5가 기본)</small></span><input aria-label="공간 소리" type="range" min="1" max="10" step="1" value={audio?.roomLevel??5} onChange={e=>{audio?.setRoomLevel(Number(e.target.value));redraw(n=>n+1);}}/></label><label className="setting-row"><span>내 캐릭터<small>다른 관객에게도 이렇게 보여요</small></span><select aria-label="내 캐릭터" value={world?.visitorLook??'man'} onChange={e=>{const look=e.target.value as 'man'|'woman';try{localStorage.setItem('garnier-look',look);}catch{}world?.setLook(look);redraw(n=>n+1);}}><option value="man">남자</option><option value="woman">여자</option></select></label><label className="setting-row"><span>화면 품질<small>{world?`${world.fps} FPS · ${world.renderer.domElement.width}×${world.renderer.domElement.height}`:'선명도를 선택할 수 있어요'}</small></span><select aria-label="화면 품질" value={world?.quality??"balanced"} onChange={e=>world?.setQuality(e.target.value)}><option value="balanced">균형 · {world?.mobile?'60':'30'}FPS</option><option value="sharp">선명하게 · 60FPS</option><option value="low">저발열 · {world?.mobile?'60':'30'}FPS</option></select></label><div className="settings-info"><Icon name="music" size={19}/><p>{p?.track.title}<br/>{p?.track.credit&&<><a href={p.track.credit.sourceUrl} target="_blank" rel="noreferrer">{p.track.credit.sourceName}</a> · {p.track.credit.artist&&<>{p.track.credit.artist} · </>} <a href={p.track.credit.licenseUrl} target="_blank" rel="noreferrer">{p.track.credit.licenseName}</a>{p.track.credit.changes&&<> · {p.track.credit.changes}</>}</>}</p></div><p className="settings-info"><small>로비 천장 사진: <a href="https://commons.wikimedia.org/wiki/File:Ópera,_París,_Francia,_2022-10-31,_DD_54-56_HDR.jpg" target="_blank" rel="noreferrer">Diego Delso / Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · 2048px·WebP 변환</small></p>{import.meta.env.DEV&&<section className="device-diagnostic">{iphoneBridge?<><button data-device-probe disabled={iphonePending} onClick={()=>void measureIPhone()}>연결된 아이폰 측정</button><p>USB로 연결된 아이폰에서 플리를 열고 FPS와 CPU·GPU 시간을 측정합니다.</p></>:<><button data-device-probe disabled={!entered||zone!=='auditorium'||!!probeProgress} onClick={()=>void diagnose()}>끊김 진단 · 최대 30초</button><p>{world?.mobile?'이 기기의 화면 설정으로 FPS와 CPU·GPU 시간을 측정합니다.':'iPhone 13 Pro 화면 조건에서 이 PC의 FPS와 CPU·GPU 시간을 측정합니다.'} 음악을 비교할 수 있을 때는 30초, 그 외에는 10초 동안 실행합니다.</p></>}{probeMessage&&<p role="status">{probeMessage}</p>}{probeReport&&<><button onClick={copyProbeReport}>진단 결과 복사</button><details ref={probeDetails}><summary>진단 결과 보기</summary><textarea ref={probeText} aria-label="기기 진단 결과" readOnly value={probeReport}/></details></>}</section>}<div className="controls-copy">{net?.local&&<p>GitHub Pages 감상 버전 · 다른 관객과의 실시간 연결은 제공하지 않습니다.</p>}<p>바닥 클릭 / WASD / 방향키 — 이동</p><p>드래그 — 둘러보기 · 휠 / 두 손가락 — 거리 조절</p><p>좌석 클릭 — 앉기 · ESC — 일어나기</p></div></dialog>
 </>;
}
createRoot(document.getElementById('root')!).render(<App/>);

import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {World} from './World';
import {Presence} from './network/Presence';
import {ConcertAudio} from './audio/ConcertAudio';
import {SEATS} from '../shared/venue';
import './style.css';

function Icon({name,size=20}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  hall:<><path d="m3 8 9-5 9 5M3 21h18M5 10v8m5-8v8m4-8v8m5-8v8M3 8h18"/></>,
  sound:<><path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute:<><path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 5 6m0-6-5 6"/></>,
  people:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/></>,
  settings:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
  arrow:<path d="M4 12h15m-6-6 6 6-6 6"/>,
  close:<path d="m6 6 12 12M6 18 18 6"/>,
  music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
  wave:<><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-7a1.5 1.5 0 0 1 3 0v8-5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-13 4L3 13a1.7 1.7 0 0 1 2.5-2L8 14"/></>,
  clap:<><path d="m5 11 4 7a6 6 0 0 0 10-6l-3-6a1.5 1.5 0 0 0-2.5 1L16 12 10 3a1.5 1.5 0 0 0-2.5 1L12 12 6 5a1.5 1.5 0 0 0-2 2l5 7-4-3a1.5 1.5 0 0 0-2 2l4 5M18 2l1 2m3 1-2 1"/></>,
  seat:<><path d="M5 12V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M4 10v7h16v-7M6 17v4m12-4v4M4 13h16"/></>,
  door:<><path d="M4 21h16M6 21V3h12v18M12 12h1"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.hall}</svg>;
}
function format(t:number){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function App(){
 const [app,setApp]=useState<{world:World;net:Presence;audio:ConcertAudio}|null>(null),[,redraw]=useState(0),[entered,setEntered]=useState(false),[settings,setSettings]=useState(false),[seats,setSeats]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState('');
 const toastTimer=useRef(0),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let world:World|undefined;const net=new Presence(),audio=new ConcertAudio(net.now);
  try{world=new World(document.getElementById('world')!,net,audio);const active=world;const update=()=>redraw(n=>n+1);const notify=(message:string)=>{setToast(message);clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),3500);};
   world.onChange=update;world.onToast=notify;net.onState=s=>active.apply(s);net.onStatus=update;net.onError=notify;setApp({world,net,audio});
   if(import.meta.env.DEV)Object.assign(window,{__concert:{world,net,audio}});
  }catch(e){setError(e instanceof Error?e.message:'3D 화면을 열지 못했어요.');}
  return ()=>{world?.destroy();net.destroy();audio.destroy();};
 },[]);
 useEffect(()=>{if(settings){dialog.current?.showModal();app?.world.input.keys.clear();}else dialog.current?.close();},[settings,app]);
 const world=app?.world,net=app?.net,audio=app?.audio,p=audio?.playback,zone=world?.zone??'lobby',connected=net?.status==='connected',sitting=world?.pose==='sit';
 const enter=()=>{if(!app)return;setEntered(true);app.world.start();app.net.connect();void app.audio.unlock();};
 return <>
  <div className="vignette"/>
  <header className="topbar">
   <div className="brand"><span className="brand-mark"><Icon name="hall" size={25}/></span><div><span className="brand-name">GARNIER</span><span className="brand-sub">함께 듣는 음악당</span></div></div>
   {entered&&<div className="location"><span className="location-en">{zone==='lobby'?'LE GRAND FOYER':'GOLDENER SAAL'}</span><span>{zone==='lobby'?'그랑 푸아예':'황금홀'}<i>·</i>{net?.state?.roomId?.replace('hall-','본관 ')??'입장 중'}</span></div>}
   <nav className="tools" aria-label="음악당 설정">
    {entered&&<span className="visitor-count" title={connected?'함께 있는 관객':'연결을 기다리고 있어요'}><span className={`connection ${connected?'online':''}`}/><Icon name="people" size={17}/>{net?.local?'혼자 감상':net?.state?.visitors.length??'—'}</span>}
    <button className="icon-button" aria-label={audio?.enabled?'소리 끄기':'소리 켜기'} onClick={()=>{audio?.toggle();redraw(n=>n+1);}}><Icon name={audio?.enabled?'sound':'mute'}/></button>
    <button className="icon-button" aria-label="설정" onClick={()=>setSettings(true)}><Icon name="settings"/></button>
   </nav>
  </header>
  {!entered&&!error&&<section className="welcome">
   <div className="eyebrow"><span/>A PLACE TO LISTEN, TOGETHER</div>
   <h1>잠시,<br/>음악 속에 머물러요.</h1>
   <p>황금빛 로비를 지나, 나만의 자리에 앉아보세요.<br/>어느 때 찾아와도 음악은 흐르고 있습니다.</p>
   <button className="enter-button" onClick={enter} disabled={!app}>음악당 들어가기 <Icon name="arrow" size={19}/></button>
   <div className="welcome-note">가입 없이, 편안하게. <span>소리와 함께 입장합니다.</span></div>
  </section>}
  {!entered&&<div className="intro-caption"><span>01 / LE GRAND FOYER</span><span>팔레 가르니에에서 영감을 받은 작은 공간</span></div>}
  {entered&&<>
   {!connected&&<div className="connection-banner" role="status">{net?.status==='connecting'?'음악당의 문을 여는 중이에요…':'연결이 잠시 끊겼어요. 다시 연결하고 있습니다.'}</div>}
   {connected&&zone==='lobby'&&<aside className="room-note"><span>LE GRAND FOYER</span><h2>오늘의 자리는<br/>비워두었어요.</h2><p>앞쪽 문을 눌러 공연장으로 들어가세요.</p><button onClick={()=>world?.changeZone()}>공연장으로 <Icon name="arrow" size={17}/></button></aside>}
   {zone==='auditorium'&&world?.concertView&&<button className="framing-toggle" onClick={()=>world?.toggleFraming()}>{world?.hallOverview?'공연 가까이':'홀 전체'}</button>}
   {zone==='auditorium'&&<button className="view-toggle" onClick={()=>world?.toggleConcertView()}>{world?.concertView?'걷기 시점':'무대 전체'}</button>}
   {zone==='auditorium'&&<button className="seat-open" onClick={()=>setSeats(v=>!v)} aria-expanded={seats}><Icon name="seat" size={16}/> 좌석 선택</button>}
   {seats&&zone==='auditorium'&&<section className="seat-panel" aria-label="빈 좌석 선택"><div className="panel-heading"><span>나의 자리</span><button className="icon-button" aria-label="좌석 선택 닫기" onClick={()=>setSeats(false)}><Icon name="close" size={16}/></button></div><p>무대</p><div className="stage-line"/><div className="seat-grid">{SEATS.map((s,i)=>{const claim=net?.state?.seats[s.id],mine=claim?.visitorId===net?.selfId,occupied=!!claim&&!mine;return <button key={s.id} disabled={occupied||!connected} aria-label={`${i+1}번 좌석${occupied?' 이용 중':mine?' 내 자리':''}`} className={mine?'mine':''} onClick={()=>{void world?.chooseSeat(s.id);setSeats(false);}}><Icon name="seat" size={19}/><span>{String(i+1).padStart(2,'0')}</span></button>;})}</div><small>밝은 좌석을 골라 앉아보세요.</small></section>}
   {zone==='auditorium'&&p&&<aside className="now-playing"><div className="now-label"><span className={`equalizer ${audio?.enabled&&p.playing?'active':''}`}><i/><i/><i/></span>{p.playing?'NOW PLAYING':'INTERMISSION'}</div><h2>{p.playing?p.track.title:'잠시 쉬어가는 시간'}</h2><p>{p.playing?p.track.composer:`${Math.ceil(p.remaining)}초 후 다시 시작합니다`}</p><div className="progress-track"><span style={{width:`${p.playing?p.offset/p.track.durationSeconds*100:0}%`}}/></div><div className="track-meta"><span>{audio?.state}</span><span>{format(p.offset)} / {format(p.track.durationSeconds)}</span></div></aside>}
   <div className="bottom-center"><div className="actionbar" aria-label="음악당에서 할 일"><button onClick={()=>world?.gestureAction('wave')} disabled={!connected}><Icon name="wave"/><span>인사</span></button><span className="divider"/><button className="primary-action" onClick={()=>sitting?world?.stand():world?.changeZone()} disabled={!connected}><Icon name={sitting?'seat':'door'}/><span>{sitting?'일어나기':zone==='lobby'?'공연장 입장':'로비로'}</span></button><span className="divider"/><button onClick={()=>world?.gestureAction('clap')} disabled={!connected}><Icon name="clap"/><span>박수</span></button></div><p className="controls-hint"><span>바닥 클릭으로 이동</span><i>·</i><span>드래그로 둘러보기</span><i>·</i><span>휠로 거리 조절</span></p></div>
  </>}
  {toast&&<div className="toast" role="status">{toast}</div>}
  {error&&<section className="fatal" role="alert"><h1>음악당을 열지 못했어요.</h1><p>WebGL을 지원하는 브라우저에서 다시 열어주세요.</p><small>{error}</small><button onClick={()=>location.reload()}>다시 열기</button></section>}
  <dialog ref={dialog} onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)} className="settings-dialog"><div className="panel-heading"><div><span className="eyebrow">YOUR LITTLE CONCERT</span><h2>편안하게 감상하기</h2></div><button className="icon-button" aria-label="설정 닫기" onClick={()=>setSettings(false)}><Icon name="close"/></button></div><label className="setting-row"><span>음악 소리<small>공연장에서 들리는 음량</small></span><input aria-label="음악 음량" type="range" min="0" max="100" value={Math.round((audio?.volume??.55)*100)} onChange={e=>{if(audio)audio.volume=Number(e.target.value)/100;redraw(n=>n+1);}}/></label><label className="setting-row"><span>화면 품질<small>느리게 움직이면 낮춰보세요</small></span><select aria-label="화면 품질" defaultValue="balanced" onChange={e=>world?.renderer.setPixelRatio(Math.min(devicePixelRatio,e.target.value==='low'?1:1.5))}><option value="balanced">기본</option><option value="low">가볍게</option></select></label><div className="settings-info"><Icon name="music" size={19}/><p>{p?.track.title}<br/>{p?.track.credit&&<><a href={p.track.credit.sourceUrl} target="_blank" rel="noreferrer">{p.track.credit.sourceName}</a> · <a href={p.track.credit.licenseUrl} target="_blank" rel="noreferrer">{p.track.credit.licenseName}</a></>}</p></div><div className="controls-copy">{net?.local&&<p>GitHub Pages 감상 버전 · 다른 관객과의 실시간 연결은 제공하지 않습니다.</p>}<p>바닥 클릭 / WASD / 방향키 — 이동</p><p>드래그 — 둘러보기 · 휠 / 두 손가락 — 거리 조절</p><p>좌석 클릭 — 앉기 · ESC — 일어나기</p></div></dialog>
 </>;
}
createRoot(document.getElementById('root')!).render(<App/>);

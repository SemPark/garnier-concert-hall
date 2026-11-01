import React,{useEffect,useRef,useState} from 'react';
import program from '../content/playlist.json';
import {nextPiece,type Playlist} from '../shared/timeline';
import {createRoot} from 'react-dom/client';
import {World} from './World';
import {Presence} from './network/Presence';
import {ConcertAudio} from './audio/ConcertAudio';
import {SeatMap} from './SeatMap';
import './style.css';
import {runDeviceProbe} from './diagnostics/DeviceProbe';
import {GESTURES,type Gesture} from '../shared/gestures';
const GLYPH:Record<Gesture,string>={wave:'〜',clap:'♪',bravo:'!',ovation:'✦',bow:'⌒',moved:'♥',shh:'…',doze:'Zz'};

function Icon({name,size=20}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  hall:<><path d="m3 8 9-5 9 5M3 21h18M5 10v8m5-8v8m4-8v8m5-8v8M3 8h18"/></>,
  sound:<><path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute:<><path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 5 6m0-6-5 6"/></>,
  people:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/></>,
  stairs:<path d="M4 20h4v-4h4v-4h4V8h4V4"/>,
  walk:<><circle cx="13" cy="4.5" r="2"/><path d="M12.5 8 11 14l-2.5 7M11 14l3 3v4M8 11.5l4.2-3 3.3 2.5"/></>,
  floor1:<text x="12" y="16.6" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor" stroke="none">1F</text>,
  floor2:<text x="12" y="16.6" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor" stroke="none">2F</text>,
  stage:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6m-3-3h6"/></>,
  overview:<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M8 15h8M9 12h6M10.5 9h3"/>,
  menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
  settings:<><path d="M19.0 10.3L21.5 10.6L21.5 13.4L19.0 13.7L18.2 15.7L19.7 17.7L17.7 19.7L15.7 18.2L13.7 19.0L13.4 21.5L10.6 21.5L10.3 19.0L8.3 18.2L6.3 19.7L4.3 17.7L5.8 15.7L5.0 13.7L2.5 13.4L2.5 10.6L5.0 10.3L5.8 8.3L4.3 6.3L6.3 4.3L8.3 5.8L10.3 5.0L10.6 2.5L13.4 2.5L13.7 5.0L15.7 5.8L17.7 4.3L19.7 6.3L18.2 8.3Z"/><circle cx="12" cy="12" r="3"/></>,
  arrow:<path d="M4 12h15m-6-6 6 6-6 6"/>,
  close:<path d="m6 6 12 12M6 18 18 6"/>,
  music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
  wave:<><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-7a1.5 1.5 0 0 1 3 0v8-5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-13 4L3 13a1.7 1.7 0 0 1 2.5-2L8 14"/></>,
  clap:<><path d="m5 11 4 7a6 6 0 0 0 10-6l-3-6a1.5 1.5 0 0 0-2.5 1L16 12 10 3a1.5 1.5 0 0 0-2.5 1L12 12 6 5a1.5 1.5 0 0 0-2 2l5 7-4-3a1.5 1.5 0 0 0-2 2l4 5M18 2l1 2m3 1-2 1"/></>,
  seat:<><path d="M5 12V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M4 10v7h16v-7M6 17v4m12-4v4M4 13h16"/></>,
  door:<><path d="M4 21h16M6 21V3h12v18M12 12h1"/></>,
  enter:<path d="M13 4h6v16h-6M3 12h11m-4-4 4 4-4 4"/>,
  exit:<path d="M11 4H5v16h6m-1-8h11m-4-4 4 4-4 4"/>,
  react:<><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.hall}</svg>;
}
function format(t:number){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function App(){
 // The icon menu stays listed from the start; ☰ hides or shows it.
 const [menu,setMenu]=useState(true);
 // Man/woman window shown in the lobby after entering; it closes once the visitor picks.
 const [lookPicker,setLookPicker]=useState(true);
 const [app,setApp]=useState<{world:World;net:Presence;audio:ConcertAudio}|null>(null),[,redraw]=useState(0),[entered,setEntered]=useState(false),[settings,setSettings]=useState(false),[seats,setSeats]=useState(false),[musicExpanded,setMusicExpanded]=useState(false),[reactions,setReactions]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState('');
 const [probeProgress,setProbeProgress]=useState(''),[probeReport,setProbeReport]=useState(''),[probeMessage,setProbeMessage]=useState('');
 const toastTimer=useRef(0),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let world:World|undefined;const net=new Presence(),audio=new ConcertAudio(net.now);
  try{world=new World(document.getElementById('world')!,net,audio);const active=world;const update=()=>redraw(n=>n+1);const notify=(message:string)=>{setToast(message);clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),3500);};
   world.onChange=update;world.onToast=notify;net.onState=s=>active.apply(s);net.onStatus=update;net.onError=notify;setApp({world,net,audio});
   if(import.meta.env.DEV)Object.assign(window,{__concert:{world,net,audio}});
  }catch(e){setError(e instanceof Error?e.message:'3D 화면을 열지 못했어요.');}
  return ()=>{world?.destroy();net.destroy();audio.destroy();};
 },[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const i=Number(e.code.replace('Digit',''))-1;if(!app||!entered||settings||!(i>=0&&i<GESTURES.length)||app.net.status!=='connected'||(e.target as HTMLElement)?.closest('input,textarea,select,dialog'))return;e.preventDefault();app.world.gestureAction(GESTURES[i].id);};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);},[app,entered,settings]);
 useEffect(()=>{if(settings){dialog.current?.showModal();app?.world.input.keys.clear();}else dialog.current?.close();},[settings,app]);
 const world=app?.world,net=app?.net,audio=app?.audio,p=audio?.playback,zone=world?.zone??'lobby',connected=net?.status==='connected',sitting=world?.pose==='sit';
 const enter=()=>{if(!app)return;setEntered(true);app.world.start();app.net.connect();void app.audio.unlock();};
 const diagnose=async()=>{if(!world||!audio)return;if(!audio.playback.playing||audio.playback.remaining<35){setProbeMessage('곡이 바뀌는 구간입니다. 다음 곡이 시작되면 진단해 주세요.');return;}setSettings(false);setProbeReport('');setProbeMessage('');try{const report=await runDeviceProbe(world,audio,setProbeProgress);setProbeReport(JSON.stringify(report));setProbeMessage('진단 완료 · 결과를 복사해 보내주세요. 결과는 자동 전송되지 않습니다.');}catch(e){setProbeMessage(e instanceof Error?e.message:'진단을 완료하지 못했어요.');}finally{setProbeProgress('');setSettings(true);}};
 return <>
  <div className="vignette"/>
  <header className="topbar">
   <div className="brand"><span className="brand-mark"><Icon name="hall" size={25}/></span><div><span className="brand-name">GARNIER</span><span className="brand-sub">함께 듣는 음악당</span></div></div>
   {entered&&<div className="location"><span className="location-en">{zone==='lobby'?'LE GRAND FOYER':'GOLDENER SAAL'}</span><span>{zone==='lobby'?'그랑 푸아예':'황금홀'}<i>·</i>{net?.state?.roomId?.replace('hall-','본관 ')??'입장 중'}</span></div>}
   <nav className="tools" aria-label="음악당 설정">
    {entered&&<span className="visitor-count" title={connected?'함께 있는 관객':'연결을 기다리고 있어요'}><span className={`connection ${connected?'online':''}`}/><Icon name="people" size={18}/>{net?.local?'혼자 감상':net?.state?.visitors.length??'—'}</span>}
    <button className="icon-button" aria-label={audio?.enabled?'소리 끄기':'소리 켜기'} onClick={()=>{audio?.toggle();redraw(n=>n+1);}}><Icon name={audio?.enabled?'sound':'mute'}/></button>
    {entered&&<button className={`icon-button menu-button ${menu?'active':''}`} aria-label="메뉴" aria-expanded={menu} aria-haspopup="menu" onClick={()=>setMenu(v=>!v)}><Icon name={menu?'close':'menu'}/></button>}
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
   {connected&&zone==='lobby'&&lookPicker&&<div className="look-picker" role="dialog" aria-label="내 캐릭터 고르기"><span>YOUR CHARACTER</span><h2>내 캐릭터를 골라주세요</h2><div className="look-choice">{(["man","woman"] as const).map(v=><button key={v} className={world?.visitorLook===v?"active":""} onClick={()=>{try{localStorage.setItem('garnier-look',v);}catch{}if(world?.visitorLook!==v)world?.setLook(v);setLookPicker(false);}}>{v==="man"?"남자":"여자"}</button>)}</div></div>}
   {connected&&zone==='lobby'&&!lookPicker&&<aside className="room-note"><span>LE GRAND FOYER</span><h2>오늘의 자리는 <br/>비워두었어요.</h2><p>앞쪽 문이나 아래 ‘공연장 입장’을 눌러 들어가세요.</p></aside>}
   {menu&&<><nav className="icon-menu" role="menu" aria-label="음악당 메뉴" title="음악당 메뉴" onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}>
    {zone==='auditorium'?<>
     <button role="menuitem" className="icon-menu-item" aria-label="좌석 고르기" title="좌석 고르기" onClick={()=>{world?.input.keys.clear();setSeats(true);}}><Icon name="seat" size={20}/></button>
     <button role="menuitem" className="icon-menu-item" aria-label={(world?.position.y??0)>8?'1층으로 내려가기':'2층으로 올라가기'} title={(world?.position.y??0)>8?'1층으로 내려가기':'2층으로 올라가기'} onClick={()=>{world?.goToGallery();}}><Icon name={(world?.position.y??0)>8?'floor1':'floor2'} size={20}/></button>
     <span className="icon-menu-divider"/>
     <button role="menuitem" className={`icon-menu-item ${!world?.concertView?'active':''}`} aria-label="걷기 시점" title="걷기 시점" onClick={()=>{if(world?.concertView)world.toggleConcertView();}}><Icon name="walk" size={20}/></button>
     <button role="menuitem" className={`icon-menu-item ${world?.concertView&&world?.hallOverview?'active':''}`} aria-label="홀 전체 보기" title="홀 전체 보기" onClick={()=>{if(!world?.concertView)world?.toggleConcertView();if(!world?.hallOverview)world?.toggleFraming();}}><Icon name="overview" size={20}/></button>
     <span className="icon-menu-divider"/>
     <button role="menuitem" className="icon-menu-item" aria-label="로비로 나가기" title="로비로 나가기" onClick={()=>{world?.changeZone();}}><Icon name="exit" size={20}/></button>
    </>:<button role="menuitem" className="icon-menu-item" aria-label="공연장 들어가기" title="공연장 들어가기" onClick={()=>{world?.changeZone();}}><Icon name="enter" size={20}/></button>}
    <button role="menuitem" className="icon-menu-item" aria-label="설정" title="설정" onClick={()=>{setSettings(true);}}><Icon name="settings" size={20}/></button>
   </nav></>}
   {seats&&zone==='auditorium'&&<SeatMap claims={net?.state?.seats??{}} selfId={net?.selfId??''} connected={connected} onClose={()=>setSeats(false)} onChoose={id=>{void world?.chooseSeat(id);}}/>}
   {zone==='auditorium'&&p&&<aside className={`now-playing ${(!world?.concertView||world?.pose==='walk'||window.innerWidth<700)&&!musicExpanded?'compact-music':''}`}><button className="music-summary" aria-label={musicExpanded?'음악 정보 접기':'음악 정보 펼치기'} aria-expanded={musicExpanded} onClick={()=>setMusicExpanded(v=>!v)}><Icon name="music" size={14}/><span>{p.playing?p.track.title:`곧 이어서 — ${nextPiece(program as Playlist,p.index)?.title??''}`}</span><span>{musicExpanded?'−':'+'}</span></button><div className="music-details"><div className="now-label"><span className={`equalizer ${audio?.enabled&&p.playing?'active':''}`}><i/><i/><i/></span>{p.playing?(p.track.stage?'ON STAGE':'NOW PLAYING'):'잠시 후'}</div><h2>{p.playing?p.track.title:`곧 이어서 — ${nextPiece(program as Playlist,p.index)?.title??''}`}</h2><p>{p.playing&&!p.track.stage?p.track.composer:`다음 곡: ${nextPiece(program as Playlist,p.index)?.title??''}`}{!p.playing&&` · ${Math.ceil(p.remaining)}초 후`}</p><div className="progress-track"><span style={{width:`${p.playing?p.offset/p.track.durationSeconds*100:0}%`}}/></div><div className="track-meta"><span>{audio?.state}</span><span>{format(p.offset)} / {format(p.track.durationSeconds)}</span></div></div></aside>}
   <div className="bottom-center">{reactions&&<div className="reaction-panel" role="group" aria-label="리액션">{GESTURES.map((g,n)=><button key={g.id} onClick={()=>{world?.gestureAction(g.id);setReactions(false);}} disabled={!connected}><b>{GLYPH[g.id]}</b><span>{g.label}</span><kbd>{n+1}</kbd></button>)}</div>}<div className="actionbar" aria-label="음악당에서 할 일"><button onClick={()=>world?.gestureAction('wave')} disabled={!connected}><Icon name="wave"/><span>인사</span></button><button onClick={()=>world?.gestureAction('clap')} disabled={!connected}><Icon name="clap"/><span>박수</span></button><span className="divider"/><button className="primary-action" onClick={()=>{if(sitting)world?.stand();else if(zone==='lobby')world?.changeZone();else{world?.input.keys.clear();setSeats(true);}}} disabled={!connected}><Icon name={sitting?'seat':zone==='lobby'?'enter':'seat'}/><span>{sitting?'일어나기':zone==='lobby'?'공연장 입장':'자리 앉기'}</span></button><span className="divider"/><button className={reactions?'active':''} aria-expanded={reactions} onClick={()=>setReactions(v=>!v)} disabled={!connected}><Icon name="react"/><span>리액션</span></button></div>{world?.mobile?<p className="controls-hint"><span>바닥을 눌러 이동</span><i>·</i><span>끌어서 둘러보기</span><i>·</i><span>두 손가락으로 확대</span></p>:<p className="controls-hint"><span>바닥 클릭으로 이동</span><i>·</i><span>드래그로 둘러보기</span><i>·</i><span>휠로 거리 조절</span><i>·</i><span>1–8 리액션</span></p>}</div>
  </>}
  {probeProgress&&<div className="diagnostic-overlay" role="status"><p>{probeProgress}<br/><small>측정 중 화면이 잠시 멈춥니다. 음악의 끊김을 비교하고 있어요.</small></p></div>}
  {toast&&<div className="toast" role="status">{toast}</div>}
  {error&&<section className="fatal" role="alert"><h1>음악당을 열지 못했어요.</h1><p>WebGL을 지원하는 브라우저에서 다시 열어주세요.</p><small>{error}</small><button onClick={()=>location.reload()}>다시 열기</button></section>}
  <dialog ref={dialog} onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)} className="settings-dialog"><div className="panel-heading"><div><span className="eyebrow">YOUR LITTLE CONCERT</span><h2>편안하게 감상하기</h2></div><button className="icon-button" aria-label="설정 닫기" onClick={()=>setSettings(false)}><Icon name="close"/></button></div><label className="setting-row"><span>음악 소리<small>공연장에서 들리는 음량</small></span><input aria-label="음악 음량" type="range" min="0" max="100" value={Math.round((audio?.volume??.55)*100)} onChange={e=>{if(audio)audio.volume=Number(e.target.value)/100;redraw(n=>n+1);}}/></label><label className="setting-row"><span>내 캐릭터<small>다른 관객에게도 이렇게 보여요</small></span><select aria-label="내 캐릭터" value={world?.visitorLook??'man'} onChange={e=>{const look=e.target.value as 'man'|'woman';try{localStorage.setItem('garnier-look',look);}catch{}world?.setLook(look);redraw(n=>n+1);}}><option value="man">남자</option><option value="woman">여자</option></select></label><label className="setting-row"><span>화면 품질<small>{world?`${world.fps} FPS · ${world.renderer.domElement.width}×${world.renderer.domElement.height}`:'선명도를 선택할 수 있어요'}</small></span><select aria-label="화면 품질" value={world?.quality??"balanced"} onChange={e=>world?.setQuality(e.target.value)}><option value="balanced">{world?.mobile?'균형 · 30FPS':'균형 · 기본'}</option><option value="sharp">{world?.mobile?'선명하게 · 60FPS':'선명하게'}</option><option value="low">가볍게</option></select></label><div className="settings-info"><Icon name="music" size={19}/><p>{p?.track.title}<br/>{p?.track.credit&&<><a href={p.track.credit.sourceUrl} target="_blank" rel="noreferrer">{p.track.credit.sourceName}</a> · <a href={p.track.credit.licenseUrl} target="_blank" rel="noreferrer">{p.track.credit.licenseName}</a></>}</p></div><section className="device-diagnostic"><button disabled={!entered||zone!=='auditorium'||!audio?.enabled||!!probeProgress} onClick={()=>void diagnose()}>끊김 진단 · 30초</button><p>공연장에서 실행하세요. 화면·동작·음악을 나눠 측정한 후 원래대로 돌아옵니다.</p>{probeMessage&&<p role="status">{probeMessage}</p>}{probeReport&&<><button onClick={()=>{void Promise.resolve().then(()=>navigator.clipboard.writeText(probeReport)).then(()=>setProbeMessage('진단 결과를 복사했습니다. 채팅에 붙여넣어 주세요.')).catch(()=>setProbeMessage('아래 결과를 길게 눌러 복사해 주세요.'));}}>진단 결과 복사</button><details><summary>진단 결과 보기</summary><textarea aria-label="기기 진단 결과" readOnly value={probeReport}/></details></>}</section><div className="controls-copy">{net?.local&&<p>GitHub Pages 감상 버전 · 다른 관객과의 실시간 연결은 제공하지 않습니다.</p>}<p>바닥 클릭 / WASD / 방향키 — 이동</p><p>드래그 — 둘러보기 · 휠 / 두 손가락 — 거리 조절</p><p>좌석 클릭 — 앉기 · ESC — 일어나기</p></div></dialog>
 </>;
}
createRoot(document.getElementById('root')!).render(<App/>);

import {DetailedAnalyticsChoices,useDetailedAnalytics} from './analytics/DetailedAnalyticsChoices';
import {confirmedVisitorSeat} from './diagnostics/LocalVisitRecorder';
import {DanceControls,DanceStart} from './DanceControls';
import {createPlaybackAnalytics} from './analytics/ga4';
import type {ExtraAnalytics} from './analytics/ExtraAnalytics';
import {AnalyticsChoices,useAnalyticsPreference} from './analytics/AnalyticsChoices';
import {QueenCardGame} from './QueenCardGame';
import {WishTarot} from './WishTarot';
import {ProgramBook} from './ProgramBook';
import {PlaylistCover} from './PlaylistCover';
import {PhotoMode} from './PhotoMode';
import {ConductingExperience} from './ConductingExperience';
import coffeeIcon from './assets/cafe/coffee.webp';
import macaronIcon from './assets/cafe/macaron.webp';
import {DISHES,isDrink} from '../shared/dishes';
import {reportLoading,reportInitialHallLoading,failLoading} from './loading';
import {Wardrobe} from './Wardrobe';
import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {CONCERT_OPTIONS,HALL_ID,INITIAL_PLAYLIST,LOBBY_ENABLED,PLAYLISTS,type ConcertOption} from './audio/playlist';
import {adjacentPiece} from '../shared/timeline';
import {createRoot} from 'react-dom/client';
import {World} from './World';
import {GalaxySettings} from './GalaxySettings';
import {Presence} from './network/Presence';
import {ConcertAudio} from './audio/ConcertAudio';
import {GUEST_INTRO_KEY,SeatMap} from './SeatMap';
import {GhostTableDiscovery} from './GhostTableDiscovery';
import {EncoreTrainHint} from './EncoreTrainHint';
import {FirstMealGuide,ReferenceGuide,UsherGuide,type ReferenceGuideStep,type UsherGuideStep} from './UsherGuide';
import {SEATS,seatLabel} from '../shared/venue';
import {gestureSeconds} from '../shared/gestures';

const MEAL_CHOICES=DISHES.filter(dish=>dish.id!=='tea');
const VISIT_GUIDE_KEY='pleee-visit-guide';
const MEAL_GUIDE_KEY='pleee-meal-guide';
const SPACE_REVEAL_KEY='pleee-first-space-view';
const SOUND_CHOICE_KEY='pleee-sound-muted';

function readPreference(key:string){
 try{return localStorage.getItem(key)==='1';}catch{return false;}
}
function savePreference(key:string,active:boolean){
 try{if(active)localStorage.setItem(key,'1');else localStorage.removeItem(key);}catch{/* Kept in memory for this visit. */}
}
import './style.css';
import './settings.css';
import {runDeviceProbe} from './diagnostics/DeviceProbe';
import {JAZZ_HALL} from '../shared/hallKind';
/** Conducting is available with the classical orchestra. */
const CONDUCTING_ENABLED=!JAZZ_HALL;
import {GESTURES,type Gesture} from '../shared/gestures';
reportLoading(10,'시작 화면을 준비하고 있어요');
const EMPTY_CLAIMS={};
const GLYPH:Record<Gesture,string>={wave:'〜',clap:'♪',bravo:'!',ovation:'↶',bow:'⌒',moved:'♥',shh:'…',doze:'Zz',drink:'☕',eat:'🍪'};

function Icon({name,size=20}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  hideInterface:<><path d="M3 7V4h5m8 0h5v3M3 17v3h5m8 0h5v-3M4 12h16"/><path d="m9 15 6-6"/></>,
  dance:<g strokeWidth="1.35">
   <circle cx="11.7" cy="5.5" r="2.25"/>
   <path d="M7.4 1.8 4.9 6.3Q5.8 8.9 8.7 10.5l2.1.5 2.5-.5q3.3-2.7 4.7-5.4l1.2-3M10.8 11l2.4 4.3-2 6.8m2-6.8-4.3 3.1-2.3 3.7"/>
  </g>,
  train:<>
   <path d="M2.5 16V5h9v5h6V6h3v5l1.5 2v3ZM6 8.5h2.5"/>
   <circle cx="7" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/>
  </>,
  cat:<><path d="M4 12V5l5 3h6l5-3v7c0 4.5-3.6 7-8 7s-8-2.5-8-7Z"/><path d="M9 12h.01M15 12h.01m-4 3 1 1 1-1M4 14l-2-.5m18 .5 2-.5"/></>,
  camera:<><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></>,
  hall:<><path d="m3 8 9-5 9 5M3 21h18M5 10v8m5-8v8m4-8v8m5-8v8M3 8h18"/></>,
  planet:<><circle cx="12" cy="12" r="6.5"/><path d="M6 10.5C3.1 12.7 1.4 15 2.2 16.3c1 1.7 6.2.9 11.5-2.2s8.8-6.9 7.8-8.6c-.7-1.2-3.3-.9-6.3.2"/></>,
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
  eye:<><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></>,
  overview:<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M8 15h8M9 12h6M10.5 9h3"/>,
  menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
  settings:<><path d="M19.0 10.3L21.5 10.6L21.5 13.4L19.0 13.7L18.2 15.7L19.7 17.7L17.7 19.7L15.7 18.2L13.7 19.0L13.4 21.5L10.6 21.5L10.3 19.0L8.3 18.2L6.3 19.7L4.3 17.7L5.8 15.7L5.0 13.7L2.5 13.4L2.5 10.6L5.0 10.3L5.8 8.3L4.3 6.3L6.3 4.3L8.3 5.8L10.3 5.0L10.6 2.5L13.4 2.5L13.7 5.0L15.7 5.8L17.7 4.3L19.7 6.3L18.2 8.3Z"/><circle cx="12" cy="12" r="3"/></>,
  arrow:<path d="M4 12h15m-6-6 6 6-6 6"/>,
  close:<path d="m6 6 12 12M6 18 18 6"/>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/></>,
  skip:<path d="M3 6a1 1 0 0 1 1.55-.83L12 10.1V6a1 1 0 0 1 1.55-.83l7.5 4.95a2.25 2.25 0 0 1 0 3.76l-7.5 4.95A1 1 0 0 1 12 18v-4.1l-7.45 4.93A1 1 0 0 1 3 18Z" fill="currentColor" stroke="none"/>,
  chevronDown:<path d="m6 9 6 6 6-6"/>,
  playlist:<><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r=".7" fill="currentColor"/><circle cx="4" cy="12" r=".7" fill="currentColor"/><circle cx="4" cy="18" r=".7" fill="currentColor"/></>,
  music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
  wave:<><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-7a1.5 1.5 0 0 1 3 0v8-5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-13 4L3 13a1.7 1.7 0 0 1 2.5-2L8 14"/></>,
  seat:<><path d="M5 12V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M4 10v7h16v-7M6 17v4m12-4v4M4 13h16"/></>,
  cards:<><rect x="7" y="4" width="12" height="16" rx="2"/><path d="m5 18-2-1L4 5l2-1"/><path className="queen-heart-fill" d="m13 16-3-3a1.7 1.7 0 0 1 3-1.4 1.7 1.7 0 0 1 3 1.4Z"/></>,
  tarot:<><rect x="3.5" y="3.8" width="12" height="16" rx="2" transform="rotate(9 9.5 11.8)" fill="#a76f91"/><rect x="7" y="4" width="12" height="16" rx="2" fill="#785282"/><path d="M13 8l1.2 2.8L17 12l-2.8 1.2L13 16l-1.2-2.8L9 12l2.8-1.2Z"/></>,
  trash:<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>,
  ticket:<path d="M3 6h18v3.5a2.5 2.5 0 0 0 0 5V18H3v-3.5a2.5 2.5 0 0 0 0-5ZM15 6v2.5m0 2.5v2m0 2.5V18"/>,
  door:<><path d="M4 21h16M6 21V3h12v18M12 12h1"/></>,
  enter:<path d="M13 4h6v16h-6M3 12h11m-4-4 4 4-4 4"/>,
  exit:<path d="M11 4H5v16h6m-1-8h11m-4-4 4 4-4 4"/>,
  center:<><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  react:<><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.hall}</svg>;
}
const HALL_AUDIO_KEY='pleee-hall-audio';
const REFERENCE_RESUME_KEY='pleee-reference-guide-resume';
function concertHref({hallId,playlistId}:ConcertOption){
 const url=new URL(location.href);
 if(hallId==='jazz')url.searchParams.set('hall','jazz');
 else url.searchParams.delete('hall');
 url.searchParams.set('playlist',playlistId);
 return url.href;
}
function takeHallAudioIntent(){
 try{
  const intent=sessionStorage.getItem(HALL_AUDIO_KEY);
  sessionStorage.removeItem(HALL_AUDIO_KEY);
  if(intent===INITIAL_PLAYLIST+':play')return 'play';
  if(intent===INITIAL_PLAYLIST+':mute')return 'mute';
 }catch{/* storage can be unavailable in private contexts */}
 return null;
}
function TablePromptClose({label,onClose}:{label:string;onClose:()=>void}){
 return <button type="button" className="cafe-close table-prompt-close" aria-label={`${label} 안내 닫기`} onClick={onClose}>
  <Icon name="close" size={15}/>
 </button>;
}
function WishButton({world}:{world:World}){
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [holding,setHolding]=useState(false);
 const cancel=()=>{
  if(timer.current!==null)clearTimeout(timer.current);
  timer.current=null;setHolding(false);
 };
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);},[]);
 const begin=()=>{
  if(timer.current!==null||world.wishing)return;
  setHolding(true);
  timer.current=setTimeout(()=>{timer.current=null;setHolding(false);world.makeWish();},1000);
 };
 return <button className={'eat-ready wish-action'+(holding?' holding':'')} disabled={world.wishing}
  aria-label="길게 눌러 소원 빌기" title="1초간 길게 눌러 소원 빌기"
  onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);begin();}}
  onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
  onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();begin();}}}
  onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();cancel();}}}
  onContextMenu={e=>e.preventDefault()}
  onClick={()=>{if(!world.wishing)world.onToast('꽃 버튼을 1초간 길게 눌러 소원을 빌어보세요.');}}>
  <b aria-hidden="true">💐</b><span>{world.wishing?'소원 보내는 중':'소원 빌기'}</span>
 </button>;
}

function ViewModeMenu({world,onBroadcast,extra}:{world:World;onBroadcast:()=>void;extra:ExtraAnalytics|null}){
 const trigger=useRef<HTMLButtonElement>(null);
 const options=useRef<HTMLDivElement>(null);
 const select=(action:()=>void)=>{
  action();
  options.current?.hidePopover();
  trigger.current?.focus();
 };
 const modes=[
  {icon:'walk',label:'걷기',active:!world.broadcastView&&!world.concertView,disabled:world.entranceViewLocked&&world.concertView&&!world.broadcastView,
   action:()=>{if(world.concertView)world.toggleConcertView();else world.stopBroadcastView();}},
  {icon:'overview',label:'홀 전체',active:!world.broadcastView&&world.concertView&&world.hallOverview,disabled:world.entranceViewLocked,
   action:()=>{if(!world.hallOverview)extra?.feature('hall_overview_view_click');world.showHallOverview();}},
  {icon:'stageLow',label:'무대 올려보기',active:!world.broadcastView&&world.concertView&&!world.hallOverview&&world.stageLowView&&!world.seatedStageView,disabled:world.entranceViewLocked,
   action:()=>{extra?.feature('hall_stage_view_click');world.setStageView(true);}},
  {icon:'camera',label:'방송 카메라',active:world.broadcastView,disabled:!world.canStartBroadcast&&!world.broadcastView,
   action:()=>{world.toggleBroadcastView();if(world.broadcastView){extra?.feature('hall_broadcast_view_click');onBroadcast();}}},
 ];
 return <>
  <button ref={trigger} role="menuitem" className="icon-menu-item" data-usher-label="보기 모드" aria-label="보기 모드" title="보기 모드"
   popoverTarget="view-mode-options" onClick={event=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    options.current?.style.setProperty('--view-mode-top',`${bounds.top}px`);
    options.current?.style.setProperty('--view-mode-right',`${document.documentElement.clientWidth-bounds.left+10}px`);
   }}>
   <Icon name="eye" size={20}/>
  </button>
  <div ref={options} id="view-mode-options" className="view-mode-options" popover="auto" role="group" aria-label="보기 모드">
   {modes.map(({icon,label,active,disabled,action})=><button key={icon} type="button" aria-pressed={active}
    title={disabled&&icon!=='camera'?'입구를 지나면 시점을 바꿀 수 있어요':undefined} disabled={disabled} onClick={()=>select(action)}>
    <Icon name={icon} size={20}/><span>{label}</span>
   </button>)}
  </div>
 </>;
}

function App(){
 const [analytics]=useState(createPlaybackAnalytics);
 const analyticsPreference=useAnalyticsPreference(analytics);
 const detailPreference=useDetailedAnalytics(analytics,analyticsPreference.mode,analyticsPreference.choice,JAZZ_HALL?'jazz':'classical',analyticsPreference.detailAutomatic);
 const {detail,extra,zones,research}=detailPreference;
 const onMapSeatClick=useCallback((id:string)=>{
  detail?.selected(id);
 },[detail]);
 // The icon menu stays listed from the start; ☰ hides or shows it.
 const [queenGameOpen,setQueenGameOpen]=useState(false);
 const queenAttempt=useRef<{hadResult:boolean}|null>(null);
 const [wishTarotOpen,setWishTarotOpen]=useState(false);
 const [discoveredTable,setDiscoveredTable]=useState<number|null>(null);
 const [tableExperienceSeat,setTableExperienceSeat]=useState<string|null>(null);
 const tableArrivalSeat=useRef<string|null>(null);
 const [postSpaceSeat,setPostSpaceSeat]=useState<string|null>(null);
 const [seatProgress,setSeatProgress]=useState('');
 const [usherGuide,setUsherGuide]=useState<Exclude<UsherGuideStep,'mealDrink'|'eat'|'drink'>|null>(null);
 const [observedGesture,setObservedGesture]=useState<'wave'|'eat'|'drink'|null>(null);
 const [referenceGuide,setReferenceGuide]=useState<ReferenceGuideStep|null>(null);
 const [tutorialSeat,setTutorialSeat]=useState<string|null>(null);
 const arrivalHandled=useRef(false);
 const arrivalReference=useRef(false);
 const firstVisitGuide=useRef(false);
 const [dismissedStageSeat,setDismissedStageSeat]=useState<string|null>(null);
 const [mealExperienced,setMealExperienced]=useState(()=>readPreference(MEAL_GUIDE_KEY));
 const [mealHintSeat,setMealHintSeat]=useState<string|null>(null);
 const mealHintShown=useRef(false);
 const closeWishTarot=useCallback(()=>setWishTarotOpen(false),[]);
 const wishTarotButton=useRef<HTMLButtonElement>(null);
 const wishTarotWasOpen=useRef(false);
 const [programOpen,setProgramOpen]=useState(false);
 const [menu,setMenu]=useState(true);
 const [interfaceHidden,setInterfaceHidden]=useState(false);
 const interfaceToggle=useRef<HTMLButtonElement>(null);
 const restoreInterface=useCallback(()=>{
  setInterfaceHidden(false);
  requestAnimationFrame(()=>interfaceToggle.current?.focus({preventScroll:true}));
 },[]);
 useLayoutEffect(()=>{
  if(!interfaceHidden)return;
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape')return;
   event.preventDefault();
   event.stopImmediatePropagation();
   restoreInterface();
  };
  document.body.classList.add('concert-interface-hidden');
  window.addEventListener('keydown',escape,true);
  return ()=>{
   document.body.classList.remove('concert-interface-hidden');
   window.removeEventListener('keydown',escape,true);
  };
 },[interfaceHidden,restoreInterface]);
 const openArrivalGuide=useCallback(()=>{
  if(arrivalHandled.current)return;
  arrivalHandled.current=true;
  let resume:string|null=null;
  try{
   resume=sessionStorage.getItem(REFERENCE_RESUME_KEY);
   sessionStorage.removeItem(REFERENCE_RESUME_KEY);
  }catch{/* Continue from the usual entry. */}
  if(!resume&&readPreference(VISIT_GUIDE_KEY))return;
  arrivalReference.current=resume!=='manual';
  firstVisitGuide.current=arrivalReference.current;
  setMenu(true);
  setReferenceGuide(resume?2:0);
 },[]);
 const startUsherGuide=()=>{
  setReferenceGuide(null);
  arrivalReference.current=false;
  setUsherGuide('greet');
 };
 const finishReferenceGuide=()=>{
  if(arrivalReference.current)startUsherGuide();
  else setReferenceGuide(null);
 };
 const [hallPickerOpen,setHallPickerOpen]=useState(false);
 const [musicExpanded,setMusicExpanded]=useState(false);
 const [musicListOpen,setMusicListOpen]=useState(false);
 const musicPlayer=useRef<HTMLElement>(null),musicToggle=useRef<HTMLButtonElement>(null);
 const hallPicker=useRef<HTMLDivElement>(null),hallPickerButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!hallPickerOpen&&!musicExpanded)return;
  const dismiss=(event:PointerEvent)=>{
   if(!(event.target instanceof Node))return;
   if(hallPickerOpen&&!hallPicker.current?.contains(event.target))setHallPickerOpen(false);
   if(musicExpanded&&!musicPlayer.current?.contains(event.target))setMusicExpanded(false);
  };
  window.addEventListener('pointerdown',dismiss);
  return ()=>window.removeEventListener('pointerdown',dismiss);
 },[hallPickerOpen,musicExpanded]);
 // Man/woman window shown in the lobby after entering; it closes once the visitor picks.
 const [conducting,setConducting]=useState(false);const closeConducting=useCallback(()=>setConducting(false),[]);
 const [lookPicker,setLookPicker]=useState(false);const [wardrobe,setWardrobe]=useState(false);
 const [app,setApp]=useState<{world:World;net:Presence;audio:ConcertAudio}|null>(null),[,redraw]=useState(0),[entered,setEntered]=useState(false),[settings,setSettings]=useState(false),[seats,setSeats]=useState(false),[reactions,setReactions]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState('');
 const [probeProgress,setProbeProgress]=useState(''),[probeReport,setProbeReport]=useState(''),[probeMessage,setProbeMessage]=useState('');
 const [iphonePending,setIphonePending]=useState(false);
 const iphoneBridge=import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname);
 const localDevelopment=import.meta.env.DEV&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const entering=useRef(false),initialHallRequested=useRef(false);
 const [initialHallReady,setInitialHallReady]=useState(false);
 const toastTimer=useRef(0),dialog=useRef<HTMLDialogElement>(null),probeDetails=useRef<HTMLDetailsElement>(null),probeText=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{
  let world:World|undefined;
  const intent=takeHallAudioIntent();
  const net=new Presence(),audio=new ConcertAudio(net.now,INITIAL_PLAYLIST,intent!=='mute'&&!readPreference(SOUND_CHOICE_KEY),analytics,extra,research);
  let triedEntryAudio=false;
  let previousSeat:string|null|undefined;
  try{world=new World(document.getElementById('world')!,net,audio);const active=world;const update=()=>redraw(n=>n+1);const notify=(message:string)=>{setToast(message);clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),3500);};
   world.onChange=()=>{
    if(!triedEntryAudio&&intent==='play'&&active.entered&&active.zone==='auditorium'){
     triedEntryAudio=true;
     if(audio.soundRequested&&!audio.enabled)void audio.unlock().then(update);
    }
    update();
   };
   world.onQueenCardGame=()=>{queenAttempt.current={hadResult:false};setQueenGameOpen(true);};world.onProgramBook=()=>setProgramOpen(true);world.onArrivalGuide=openArrivalGuide;world.onToast=notify;world.onSeatProgress=setSeatProgress;world.onWardrobe=()=>setWardrobe(true);world.onSeatMap=()=>{extra?.feature('hall_seat_map_open');active.input.keys.clear();setSeats(true);};
   if(detail)active.onAnalyticsSeatSelected=id=>detail.selected(id);
   net.onState=s=>{
    active.apply(s);
    const trackSeat=detail?.measuring, trackResult=research?.measuring;
    if(active.self&&(trackSeat||trackResult)){
     const seat=confirmedVisitorSeat(s,active.self,net.selfId);
     if(trackSeat)detail.seated(seat);
     if(trackResult&&seat&&previousSeat!==undefined&&seat!==previousSeat)research.count('action_result','seat_confirmed');
     previousSeat=trackResult?seat:undefined;
    }else previousSeat=undefined;
   };
   net.onMoveBlocked=point=>active.correctMove(point);
   net.onRelocated=point=>{
    active.finishHallMove(point);
    detail?.interrupt();
   };
   net.onStatus=()=>{
    if(net.status!=='connected'){
     previousSeat=undefined;
     active.stopHallLoading();
     detail?.interrupt();zones?.interrupt();
    }
    update();
   };
   net.onError=message=>{active.stopHallLoading();notify(message);};setApp({world,net,audio});
   if(research)net.onSeatDenied=()=>research.count('action_result','seat_denied');
   world.onWishTarot=()=>setWishTarotOpen(true);
   world.onGhostTable=table=>{
    const seatId=active.self?.seatId;
    if(active.pose==='sit'&&seatId&&SEATS.some(seat=>seat.id===seatId&&seat.level==='parterre'&&seat.row===table)){
     setTableExperienceSeat(seatId);
    }else setDiscoveredTable(table);
   };
   if(import.meta.env.DEV)Object.assign(window,{__concert:{world,net,audio}});
  }catch(e){failLoading();setError(e instanceof Error?e.message:'3D 화면을 열지 못했어요.');}
  // Full-document hall links do not unmount React. Release the old hall before
  // Safari keeps the document in its back/forward cache alongside the next one.
  let released=false;
  const release=()=>{if(released)return;released=true;net.destroy();audio.destroy();world?.destroy();};
  const restore=(event:PageTransitionEvent)=>{if(event.persisted&&released)location.reload();};
  const sampleArea=()=>{
   if(!world?.entered||!world.self||document.hidden||net.status!=='connected'){
    detail?.interrupt();zones?.interrupt();return;
   }
   if(research?.measuring&&!world.hallLoading&&net.state&&!net.local){
    const others=net.state.visitors.filter(visitor=>visitor.id!==net.selfId&&visitor.zone===world.zone).length;
    research.once('co_audience',others<=1?others===0?'0':'1':others<=4?'2-4':'5+');
   }
   if(world.ridingTrain){detail?.interrupt();zones?.interrupt();return;}
   const {y,z}=world.position;
   const now=performance.now();
   if(zones?.measuring)zones.position(world.zone,y,z,now);
   if(!detail?.measuring||world.hallLoading){detail?.interrupt();return;}
   detail.seated(confirmedVisitorSeat(net.state,world.self,net.selfId));
   detail.position(world.zone,y,z,now);
  };
  const suspendDetail=()=>{detail?.interrupt();zones?.interrupt();};
  const timer=detail?window.setInterval(sampleArea,1000):undefined;
  const pagehide=()=>{detail?.flush();extra?.flush();zones?.flush();research?.flush();release();};
  if(detail)document.addEventListener('visibilitychange',suspendDetail);
  window.addEventListener('pagehide',pagehide);
  window.addEventListener('pageshow',restore);
  return ()=>{window.removeEventListener('pagehide',pagehide);document.removeEventListener('visibilitychange',suspendDetail);clearInterval(timer);
   window.removeEventListener('pageshow',restore);release();};
 },[openArrivalGuide]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const i=Number(e.code.replace('Digit',''))-1;if(!app||!entered||settings||!(i>=0&&i<GESTURES.length)||app.net.status!=='connected'||(e.target as HTMLElement)?.closest('input,textarea,select,dialog'))return;e.preventDefault();app.world.gestureAction(GESTURES[i].id);};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);},[app,entered,settings]);
 useEffect(()=>{
  const panel=dialog.current;
  if(!panel)return;
  if(!settings){panel.close();return;}
  if(!panel.open){
   panel.showModal();
   panel.querySelector<HTMLElement>('#settings-title')?.focus({preventScroll:true});
  }
  app?.world.input.keys.clear();
 },[settings,app]);
 const world=app?.world,net=app?.net,audio=app?.audio,p=audio?.playback,zone=world?.zone??'lobby',connected=net?.status==='connected',sitting=world?.pose==='sit';
 const program=audio?.playlist;
 const currentTrack=p?.track.stage&&program?adjacentPiece(program,p.index):p?.track;
 const atWishTarotTable=!!world?.atWishTarotTable;
 const atTeaTable=!!world?.atTeaTable;
 const tarotVisible=wishTarotOpen&&atWishTarotTable&&connected;
 useEffect(()=>{if(tarotVisible)extra?.feature('tarot');},[tarotVisible]);
 useEffect(()=>{if(queenGameOpen)extra?.feature('queen_cards');},[queenGameOpen]);
 const specialTable=atWishTarotTable||!!world?.atQueenTable||atTeaTable;
 const tableSeat=zone==='auditorium'&&sitting?world?.self?.seatId:null;
 const confirmedSeat=tableSeat?SEATS.find(seat=>seat.id===tableSeat):undefined;
 const mealAvailable=!!world?.atDinnerTable&&!(world.dish&&world.drink);
 const foodReady=!!world?.dish&&!world.self?.dishEmptyAt;
 const drinkReady=!!world?.drink&&!world.self?.drinkEmptyAt&&!world.teaPouring;
 const mealTasted=!!world?.atDinnerTable&&((world.self?.dishBites??0)>0||(world.self?.drinkSips??0)>0);
 useEffect(()=>{
  if(mealExperienced||!mealTasted)return;
  savePreference(MEAL_GUIDE_KEY,true);
  setMealExperienced(true);
 },[mealExperienced,mealTasted]);
 const seatedGuideStep=!mealExperienced&&!mealTasted&&world?.atDinnerTable&&(mealAvailable||foodReady||drinkReady)?'meal':'space';
 const choosingMeal=usherGuide==='meal'&&mealAvailable;
 const choosingDrink=choosingMeal&&!!world?.dish;
 let currentGuideStep:UsherGuideStep|null=usherGuide;
 if(usherGuide==='meal'){
  if(choosingMeal)currentGuideStep=choosingDrink?'mealDrink':'meal';
  else if(foodReady)currentGuideStep='eat';
  else if(drinkReady)currentGuideStep='drink';
 }
 const canShowSeatHint=!!world&&connected&&zone==='auditorium'&&!world.hallLoading
  &&!world.self?.dance&&!world.photoMode&&!world.catView&&!world.broadcastView&&!world.ridingTrain
  &&!conducting&&discoveredTable===null&&!seats&&!settings&&!wardrobe&&!programOpen&&!queenGameOpen&&!wishTarotOpen&&!hallPickerOpen;
 const guideActive=usherGuide!==null;
 const referenceActive=referenceGuide!==null;
 const referenceShowsHall=referenceGuide===2&&canShowSeatHint;
 const seatConfirmed=!!confirmedSeat&&world?.self?.pose==='sit'&&!!tableSeat&&net?.state?.seats[tableSeat]?.visitorId===net?.selfId&&net?.state?.seats[tableSeat]?.status==='seated';
 const competingPanel=musicExpanded||reactions||world?.cafeMenu||world?.dishMenu&&usherGuide!=='meal';
 const showSpaceOutro=canShowSeatHint&&usherGuide==='space'&&!!world?.spaceOverviewReady;
 const showUsherGuide=canShowSeatHint&&guideActive&&!competingPanel&&(usherGuide!=='space'||menu)&&!showSpaceOutro;
 const observingGuide=!!observedGesture||!!world?.spaceTransitioning||usherGuide==='seat'&&!!seatProgress
  ||usherGuide==='meal'&&!!world?.dishMenu||usherGuide==='space'&&!!world?.openHall;
 const tasteMeal=(gesture:'eat'|'drink')=>{
  if(usherGuide==='meal'&&observedGesture)return;
  if(world?.gestureAction(gesture)&&usherGuide==='meal'&&!choosingMeal)setObservedGesture(gesture);
 };
 const finishUsherGuide=useCallback(()=>{
  firstVisitGuide.current=false;
  savePreference(VISIT_GUIDE_KEY,true);
  setObservedGesture(null);
  setUsherGuide(null);
  setSeats(false);
  if(usherGuide==='meal'&&world?.dishMenu)world.closeDishMenu();
  if(world?.renderer.domElement.isConnected)world.renderer.domElement.focus({preventScroll:true});
 },[world,usherGuide]);
 const quitReferenceGuide=()=>{
  setReferenceGuide(null);
  if(!arrivalReference.current)return;
  arrivalReference.current=false;
  finishUsherGuide();
 };
 const completeSpaceGuide=useCallback(()=>{
  if(firstVisitGuide.current)research?.once('first_visit_stage','complete');
  if(seatConfirmed&&tableSeat&&specialTable)setPostSpaceSeat(tableSeat);
  finishUsherGuide();
 },[seatConfirmed,tableSeat,specialTable,finishUsherGuide,research]);
 const toggleSpace=()=>{
  if(world&&!world.openHall)extra?.feature('hall_space_click');
  if(world?.toggleOpenHall(usherGuide==='space'||!readPreference(SPACE_REVEAL_KEY))){
   savePreference(SPACE_REVEAL_KEY,true);
  }
 };
 useEffect(()=>{
  const step=observedGesture==='wave'?'greet':'meal';
  if(!observedGesture||usherGuide!==step)return;
  const timer=window.setTimeout(()=>{
   setObservedGesture(null);
   setUsherGuide(current=>current===step?step==='greet'?'seat':'space':current);
  },gestureSeconds(observedGesture)*1000);
  return ()=>window.clearTimeout(timer);
 },[observedGesture,usherGuide]);
 useLayoutEffect(()=>{
  if(!usherGuide)return;
  if(initialHallReady&&zone!=='auditorium'){
   firstVisitGuide.current=false;
   setObservedGesture(null);
   setUsherGuide(null);
   return;
  }
  if(seatConfirmed&&tableSeat){
   setTutorialSeat(tableSeat);
   if(usherGuide==='seat'){
    setObservedGesture(null);
    setUsherGuide(seatedGuideStep);
   }
  }
  if(usherGuide==='meal'&&!seatConfirmed){
   if(world?.dishMenu)world.closeDishMenu();
   setObservedGesture(null);
   setUsherGuide('seat');
  }
  if(usherGuide==='space'){
   setMenu(true);
   if(world?.openHall&&world.openHallProgress>=1&&!world.spaceRevealRunning)completeSpaceGuide();
  }
 },[usherGuide,seatConfirmed,seatedGuideStep,tableSeat,initialHallReady,zone,menu,world,world?.openHall,world?.openHallProgress,world?.spaceRevealRunning,completeSpaceGuide]);
 useEffect(()=>{
  if(firstVisitGuide.current&&!document.hidden&&referenceGuide!==null&&canShowSeatHint){
   research?.once('first_visit_stage','guide_open');
  }
 },[referenceGuide,canShowSeatHint,research]);
 useEffect(()=>{
  if(firstVisitGuide.current&&!document.hidden&&showUsherGuide&&usherGuide){
   research?.once('first_visit_stage',usherGuide);
  }
 },[showUsherGuide,usherGuide,research]);
 const hallChoicesVisible=hallPickerOpen;
 const showStagePrompt=!specialTable&&canShowSeatHint&&confirmedSeat&&!guideActive&&!referenceActive&&tutorialSeat!==tableSeat&&dismissedStageSeat!==tableSeat&&!world?.concertView&&!world?.dishMenu;
 const showMealGuide=!mealExperienced&&!mealTasted&&!!showStagePrompt&&mealAvailable&&tableSeat===mealHintSeat;
 useLayoutEffect(()=>{
  if(!tableSeat){setMealHintSeat(null);return;}
  if(mealExperienced||mealTasted||!showStagePrompt||!mealAvailable||mealHintShown.current)return;
  mealHintShown.current=true;
  setMealHintSeat(tableSeat);
 },[tableSeat,showStagePrompt,mealAvailable,mealExperienced,mealTasted]);
 useEffect(()=>{
  setTableExperienceSeat(null);
  setDismissedStageSeat(null);
 },[tableSeat]);
 const canShowTablePrompt=canShowSeatHint&&!guideActive&&!referenceActive&&!competingPanel&&!world?.spaceTransitioning&&!world?.seatedStageView;
 useEffect(()=>{
  if(!postSpaceSeat)return;
  if(!connected||!world?.openHall||!specialTable||postSpaceSeat!==tableSeat){
   setPostSpaceSeat(null);
   return;
  }
  if(!canShowTablePrompt||toast||seatProgress)return;
  const timer=window.setTimeout(()=>{
   tableArrivalSeat.current=postSpaceSeat;
   setTableExperienceSeat(postSpaceSeat);
   setPostSpaceSeat(null);
  },1500);
  return ()=>window.clearTimeout(timer);
 },[postSpaceSeat,connected,world?.openHall,specialTable,tableSeat,canShowTablePrompt,toast,seatProgress]);
 useEffect(()=>{
  if(!specialTable||!tableSeat){tableArrivalSeat.current=null;return;}
  if(!seatConfirmed||tableArrivalSeat.current===tableSeat||guideActive||referenceActive||postSpaceSeat===tableSeat)return;
  tableArrivalSeat.current=tableSeat;
  setTableExperienceSeat(tableSeat);
 },[specialTable,tableSeat,seatConfirmed,guideActive,referenceActive,postSpaceSeat]);
 const drink=world?.drink;
 const hasTea=drink==='tea';
 const dinnerDrink=drink&&DISHES.find(dish=>dish.id===drink);
 const dinnerDrinkLabel=dinnerDrink&&dinnerDrink.label+' 마시기';
 const teaPouring=!!world?.teaPouring;
 const teaPromptAvailable=atTeaTable&&(!hasTea||teaPouring);
 const teaActionLabel=teaPouring?'차 따르는 중':drink?'차로 바꾸기':'차 받기';
 const queenPromptAvailable=!!world?.atQueenTable&&!world.queenWand.charges&&!world.queenWand.casting&&!world.queenWand.receiving;
 const showTablePrompt=!!tableSeat&&tableExperienceSeat===tableSeat&&canShowTablePrompt&&(atWishTarotTable||teaPromptAvailable||queenPromptAvailable);
 const dismissTablePrompt=()=>{setPostSpaceSeat(null);setTableExperienceSeat(null);};
 const closeGhostTable=()=>setDiscoveredTable(null);
 useLayoutEffect(()=>{
  if(!world)return;
  world.visitGuideActive=guideActive||referenceActive;
  return ()=>{world.visitGuideActive=false;};
 },[world,guideActive,referenceActive]);
 useEffect(()=>{
  if(!connected||zone!=='auditorium'||guideActive||referenceActive||world?.spaceTransitioning){
   setDiscoveredTable(null);
   setTableExperienceSeat(null);
  }
 },[connected,zone,guideActive,referenceActive,world?.spaceTransitioning]);
 useEffect(()=>{
  if(zone!=='auditorium'){
   arrivalReference.current=false;
   setReferenceGuide(null);
  }else if(!connected&&!arrivalReference.current)setReferenceGuide(null);
 },[connected,zone]);
 const showMirrorHint=canShowSeatHint&&!guideActive&&!referenceActive&&!showStagePrompt&&!showTablePrompt&&!toast&&!seatProgress&&!world?.dishMenu&&!!world?.showMirrorHint;
 const trainHintBlocked=!canShowSeatHint||guideActive||referenceActive||showStagePrompt||showTablePrompt||showMirrorHint||!!toast||!!seatProgress
  ||!!competingPanel||!!world?.spaceTransitioning||!!probeProgress;
 useEffect(()=>{if(!atWishTarotTable||!connected||world?.photoMode)setWishTarotOpen(false);},[atWishTarotTable,connected,world?.photoMode]);
 useEffect(()=>{if(zone!=='lobby')setWardrobe(false);setProgramOpen(false);setQueenGameOpen(false);setMusicExpanded(false);setMusicListOpen(false);},[zone]);
 const musicPanelExposed=!!(zone==='auditorium'&&audio&&program&&currentTrack&&musicExpanded&&
  !interfaceHidden&&!settings&&!seats&&!wardrobe&&!programOpen&&!queenGameOpen&&!tarotVisible&&!referenceActive&&!showMealGuide);
 const playlistExposed=musicPanelExposed&&musicListOpen;
 const seatMapExposed=!!world?.ready&&seats&&!interfaceHidden;
 useEffect(()=>{if(musicPanelExposed&&!document.hidden)research?.count('feature_exposure','music_panel');},[musicPanelExposed,research]);
 useEffect(()=>{if(playlistExposed&&!document.hidden)research?.count('feature_exposure','playlist');},[playlistExposed,research]);
 useEffect(()=>{if(seatMapExposed&&!document.hidden)research?.count('feature_exposure','seat_map');},[seatMapExposed,research]);
 useEffect(()=>{if(tarotVisible&&!document.hidden)research?.count('feature_exposure','tarot');},[tarotVisible,research]);
 useEffect(()=>{if(queenGameOpen&&!document.hidden)research?.count('feature_exposure','queen_cards');},[queenGameOpen,research]);
 const closeQueenGame=()=>{
  const attempt=queenAttempt.current;
  if(attempt)queueMicrotask(()=>{
   if(!attempt.hadResult)research?.count('feature_cancel','queen_cards');
   if(queenAttempt.current===attempt)queenAttempt.current=null;
  });
  setQueenGameOpen(false);
 };
 const closeSeats=useCallback(()=>setSeats(false),[]);
 const skipPiece=(direction:1|-1)=>{
  world?.yieldFrameForControls();
  audio?.skipTrack(direction);
  redraw(n=>n+1);
 };
 const chooseMappedSeat=useCallback(async(id:string)=>{
  if(!world)return false;
  world.yieldFrameForControls();
  if(world.zone==='lobby'){world.chooseSeatFromLobby(id);return true;}
  if(world.pose==='sit'&&world.self?.seatId===id)return true;
  const accepted=await world.chooseSeat(id,true,true);
  if(accepted&&guideActive)setTutorialSeat(id);
  return accepted;
 },[world,guideActive]);
 useEffect(()=>{if(!world)return;world.seatMapOpen=seats;return()=>{world.seatMapOpen=false;};},[world,seats]);
 useEffect(()=>{if(!world)return;world.uiObscured=(seats||settings||wardrobe||programOpen||queenGameOpen||wishTarotOpen||discoveredTable!==null||referenceActive||showMealGuide)&&!probeProgress;if(world.uiObscured)world.input.keys.clear();return()=>{world.uiObscured=false;};},[world,seats,settings,wardrobe,programOpen,queenGameOpen,wishTarotOpen,discoveredTable,referenceActive,showMealGuide,probeProgress]);
 useEffect(()=>{
  if(wishTarotWasOpen.current&&!wishTarotOpen)(wishTarotButton.current??world?.renderer.domElement)?.focus();
  wishTarotWasOpen.current=wishTarotOpen;
 },[wishTarotOpen,world]);
 // Start automatically once WebGL is ready; route only the initial visit to the hall.
 useEffect(()=>{if(!app||!app.world.ready||entering.current)return;entering.current=true;app.world.start();setEntered(true);app.net.connect();},[app,world?.ready]);
 useEffect(()=>{if(!world||!connected||!world.self)return;if(world.zone==='auditorium'){initialHallRequested.current=true;setInitialHallReady(true);return;}if(!initialHallRequested.current){initialHallRequested.current=true;reportInitialHallLoading(70,'공연장으로 들어가고 있어요');void world.changeZone();}},[world,connected,zone]);
 // ConcertAudio handles gesture unlock and retries after browser autoplay blocks.
 const restartFirstVisit=()=>{
  for(const key of [VISIT_GUIDE_KEY,GUEST_INTRO_KEY,MEAL_GUIDE_KEY,SPACE_REVEAL_KEY])savePreference(key,false);
  net?.send({type:'release'});
  net?.forgetResume();
  location.reload();
 };
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

 const concertChoices=CONCERT_OPTIONS.map(option=>{
  if(!PLAYLISTS[option.playlistId])return <button key={option.playlistId} type="button" disabled>{option.label}<span>준비 중</span></button>;
  const current=option.playlistId===(audio?.playlistId??INITIAL_PLAYLIST);
  const href=concertHref(option);
  return <a key={option.playlistId} href={href} aria-current={current?'page':undefined} onClick={event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   extra?.feature('hall_program_click');
   if(option.hallId!==HALL_ID){
    try{
     sessionStorage.setItem(HALL_AUDIO_KEY,option.playlistId+(audio?.soundRequested===false?':mute':':play'));
     if(referenceShowsHall)sessionStorage.setItem(REFERENCE_RESUME_KEY,arrivalReference.current?'arrival':'manual');
    }catch{/* The sound control remains available. */}
    return;
   }
   event.preventDefault();
   audio?.selectPlaylist(option.playlistId);
   if(location.href!==href)history.replaceState(history.state,'',href);
   setHallPickerOpen(false);
   if(!referenceShowsHall)hallPickerButton.current?.focus();
   redraw(n=>n+1);
  }}>{option.label}{current&&<span>현재</span>}</a>;
 });
 return <>
  {world?.photoMode&&<PhotoMode world={world}/>}
  {canShowSeatHint&&!guideActive&&!seatProgress&&
   <button type="button" className="usher-help" aria-label="공연장 이용 안내" title="공연장 이용 안내"
    aria-haspopup="dialog" data-raised={showStagePrompt?true:undefined} onClick={()=>{setMenu(true);setReferenceGuide(0);}}>
    <span><Icon name="help" size={25}/></span>
   </button>}
  <div className="vignette"/>
  {(world?.hallLoading&&initialHallReady)&&<div className="hall-loading" role="status" aria-live="polite" aria-busy="true"><div className="hall-loading-card"><span className="hall-loading-spinner" aria-hidden="true"/><h2>공연장으로 들어가고 있어요</h2><p>무대와 좌석을 준비하고 있어요. 잠시만 기다려 주세요.</p></div></div>}

  {entered&&<header className="topbar">
   {entered&&<div className="location"><span className="location-en">{zone==='lobby'?'LOBBY':JAZZ_HALL?'pleee jazz':'pleee hall'}</span><span>{zone==='lobby'?'로비':'공연장'}<i>·</i>{net?.state?.roomId?.replace('hall-','본관 ').replace('jazz-','재즈홀 ')??'입장 중'}</span></div>}
   {queenGameOpen&&world&&<QueenCardGame onResult={won=>{
    if(queenAttempt.current)queenAttempt.current.hadResult=true;
    world.queenCardResult(won);
    if(won){extra?.feature('queen_cards','completed');research?.count('action_result','queen_cards_completed');}
   }} onClose={closeQueenGame}/>}
   {wishTarotOpen&&atWishTarotTable&&connected&&<WishTarot onClose={()=>{
    research?.count('feature_cancel','tarot');closeWishTarot();
   }} onFlower={(card,image)=>{
    world?.receiveWishFlower(card,image);
    extra?.feature('tarot','completed');research?.count('action_result','tarot_completed');
    closeWishTarot();
   }}/>}
   {programOpen&&audio&&program&&<ProgramBook playlist={program} playlistId={audio.playlistId} onClose={()=>{setProgramOpen(false);world?.renderer.domElement.focus();}}/>}
   {zone==='auditorium'&&audio&&program&&currentTrack&&<aside className="now-playing" ref={musicPlayer} aria-label="음악 재생" onKeyDown={event=>{
    if(event.key!=='Escape'||!musicExpanded)return;
    event.stopPropagation();
    setMusicExpanded(false);
    musicToggle.current?.focus();
   }}>
    <button type="button" className="music-summary" ref={musicToggle} aria-expanded={musicExpanded} aria-controls="music-panel" onClick={()=>{
     setHallPickerOpen(false);
     if(!musicExpanded)extra?.feature('hall_music_panel_open');
     setMusicExpanded(open=>!open);
    }}>
     <span className="music-thumbnail" aria-hidden="true"><PlaylistCover playlistId={audio.playlistId} name={program.name}/></span>
     <span className="music-summary-copy">
      <strong>{currentTrack.title}</strong>
      <span>{currentTrack.credit?.artist??currentTrack.composer}</span>
     </span>
     <Icon name="chevronDown" size={14}/>
    </button>
    <div className="music-panel" id="music-panel" hidden={!musicExpanded}>
     <PlaylistCover playlistId={audio.playlistId} name={program.name}/>
     <div className="music-track" aria-live="polite">
      <h2>{currentTrack.title}</h2>
      <p>{currentTrack.credit?.artist??currentTrack.composer}</p>
     </div>
     <div className="music-controls">
      <button type="button" className="music-control music-previous" aria-label="이전 곡" title="이전 곡" onClick={()=>skipPiece(-1)}>
       <Icon name="skip" size={21}/>
      </button>
      <button type="button" className="music-control music-next" aria-label="다음 곡" title="다음 곡" onClick={()=>{extra?.feature('hall_next_track_click');skipPiece(1);}}>
       <Icon name="skip" size={21}/>
      </button>
      <button type="button" className="music-control music-list-toggle" aria-label="플레이리스트" title="플레이리스트" aria-expanded={musicListOpen} aria-controls="music-list" onClick={()=>{if(!musicListOpen)extra?.feature('hall_playlist_open');setMusicListOpen(open=>!open);}}>
       <Icon name="playlist" size={19}/>
      </button>
     </div>
     <ol className="music-list" id="music-list" aria-label={program.name??'플레이리스트'} hidden={!musicListOpen}>
      {musicListOpen&&program.tracks.filter(track=>!track.stage).map(track=><li key={track.id} aria-current={track.id===currentTrack.id?'true':undefined}>
       <strong>{track.title}</strong><span>{track.credit?.artist??track.composer}</span>
      </li>)}
     </ol>
    </div>
   </aside>}
   <nav className="tools" aria-label="음악당 설정">
    <div className="hall-picker" data-concert-picker ref={hallPicker} onKeyDown={event=>{
     if(event.key!=='Escape'||!hallPickerOpen)return;
     event.stopPropagation();
     setHallPickerOpen(false);
     hallPickerButton.current?.focus();
    }}>
     <button type="button" ref={hallPickerButton} className="tools-brand" aria-label="플리 공연 선택" aria-expanded={hallChoicesVisible} aria-controls="hall-choices" onClick={()=>{
      if(!hallPickerOpen){audio?.wakeFromGesture();setMusicExpanded(false);world?.input.keys.clear();}
      setHallPickerOpen(!hallPickerOpen);
     }}>플리 <span className="hall-picker-caret" aria-hidden="true"/></button>
     <div id="hall-choices" className="hall-choices" data-usher-highlight role="group" aria-label="공연 선택" hidden={!hallChoicesVisible}>
      {concertChoices}
     </div>
    </div>
    {entered&&<span className="visitor-count" title={connected?'함께 있는 관객':'연결을 기다리고 있어요'}><span className={`connection ${connected?'online':''}`}/><Icon name="people" size={18}/>{net?.local?'혼자 감상':net?.state?.visitors.length??'—'}</span>}
    <button className="icon-button" aria-label={audio?.enabled?'소리 끄기':'소리 켜기'} title={audio?.enabled?'소리 끄기':'소리 켜기'} onClick={()=>{if(audio){audio.toggle();savePreference(SOUND_CHOICE_KEY,!audio.soundRequested);}redraw(n=>n+1);}}><Icon name={audio?.enabled?'sound':'mute'}/></button>
    {entered&&<button className={`icon-button menu-button ${menu?'active':''}`} aria-label="메뉴" aria-expanded={menu} aria-haspopup="menu" onClick={()=>setMenu(v=>!v)}><Icon name={menu?'close':'menu'}/></button>}
   </nav>
  </header>}
   {world&&<EncoreTrainHint world={world} blocked={trainHintBlocked}/>}
   {world&&discoveredTable!==null&&!guideActive&&<GhostTableDiscovery table={discoveredTable} claims={net?.state?.seats??EMPTY_CLAIMS}
    selfId={net?.selfId??''} connected={connected} onClose={closeGhostTable} onChoose={()=>world.chooseGhostTableSeat(discoveredTable)} onOpenSeatMap={()=>{extra?.feature('hall_seat_map_open');closeGhostTable();setSeats(true);}}/>}
   {world?.ready&&<SeatMap open={seats} claims={net?.state?.seats??EMPTY_CLAIMS} selfId={net?.selfId??''} connected={connected} onClose={closeSeats} onChoose={chooseMappedSeat} onSeatClick={detail?onMapSeatClick:undefined}/>}
  {entered&&<>
   {!connected&&<div className="connection-banner" role="status">{net?.status==='connecting'?'음악당의 문을 여는 중이에요…':'연결이 잠시 끊겼어요. 다시 연결하고 있습니다.'}</div>}
   {connected&&zone==='lobby'&&lookPicker&&<div className="look-picker" role="dialog" aria-label="내 캐릭터 고르기"><span>YOUR CHARACTER</span><h2>내 캐릭터를 골라주세요</h2><div className="look-choice">{(["man","woman"] as const).map(v=><button key={v} className={world?.visitorLook===v?"active":""} onClick={()=>{try{localStorage.setItem('garnier-look',v);}catch{}if(world?.visitorLook!==v)world?.setLook(v);setLookPicker(false);}}>{v==="man"?"남자":"여자"}</button>)}</div></div>}

   {menu&&<><nav className="icon-menu" role="menu" aria-label="음악당 메뉴" title="음악당 메뉴" onKeyDown={e=>{if(e.key==='Escape'&&!e.currentTarget.querySelector('.view-mode-options:popover-open'))setMenu(false);}}>
    {zone==='auditorium'?<>
     <button role="menuitem" className={`icon-menu-item ${world?.ridingTrain?'active':''}`} data-usher-label="열차" aria-label={world?.ridingTrain?'승강장에 내리기':'열차에 타기'} title={world?.ridingTrain?'승강장에 내리기':'열차에 타기'} disabled={!connected} onClick={()=>world?.toggleTrain()}><Icon name="train" size={20}/></button>
     <button role="menuitem" className="icon-menu-item" data-usher-label="층 이동" aria-label={(world?.position.y??0)>8?'1층으로 내려가기':'2층으로 올라가기'} title={(world?.position.y??0)>8?'1층으로 내려가기':'2층으로 올라가기'} onClick={()=>{world?.goToGallery();}}><Icon name={(world?.position.y??0)>8?'floor1':'floor2'} size={20}/></button>
     <button role="menuitem" className="icon-menu-item" data-usher-label="무대 앞" aria-label="무대 앞으로 바로 이동" title="무대 앞으로 바로 이동" onClick={()=>{extra?.feature('hall_stage_click');world?.goToHallPoint('front');}}><Icon name="front" size={20}/></button>
     <button role="menuitem" className="icon-menu-item" data-usher-label="객석 뒤" aria-label="공연장 뒤로 바로 이동" title="공연장 뒤로 바로 이동" onClick={()=>{extra?.feature('hall_rear_click');world?.goToHallPoint('rear');}}><Icon name="back" size={20}/></button>
     <button role="menuitem" className="icon-menu-item" data-visit-guide="space" data-usher-label="우주 공간" aria-label={world?.openHall?'공연장으로 돌아가기':'우주 공간으로 전환'} title={world?.openHall?'공연장으로 돌아가기':'우주 공간으로 전환'} onClick={toggleSpace}><Icon name={world?.openHall?'hall':'planet'} size={20}/></button>
     <span className="icon-menu-divider"/>
     {world&&<ViewModeMenu world={world} extra={extra} onBroadcast={()=>setMenu(false)}/>}
     <button ref={interfaceToggle} type="button" role="menuitem" className="icon-menu-item"
      data-audio-ignore data-usher-label="UI 숨기기" aria-label="화면 UI 숨기기" title="화면 UI 숨기기 · 화면 누르기 또는 Esc로 복귀"
      onClick={()=>setInterfaceHidden(true)}><Icon name="hideInterface" size={20}/></button>
     <span className="icon-menu-divider"/>
     {LOBBY_ENABLED&&<button role="menuitem" className="icon-menu-item" data-usher-label="로비" aria-label="로비로 나가기" title="로비로 나가기" onClick={()=>{world?.changeZone();}}><Icon name="exit" size={20}/></button>}
    </>:<>
     <button role="menuitem" className="icon-menu-item" aria-label="로비 가운데로 바로 이동" title="로비 가운데로 바로 이동" onClick={()=>world?.goToHallPoint('lobby')}><Icon name="center" size={20}/></button>
     <span className="icon-menu-divider"/>
     <button role="menuitem" className="icon-menu-item" aria-label="공연장 들어가기" title="공연장 들어가기" onClick={()=>{world?.changeZone();}}><Icon name="enter" size={20}/></button>
    </>}
    <button role="menuitem" className="icon-menu-item" data-usher-label="사진 모드" aria-label="사진 모드" title="사진 모드" onClick={()=>{setHallPickerOpen(false);setReactions(false);world?.startPhotoMode();}}><Icon name="camera" size={20}/></button>
    <button role="menuitem" className="icon-menu-item" data-usher-label="설정" data-audio-ignore={localDevelopment||undefined} aria-label="설정" title="설정" onClick={()=>{setSettings(true);}}><Icon name="settings" size={20}/></button>
   </nav></>}

   {world?.cafeMenu&&<div className="cafe-menu" role="dialog" aria-label="카페"><button className="cafe-close" aria-label="닫기" onClick={()=>world.closeCafeMenu()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div className="cafe-choices">{!world.coffee&&<button aria-label="커피 받기" onClick={()=>world.visitCafe('coffee')} disabled={!connected}><img src={coffeeIcon} alt="" aria-hidden="true"/></button>}{!world.macaron&&<button aria-label="마카롱 받기" onClick={()=>world.visitCafe('macaron')} disabled={!connected}><img src={macaronIcon} alt="" aria-hidden="true"/></button>}</div></div>}
   {showTablePrompt&&atWishTarotTable&&
    <div className="cafe-menu wish-tarot-prompt">
     <TablePromptClose label="별빛 타로" onClose={dismissTablePrompt}/>
     <div className="cafe-choices"><button ref={wishTarotButton} aria-label="별빛 타로" aria-haspopup="dialog" onClick={()=>{world?.openWishTarot();dismissTablePrompt();}}>
      <Icon name="tarot" size={30}/><b>별빛 타로</b>
     </button></div>
    </div>}
   {showTablePrompt&&world&&teaPromptAvailable&&
    <div className="cafe-menu queen-game-prompt tea-prompt">
     <TablePromptClose label="모자장수의 차" onClose={dismissTablePrompt}/>
     <div className="cafe-choices"><button type="button" aria-label={teaActionLabel} title={teaActionLabel} disabled={!connected||teaPouring}
      onClick={()=>world.orderDish('tea')}>
      <b aria-hidden="true">🍵</b>
     </button></div>
    </div>}
   {showTablePrompt&&world&&queenPromptAvailable&&
    <div className="cafe-menu queen-game-prompt">
     <TablePromptClose label="카드 게임" onClose={dismissTablePrompt}/>
     <div className="cafe-choices"><button aria-label="하트 여왕 카드 게임" onClick={()=>{world.openQueenCardGame();dismissTablePrompt();}}>
      <Icon name="cards" size={30}/><b>카드 게임</b>
     </button></div>
    </div>}
   {world?.dishMenu&&mealAvailable&&<div className="cafe-menu dish-menu" role="dialog" aria-label={choosingDrink?'음료 고르기':'요리 고르기'}>
    <button className="cafe-close" aria-label="요리 메뉴 닫기" onClick={()=>world.closeDishMenu()}><Icon name="close" size={14}/></button>
    {choosingMeal&&<h2 className="guided-dish-title">{choosingDrink?'함께 마실 음료':'먹을 요리'}</h2>}
    <div className="cafe-choices dish-choices">{MEAL_CHOICES.filter(dish=>!choosingMeal||isDrink(dish.id)===choosingDrink).map(dish=>
     <button key={dish.id} aria-label={dish.label} disabled={!connected||!!(isDrink(dish.id)?world.drink:world.dish)}
      onClick={()=>world.orderDish(dish.id,choosingMeal&&!choosingDrink&&!world.drink)}>
      <b aria-hidden="true">{dish.glyph}</b><span>{dish.label}</span>
     </button>)}</div>
   </div>}
   {showSpaceOutro&&<div className="visit-guide-outro">
    <div className="visit-guide-outro-content">
     <p role="status"><span>안내를 마쳤어요.</span><span>이제 자유롭게 공연을 즐겨 보세요.</span></p>
    </div>
   </div>}
   {world&&<DanceControls world={world} exitIcon={<Icon name="exit" size={22}/>}/>}
   {toast&&(world?.self?.dance)&&<div className="toast" role="status">{toast}</div>}<div className="bottom-center" style={world?.self?.dance?{display:'none'}:undefined}>{reactions&&<div className="reaction-panel" role="group" aria-label="리액션">{GESTURES.filter(g=>(g.id!=='drink'||world?.coffee)&&(g.id!=='eat'||world?.macaron)).map((g,n)=><button key={g.id} onClick={()=>{world?.gestureAction(g.id);setReactions(false);}} disabled={!connected}><b>{g.id==='drink'||g.id==='eat'?<img className="food-icon" src={g.id==='drink'?coffeeIcon:macaronIcon} alt="" aria-hidden="true"/>:GLYPH[g.id]}</b><span>{g.label}</span><kbd>{n+1}</kbd></button>)}</div>}{toast&&!seatProgress&&<div className="toast" role="status">{toast}</div>}
   {seatProgress&&!seats&&<div className="toast" role="status">{seatProgress}</div>}
   {referenceGuide!==null&&canShowSeatHint&&<ReferenceGuide index={referenceGuide} onStepChange={setReferenceGuide} onExit={quitReferenceGuide} onFinish={finishReferenceGuide}
    programChoices={referenceShowsHall&&<>
     <div className="hall-choices" data-concert-picker role="group" aria-label="공연 선택">{concertChoices}</div>
     {audio&&program&&<label className="reference-guide-song">이 공연에서 들을 곡
      <select value={currentTrack?.id??''} onChange={event=>{
       world?.yieldFrameForControls();
       audio.selectTrack(event.target.value);
       redraw(n=>n+1);
      }}>
       {program.tracks.filter(track=>!track.stage).map(track=><option key={track.id} value={track.id}>{track.title}</option>)}
      </select>
     </label>}
    </>}
    onAction={()=>audio?.wakeFromGesture()}/>}
   {showUsherGuide&&currentGuideStep&&<UsherGuide step={currentGuideStep} observing={observingGuide} onExit={finishUsherGuide}/>}
   {showMealGuide&&<FirstMealGuide onChoose={()=>{
    setMealHintSeat(null);
    world?.openDishMenu();
   }} onDismiss={()=>{
    setMealHintSeat(null);
    requestAnimationFrame(()=>world?.renderer.domElement.focus());
   }}/>}
   {showStagePrompt&&!showMealGuide&&<aside className="seat-hint mirror-hint" aria-label="착석 안내">
    <p role="status">{seatLabel(confirmedSeat)}에 앉았어요.</p>
    <button type="button" className="mirror-hint-close" aria-label="착석 안내 닫기" onClick={()=>setDismissedStageSeat(confirmedSeat.id)}><Icon name="close" size={16}/></button>
   </aside>}
   {showMirrorHint&&world&&
    <aside className="mirror-hint" aria-label="음악당 뒤편">
     <p>오른쪽 계단 옆에 오래된 거울이 있어요.</p>
     <button type="button" className="mirror-hint-close" aria-label="거울 안내 닫기" onClick={()=>world.dismissMirrorHint()}><Icon name="close" size={16}/></button>
    </aside>}
   {!showSpaceOutro&&(world?.atDinnerTable&&(world.dish||world.drink)||world&&world.queenWand.charges>0)&&
    <div className="discard-actions">
     {world?.atDinnerTable&&(world.dish||world.drink)&&<button className="dish-trash" aria-label="음식 모두 버리기" title="음식 모두 버리기" onClick={()=>world.clearDishes()} disabled={!connected}><Icon name="trash" size={18}/></button>}
     {world&&world.queenWand.charges>0&&<button className="dish-trash" aria-label="하트 지팡이 버리기" title="하트 지팡이 버리기" onClick={()=>world.discardQueenWand()} disabled={world.queenWand.casting}><Icon name="trash" size={18}/></button>}

    </div>}
   {world?.catView&&<button className="broadcast-exit" type="button" autoFocus onClick={()=>world.stopCatView()}><Icon name="close" size={16}/>고양이 보기 종료</button>}
   {world?.broadcastView&&<button className="broadcast-exit" type="button" autoFocus onClick={()=>world.stopBroadcastView()}><Icon name="close" size={16}/>돌아가기</button>}
   {world?.concertView&&zone==='auditorium'&&!world.entranceViewLocked&&
    !world.broadcastView&&!world.catView&&!world.photoMode&&
    !world.ridingTrain&&!world.self?.dance&&!conducting&&
    <button className="concert-view-exit" type="button" onClick={()=>{
     world.toggleConcertView();
     world.renderer.domElement.focus();
    }}><Icon name="exit" size={18}/>돌아가기</button>}
   <div className="actionbar" aria-label="음악당에서 할 일"><button data-visit-guide="greet" data-usher-label="인사" onClick={()=>{
    if(usherGuide==='greet'&&observedGesture)return;
    if(world?.gestureAction('wave')&&usherGuide==='greet')setObservedGesture('wave');
   }} disabled={!connected}><Icon name="wave"/><span>인사</span></button><span className="divider"/>
    {world?.ridingTrain
     ? <button type="button" className="primary-action train-leave" disabled={!connected} onClick={()=>world.stand()}>
      <Icon name="exit" size={18}/>열차에서 내리기
     </button>
     : <button className="primary-action" data-visit-guide="seat" data-usher-label={sitting?'일어나기':'좌석'} onClick={()=>{if(sitting)world?.stand();else if(zone==='lobby')world?.changeZone();else{extra?.feature('hall_seat_map_open');world?.input.keys.clear();setSeats(true);}}} disabled={!connected}><Icon name={zone==='auditorium'?'ticket':sitting?'seat':'enter'}/><span>{sitting?'일어나기':zone==='lobby'?'공연장 입장':'자리 앉기'}</span></button>}
    {world?.wishFlowerCard&&<WishButton world={world}/>}{zone==='lobby'&&<button onClick={()=>world?.goToHallPoint('lobby')} disabled={!connected} aria-label="로비 가운데로 바로 이동"><Icon name="center"/><span>가운데</span></button>}{zone==='lobby'&&world?.macaron&&<button className="eat-ready" onClick={()=>world.gestureAction('eat')} disabled={!connected} aria-label="마카롱 먹기"><img className="food-icon" src={macaronIcon} alt="" aria-hidden="true"/><span>마카롱 먹기</span></button>}{zone==='lobby'&&world?.coffee&&<button className="eat-ready" onClick={()=>world.gestureAction('drink')} disabled={!connected} aria-label="커피 마시기"><img className="food-icon" src={coffeeIcon} alt="" aria-hidden="true"/><span>커피 마시기</span></button>}{world?.atDinnerTable&&world.dish&&<button className="eat-ready" data-visit-guide="eat" onClick={()=>tasteMeal('eat')} disabled={!connected} aria-label={DISHES.find(d=>d.id===world.dish)!.label+' 먹기'}><b className="food-icon dish-icon" aria-hidden="true">{DISHES.find(d=>d.id===world.dish)!.glyph}</b><span>{DISHES.find(d=>d.id===world.dish)!.label} 먹기</span></button>}{world?.atDinnerTable&&dinnerDrink&&(!hasTea||drinkReady)&&
     <button className="eat-ready" data-visit-guide="drink" onClick={()=>tasteMeal('drink')} disabled={!connected} aria-label={dinnerDrinkLabel}>
      <b className="food-icon dish-icon" aria-hidden="true">{dinnerDrink.glyph}</b><span>{dinnerDrinkLabel}</span>
     </button>}{mealAvailable&&<button onClick={()=>world?.openDishMenu()} disabled={!connected} data-visit-guide="meal" data-usher-label="식사" aria-label="요리 고르기"><Icon name="dinner"/><span>식사</span></button>}{zone==='auditorium'&&world?.candle&&<button className={'candle-action'+(world.candle==='on'?' lit':'')} data-usher-label="촛불" aria-pressed={world.candle==='on'} aria-label={world.candle==='on'?'촛불 끄기':'촛불 켜기'} onClick={()=>{world.toggleCandle();redraw(n=>n+1);}}><Icon name="candle"/><span>촛불</span></button>}{CONDUCTING_ENABLED&&zone==='auditorium'&&<button onClick={()=>{setReactions(false);setConducting(true);}} disabled={!connected||world?.entranceViewLocked} data-usher-label="지휘" aria-label="지휘자 체험"><Icon name="conductor"/><span>지휘자 체험</span></button>}{zone==='auditorium'&&world&&<DanceStart world={world} disabled={!connected||world.ridingTrain||(sitting&&!world.self?.seatId)}><Icon name="dance"/><span>춤추기</span></DanceStart>}{world&&world.queenWand.charges>0&&<button className="eat-ready" aria-label={`하트 마법, ${world.queenWand.charges}회 남음`}
    onClick={()=>world.castQueenWand()} disabled={world.queenWand.casting}>
    <b className="wand-hearts" aria-hidden="true">{'♥'.repeat(world.queenWand.charges)}</b><span>하트 마법</span>
   </button>}<span className="divider"/><button className={reactions?'active':''} data-usher-label="리액션" aria-expanded={reactions} onClick={()=>setReactions(v=>!v)} disabled={!connected}><Icon name="react"/><span>리액션</span></button></div></div>
  </>}
  {conducting&&world&&<ConductingExperience world={world} onClose={closeConducting}/>}
  {probeProgress&&<div className="diagnostic-overlay" role="status"><p>{probeProgress}<br/><small>측정이 끝나면 이전 화면 설정으로 돌아갑니다.</small></p></div>}
  {toast&&!entered&&<div className="toast" role="status">{toast}</div>}
  {error&&<section className="fatal" role="alert"><h1>음악당을 열지 못했어요.</h1><p>WebGL을 지원하는 브라우저에서 다시 열어주세요.</p><small>{error}</small><button onClick={()=>location.reload()}>다시 열기</button></section>}
  {wardrobe&&world&&<Wardrobe look={world.visitorLook} selected={world.self?.outfit} onSelect={outfit=>world.setOutfit(outfit)} onClose={()=>setWardrobe(false)}/>}
  <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title"
   onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)} data-audio-ignore={localDevelopment||undefined}>
   <header className="settings-header">
    <h2 id="settings-title" tabIndex={-1}>설정</h2>
    <button type="button" className="icon-button" aria-label="설정 닫기" onClick={()=>setSettings(false)}><Icon name="close"/></button>
   </header>
   <div className="settings-body">
    <section className="settings-group" aria-labelledby="settings-sound">
     <h3 id="settings-sound">소리</h3>
     <label className="setting-row">
      <span>음악 소리</span>
      <span className="setting-range">
       <input aria-label="음악 음량" type="range" min="0" max="100" value={Math.round((audio?.volume??1)*100)}
        onChange={event=>{if(audio)audio.volume=Number(event.target.value)/100;redraw(n=>n+1);}}/>
       <span className="setting-value" aria-hidden="true">{Math.round((audio?.volume??1)*100)}</span>
      </span>
     </label>
     <label className="setting-row">
      <span>공간 소리</span>
      <span className="setting-range">
       <input aria-label="공간 소리" type="range" min="1" max="10" step="1" value={audio?.roomLevel??5}
        onChange={event=>{audio?.setRoomLevel(Number(event.target.value));redraw(n=>n+1);}}/>
       <span className="setting-value" aria-hidden="true">{audio?.roomLevel??5}</span>
      </span>
     </label>
    </section>
    <section className="settings-group" aria-labelledby="settings-display">
     <h3 id="settings-display">화면과 캐릭터</h3>
     <label className="setting-row">
      <span>화면 품질</span>
      <span className="setting-select">
       <select aria-label="화면 품질" value={world?.quality??'balanced'}
        onChange={event=>world?.setQuality(event.target.value)}>
        <option value="balanced">균형 · {world?.mobile?'60':'30'} FPS</option>
        <option value="sharp">선명 · 60 FPS</option>
        <option value="low">저발열 · {world?.mobile?'60':'30'} FPS</option>
       </select>
      </span>
     </label>
     <label className="setting-row">
      <span>내 캐릭터</span>
      <span className="setting-select">
       <select aria-label="내 캐릭터" value={world?.visitorLook??'man'} onChange={event=>{
        const look=event.target.value as 'man'|'woman';
        try{localStorage.setItem('garnier-look',look);}catch{/* Keep the choice for this visit. */}
        world?.setLook(look);
        redraw(n=>n+1);
       }}>
        <option value="man">남자</option>
        <option value="woman">여자</option>
       </select>
      </span>
     </label>
     <div className="setting-row">
      <span>캐릭터 이름</span>
      <button type="button" className="setting-toggle" aria-label="캐릭터 이름 표시"
       aria-pressed={world?.showVisitorNames??true} onClick={()=>world?.setShowVisitorNames(!world.showVisitorNames)}>
       {world?.showVisitorNames!==false?'켜짐':'꺼짐'}
      </button>
     </div>
    </section>
    <div className="settings-disclosures">
     {analytics&&<details name="settings-extra">
      <summary>쿠키 및 데이터 수집</summary>
      <div className="settings-extra">
       <p>음악당은 방문 및 음악 재생 통계를 집계하기 위해 Google Analytics를 사용합니다. 이 과정에서 브라우저에 통계 쿠키가 저장될 수 있습니다.</p>
       <a href="https://policies.google.com/technologies/partner-sites?hl=ko" target="_blank" rel="noreferrer">Google의 데이터 수집 및 처리 방식</a>
       {!analyticsPreference.detailAutomatic&&(analyticsPreference.mode==='auto'||analyticsPreference.mode==='ask')&&
         <AnalyticsChoices {...analyticsPreference} inSettings/>}
       {detailPreference.eligible&&!analyticsPreference.detailAutomatic&&<>
        <DetailedAnalyticsChoices {...detailPreference.seatChoice}/>
        <DetailedAnalyticsChoices {...detailPreference.extraChoice} kind="extra"/>
        <DetailedAnalyticsChoices {...detailPreference.zoneChoice} kind="zones"/>
        <DetailedAnalyticsChoices {...detailPreference.researchChoice} kind="research"/>
        <DetailedAnalyticsChoices {...detailPreference.performanceChoice} kind="performance"/>
       </>}
      </div>
     </details>}
     <details name="settings-extra">
      <summary>음악과 이미지 출처</summary>
      <div className="settings-extra settings-credits">
       <a href={import.meta.env.BASE_URL+'credits/music.html?playlist='+encodeURIComponent(audio?.playlistId??INITIAL_PLAYLIST)}
        target="_blank" rel="noreferrer">음원 출처</a>
       <a href={import.meta.env.BASE_URL+'credits/space.html'} target="_blank" rel="noreferrer">우주 이미지 출처</a>
       <p className="ceiling-photo-credit">
        <a href="https://commons.wikimedia.org/wiki/File:Ópera,_París,_Francia,_2022-10-31,_DD_54-56_HDR.jpg"
         target="_blank" rel="noreferrer">천장 사진</a>
        {' · '}<a href="https://delso.photo/" target="_blank" rel="noreferrer">Diego Delso</a>
        {' · '}<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
       </p>
      </div>
     </details>
     {import.meta.env.DEV&&<details name="settings-extra">
      <summary>개발 도구</summary>
      <div className="settings-extra">
       {localDevelopment&&<button type="button" className="setting-toggle" onClick={restartFirstVisit}>첫 방문 다시 테스트</button>}
       {world&&<p>{world.fps} FPS · {world.renderer.domElement.width} × {world.renderer.domElement.height}</p>}
       <section className="device-diagnostic">
        {iphoneBridge
         ?<><button data-device-probe disabled={iphonePending} onClick={()=>void measureIPhone()}>연결된 아이폰 측정</button>
          <p>USB로 연결된 아이폰에서 플리를 열고 FPS와 CPU·GPU 시간을 측정합니다.</p></>
         :<><button data-device-probe disabled={!entered||zone!=='auditorium'||!!probeProgress} onClick={()=>void diagnose()}>끊김 진단 · 최대 30초</button>
          <p>{world?.mobile?'이 기기의 화면 설정':'iPhone 13 Pro 화면 조건'}으로 FPS와 CPU·GPU 시간을 측정합니다. 음악을 비교할 수 있을 때는 30초, 그 외에는 10초 동안 실행합니다.</p></>}
        {probeMessage&&<p role="status">{probeMessage}</p>}
        {probeReport&&<>
         <button onClick={copyProbeReport}>진단 결과 복사</button>
         <details ref={probeDetails}>
          <summary>진단 결과 보기</summary>
          <textarea ref={probeText} aria-label="기기 진단 결과" readOnly value={probeReport}/>
         </details>
        </>}
       </section>
       {world&&<GalaxySettings world={world}/>}
      </div>
     </details>}
    </div>
   </div>
  </dialog>
  {interfaceHidden&&<button type="button" className="concert-interface-restore" data-audio-ignore
   aria-label="화면 UI 다시 보기" title="화면을 누르거나 Esc를 눌러 UI 다시 보기"
   autoFocus onClick={restoreInterface}/>}
  {!settings&&analyticsPreference.mode==='ask'&&analyticsPreference.choice===null&&
   <AnalyticsChoices {...analyticsPreference}/>}
 </>;
}
createRoot(document.getElementById('root')!).render(<App/>);

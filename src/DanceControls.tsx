import type {ReactNode} from 'react';
import {PARTNER_DANCES,SOLO_DANCES,type DanceStyle} from '../shared/dance';
import type {World} from './World';

function DanceMoveIcon({style}:{style:DanceStyle}){
 const paths:Record<DanceStyle,ReactNode>={
  step:<><path d="M3 13h18l-4 5H7l-4-5Zm9-2V3l5 8h-5ZM2 21q2.5-2 5 0t5 0 5 0 5 0"/></>,
  sweep:<><circle cx="12" cy="5" r="2"/><path d="m3 4 2 6 7 3 7-3 2-6m-9 9v4m0 0-4 4m4-4 4 4"/></>,
  clap:<><circle cx="12" cy="5" r="2"/><path d="M12 9v7m0-6L5 14m7-4 7 1m-7 5-4 5m4-5 4 5M2 12l2 2-2 2m20-7-2 2 2 2"/></>,
  shimmy:<><circle cx="12" cy="6" r="2"/><path d="m7 14 5-3 5 3m-5-3v9M2 10l2-2 2 2m12 0 2 2 2-2M4 8v5m16-6v5"/></>,
  hop:<><path d="M12 3v8M8 7l4-4 4 4m-9 9 3 3m7-3-3 3M5 22h14"/></>,
  spin:<><path d="M20 9a8 8 0 1 0-1.6 9M20 4v5h-5"/><circle cx="12" cy="12" r="1.4"/></>,
  bad:<><circle cx="9" cy="5" r="2"/><path d="m10 8 3 7m-4-6-4 4 7-1m1 3-4 6m4-6 4 6m1-13 2-2m-1 5h3"/></>,
 };
 return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[style]}</svg>;
}

export function DanceStart({world,disabled,children}:{world:World;disabled:boolean;children:ReactNode}){
 return <button type="button" className="dance-start" data-usher-label="춤추기" aria-label="춤추기" title="춤추기" disabled={disabled}
  onClick={()=>world.startDanceHere()}>{children}</button>;
}

export function DanceControls({world,exitIcon}:{world:World;exitIcon:ReactNode}){
 const dance=world.danceSelection;
 if(!dance||world.zone!=='auditorium')return null;
 const ending=dance.endingAt!==undefined;
 return <div className="dance-controls" role="group" aria-label="춤 조작">
  <div className="dance-moves">{(dance.partnerId?PARTNER_DANCES:SOLO_DANCES).map(({id,label})=>
   <button type="button" className="dance-move" key={id} aria-label={label} title={label}
    aria-pressed={!ending&&dance.style===id} disabled={ending} onClick={()=>world.danceAction({type:'danceStart',style:id})}>
    <DanceMoveIcon style={id}/>
   </button>)}</div>
  {!ending&&dance.joinSpot&&!dance.partnerId&&
   <button type="button" className="dance-npc" aria-label="유령과 춤추기" title="유령과 춤추기"
    onClick={()=>world.danceAction({type:'danceJoinNpc'})}>
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
     <path d="M3.5 19v-8a6 6 0 0 1 12 0v8l-3-2-3 2-3-2-3 2Z"/>
     <path d="M8 11v1m3 0v-1m7-6h3m-1.5-1.5v3"/>
    </svg>
   </button>}
  <div className="dance-exit">
   <button type="button" className="dance-stop" aria-label="춤 끝내기" title="춤 끝내기" disabled={ending}
    onClick={()=>world.danceAction({type:'danceStop'})}>{exitIcon}</button>
  </div>
 </div>;
}

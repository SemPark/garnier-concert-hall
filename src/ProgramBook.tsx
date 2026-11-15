import React,{useEffect,useRef,useState} from 'react';
import type {Playback,Playlist} from '../shared/timeline';
import {nextPiece} from '../shared/timeline';
import './programBook.css';

export const PROGRAM_PAGE_SIZE=6;
export function ProgramBook({playlist,playback,onClose}:{playlist:Playlist;playback:Playback;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [page,setPage]=useState(0),[turn,setTurn]=useState(0),[returning,setReturning]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const tracks=playlist.tracks.filter(track=>!track.stage);
 const pages=1+Math.ceil(tracks.length/PROGRAM_PAGE_SIZE);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  dialog.current?.showModal();
  return()=>{clearTimeout(timer.current);previous?.focus();};
 },[]);
 const flip=(direction:number)=>{
  if(returning)return;
  setTurn(t=>t+1);
  if(page+direction>=pages){
   setReturning(true);
   timer.current=setTimeout(()=>{setPage(0);setReturning(false);setTurn(t=>t+1);},650);
  }else setPage(Math.max(0,page+direction));
 };
 const next=nextPiece(playlist,playback.index);
 return <dialog ref={dialog} className="program-book-dialog" aria-labelledby="program-book-title" onCancel={event=>{event.preventDefault();onClose();}}>
  <header><div><small>PLEEE · PROGRAMME</small><h2 id="program-book-title">끝나지 않는 공연</h2></div><button autoFocus onClick={onClose} aria-label="공연 프로그램 닫기">닫기 ×</button></header>
  <div key={turn} className={`program-paper ${returning?'program-return':'program-turn'}`}>
   {page===0?<><span className="program-kicker">{playback.playing?'지금 흐르는 음악':'곡 사이의 여백'}</span>
    <h3>{playback.track.title}</h3><p>{playback.track.composer}</p>
    <div className="program-rule">✦</div><span className="program-kicker">다음 곡</span>
    <h3>{next?.title??'다음 공연을 기다립니다'}</h3><p>{next?.composer}</p>
    <p className="program-footnote">책장을 넘기면 모든 곡을 만날 수 있습니다.</p></>
    :<><span className="program-kicker">전체 프로그램 · {tracks.length}곡</span>
     <ol start={(page-1)*PROGRAM_PAGE_SIZE+1}>{tracks.slice((page-1)*PROGRAM_PAGE_SIZE,page*PROGRAM_PAGE_SIZE).map(track=><li key={track.id} aria-current={track.id===playback.track.id?'true':undefined}><div><strong>{track.title}</strong><span>{track.composer}</span></div>{track.id===playback.track.id&&<small>지금</small>}</li>)}</ol></>}
  </div>
  <div className="program-announcement" role="status">{returning?'마지막 책장이 처음으로 돌아갑니다…':'음악은 계속 흐릅니다.'}</div>
  <footer><button disabled={page===0||returning} onClick={()=>flip(-1)}>← 이전</button><span>{page+1} / {pages}</span><button disabled={returning} onClick={()=>flip(1)}>{page===pages-1?'처음으로 ↻':'다음 →'}</button></footer>
 </dialog>;
}

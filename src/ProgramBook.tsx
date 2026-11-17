import {useEffect,useRef} from 'react';
import type {Playlist} from '../shared/timeline';
import type {PlaylistId} from './audio/playlist';
import {PlaylistCover} from './PlaylistCover';
import './programBook.css';

export function ProgramBook({playlist,playlistId,onClose}:{playlist:Playlist;playlistId:PlaylistId;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const tracks=playlist.tracks.filter(track=>!track.stage);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  dialog.current?.showModal();
  return()=>previous?.focus();
 },[]);
 return <dialog ref={dialog} className="program-book-dialog" aria-labelledby="program-book-title" onCancel={event=>{event.preventDefault();onClose();}}>
  <header>
   <div><small>PLEEE · PROGRAMME</small><h2 id="program-book-title">{playlist.name??'끝나지 않는 공연'}</h2></div>
   <button type="button" autoFocus onClick={onClose} aria-label="공연 프로그램 닫기">닫기 ×</button>
  </header>
  <div className="program-paper">
   <PlaylistCover playlistId={playlistId} name={playlist.name}/>
   <ol>{tracks.map(track=><li key={track.id}>
    <strong>{track.title}</strong>
    <span>{track.credit?.artist??track.composer}</span>
   </li>)}</ol>
  </div>
 </dialog>;
}

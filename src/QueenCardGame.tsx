import React,{useEffect,useRef,useState} from 'react';
import './programBook.css';
import './queenCardGame.css';

const ranks=['A','Q','K'];
function shuffledCards(){
 const cards=[...ranks];
 for(let i=cards.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [cards[i],cards[j]]=[cards[j],cards[i]];
 }
 return cards;
}

export function QueenCardGame({onResult,onClose}:{onResult:(won:boolean)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [cards,setCards]=useState(shuffledCards);
 const [picked,setPicked]=useState<number|null>(null);
 const locked=useRef(false);
 const winTimer=useRef<number|undefined>(undefined);
 useEffect(()=>{
  dialog.current?.showModal();
  return ()=>{window.clearTimeout(winTimer.current);dialog.current?.close();};
 },[]);
 const choose=(index:number)=>{
  if(locked.current)return;
  locked.current=true;
  setPicked(index);
  if(cards[index]==='Q')winTimer.current=window.setTimeout(()=>{
   onClose();
   onResult(true);
  },900);
 };
 const won=picked!==null&&cards[picked]==='Q';
 const revealed=picked!==null;
 const leave=()=>{
  if(won)return;
  if(picked!==null)onResult(false);
  onClose();
 };
 const retry=()=>{
  onResult(false);
  locked.current=false;
  setCards(shuffledCards());
  setPicked(null);
 };
 return <dialog ref={dialog} className="program-book-dialog queen-card-game" aria-labelledby="queen-game-title"
  onCancel={event=>{event.preventDefault();leave();}}>
  <header><h2 id="queen-game-title">하트 여왕을 찾아라</h2><button autoFocus disabled={won} onClick={leave}>닫기</button></header>
  <p role="status">{!revealed?'하트 Q는 어느 카드일까요?':won?'여왕이 마지못해 지팡이를 건넵니다. 마법을 세 번 쓸 수 있어요.':'여왕이 고개를 절레절레 흔듭니다.'}</p>
  <div className="queen-card-row">
   {cards.map((rank,index)=><button key={index} disabled={revealed}
    aria-label={revealed?`하트 ${rank}`:`${index+1}번 카드`}
    className={`${revealed?'face':'back'} ${picked===index?'picked':''}`} onClick={()=>choose(index)}>
     {revealed?<><b>{rank}</b><span aria-hidden="true">♥</span>{won&&picked===index&&
      <i className="queen-win-burst" aria-hidden="true">
       {Array.from({length:8},(_,i)=><i key={i} style={{'--ray':`${i*45}deg`} as React.CSSProperties}>♥</i>)}
      </i>}</>:<span aria-hidden="true">✦</span>}
    </button>)}
  </div>
  {revealed&&!won&&<footer><button onClick={leave}>공연장으로 돌아가기</button>
   <button onClick={retry}>다시 섞기</button></footer>}
 </dialog>;
}

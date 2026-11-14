import {useEffect,useRef,useState} from 'react';
import tarotBack from './assets/tarot/back.svg';
import {dealTarot} from './tarot/deck';
import {TarotCardFrame,type TarotCard} from './tarot/TarotCardFrame';
import './programBook.css';
import './wishTarot.css';

export function WishTarot({onClose,onFlower}:{onClose:()=>void;onFlower:(card:TarotCard,image:HTMLImageElement)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const decodedImage=useRef<HTMLImageElement>(null);
 const [hand]=useState(dealTarot);
 const [selected,setSelected]=useState<number|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const element=dialog.current;
  element?.showModal();
  return ()=>element?.close();
 },[]);
 useEffect(()=>{
  if(selected!==null)closeButton.current?.focus({preventScroll:true});
 },[selected]);
 const result=selected===null?null:hand[selected];
 const receive=()=>{
  if(result&&status==='ready'&&decodedImage.current)onFlower(result.card,decodedImage.current);
  else onClose();
 };
 return <dialog ref={dialog} className="program-book-dialog wish-tarot-dialog" aria-labelledby="wish-tarot-title"
  onCancel={event=>{event.preventDefault();receive();}}
  onKeyDown={event=>event.stopPropagation()}>
  <header><h2 id="wish-tarot-title">소원 타로</h2><button ref={closeButton} autoFocus aria-label="소원 타로 닫기" onClick={receive}>✕</button></header>
  {!result?<>
   <p className="wish-tarot-status">마음에 드는 카드 한 장을 골라 주세요.</p>
   <div className="wish-tarot-backs">
    {hand.map(({card},index)=><button key={card.id} aria-label={`${index+1}번 카드 펼치기`} onClick={()=>setSelected(index)}>
     <img src={tarotBack} alt="" width="256" height="384"/>
    </button>)}
   </div>
   <p className="wish-tarot-note">오늘의 마음을 위한 작은 위로예요.</p>
  </>:<>
   <div className="wish-tarot-art" aria-busy={status==='loading'}>
    <TarotCardFrame card={result.card} src={result.src+(attempt?`?retry=${attempt}`:'')} ready={status==='ready'}
     onLoad={image=>{decodedImage.current=image;setStatus('ready');}} onError={()=>setStatus('error')}/>
    {status!=='ready'&&<div className="wish-tarot-loading" role="status">
     {status==='error'?<><p>그림을 불러오지 못했어요.</p><button onClick={()=>{setStatus('loading');setAttempt(n=>n+1);}}>다시 불러오기</button></>:'그림을 펼치고 있어요…'}
    </div>}
   </div>
   {status==='ready'&&<div className="wish-tarot-result" aria-live="polite">
    <h3>{result.card.number} · {result.card.nameKo} <small>({result.card.nameEn})</small></h3>
    <p>{result.card.interpretation}</p>
   </div>}
   {status==='ready'&&<footer><button onClick={receive}>꽃다발 받기</button><span className="wish-tarot-note">오늘의 마음을 위한 작은 위로</span></footer>}
  </>}
 </dialog>;
}

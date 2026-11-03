import {useEffect,useRef} from 'react';
import {OUTFITS,type Outfit} from '../shared/wardrobe';

export function Wardrobe({look,selected,onSelect,onClose}:{look:'man'|'woman';selected?:Outfit;onSelect:(outfit:Outfit)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{dialog.current?.close();previous?.focus();};},[]);
 return <dialog ref={dialog} className="wardrobe-dialog" aria-labelledby="wardrobe-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <header><div><span>VESTIAIRE · AUREA</span><h2 id="wardrobe-title">오늘의 관람복</h2></div><button className="wardrobe-close" aria-label="의상 선택 닫기" onClick={onClose}>×</button></header>
  <p>음악과 함께할 옷을 골라보세요.<br/>{look==='woman'?'단정한 블라우스와 치마':'셔츠와 재킷'}로 준비했습니다.</p>
  <div className="wardrobe-options">{OUTFITS.map(outfit=><button key={outfit.id} className={`wardrobe-option ${selected===outfit.id?'selected':''}`} aria-pressed={selected===outfit.id} onClick={()=>onSelect(outfit.id)}>
   <svg viewBox="0 0 100 106" aria-hidden="true"><path d={look==='woman'?'M35 18 23 22 12 54 24 59 32 40 34 56 23 93 Q50 101 77 93 L66 56 68 40 76 59 88 54 77 22 65 18Z':'M35 18 23 22 12 70 25 74 32 45 30 87 70 87 68 45 75 74 88 70 77 22 65 18Z'} fill={'#'+outfit.color.toString(16).padStart(6,'0')} stroke="#c7ad78" strokeWidth="1.3"/><path d="m35 18 15 8 15-8-8 18H43Z" fill="#f4eddd"/>{look==='man'?<path d="m43 31 7 4 7-4v9l-7-4-7 4Z" fill="#ac5961"/>:<circle cx="50" cy="39" r="2.5" fill="#d9b86c"/>}<path d="M35 57H65" stroke="#d9b86c" strokeWidth="1"/></svg>
   <strong>{outfit.name}</strong><small>{outfit.description}</small><span className="wardrobe-status">{selected===outfit.id?'입고 있어요':'갈아입기'}</span>
  </button>)}</div>
  <button className="wardrobe-done" onClick={onClose}>이 옷으로 둘러보기</button>
 </dialog>;
}

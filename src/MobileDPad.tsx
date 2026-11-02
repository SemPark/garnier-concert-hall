import {useEffect,useRef,useState} from 'react';
import type {Input} from './controls/Input';

const DIRECTIONS=[{code:'ArrowUp',label:'앞으로 이동',name:'up',angle:0},{code:'ArrowLeft',label:'왼쪽으로 이동',name:'left',angle:-90},{code:'ArrowRight',label:'오른쪽으로 이동',name:'right',angle:90},{code:'ArrowDown',label:'뒤로 이동',name:'down',angle:180}];

/** Hold to walk; independent touch keys also allow diagonal movement with two fingers. */
export function MobileDPad({input,disabled}:{input:Input;disabled:boolean}){
 const held=useRef(new Map<number,string>()),[pressed,setPressed]=useState<string[]>([]);
 useEffect(()=>{
  const clear=()=>{held.current.clear();input.touchKeys.clear();setPressed([]);};
  const visibility=()=>{if(document.hidden)clear();};
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);
  if(disabled)clear();
  return ()=>{window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);held.current.clear();input.touchKeys.clear();};
 },[input,disabled]);
 const release=(id:number)=>{const code=held.current.get(id);held.current.delete(id);if(code&&![...held.current.values()].includes(code))input.touchKeys.delete(code);setPressed([...input.touchKeys]);};
 return <div className="mobile-dpad" role="group" aria-label="이동 컨트롤러" onContextMenu={e=>e.preventDefault()}>
  <span className="dpad-center" aria-hidden="true"/>
  {DIRECTIONS.map(direction=><button key={direction.code} className={`dpad-${direction.name}${pressed.includes(direction.code)?' pressed':''}`} aria-label={direction.label} disabled={disabled}
   onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);held.current.set(e.pointerId,direction.code);input.touchKeys.add(direction.code);setPressed([...input.touchKeys]);}}
   onPointerUp={e=>release(e.pointerId)} onPointerCancel={e=>release(e.pointerId)} onLostPointerCapture={e=>release(e.pointerId)}
   onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();input.touchKeys.add(direction.code);setPressed([...input.touchKeys]);}}}
   onKeyUp={e=>{if(e.code==='Space'||e.code==='Enter'){input.touchKeys.delete(direction.code);setPressed([...input.touchKeys]);}}}
   onBlur={()=>{if(![...held.current.values()].includes(direction.code)){input.touchKeys.delete(direction.code);setPressed([...input.touchKeys]);}}}>
   <svg viewBox="0 0 24 24" aria-hidden="true" style={{transform:`rotate(${direction.angle}deg)`}}><path d="m6 15 6-6 6 6"/></svg>
  </button>)}
 </div>;
}

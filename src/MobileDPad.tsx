import {useEffect,useRef,useState} from 'react';
import type {Input} from './controls/Input';

/** A circular analogue stick: continuous direction and speed, independent of camera touches. */
export function MobileDPad({input,disabled}:{input:Input;disabled:boolean}){
 const pointer=useRef<number|null>(null),control=useRef<HTMLButtonElement>(null),[active,setActive]=useState(false);
 const reset=()=>{pointer.current=null;input.touchMove.x=0;input.touchMove.z=0;control.current?.style.setProperty('--stick-x','0px');control.current?.style.setProperty('--stick-y','0px');setActive(false);};
 useEffect(()=>{
  const visibility=()=>{if(document.hidden)reset();};
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);if(disabled)reset();
  return ()=>{window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);input.touchMove.x=0;input.touchMove.z=0;pointer.current=null;};
 },[input,disabled]);
 const move=(x:number,y:number)=>{
  const el=control.current;if(!el)return;const r=el.getBoundingClientRect(),radius=r.width*.3,dx=x-r.left-r.width/2,dy=y-r.top-r.height/2,length=Math.hypot(dx,dy),clamp=length>radius?radius/length:1;
  const amount=Math.min(1,length/radius),speed=amount<.12?0:(amount-.12)/.88;
  input.touchMove.x=length?dx/length*speed:0;input.touchMove.z=length?dy/length*speed:0;
  el.style.setProperty('--stick-x',`${dx*clamp}px`);el.style.setProperty('--stick-y',`${dy*clamp}px`);
 };
 return <button ref={control} type="button" className={`mobile-joystick${active?' active':''}`} aria-label="이동 조이스틱" disabled={disabled}
  onContextMenu={e=>e.preventDefault()}
  onPointerDown={e=>{if(pointer.current!==null)return;e.preventDefault();e.stopPropagation();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);setActive(true);move(e.clientX,e.clientY);}}
  onPointerMove={e=>{if(pointer.current===e.pointerId){e.preventDefault();move(e.clientX,e.clientY);}}}
  onPointerUp={e=>{if(pointer.current===e.pointerId)reset();}} onPointerCancel={e=>{if(pointer.current===e.pointerId)reset();}} onLostPointerCapture={e=>{if(pointer.current===e.pointerId)reset();}}>
  <span className="joystick-ring" aria-hidden="true"/><span className="joystick-knob" aria-hidden="true"/>
 </button>;
}

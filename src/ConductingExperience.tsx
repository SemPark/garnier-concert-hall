import React,{useEffect,useRef,useState} from 'react';
import {ConductCameraInput} from './scene/ConductCameraInput';
import type {World} from './World';
export function ConductingExperience({world,onClose}:{world:World;onClose:()=>void}){
 const demo=world.conducting,[,refresh]=useState(0),section=useRef<HTMLElement>(null),cameraInput=useRef<ConductCameraInput|null>(null);
 if(!cameraInput.current)cameraInput.current=new ConductCameraInput(demo);
 useEffect(()=>{const root=section.current;if(!root)return;const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();demo.cameraBegin(performance.now());demo.setZoom(demo.zoom+e.deltaY*.0006);demo.cameraEnd(performance.now());};const touch=(e:TouchEvent)=>{if(e.cancelable)e.preventDefault();};root.addEventListener('wheel',wheel,{passive:false});root.addEventListener('touchmove',touch,{passive:false});return()=>{root.removeEventListener('wheel',wheel);root.removeEventListener('touchmove',touch);};},[demo]);
 useEffect(()=>{world.startConducting();const timer=setInterval(()=>refresh(n=>n+1),50);return()=>{clearInterval(timer);world.endConducting();};},[world]);
 const tap=(x:number)=>{demo.beat(x,performance.now());refresh(n=>n+1);};
 return <section ref={section} className="conducting-experience" role="dialog" aria-modal="true" aria-label="지휘자 체험" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')onClose();if(e.key==='Tab'){e.preventDefault();const c=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button,input,[tabindex="0"]')),i=c.indexOf(document.activeElement as HTMLElement);c[(i+(e.shiftKey?-1:1)+c.length)%c.length]?.focus();}}}>
  <header><button onClick={()=>{demo.setZoom(.85);demo.height=0;demo.angle=0;}}>시점 초기화</button><button autoFocus onClick={onClose}>체험 끝내기</button></header>
  <div className="conducting-camera-area" aria-label="마우스 또는 손가락으로 시점 조절" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);cameraInput.current!.down(e.pointerId,e.clientX,e.clientY);}} onPointerMove={e=>cameraInput.current!.move(e.pointerId,e.clientX,e.clientY)} onPointerUp={e=>{cameraInput.current!.up(e.pointerId);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={e=>cameraInput.current!.up(e.pointerId)} onLostPointerCapture={e=>cameraInput.current!.up(e.pointerId)}/>
  <div className="conducting-pad" role="button" tabIndex={0} aria-label="좌우 원하는 위치를 탭해서 지휘하기" onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();tap(0);}}} onPointerDown={e=>{e.preventDefault();e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();tap((e.clientX-r.left)/r.width*2-1);}}>
   <span className="conducting-hand" style={{left:(demo.x+1)*50+'%',top:25+demo.stroke*40+'%'}} aria-hidden="true">╱</span>
   <span className="conducting-side left">왼쪽</span><span className="conducting-side right">오른쪽</span>
   <p>원하는 방향을 톡, 톡 눌러 주세요<br/><small>한 번 누르면 아래로 찍고 자동으로 올라옵니다 · 빠르게 탭하면 연주 동작도 빨라져요</small></p>
  </div>
 </section>;
}

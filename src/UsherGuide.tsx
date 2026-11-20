import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

const STEPS={
 greet:{target:'greet',label:'인사',description:'안내원에게 인사해 보세요.',side:'bottom'},
 seat:{target:'seat',label:'좌석',description:'마음에 드는 자리에 앉아보세요.',side:'bottom'},
 meal:{target:'meal',label:'식사',description:'식탁에서 먹을 요리를 골라 보세요.',side:'bottom'},
 mealDrink:{target:'meal',label:'음료',description:'식사와 함께 마실 음료를 골라 보세요.',side:'bottom'},
 eat:{target:'eat',label:'먹기',description:'고른 요리를 먹어 보세요.',side:'bottom'},
 drink:{target:'drink',label:'마시기',description:'고른 음료를 마셔 보세요.',side:'bottom'},
 space:{target:'space',label:'우주 공간',description:'음악당의 하늘을 열어보세요.',side:'right'},
} as const;

export type UsherGuideStep=keyof typeof STEPS;
type GuideFrame={left:number;top:number;width:number;height:number};
type GuideActions={onSkip:()=>void;onExit:()=>void};

export function UsherGuideActions({onSkip,onExit}:GuideActions){
 return <div className="visit-guide-actions">
  <button type="button" onClick={onSkip}>이 단계 건너뛰기</button>
  <button type="button" onClick={onExit}>자유롭게 둘러보기</button>
 </div>;
}

export function UsherGuide({step,observing,onSkip,onExit}:{step:UsherGuideStep;observing:boolean}&GuideActions){
 const [frame,setFrame]=useState<GuideFrame|null>(null);
 const {target,label,description,side}=STEPS[step];
 useLayoutEffect(()=>{
  if(observing){setFrame(null);return;}
  const button=document.querySelector<HTMLButtonElement>(`[data-visit-guide="${target}"]`);
  if(!button){setFrame(null);return;}
  const update=()=>{
   const {left,top,width,height}=button.getBoundingClientRect();
   setFrame(width&&height?{left,top,width,height}:null);
  };
  update();
  button.setAttribute('aria-describedby','visit-guide-description');
  button.focus({preventScroll:true});
  const resize=new ResizeObserver(update);
  resize.observe(button);
  if(button.parentElement)resize.observe(button.parentElement);
  window.addEventListener('resize',update);
  window.addEventListener('scroll',update,true);
  return ()=>{
   button.removeAttribute('aria-describedby');
   resize.disconnect();
   window.removeEventListener('resize',update);
   window.removeEventListener('scroll',update,true);
  };
 },[target,observing]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&!event.defaultPrevented)onExit();
  };
  window.addEventListener('keydown',escape);
  return ()=>window.removeEventListener('keydown',escape);
 },[onExit]);

 return createPortal(<section className={`usher-walkthrough visit-guide ${side}`} data-guide-step={step} aria-label="첫 방문 안내">
  {!observing&&frame&&<>
   <div className="usher-walkthrough-focus" style={frame} aria-hidden="true"/>
   <span className="visit-guide-label" aria-hidden="true" style={side==='right'?
    {left:frame.left-22,top:frame.top-8}:
    {left:frame.left+frame.width/2,top:frame.top-22}}>{label}</span>
   <div className="visit-guide-arrow" aria-hidden="true" style={side==='right'?
    {left:frame.left-20,top:frame.top+frame.height/2}:
    {left:frame.left+frame.width/2,top:frame.top-20}}/>
  </>}
  {!observing&&<p id="visit-guide-description" role="status" className="visit-guide-description" style={frame?
   side==='right'?{right:innerWidth-frame.left+32,top:frame.top+frame.height/2}:
    {left:`clamp(126px, ${frame.left+frame.width/2}px, calc(100% - 126px))`,bottom:innerHeight-frame.top+47}
   :undefined}>{description}</p>}
  <UsherGuideActions onSkip={onSkip} onExit={onExit}/>
 </section>,document.body);
}

export function FirstMealGuide({onChoose,onDismiss}:{onChoose:()=>void;onDismiss:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [frame,setFrame]=useState<GuideFrame|null>(null);
 useLayoutEffect(()=>{
  const element=dialog.current!;
  const button=document.querySelector<HTMLElement>('.actionbar [data-usher-label="식사"]');
  if(!button)return;
  const update=()=>{
   const {left,top,width,height}=button.getBoundingClientRect();
   setFrame({left,top,width,height});
  };
  update();
  element.showModal();
  const observer=new ResizeObserver(update);
  observer.observe(button);
  if(button.parentElement)observer.observe(button.parentElement);
  window.addEventListener('resize',update);
  return ()=>{
   observer.disconnect();
   window.removeEventListener('resize',update);
   element.close();
  };
 },[]);

 const center=frame?frame.left+frame.width/2:0;
 return <dialog ref={dialog} className="usher-walkthrough seat-meal-guide" aria-labelledby="seat-meal-title"
  onCancel={event=>{event.preventDefault();onDismiss();}}>
  {frame&&<>
   <div className="usher-walkthrough-focus" style={frame} aria-hidden="true"/>
   <div className="seat-meal-caption" style={{left:`clamp(132px, ${center}px, calc(100% - 132px))`,top:frame.top-22}}>
    <h2 id="seat-meal-title">식사</h2>
    <p>포크 아이콘을 눌러 요리를 골라요.</p>
   </div>
   <span className="seat-meal-pointer" style={{left:center,top:frame.top-18}} aria-hidden="true"/>
   <button type="button" className="seat-meal-target" style={frame} aria-label="요리 고르기" onClick={onChoose}/>
  </>}
  <button type="button" className="usher-walkthrough-skip" autoFocus onClick={onDismiss}>건너뛰기</button>
 </dialog>;
}

const REFERENCE_STEPS=[
 {side:'bottom',selector:'.actionbar',title:'하단 조작 바',description:'바닥을 눌러 걷고, 빈 의자나 좌석 버튼을 눌러 자리를 골라요.'},
 {side:'right',selector:'.icon-menu',title:'오른쪽 메뉴',description:'무대 시점을 바꾸고 공연장을 둘러봐요.'},
 {side:'hall',selector:'.hall-picker',title:'공연 고르기',description:'클래식·재즈 공연과 듣고 싶은 곡을 고를 수 있어요.'},
] as const;

export type ReferenceGuideStep=0|1|2;
type ReferenceLayout={
 frame:GuideFrame;
 cutouts:{x:number;y:number;width:number;height:number;rx:number}[];
 labels:{text:string;x:number;y:number}[];
};

export function ReferenceGuide({index,onStepChange,onExit,finishLabel='공연장으로',onEnableSound,onAction,programChoices}:{
 index:ReferenceGuideStep;onStepChange:(step:ReferenceGuideStep)=>void;onExit:()=>void;finishLabel?:string;onEnableSound?:()=>void;onAction?:()=>void;programChoices?:ReactNode;
}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [layout,setLayout]=useState<ReferenceLayout|null>(null);
 const step=REFERENCE_STEPS[index];

 useLayoutEffect(()=>{
  const element=dialog.current!;
  element.showModal();
  return ()=>element.close();
 },[]);
 useLayoutEffect(()=>{
  const group=document.querySelector<HTMLElement>(step.selector);
  if(!group){setLayout(null);return;}
  const trigger=step.side==='hall'?group.querySelector<HTMLElement>('.tools-brand')??group:group;
  const panel=group.querySelector<HTMLElement>('[data-usher-highlight]');
  const update=()=>{
   const bounds=trigger.getBoundingClientRect(),panelBounds=panel?.getBoundingClientRect();
   const left=panelBounds?.width?Math.min(bounds.left,panelBounds.left):bounds.left;
   const right=panelBounds?.width?Math.max(bounds.right,panelBounds.right):bounds.right;
   const bottom=panelBounds?.height?Math.max(bounds.bottom,panelBounds.bottom):bounds.bottom;
   const labels=[...group.querySelectorAll<HTMLElement>('[data-usher-label]')].flatMap(button=>{
    const rect=button.getBoundingClientRect();
    if(!rect.width||rect.top<bounds.top||rect.bottom>bottom||rect.left<left||rect.right>right)return [];
    return [{text:button.dataset.usherLabel!,x:step.side==='bottom'?rect.left+rect.width/2:left-24,
     y:step.side==='bottom'?bounds.top-22:rect.top+rect.height/2}];
   });
   const cutouts=step.side==='hall'?[bounds,panelBounds].flatMap((rect,i)=>rect?.width&&rect.height?
    [{x:rect.left,y:rect.top,width:rect.width,height:rect.height,rx:i===0?rect.height/2:15}]:[]):[];
   setLayout({frame:{left,top:bounds.top,width:right-left,height:bottom-bounds.top},cutouts,labels});
  };
  update();
  const resize=new ResizeObserver(update);
  for(const element of new Set([group,trigger,panel]))if(element)resize.observe(element);
  window.addEventListener('resize',update);
  group.addEventListener('scroll',update,{passive:true});
  return ()=>{
   resize.disconnect();
   window.removeEventListener('resize',update);
   group.removeEventListener('scroll',update);
  };
 },[step]);

 return <dialog ref={dialog} className={`usher-walkthrough reference-guide ${step.side}`}
  aria-labelledby="reference-guide-title" onCancel={event=>{event.preventDefault();onExit();}}>
  {layout?.cutouts.length?<svg className="reference-guide-mask" aria-hidden="true">
   <defs><mask id="reference-hall-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
    <rect width="100%" height="100%" fill="white"/>
    {layout.cutouts.map(rect=><rect key={rect.y} {...rect} fill="black"/>)}
   </mask></defs>
   <rect width="100%" height="100%" fill="#151117" fillOpacity=".71" mask="url(#reference-hall-mask)"/>
   {layout.cutouts.map(rect=><rect key={rect.y} {...rect} fill="none" stroke="var(--guide-line)"/>)}
  </svg>:layout?<div className="usher-walkthrough-focus" style={layout.frame} aria-hidden="true"/>:
   <div className="reference-guide-dim" aria-hidden="true"/>}
  <button type="button" className="usher-walkthrough-skip" onClick={()=>{onAction?.();onExit();}}>건너뛰기</button>
  {index===2&&programChoices&&<section className="reference-guide-programs" aria-label="공연과 곡 선택">{programChoices}</section>}
  <section className="reference-guide-intro" aria-live="polite">
   <div className="reference-guide-heading">
    <span>{index+1} / {REFERENCE_STEPS.length}</span><h2 id="reference-guide-title">{step.title}</h2>
   </div>
   <p>{step.description}</p>
   <div className="reference-guide-actions">
    {index!==0&&<button type="button" className="reference-guide-previous" onClick={()=>{onAction?.();onStepChange(index===2?1:0);}}>
     <span aria-hidden="true">←</span> 이전
    </button>}
    {onEnableSound&&<button type="button" className="reference-guide-sound" aria-label="소리 켜기" onClick={onEnableSound}>소리 켜기</button>}
    <button type="button" className="reference-guide-next" autoFocus onClick={()=>{onAction?.();if(index===2)onExit();else onStepChange(index===0?1:2);}}>
     {index===2?finishLabel:'다음'} <span aria-hidden="true">{index===2?'✓':'→'}</span>
    </button>
   </div>
  </section>
  {!!layout?.labels.length&&<ul className="reference-guide-labels" aria-label={step.title+' 버튼'}>
   {layout.labels.map(({text,x,y})=><li key={text} style={{left:x,top:y}}>{text}</li>)}
  </ul>}
 </dialog>;
}

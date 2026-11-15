import {useRef,type SyntheticEvent} from 'react';
import {TarotFrameOrnament} from './TarotFrameOrnament';

export type TarotCard={id:number;number:string;nameKo:string;nameEn:string;interpretation:string};

/** Numbers, titles and borders are composed here, never painted into the generated art. */
export function TarotCardFrame({card,src,ready,onLoad,onError}:{
 card:TarotCard;src:string;ready:boolean;onLoad:(image:HTMLImageElement)=>void;onError:()=>void;
}){
 const image=useRef<HTMLImageElement>(null);
 const loaded=(event:SyntheticEvent<HTMLImageElement>)=>{
  const element=event.currentTarget;
  void element.decode().then(
   ()=>{if(image.current===element)onLoad(element);},
   ()=>{if(image.current===element)onError();},
  );
 };
 return <div className={`tarot-card-frame${ready?' is-ready':''}`} aria-hidden="true">
  <img ref={image} key={src} src={src} alt="" width="768" height="1152" decoding="async" onLoad={loaded} onError={onError}/>
  <TarotFrameOrnament card={card}/>
 </div>;
}

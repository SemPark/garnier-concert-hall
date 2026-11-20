import {useState} from 'react';
import type {World} from './World';
import './encore-train-hint.css';

type Props = {world:World;blocked:boolean};

export function EncoreTrainHint({world,blocked}:Props){
 const [expanded,setExpanded]=useState(false);
 const action=blocked?null:world.trainDiscoveryAction;
 if(!action)return null;

 return <aside className="encore-train-hint" aria-label="앙코르 열차 안내">
  {expanded
   ? <button type="button" className="encore-train-hint-action is-expanded" onClick={()=>world.activateTrainDiscovery()}>
      {action==='board'?'탑승하기':'승강장으로 이동'}
     </button>
   : <button type="button" className="encore-train-hint-action" onClick={()=>setExpanded(true)}>
      앙코르 열차를 타볼까요?
     </button>}
  <button type="button" className="encore-train-hint-dismiss" aria-label="앙코르 열차 안내 닫기" onClick={()=>world.dismissTrainDiscovery()}>
   <span aria-hidden="true">×</span>
  </button>
 </aside>;
}

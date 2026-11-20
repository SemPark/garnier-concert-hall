import {useState} from 'react';
import type {World} from './World';
import {MAX_GALAXIES} from './scene/SpaceGalaxies';

export function GalaxySettings({world}:{world:World}){
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const {count,size,brightness,resolution}=world.galaxySettings;
 const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 const save=async(device:'desktop'|'mobile')=>{
  setSaving(true);
  setMessage('');
  try{
   const response=await fetch('/__galaxy-presets',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({device,count,size,brightness,resolution}),
   });
   if(!response.ok)throw new Error(String(response.status));
   setMessage(`${device==='desktop'?'데스크톱':'모바일'} 프리셋을 저장했습니다.`);
  }catch{setMessage('프리셋을 저장하지 못했습니다. 다시 시도해 주세요.');}
  finally{setSaving(false);}
 };
 return <fieldset className="galaxy-settings">
  <legend>우주 배경 · 은하</legend>
  <label className="setting-row">은하 개수
   <select value={count} onChange={e=>world.setGalaxySettings({count:Number(e.target.value)})}>
    {Array.from({length:MAX_GALAXIES+1},(_,n)=><option key={n} value={n}>{n}개</option>)}
   </select>
  </label>
  <label className="setting-row">은하 크기
   <input type="range" min=".65" max="1.35" step=".05" value={size}
    onChange={e=>world.setGalaxySettings({size:Number(e.target.value)})}/>
  </label>
  <label className="setting-row">은하 밝기
   <input type="range" min="0" max="1" step=".01" value={brightness}
    onChange={e=>world.setGalaxySettings({brightness:Number(e.target.value)})}/>
  </label>
  <label className="setting-row">은하 해상도
   <select value={resolution} onChange={e=>world.setGalaxySettings({resolution:e.target.value==='mobile'?'mobile':'desktop'})}>
    <option value="mobile">512 × 256</option>
    <option value="desktop">1024 × 512</option>
   </select>
  </label>
  {local&&<div className="galaxy-preset-actions">
   <button type="button" disabled={saving} onClick={()=>void save('desktop')}>데스크톱 프리셋 저장</button>
   <button type="button" disabled={saving} onClick={()=>void save('mobile')}>모바일 프리셋 저장</button>
   {message&&<p role="status">{message}</p>}
  </div>}
 </fieldset>;
}

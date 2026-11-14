import type {World} from './World';
import {MAX_GALAXIES} from './scene/SpaceGalaxies';

export function GalaxySettings({world}:{world:World}){
 const {count,size,brightness,resolution}=world.galaxySettings;
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
 </fieldset>;
}

export function GalaxyCredits(){
 return <div className="settings-info galaxy-credits">
  <p><a href="https://science.nasa.gov/image-detail/hubble_m51/" target="_blank" rel="noreferrer">M51</a> · NASA, ESA, S. Beckwith (STScI), and the Hubble Heritage Team (STScI/AURA)</p>
  <p><a href="https://science.nasa.gov/asset/hubble/the-majestic-sombrero-galaxy-m104/" target="_blank" rel="noreferrer">M104</a> · NASA/ESA and The Hubble Heritage Team (STScI/AURA)</p>
  <p><a href="https://science.nasa.gov/asset/hubble/m87-4/" target="_blank" rel="noreferrer">M87</a> · NASA, ESA, A. Lessing (Stanford University), E. Baltz (Stanford University), M. Shara (AMNH), J. DePasquale (STScI)</p>
  <p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · 배경 투명화 및 크기 조정</p>
 </div>;
}

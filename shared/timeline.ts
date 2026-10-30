export type Track={id:string;title:string;composer:string;url:string;durationSeconds:number;gapAfterSeconds:number;credit?:{sourceName:string;sourceUrl:string;licenseName:string;licenseUrl:string}};
export type Playlist={version:string;epochMs:number;tracks:Track[]};
export type Playback={track:Track;index:number;offset:number;playing:boolean;remaining:number;cycle:number};
export function playbackAt(list:Playlist,now:number):Playback{
 if(!Number.isFinite(now)||!Number.isFinite(list.epochMs)||!list.tracks.length)throw new Error('Invalid playlist or clock');
 const lengths=list.tracks.map(t=>{if(!Number.isFinite(t.durationSeconds)||t.durationSeconds<=0||!Number.isFinite(t.gapAfterSeconds)||t.gapAfterSeconds<0)throw new Error('Invalid track duration');return t.durationSeconds+t.gapAfterSeconds});
 const total=lengths.reduce((a,b)=>a+b,0);const elapsed=(now-list.epochMs)/1000;
 if(elapsed<0)return {track:list.tracks[0],index:0,offset:0,playing:false,remaining:-elapsed,cycle:-1};
 let pos=elapsed%total;
 for(let i=0;i<lengths.length;i++){if(pos<lengths[i]){const track=list.tracks[i];const playing=pos<track.durationSeconds;return {track,index:i,offset:Math.min(pos,track.durationSeconds),playing,remaining:playing?track.durationSeconds-pos:lengths[i]-pos,cycle:Math.floor(elapsed/total)}}pos-=lengths[i];}
 throw new Error('Unreachable timeline');
}

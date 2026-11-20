import {ATRIUM} from '../../shared/grandStair';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import type {Zone} from '../../shared/venue';

export type Floor=1|2;
export type Area='lobby'|'front'|'middle'|'rear';
export type AreaKey=`${Floor}_${Area}`;
export type Hall='classical'|'jazz';

export function analyticsArea(zone:Zone,y:number,z:number):{floor:Floor;area:Area;key:AreaKey}|null{
 if(!Number.isFinite(y)||!Number.isFinite(z))return null;
 const floor:Floor=y>=(zone==='lobby'?ATRIUM.balconyY:GOLDEN_HALL.balconyHeight)-.3?2:1;
 const area:Area=zone==='lobby'?'lobby':z<8?'front':z<24?'middle':'rear';
 return {floor,area,key:`${floor}_${area}`};
}

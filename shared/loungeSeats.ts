import {LOBBY_FURNITURE as F} from './grandStair';

/** Lobby seating stays separate from the concert hall's reserved tickets and capacity. */
export const LOUNGE_SEATS=[
 ...F.sofas.flatMap((sofa,i)=>[-.6,.6].map((offset,j)=>({id:`sofa-${i}-${j}`,x:sofa.x-.1,y:0,z:sofa.z+offset,yaw:Math.PI/2,approach:{x:sofa.x-1.05,y:0,z:sofa.z+offset}}))),
 ...[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle,i)=>({id:`ottoman-${i}`,x:F.ottoman.x+Math.sin(angle),y:0,z:F.ottoman.z+Math.cos(angle),yaw:angle+Math.PI,approach:{x:F.ottoman.x+Math.sin(angle)*1.95,y:0,z:F.ottoman.z+Math.cos(angle)*1.95}})),
];

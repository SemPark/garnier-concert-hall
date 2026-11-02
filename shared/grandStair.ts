/**
 * The Grand Escalier hall behind the foyer, after the Palais Garnier: a tall marble hall with a central flight
 * that splits at a landing into two branches up to a balcony ring. Only the ground floor is walkable for now.
 */
export const ATRIUM={halfWidth:15,front:18,back:44,height:20,balconyY:7.2,balconyDepth:2.4,opening:6.9,openingHeight:12} as const;
export const GRAND_STAIR={flightHalf:4,flightStart:31,flightEnd:37,landingEnd:41.6,branchInner:5.4,branchOuter:8.4,branchEnd:30.4,rise:3.6,steps:18} as const;
/** Ground columns under the balcony edge. */
export const ATRIUM_COLUMNS=[21,26,31,36,41].flatMap(z=>[-1,1].map(side=>({x:side*(15-2.55),z})));
/** Lobby furniture footprints (centre and half sizes), shared by the scene and the walking rules. */
export const LOBBY_FURNITURE={
 boxOffice:{x:-10.8,z:19.1,hx:2.6,hz:.85},cloakroom:{x:10.8,z:19.1,hx:2.6,hz:.85},
 cafeCounter:{x:-14.1,z:31,hx:.55,hz:4.2},
 cafeTables:[24,28,32,36].map(z=>({x:-9.8,z,hx:.45,hz:.45})),
 sofas:[23.5,28.5,33.5,38.5].map(z=>({x:14.15,z,hx:.55,hz:1.3})),
 ottoman:{x:9.6,z:24,hx:1.3,hz:1.3},
 busts:[-6.5,.5,7.5].flatMap(z=>[-1,1].map(side=>({x:side*6.35,z,hx:.35,hz:.35}))),
 programBoard:{x:4.3,z:-16.4,hx:.75,hz:.3},
} as const;
export const COMPOSERS=['MOZART','HAYDN','BEETHOVEN','SCHUBERT','BRAHMS','STRAUSS'] as const;
/** Lobby floor: the foyer, then the wider hall it opens into. */
export function onLobbyFloor(x:number,z:number){return (Math.abs(x)<=6.6&&z<=ATRIUM.front+.6)||(Math.abs(x)<=ATRIUM.halfWidth-.5&&z>=ATRIUM.front&&z<=ATRIUM.back-.5);}

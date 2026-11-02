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
 // Box office and cloakroom sit inside the first ground-tier arcade bay on each side, behind the arch.
 boxOffice:{x:-14.1,z:23.1,hx:.95,hz:2.1},cloakroom:{x:14.1,z:23.1,hx:.95,hz:2.1},
 cafeCounter:{x:-14.2,z:30.85,hx:.5,hz:4.45},
 cafeTables:[24,28,32,36].map(z=>({x:-9.8,z,hx:.45,hz:.45})),
 sofas:[28.1,33.1,38.1].map(z=>({x:14.15,z,hx:.55,hz:1.3})),
 ottoman:{x:9.6,z:24,hx:1.3,hz:1.3},
 // The composer statues stand in the street vestibule beyond the entrance, not in this hall.
 busts:[] as {x:number;z:number;hx:number;hz:number}[],
 torchieres:[-10.2,-3.4,3.4,10.2].map(x=>({x,z:19.2,hx:.45,hz:.45})),
 programBoard:{x:-6.4,z:28.4,hx:.75,hz:.4},
} as const;
export const COMPOSERS=['LULLI','GLUCK'] as const;
/** Lobby floor: the Grand Escalier hall itself. */
export function onLobbyFloor(x:number,z:number){return Math.abs(x)<=ATRIUM.halfWidth-.5&&z>=ATRIUM.front+.5&&z<=ATRIUM.back-.5;}
/** The amphitheatre door at the head of the flight is the way into the hall. */
export const AMPHITHEATRE_DOOR={x:0,z:41.6-.7,halfWidth:1.3} as const;
/** Walking height in the lobby: the floor, the central flight (one even ramp of steps) and its landing.
 *  The flight's sides, the landing's flanks and the flare are not walkable; the curved branches are overhead only. */
export function lobbyHeight(x:number,z:number):number|null{
 const S=GRAND_STAIR,a=Math.abs(x);if(!onLobbyFloor(x,z))return null;
 if(z>=S.flightStart&&z<=S.flightEnd){if(a<=S.flightHalf-.3)return (z-S.flightStart)/(S.flightEnd-S.flightStart)*S.rise;if(a<=S.branchInner+1.5)return null;return 0;}
 if(z>S.flightEnd&&z<=S.landingEnd){if(a<=S.branchInner-.3)return z<=S.landingEnd-.35?S.rise:null;if(a<=S.branchInner+1.5)return null;return 0;}
 if(z>=S.flightStart-1.6&&z<S.flightStart&&a>S.flightHalf-.3&&a<=S.flightHalf+2.6)return null;// the flared lowest steps
 return 0;
}

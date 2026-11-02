/**
 * The Grand Escalier hall behind the foyer, after the Palais Garnier: a tall marble hall with a central flight
 * that splits at a landing into two branches up to a balcony ring. The central flight and two straight branch flights connect the ground floor to the first balcony.
 */
export const ATRIUM={halfWidth:15,front:18,back:44,height:20,balconyY:7.2,balconyDepth:2.4,opening:6.9,openingHeight:12} as const;
export const GRAND_STAIR={flightHalf:4,flightStart:31,flightEnd:37,landingEnd:41.6,branchInner:5.4,branchOuter:8.4,branchEnd:30.4,rise:3.6,steps:18} as const;
/** Shared dimensions for the visible branch stairs, their rails, click surfaces and navigation. */
export const LOBBY_BRANCH={startX:GRAND_STAIR.branchInner,endX:ATRIUM.halfWidth-ATRIUM.balconyDepth,z:(GRAND_STAIR.flightEnd+GRAND_STAIR.landingEnd)/2,width:2.4,steps:18} as const;
export function lobbyBranchHeight(x:number){const b=LOBBY_BRANCH,t=Math.max(0,Math.min(1,(Math.abs(x)-b.startX)/(b.endX-b.startX)));return GRAND_STAIR.rise+(ATRIUM.balconyY-GRAND_STAIR.rise)*t;}
export function onLobbyBalcony(x:number,z:number,padding=.27){const a=Math.abs(x),A=ATRIUM;return onLobbyFloor(x,z)&&(a>=A.halfWidth-A.balconyDepth+padding||z<=A.front+A.balconyDepth-padding||z>=A.back-A.balconyDepth+padding);}
export function lobbyRouteNodes(){const S=GRAND_STAIR,B=LOBBY_BRANCH,A=ATRIUM;return [
 {x:0,y:0,z:S.flightStart-.1},{x:0,y:S.rise,z:S.flightEnd+.1},{x:0,y:S.rise,z:B.z},
 ...[-1,1].flatMap(side=>[{x:side*B.startX,y:S.rise,z:B.z},{x:side*B.endX,y:A.balconyY,z:B.z},{x:side*(B.endX+.6),y:A.balconyY,z:B.z},... [A.front+1.3,A.back-1.3].map(z=>({x:side*(A.halfWidth-1.3),y:A.balconyY,z}))]),
 ];}
export const LOBBY_ARCADE={x:12.7,bays:[23.1,28.1,33.1,38.1],columns:[20.6,25.6,30.6,35.6,40.6]} as const;
export const BOX_OFFICE_APPROACH={x:-12.5,y:0,z:23.1} as const;
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
/** Choose the floor contiguous with the visitor, including the space beneath the branch stairs. */
export function lobbyHeight(x:number,z:number,fromY=0):number|null{
 const S=GRAND_STAIR,B=LOBBY_BRANCH,A=ATRIUM,a=Math.abs(x);if(!onLobbyFloor(x,z))return null;
 const candidates:number[]=[];
 if(onLobbyBalcony(x,z)&&Math.abs(A.balconyY-fromY)<.65)candidates.push(A.balconyY);
 if(a>=B.startX-.015&&a<=B.endX+.65&&Math.abs(z-B.z)<=B.width/2-.25){const y=lobbyBranchHeight(x);if(Math.abs(y-fromY)<.65)candidates.push(y);}
 let ground:number|null=0;
 if(z>=S.flightStart&&z<=S.flightEnd){if(a<=S.flightHalf-.3)ground=(z-S.flightStart)/(S.flightEnd-S.flightStart)*S.rise;else if(a<=S.branchInner+.27)ground=null;}
 else if(z>S.flightEnd&&z<=S.landingEnd){if(a<=S.branchInner+.015)ground=z<=S.landingEnd-.35?S.rise:null;else if(a<=S.branchInner+.27)ground=null;}
 else if(z>=S.flightStart-1.6&&z<S.flightStart&&a>S.flightHalf-.3&&a<=S.flightHalf+2.6)ground=null;
 if(ground!==null)candidates.push(ground);
 candidates.sort((a,b)=>Math.abs(a-fromY)-Math.abs(b-fromY));return candidates[0]??null;
}

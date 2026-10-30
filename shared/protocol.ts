import type {Visitor,Zone,Pose} from './venue';
export type SeatClaim={visitorId:string;status:'reserved'|'seated';expiresAt:number|null};
export type Snapshot={revision:number;visitors:Visitor[];seats:Record<string,SeatClaim>;serverNow:number;roomId:string};
export type ClientMessage=
 |{type:'move';x:number;z:number;yaw:number;pose:Pose}
 |{type:'zone';zone:Zone}
 |{type:'reserve';seatId:string;requestId:string}
 |{type:'seated';seatId:string}
 |{type:'release';requestId?:string}
 |{type:'renew';seatId:string}
 |{type:'gesture';gesture:'wave'|'clap'}
 |{type:'sync'}
 |{type:'clock';sentAt:number};
export type ServerMessage=
 |{type:'welcome';selfId:string;resumeToken:string;state:Snapshot}
 |{type:'state';state:Snapshot}
 |{type:'seatResult';ok:boolean;seatId:string;requestId:string;reason?:string}
 |{type:'clock';sentAt:number;serverNow:number}
 |{type:'error';message:string};

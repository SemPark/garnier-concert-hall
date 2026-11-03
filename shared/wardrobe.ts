import {LOBBY_ARCADE} from './grandStair';
export const OUTFITS=[
 {id:'black',name:'클래식 블랙',color:0x25252c,description:'차분한 정장'},
 {id:'navy',name:'미드나잇 네이비',color:0x293c56,description:'깊은 남색'},
 {id:'wine',name:'벨벳 와인',color:0x69313e,description:'은은한 버건디'},
 {id:'green',name:'포레스트 그린',color:0x344d43,description:'짙은 초록'},
] as const;
export type Outfit=typeof OUTFITS[number]['id'];
export const isOutfit=(value:unknown):value is Outfit=>OUTFITS.some(o=>o.id===value);
export const CLOAKROOM_APPROACH={x:12.5,y:0,z:LOBBY_ARCADE.bays[0]};
export function atCloakroom(v:{zone:string;x:number;y?:number;z:number}){return v.zone==='lobby'&&Math.abs(v.y??0)<.3&&Math.hypot(v.x-CLOAKROOM_APPROACH.x,v.z-CLOAKROOM_APPROACH.z)<1.45;}

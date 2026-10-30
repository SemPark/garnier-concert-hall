import * as T from 'three';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
/** Preserve the seat's initial stage view while allowing the same drag/pinch controls. */
export function galleryCameraFrame(seat:{x:number;y:number;z:number},yaw:number,pitch:number,distance:number){
 const look=new T.Vector3(0,3,-19),offset=new T.Vector3(Math.sign(seat.x)*13.2,seat.y+3,seat.z+2).sub(look);
 offset.multiplyScalar(T.MathUtils.clamp(distance/4.8,.65,1.6));offset.applyAxisAngle(new T.Vector3(1,0,0),-(pitch-.13)*.55);offset.applyAxisAngle(new T.Vector3(0,1,0),yaw);
 const position=look.clone().add(offset);position.x=T.MathUtils.clamp(position.x,-15.35,15.35);position.y=T.MathUtils.clamp(position.y,H.balconyHeight+.6,H.height-1.2);position.z=T.MathUtils.clamp(position.z,H.front+1.2,H.rear-1);
 return {look,position};
}

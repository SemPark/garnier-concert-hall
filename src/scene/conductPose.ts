import * as T from 'three';
/** Avatars face local -Z, not +Z. */
export function faceYaw(dx:number,dz:number){return Math.atan2(-dx,-dz);}
/** Keep the right arm on its own side; the torso turns and shifts to reach screen-left/right. */
export function conductorTurn(direction:number){return T.MathUtils.clamp(direction,-1,1)*.9;}
export function conductorShift(direction:number){return -T.MathUtils.clamp(direction,-1,1)*.18;}
export function rightStroke(direction:number,stroke:number){return new T.Euler(2.15-stroke*.75,0,.38-direction*.04);}

import {MathUtils} from 'three';
import type {HighFivePosition} from '../../shared/highFive';

export type HighFivePose = {
 yaw: number;
 dx: number;
 dz: number;
 hand: {x: number; y: number; z: number};
 turn: number;
 reach: number;
};

export function highFivePose(from: HighFivePosition, to: HighFivePosition, age: number, reduced: boolean): HighFivePose {
 const smooth = MathUtils.smoothstep;
 const turn = smooth(age, 0, .26) * (1 - smooth(age, .88, 1.3));
 const reach = smooth(age, .10, .37) * (1 - smooth(age, .62, 1.08));
 const dx = to.x - from.x, dz = to.z - from.z;
 const distance = Math.hypot(dx, dz);
 const yaw = Math.atan2(dx, dz);
 const advance = from.sitting || reduced ? 0 : Math.max(0, distance / 2 - .36) * reach;
 // The hands rise first, then meet near the middle and recoil.
 const pullBack = .16 * (1 - smooth(age, .28, .49)) + .12 * smooth(age, .54, .76);
 const handDistance = distance / 2 - Math.min(.06 + pullBack, distance / 2);
 const handHeight = ((from.y ?? 0) + (to.y ?? 0)) / 2 + 1.26 + .08 * (1 - smooth(age, .28, .49));
 return {
  yaw, turn, reach,
  dx:Math.sin(yaw) * advance, dz:Math.cos(yaw) * advance,
  hand:{x:from.x + Math.sin(yaw) * handDistance, y:handHeight, z:from.z + Math.cos(yaw) * handDistance},
 };
}

export function turnForHighFive(yaw: number, target: number, weight: number) {
 return yaw + (MathUtils.euclideanModulo(target - yaw + Math.PI, Math.PI * 2) - Math.PI) * weight;
}

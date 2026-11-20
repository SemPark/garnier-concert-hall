import {MathUtils} from 'three';
import {HIGH_FIVE_CONTACT_MS, HIGH_FIVE_MS, type HighFivePosition} from '../../shared/highFive';

type HighFiveHand = 'left' | 'right';

export type HighFivePose = {
 side: HighFiveHand;
 yaw: number;
 dx: number;
 dz: number;
 hand: {x: number; y: number; z: number};
 turn: number;
 reach: number;
};

export function highFivePoses(from: HighFivePosition, to: HighFivePosition, age: number, reduced: boolean, fromSide: HighFiveHand = 'right', toSide: HighFiveHand = 'right'): readonly [HighFivePose, HighFivePose] {
 const dx = to.x - from.x, dz = to.z - from.z;
 const distance = Math.hypot(dx, dz);
 // Even at the same spawn point, the pair steps out in opposite directions.
 const heading = distance > 0 ? Math.atan2(dx, dz) : 0;
 const otherHeading = heading > 0 ? heading - Math.PI : heading + Math.PI;
 return [
  participantPose(from, to, age, reduced, fromSide, heading, distance),
  participantPose(to, from, age, reduced, toSide, otherHeading, distance),
 ];
}

function participantPose(from: HighFivePosition, to: HighFivePosition, age: number, reduced: boolean, side: HighFiveHand, heading: number, distance: number): HighFivePose {
 const smooth = MathUtils.smoothstep;
 const contact = HIGH_FIVE_CONTACT_MS / 1000;
 const turn = smooth(age, 0, .26) * (1 - smooth(age, .88, HIGH_FIVE_MS / 1000));
 const reach = smooth(age, .10, .37) * (1 - smooth(age, .57, 1.08));
 const forwardX = Math.sin(heading), forwardZ = Math.cos(heading);
 const rightHand = side === 'right';
 const yaw = heading + (rightHand ? .68 : -.68);
 const step = from.sitting || reduced ? 0 : smooth(age, .03, .35) * (1 - smooth(age, .63, 1.2));
 const advance = (distance / 2 - (to.sitting ? .42 : .52)) * step;
 // Offset the shoulders so both faces clear the space where the palms meet.
 const sidestep = (rightHand ? .27 : -.10) * step;
 // Lift, strike at the shared contact time, then immediately pull the hand back.
 const windup = 1 - smooth(age, .31, contact);
 const recoil = smooth(age, contact, .69);
 const palmGap = .078 + .18 * windup + .16 * recoil;
 const handHeight = ((from.y ?? 0) + (to.y ?? 0)) / 2 + 1.20 + .10 * windup - .12 * recoil;
 return {
  side, yaw, turn, reach,
  dx: forwardX * advance + forwardZ * sidestep,
  dz: forwardZ * advance - forwardX * sidestep,
  hand: {
   x: (from.x + to.x) / 2 - forwardX * palmGap,
   y: handHeight,
   z: (from.z + to.z) / 2 - forwardZ * palmGap,
  },
 };
}

export function turnForHighFive(yaw: number, target: number, weight: number) {
 return yaw + (MathUtils.euclideanModulo(target - yaw + Math.PI, Math.PI * 2) - Math.PI) * weight;
}

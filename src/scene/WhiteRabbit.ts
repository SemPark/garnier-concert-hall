import * as T from 'three';
import {DINNER_FRONT_LANE, DINNER_REAR_LANE, DINNER_LANES_X, DINNER_LANES_Z, DINNER_ROWS, DINNER_TABLES} from '../../shared/dinnerTables';
import {PARTERRE} from '../../shared/parterre';
import type {GhostSpot} from './Ghosts';

const lanes = [DINNER_FRONT_LANE, ...DINNER_LANES_Z, DINNER_REAR_LANE];
const rowGaps = DINNER_ROWS.map(z => {
 const tables = DINNER_TABLES.filter(table => table.z === z);
 return tables.slice(1).map((table, i) => (tables[i].x + table.x) / 2);
});

function routeCorners() {
 // Use a fixed seed so the shared clock gives every visitor the same route.
 let seed = 197;
 const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
 };
 const front = 0, rear = lanes.length - 1, start = Math.floor(lanes.length / 2);
 const stops = [start];
 let lane = start;
 // Visit both ends of the room, sometimes doubling back through a different gap.
 for (const end of [rear, front, rear, front, rear, front, start]) {
  const direction = Math.sign(end - lane);
  while (lane !== end) {
   if (lane > front && lane < rear && random() < .25) stops.push(lane - direction, lane);
   lane += direction;
   stops.push(lane);
  }
 }

 let firstGap: number | undefined, previousGap: number | undefined;
 return stops.slice(1).flatMap((next, i) => {
  const from = stops[i];
  // Change gaps after each row, including when doubling back or closing the loop.
  const available = (x: number) => x !== previousGap && (i !== stops.length - 2 || x !== firstGap);
  const inner = rowGaps[Math.min(from, next)].filter(available);
  const sides = DINNER_LANES_X.filter(available);
  const choices = inner.length && (!sides.length || random() >= .12) ? inner : sides;
  const gap = choices[Math.floor(random() * choices.length)];
  firstGap ??= gap;
  previousGap = gap;
  const x = gap + (random() - .5) * .6;
  return [new T.Vector3(x, PARTERRE.floor, lanes[from]), new T.Vector3(x, PARTERRE.floor, lanes[next])];
 });
}

const corners = routeCorners();

// Rounded turns stay inside the clear aisles instead of cutting across tables.
const path = new T.CurvePath<T.Vector3>();
const turns = corners.map((corner, i) => {
 const previous = corners[(i + corners.length - 1) % corners.length];
 const next = corners[(i + 1) % corners.length];
 return {
  entry: previous.clone().sub(corner).normalize().multiplyScalar(.4).add(corner),
  exit: next.clone().sub(corner).normalize().multiplyScalar(.4).add(corner),
 };
});
for (let i = 0; i < corners.length; i++) {
 const turn = turns[i], next = turns[(i + 1) % corners.length];
 path.add(new T.QuadraticBezierCurve3(turn.entry, corners[i], turn.exit));
 path.add(new T.LineCurve3(turn.exit, next.entry));
}
const length = path.getLength();

/** Shared hall time makes the single rabbit follow the same route for every visitor. */
export function whiteRabbitSpot(seconds: number): GhostSpot {
 const cycle = Math.floor(seconds / 24);
 const age = T.MathUtils.euclideanModulo(seconds, 24);
 // Integrate speed so stop, surprise and sprint never teleport along the route.
 let distance = cycle * 67.2;
 let walking = true;
 let action = 'rush-aisles';
 let state: 'idle' | 'signature' = 'idle';
 let watch = 0;
 if (age < 14) distance += age * 2.8;
 else if (age < 17) {
  distance += 39.2;
  walking = false;
  state = 'signature';
  action = age < 16.2 ? 'check-watch' : 'startled';
  watch = T.MathUtils.smoothstep(age,14,14.5)*(1-T.MathUtils.smoothstep(age,16.1,16.8));
 } else if (age < 21) {
  distance += 39.2 + (age - 17) * 4.9;
  state = 'signature';
  action = 'late-sprint';
 } else distance += 58.8 + (age - 21) * 2.8;
 const progress = T.MathUtils.euclideanModulo(distance / length, 1);
 // CurvePath.getPoint already distributes progress by segment length.
 const position = path.getPoint(progress);
 const ahead = path.getPoint((progress + .1 / length) % 1);
 return {
  x: position.x, y: position.y, z: position.z,
  yaw: Math.atan2(ahead.x - position.x, ahead.z - position.z),
  id: 'npc-white-rabbit', sitting: false, npc: true, walking, costume: 'white-rabbit',
  behavior: {state,action,age:state==='signature'?age-14:age,headYaw:0,headPitch:watch*.42,lean:action==='startled'?-.2:walking?.14:0,
   roll:0,hands:watch,light:1,flame:1,flameTilt:0,watch},
 };
}

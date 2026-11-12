import * as T from 'three';
import {DINNER_FRONT_LANE, DINNER_REAR_LANE, DINNER_LANES_X, DINNER_LANES_Z} from '../../shared/dinnerTables';
import {PARTERRE} from '../../shared/parterre';
import type {GhostSpot} from './Ghosts';

const [left, right] = DINNER_LANES_X;
const corners = [
 [left, DINNER_FRONT_LANE], [right, DINNER_FRONT_LANE],
 [right, DINNER_LANES_Z[3]], [left, DINNER_LANES_Z[3]],
 [left, DINNER_REAR_LANE], [right, DINNER_REAR_LANE],
 [right, DINNER_LANES_Z[5]], [left, DINNER_LANES_Z[5]],
].map(([x, z]) => new T.Vector3(x, PARTERRE.floor, z));

// Rounded turns stay inside the clear aisles instead of cutting across tables.
const path = new T.CurvePath<T.Vector3>();
const turns = corners.map((corner, i) => {
 const previous = corners[(i + corners.length - 1) % corners.length];
 const next = corners[(i + 1) % corners.length];
 return {
  entry: previous.clone().sub(corner).normalize().multiplyScalar(.55).add(corner),
  exit: next.clone().sub(corner).normalize().multiplyScalar(.55).add(corner),
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
 const progress = ((seconds * 2.8 / length) % 1 + 1) % 1;
 // CurvePath.getPoint already distributes progress by segment length.
 const position = path.getPoint(progress);
 const ahead = path.getPoint((progress + .001) % 1);
 return {
  x: position.x, y: position.y, z: position.z,
  yaw: Math.atan2(ahead.x - position.x, ahead.z - position.z),
  id: 'npc-white-rabbit', sitting: false, npc: true, walking: true, costume: 'white-rabbit',
 };
}

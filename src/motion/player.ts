import { Euler, Quaternion, Vector3 } from 'three';
import type { Avatar } from '../character/Avatar';
import { MOTION_STRIDE, sampleClip, type MotionClip } from './clip';
const sample = new Float32Array(MOTION_STRIDE);
const sides = [-1, 1] as const;
const target = new Vector3(), guide = new Vector3(), leftFoot = new Vector3(), rightFoot = new Vector3();
const inverse = new Quaternion(), rotation = new Quaternion(), angles = new Euler();
/** Apply after Avatar.update; root position/yaw remain owned by shared dance navigation. */
export function applyMotion(avatar: Avatar, clip: MotionClip, seconds: number, weight = 1) {
  const f = sampleClip(clip, seconds, sample);
  rotation.setFromEuler(angles.set(f[3], f[4], f[5]));
  avatar.body.quaternion.slerp(rotation, weight);
  // Rotate around the hip, not the origin at the floor.
  target.set(0, .55, 0).applyQuaternion(avatar.body.quaternion);
  avatar.body.position.lerp(guide.set(f[0] - target.x, f[1] + .55 - target.y, -target.z), weight);
  rotation.setFromEuler(angles.set(f[6], f[7], f[8]));
  avatar.head.quaternion.slerp(rotation, weight);
  inverse.copy(avatar.body.quaternion).invert();
  for (const side of sides) {
    const offset = side < 0 ? 9 : 15;
    target.fromArray(f, offset).sub(guide.set(side * .16, .99, 0)).applyQuaternion(inverse)
      .add(guide.set(side * .16, .99, 0));
    guide.fromArray(f, offset + 3).applyQuaternion(inverse).normalize();
    avatar.poseJointedArm(side, target, guide, 0, 0, weight);
  }
  leftFoot.fromArray(f, 21);
  rightFoot.fromArray(f, 24);
  avatar.poseCapturedFeet(leftFoot, rightFoot, weight);
}

import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PaintedUsher, PORTRAIT_LEFT_TRACK_LIMIT, PORTRAIT_REST_YAW } from './PaintedUsher';
import { REAR_COLUMNS, REAR_SCREENS } from '../../shared/gallery';
import { WALL_DATUM } from './HallWallBands';

const width = 2.8;
const height = width * 1.25;
const landingStart = REAR_COLUMNS.z + Math.max(REAR_COLUMNS.radius, REAR_SCREENS.thickness / 2);
// The entrance-facing edge of the outer column marks the portrait bay threshold.
const portraitBayEdge = Math.min(...REAR_COLUMNS.xs) + REAR_COLUMNS.radius;
export class HallPortrait {
  readonly root = new T.Group();
  readonly surface = new T.Mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ color: 0x332016, toneMapped: false }),
  );
  private readonly bounds = new T.Sphere(new T.Vector3(), Math.hypot(width, height) / 2);
  private readonly frustum = new T.Frustum();
  private readonly viewProjection = new T.Matrix4();
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly frameGeometries: T.BufferGeometry[] = [];
  private readonly frameMaterials = [0x382017, 0x95652b, 0x493017].map(color =>
    new T.MeshStandardMaterial({ color, roughness: .62 }),
  );
  private painting?: PaintedUsher;
  private lastDraw = -Infinity;
  private yaw = PORTRAIT_REST_YAW;
  private pitch = 0;
  private drawn = false;

  constructor(scene: T.Scene) {
    // Centre the portrait on the former wall sconce in the rear landing panel.
    this.root.position.set(-WALL_DATUM.halfWidth + .34, 7.5 * .45,
      (REAR_SCREENS.z + REAR_SCREENS.thickness / 2 + WALL_DATUM.rear) / 2);
    this.root.rotation.y = Math.PI / 2;
    this.root.userData.landmark = 'painted-usher';
    this.bounds.center.copy(this.root.position);
    this.surface.position.z = .09;
    this.surface.userData.hallPortrait = true;
    this.root.add(this.surface);
    this.frameMaterials.forEach((material, index) => {
      const edge = .04 + index * .045;
      const thickness = index === 0 ? .085 : .038;
      const depth = .07 - index * .023;
      const parts = [-1, 1].flatMap(sign => [
        new T.BoxGeometry(thickness, height + 2 * edge + thickness, .07)
          .translate(sign * (width / 2 + edge), 0, depth),
        new T.BoxGeometry(width + 2 * edge - thickness, thickness, .07)
          .translate(0, sign * (height / 2 + edge), depth),
      ]);
      const geometry = mergeGeometries(parts)!;
      parts.forEach(part => part.dispose());
      this.frameGeometries.push(geometry);
      this.root.add(new T.Mesh(geometry, material));
    });
    scene.add(this.root);
  }

  private isInsidePortraitBay(visitor: T.Vector3) {
    return Math.abs(visitor.y) < 2
      && visitor.x > this.root.position.x && visitor.x <= portraitBayEdge
      && visitor.z >= landingStart && visitor.z <= WALL_DATUM.rear;
  }

  update(renderer: T.WebGLRenderer, camera: T.Camera, visitor: T.Vector3, now: number) {
    const near = this.isInsidePortraitBay(visitor) && !this.reduced.matches;
    if (this.drawn && !near && Math.abs(PORTRAIT_REST_YAW - this.yaw) < .002 && Math.abs(this.pitch) < .002) return;
    if (now - this.lastDraw < 1000 / 15) return;
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    if (camera.position.x <= this.root.position.x || !this.frustum.intersectsSphere(this.bounds)) return;
    const dx = Math.max(.3, visitor.x - this.root.position.x);
    const dz = visitor.z - this.root.position.z;
    // From in front of the frame, the visitor moves screen-left as z increases.
    const targetYaw = near ? T.MathUtils.clamp(Math.atan2(-dz, dx), PORTRAIT_LEFT_TRACK_LIMIT, .42) : PORTRAIT_REST_YAW;
    const targetPitch = near ? T.MathUtils.clamp(Math.atan2(visitor.y + 1.5 - this.root.position.y, Math.hypot(dx, dz)), -.15, .15) : 0;
    if (this.drawn && Math.abs(targetYaw - this.yaw) < .002 && Math.abs(targetPitch - this.pitch) < .002) return;
    const dt = this.drawn ? Math.min((now - this.lastDraw) / 1000, .15) : 1/15;
    const blend = 1 - Math.exp(-7 * dt);
    this.yaw = T.MathUtils.lerp(this.yaw, targetYaw, blend);
    this.pitch = T.MathUtils.lerp(this.pitch, targetPitch, blend);
    this.painting ??= new PaintedUsher();
    if (!this.surface.material.map) {
      this.surface.material.map = this.painting.texture;
      this.surface.material.color.set(0xffffff);
      this.surface.material.needsUpdate = true;
    }
    this.painting.pose(this.yaw, this.pitch);
    this.painting.render(renderer);
    this.drawn = true;
    this.lastDraw = now;
  }

  invalidateRender() {
    this.drawn = false;
    this.lastDraw = -Infinity;
  }

  dispose() {
    this.painting?.dispose();
    this.surface.geometry.dispose();
    this.surface.material.dispose();
    this.frameGeometries.forEach(geometry => geometry.dispose());
    this.frameMaterials.forEach(material => material.dispose());
    this.root.removeFromParent();
  }
}

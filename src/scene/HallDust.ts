import * as T from 'three';
import { GOLDEN_HALL } from '../../shared/goldenHall';
import { PARTERRE } from '../../shared/parterre';

const COLUMNS = 4;
const ROWS = 12;
// Denser at seated and balcony eye level, with a lighter layer above the galleries.
const HEIGHT_BANDS = [
  [PARTERRE.floor + .55, 5.8],
  [5.8, GOLDEN_HALL.balconyHeight + 4.2],
  [GOLDEN_HALL.balconyHeight + 4.2, GOLDEN_HALL.height - 1.2],
] as const;
const MOTES_PER_CELL = 5;

function dustGeometry() {
  const positions: number[] = [];
  const seeds: number[] = [];
  const width = GOLDEN_HALL.width - 3;
  const depth = GOLDEN_HALL.rear - GOLDEN_HALL.front - 3;
  for (const [bottom, top] of HEIGHT_BANDS) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        for (let i = 0; i < MOTES_PER_CELL; i++) {
          const index = seeds.length / 3 + 1;
          const x = (index * .754877666) % 1;
          const z = (index * .569840291) % 1;
          positions.push(((col + x) / COLUMNS - .5) * width, bottom,
            GOLDEN_HALL.front + 1.5 + (row + z) / ROWS * depth);
          seeds.push((index * .618033989) % 1, (index * .438579021) % 1, top - bottom);
        }
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new T.Float32BufferAttribute(seeds, 3));
  geometry.boundingSphere = new T.Box3(
    new T.Vector3(-GOLDEN_HALL.width / 2, PARTERRE.floor, GOLDEN_HALL.front),
    new T.Vector3(GOLDEN_HALL.width / 2, GOLDEN_HALL.height, GOLDEN_HALL.rear),
  ).getBoundingSphere(new T.Sphere());
  return geometry;
}

export class HallDust {
  private readonly points: T.Points<T.BufferGeometry, T.ShaderMaterial>;

  constructor(scene: T.Scene) {
    const material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: { phase: { value: 0 }, viewportHeight: { value: 1 } },
      vertexShader: `
        attribute vec3 seed;
        uniform float phase, viewportHeight;
        varying float opacity, softness, warmth;

        void main() {
          float height = fract(seed.x + phase * (4.0 + floor(seed.y * 5.0)));
          float sway = 6.2831853 * (seed.y + phase * (8.0 + floor(seed.x * 5.0)));
          vec3 p = position + vec3(0.78 * sin(sway), height * seed.z, 0.56 * cos(sway));
          vec4 eye = modelViewMatrix * vec4(p, 1.0);
          float distance = length(eye.xyz);
          float riseFade = smoothstep(0.0, 0.14, height) * (1.0 - smoothstep(0.86, 1.0, height));
          float distanceFade = smoothstep(0.8, 3.4, distance) * (1.0 - smoothstep(22.0, 42.0, distance));
          softness = max(step(0.86, seed.y) * 0.75, 1.0 - smoothstep(1.8, 8.0, distance));
          warmth = seed.x;
          opacity = riseFade * distanceFade * mix(0.44 + 0.18 * seed.y, 0.22, softness);
          float size = mix(0.065 + 0.085 * seed.x, 0.22 + 0.20 * seed.x, softness);
          gl_PointSize = clamp(size * projectionMatrix[1][1] * viewportHeight / max(0.1, -2.0 * eye.z), 1.0, 36.0);
          gl_Position = projectionMatrix * eye;
        }
      `,
      fragmentShader: `
        varying float opacity, softness, warmth;

        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float glow = 1.0 - smoothstep(0.0, 0.91, length(p));
          float alpha = opacity * mix(glow, glow * glow, softness);
          vec3 color = mix(vec3(1.0, 0.65, 0.30), vec3(1.0, 0.92, 0.73), warmth);
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `,
    });
    this.points = new T.Points(dustGeometry(), material);
    this.points.name = '공연장 전체의 부유하는 빛먼지';
    this.points.visible = false;
    this.points.onBeforeRender = renderer => { material.uniforms.viewportHeight.value = renderer.domElement.height; };
    scene.add(this.points);
  }

  update(concertSeconds: number, visible: boolean) {
    this.points.visible = visible;
    if (visible) this.points.material.uniforms.phase.value = (concertSeconds % 360) / 360;
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TessellateModifier} from 'three/examples/jsm/modifiers/TessellateModifier.js';
import {ghostSurfaceMaterial} from './GhostSurface';

export type GhostCostume = 'queen' | 'phantom' | 'vesper' | 'candra' | 'white-rabbit';

/** Small, seated versions of the guests, with decorations merged by material. */
export function buildGhostCostume(role: GhostCostume) {
 const root = new T.Group(), pivot = new T.Group(), model = new T.Group();
 root.name = `ghost-${role}`;
 pivot.position.y = -.7;
 model.position.y = .7;
 root.add(pivot); pivot.add(model);
 const parts = new Map<number, T.BufferGeometry[]>();
 const gold = 0xb98a42, ivory = 0xf2e4c8, ink = 0x24202d, blue = 0x304458, red = 0x842b38;
 const add = (color: number, geometry: T.BufferGeometry, x = 0, y = 0, z = 0) => {
  if (geometry.index) {
   const indexed = geometry; geometry = indexed.toNonIndexed(); indexed.dispose();
  }
  geometry.translate(x, y, z);
  const list = parts.get(color) ?? [];
  list.push(geometry); parts.set(color, list);
 };
 const sphere = (radius: number, x: number, y: number, z: number) => new T.SphereGeometry(radius, 12, 8).scale(x, y, z);
 const heart = (size: number) => {
  const shape = new T.Shape();
  shape.moveTo(0, -.55);
  shape.bezierCurveTo(-1, .05, -.55, .9, 0, .4);
  shape.bezierCurveTo(.55, .9, 1, .05, 0, -.55);
  return new T.ExtrudeGeometry(shape, {depth: .04, bevelEnabled: false, curveSegments: 8}).scale(size, size, 1);
 };
 let flame: T.Mesh | undefined;
 if (role === 'white-rabbit') {
  const fur: T.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
   const tilt = -side * .15;
   fur.push(sphere(.15, .78, 3.2, .55).rotateZ(tilt).translate(side * .19, .69, -.02));
   add(red, sphere(.15, 1.05, .55, .4).rotateZ(side * .2), side * .12, -.2, .37);
  }
  add(gold, sphere(.045, 1, 1, .6), 0, -.2, .42);
  fur.push(sphere(.16, 1.1, 1.1, 1.1).translate(0, -.48, -.42));
  model.add(new T.Mesh(mergeGeometries(fur)!, ghostSurfaceMaterial()));
  fur.forEach(geometry => geometry.dispose());
  // A broad pocket watch hangs on the chest so it remains readable while running.
  add(gold, new T.TorusGeometry(.17, .025, 6, 20), .18, -.39, .4);
  add(ivory, new T.CircleGeometry(.15, 20), .18, -.39, .402);
  add(ink, new T.BoxGeometry(.015, .12, .012), .18, -.35, .416);
  add(ink, new T.BoxGeometry(.085, .015, .012), .215, -.39, .416);
  add(gold, new T.TorusGeometry(.042, .012, 5, 12), .18, -.17, .41);
  for (let i = 0; i < 5; i++) {
   const angle = i * Math.PI / 8;
   add(gold, new T.TorusGeometry(.018, .006, 4, 8), .25 + .065 * Math.sin(angle), -.22 - i * .027, .38);
  }
 } else if (role === 'queen') {
  // Scalloped standing collar, a ruby heart and a silhouette-readable crown.
  for (let i = 0; i < 9; i++) {
   const a = Math.PI * (i / 8 - .5);
   add(ivory, sphere(.15, .85, 1.4, .35), Math.sin(a) * .4, -.16 + Math.cos(a) * .18, -.24);
  }
  add(red, sphere(.39, 1.05, .55, .95), 0, -.36, -.04);
  add(gold, new T.CylinderGeometry(.22, .23, .09, 16), 0, .38, 0);
  for (let i = 0; i < 7; i++) {
   const a = i * Math.PI * 2 / 7;
   add(gold, new T.ConeGeometry(.065, .26, 4), Math.sin(a) * .2, .53, Math.cos(a) * .2);
   add(red, sphere(.035, 1, 1, 1), Math.sin(a) * .2, .68, Math.cos(a) * .2);
  }
  add(gold, heart(.2), 0, -.32, .37);
  add(red, heart(.15), 0, -.32, .416);
  add(red, heart(.12), 0, .49, .24);
 } else if (role === 'phantom') {
  add(ink, new T.CylinderGeometry(.29, .47, .69, 16, 1, true, Math.PI / 2, Math.PI), 0, -.29, -.07);
  add(red, new T.CylinderGeometry(.3, .45, .62, 16, 1, true, Math.PI / 2, Math.PI), 0, -.27, -.05);
  for (const side of [-1, 1]) add(ink, sphere(.18, 1, .5, .65), side * .29, -.2, 0);
  // A curved half mask with a real eye opening, following the ghost's dome.
  const mask = new T.Shape();
  mask.moveTo(.015, -.14); mask.lineTo(.015, .24);
  mask.quadraticCurveTo(.3, .33, .34, .03);
  mask.quadraticCurveTo(.31, -.18, .015, -.14);
  const eye = new T.Path(); eye.absellipse(.123, .038, .067, .087, 0, Math.PI * 2, true);
  mask.holes.push(eye);
  const flatMask = new T.ShapeGeometry(mask, 16);
  // Short edges keep the faces outside the curved head, including during bows.
  const geometry = new TessellateModifier(.04, 6).modify(flatMask);
  flatMask.dispose();
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
   const x = position.getX(i), y = position.getY(i);
   const radius = .37 + Math.max(0, -y) * .04 / .72;
   position.setZ(i, Math.sqrt(Math.max(.008, radius * radius - x * x - Math.max(0, y) ** 2)) + .018);
  }
  const normal = geometry.getAttribute('normal');
  const direction = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
   direction.set(position.getX(i), Math.max(0, position.getY(i)), position.getZ(i) - .018).normalize();
   normal.setXYZ(i, direction.x, direction.y, direction.z);
  }
  add(ivory, geometry);
  add(gold, sphere(.055, 1, 1, .5), 0, -.23, .38);
 } else {
  const coat = role === 'vesper' ? blue : 0x493e68;
  add(coat, new T.CylinderGeometry(.37, .43, .35, 16, 1, true, Math.PI / 2, Math.PI), 0, -.4, -.03);
  for (const side of [-1, 1]) {
   add(coat, sphere(.16, 1.1, 1.4, .45), side * .25, -.24, .22);
   for (let i = 0; i < 3; i++) add(gold, sphere(.025, 1, 1, .5), side * .15, -.27 - i * .1, .366);
  }
  add(ivory, sphere(.12, .65, 1.3, .4), 0, -.21, .39);
  add(gold, new T.CylinderGeometry(.22, .38, .12, 16), 0, .01, 0);
  if (role === 'vesper') {
   add(ink, new T.CylinderGeometry(.29, .22, .1, 6), 0, .13, 0);
   const glass = new T.Mesh(new T.CylinderGeometry(.285, .215, .49, 6), new T.MeshBasicMaterial({color: 0xffd391}));
   glass.position.y = .425; model.add(glass);
   for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const bar = new T.CylinderGeometry(.022, .022, .51, 6);
    bar.rotateZ(-Math.sin(a) * .14); bar.rotateX(Math.cos(a) * .14);
    add(gold, bar, Math.sin(a) * .255, .425, Math.cos(a) * .255);
   }
   add(ink, new T.CylinderGeometry(.33, .31, .07, 6), 0, .7, 0);
   add(gold, new T.CylinderGeometry(.12, .34, .2, 6), 0, .83, 0);
   add(ink, new T.ConeGeometry(.09, .21, 6), 0, 1.01, 0);
   add(gold, sphere(.04, 1, 1, 1), 0, 1.13, 0);
  } else {
   add(gold, new T.CylinderGeometry(.31, .2, .075, 16), 0, .1, 0);
   add(ivory, new T.CylinderGeometry(.235, .255, .55, 16), 0, .405, 0);
   for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7, length = .1 + (i % 3) * .065;
    add(0xe6d7b8, sphere(.045, 1, length / .045, .7), Math.sin(a) * .235, .66 - length, Math.cos(a) * .235);
   }
   add(ink, new T.CylinderGeometry(.015, .015, .09, 6), 0, .72, 0);
   const fire = new T.LatheGeometry([[0, 0], [.065, .05], [.09, .13], [.055, .23], [0, .4]].map(([x, y]) => new T.Vector2(x, y)), 12);
   flame = new T.Mesh(fire, new T.MeshBasicMaterial({color: 0xffcf75}));
   flame.position.y = .73; model.add(flame);
  }
 }
 for (const [color, geometries] of parts) {
  // Shape, lathe and primitive geometries all share position/normal/uv attributes.
  const merged = mergeGeometries(geometries)!;
  model.add(new T.Mesh(merged, new T.MeshLambertMaterial({color, side: T.DoubleSide})));
  geometries.forEach(geometry => geometry.dispose());
 }
 return {root, pivot, flame};
}

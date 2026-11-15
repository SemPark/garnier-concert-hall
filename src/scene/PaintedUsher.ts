import * as T from 'three';
import { faceSurfaceZ } from '../character/Face';
import { Avatar } from '../character/Avatar';

export const PORTRAIT_SIZE = { width: 384, height: 480 };
export const PORTRAIT_REST_YAW = -.70;
export const PORTRAIT_LEFT_TRACK_LIMIT = -.32;

function portraitTempleHair() {
  const columns = 16, rows = 8;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const shadow = new T.Color(0x77736b), silver = new T.Color(0xc3bcad);
  const color = new T.Color();
  for (const [start, end] of [[-2.22, -.82], [.82, 2.22]]) {
    const offset = positions.length / 3;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const angle = T.MathUtils.lerp(start, end, u);
      const length = Math.sin(u * Math.PI);
      for (let row = 0; row <= rows; row++) {
        const v = row / rows;
        const polar = 1.42 + (v - .5) * (.26 + .57 * length);
        const ring = Math.sin(polar);
        const taper = length * Math.sin(v * Math.PI);
        const shell = .985 + .10 * taper;
        const frontDepth = -ring * Math.cos(angle);
        const z = frontDepth < 0 ? -.9 * (-frontDepth) ** .72 : frontDepth;
        positions.push(.3552 * ring * Math.sin(angle) * shell, .03 + .345 * Math.cos(polar), .35 * z * shell);
        color.copy(shadow).lerp(silver, .23 + .53 * taper + .08 * Math.cos(angle * 13 + v * 3));
        colors.push(color.r, color.g, color.b);
        if (column === columns || row === rows) continue;
        const a = offset + column * (rows + 1) + row, b = a + rows + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

/** Live avatar portrait. Both render targets are reused for every frame. */
export class PaintedUsher {
  private readonly scene = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-.448, .448, .56, -.56, .1, 20);
  private readonly avatar = new Avatar(0x59383b, undefined, 40);
  private readonly source = new T.WebGLRenderTarget(384, 480);
  private readonly target = new T.WebGLRenderTarget(384, 480, { depthBuffer: false });
  private readonly screenScene = new T.Scene();
  private readonly screenCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  private readonly materials: T.Material[] = [];
  private readonly geometries: T.BufferGeometry[] = [];
  private readonly eyeMarks: { position: T.BufferAttribute; open: Float32Array; closed: Float32Array; lensOffsetX: number }[] = [];
  private lastGazeX = NaN;
  private lastEyesClosed = false;
  readonly texture = this.target.texture;
  readonly ready = true;
  private readonly filter = new T.ShaderMaterial({
    uniforms: { image: { value: this.source.texture } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      uniform sampler2D image;
      varying vec2 vUv;
      void main(){
        vec2 pixel = vec2(1.0/384.0, 1.0/480.0);
        // Fixed paper fibres distort ink boundaries without shimmering during movement.
        vec2 fibres = vec2(sin(vUv.y*721. + sin(vUv.x*143.)), sin(vUv.x*637. + sin(vUv.y*157.)));
        vec2 inkUv = vUv + fibres * pixel * .55;
        vec3 color = texture2D(image,inkUv).rgb * .5;
        color += texture2D(image,inkUv+pixel*vec2(1.8,.7)).rgb * .25;
        color += texture2D(image,inkUv-pixel*vec2(1.8,.7)).rgb * .25;
        vec3 left = texture2D(image,vUv-vec2(pixel.x,0.)).rgb;
        vec3 right = texture2D(image,vUv+vec2(pixel.x,0.)).rgb;
        vec3 up = texture2D(image,vUv+vec2(0.,pixel.y)).rgb;
        vec3 down = texture2D(image,vUv-vec2(0.,pixel.y)).rgb;
        float edge = smoothstep(.18,.50,max(length(left-right),length(up-down)));
        color = mix(color,vec3(.065,.075,.07),edge*.80);
        float grain = fract(sin(dot(floor(vUv/pixel),vec2(12.9898,78.233)))*43758.5453)-.5;
        float weave = sin(vUv.x*2413.)*sin(vUv.y*3016.);
        float pigment = sin(vUv.x*187.+sin(vUv.y*93.)*2.) * sin(vUv.y*219.+vUv.x*43.);
        float brightness = dot(color,vec3(.2126,.7152,.0722));
        float hatch = smoothstep(.78,.98,sin((vUv.x+vUv.y*.72)*690.));
        color *= 1.0 + grain*.13 + weave*.035 + pigment*.045;
        color *= 1.0 - hatch*.13*(1.-brightness);
        color = mix(color,vec3(.64,.56,.42),max(grain-.28,0.)*.16);
        color *= 1.0 - .75*dot(vUv-.5,vUv-.5);
        gl_FragColor=vec4(color,1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });

  constructor() {
    this.avatar.update(1.5, 0, false, false, null, 10, 1/15);
    // The portrait camera only sees the upper body. Hands, held props, legs,
    // and the floor shadow are below its frame throughout gaze tracking.
    this.avatar.leftLeg.removeFromParent();
    this.avatar.rightLeg.removeFromParent();
    this.avatar.leftHand.removeFromParent();
    this.avatar.rightHand.removeFromParent();
    this.avatar.instrument.removeFromParent();
    this.avatar.root.clear().add(this.avatar.body);
    this.avatar.head.children.find(part => part.userData.hairPart)?.removeFromParent();
    this.avatar.root.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      const convert = (original: T.Material) => {
        const source = original as T.MeshStandardMaterial;
        const flat = new T.MeshBasicMaterial({
          color: source.color?.clone() ?? new T.Color(0xffffff),
          map: source.map ?? null,
          transparent: source.transparent,
          opacity: source.opacity,
          depthWrite: source.depthWrite,
          side: source.side,
          polygonOffset: source.polygonOffset,
          polygonOffsetFactor: source.polygonOffsetFactor,
          polygonOffsetUnits: source.polygonOffsetUnits,
          toneMapped: false,
        });
        // Slightly faded pigments keep the portrait gentle against its darker backdrop.
        const luminance = flat.color.r * .2126 + flat.color.g * .7152 + flat.color.b * .0722;
        flat.color.lerp(new T.Color(luminance * 1.02, luminance, luminance * .92), .24);
        this.materials.push(flat);
        return flat;
      };
      object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
    });
    const hair = portraitTempleHair();
    const hairPigment = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.avatar.head.add(new T.Mesh(hair, hairPigment));
    this.geometries.push(hair);
    this.materials.push(hairPigment);
    for (const eyeMark of this.avatar.eyes.children) {
      if (!(eyeMark instanceof T.Mesh)) continue;
      const geometry = eyeMark.geometry.clone();
      const position = geometry.getAttribute('position') as T.BufferAttribute;
      const open = new Float32Array(position.array);
      const closed = new Float32Array(geometry.morphAttributes.position[0].array);
      position.setUsage(T.DynamicDrawUsage);
      this.eyeMarks.push({ position, open, closed, lensOffsetX: Math.sign(open[0]) * .025 });
      eyeMark.geometry = geometry;
      // Apply the closed shape before placing it on the curved face at the current gaze.
      eyeMark.morphTargetInfluences![0] = 0;
      eyeMark.frustumCulled = false;
      this.geometries.push(geometry);
    }
    const silver = new T.MeshBasicMaterial({color: 0xaaa99b, toneMapped: false});
    const ink = new T.MeshBasicMaterial({color: 0x575649, toneMapped: false});
    this.materials.push(silver, ink);
    for (const side of [-1, 1]) {
      const browGeometry = new T.CapsuleGeometry(.012, .075, 3, 8);
      this.geometries.push(browGeometry);
      const brow = new T.Mesh(browGeometry, silver);
      brow.rotation.z = Math.PI / 2 + side * .12;
      brow.position.set(side * .14, .095, faceSurfaceZ(side * .14, .095) - .012);
      this.avatar.head.add(brow);
      const glassesGeometry = new T.TorusGeometry(.09, .007, 5, 24);
      this.geometries.push(glassesGeometry);
      const glasses = new T.Mesh(glassesGeometry, ink);
      glasses.position.set(side * .14, .015, -.355);
      // Keep the painted spectacles on the face when the head turns.
      glasses.updateMatrix();
      glassesGeometry.applyMatrix4(glasses.matrix);
      const vertices = glassesGeometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) vertices.setZ(i, faceSurfaceZ(vertices.getX(i), vertices.getY(i)) - .008);
      glasses.position.set(0, 0, 0);
      this.avatar.head.add(glasses);
    }
    const bridgeGeometry = new T.BoxGeometry(.10, .009, .009);
    this.geometries.push(bridgeGeometry);
    const bridge = new T.Mesh(bridgeGeometry, ink);
    bridge.position.set(0, .025, -.355);
    bridge.position.z = faceSurfaceZ(0, .025) - .012;
    this.avatar.head.add(bridge);
    const wrinkle = new T.MeshBasicMaterial({color: 0x997b6f, side: T.DoubleSide, toneMapped: false});
    silver.side = T.DoubleSide;
    this.materials.push(wrinkle);
    const moustache = new T.Shape();
    moustache.moveTo(-.13,-.13);
    moustache.bezierCurveTo(-.10,-.09,-.04,-.085,0,-.115);
    moustache.bezierCurveTo(.04,-.085,.10,-.09,.13,-.13);
    moustache.bezierCurveTo(.08,-.15,.035,-.14,0,-.125);
    moustache.bezierCurveTo(-.035,-.14,-.08,-.15,-.13,-.13);
    this.faceMark(new T.ShapeGeometry(moustache, 12), silver);
    const beard = new T.Shape();
    beard.moveTo(-.17,-.19);
    beard.bezierCurveTo(-.12,-.23,-.06,-.22,0,-.22);
    beard.bezierCurveTo(.06,-.22,.12,-.23,.17,-.19);
    beard.bezierCurveTo(.14,-.26,.07,-.28,0,-.285);
    beard.bezierCurveTo(-.07,-.28,-.14,-.26,-.17,-.19);
    this.faceMark(new T.ShapeGeometry(beard, 12), silver);
    for (const y of [.125, .152]) this.wrinkleLine(-.09, y, .09, y + .006, wrinkle);
    for (const side of [-1, 1]) {
      this.wrinkleLine(side*.235, -.005, side*.275, .008, wrinkle);
      this.wrinkleLine(side*.235, -.026, side*.273, -.035, wrinkle);
      this.wrinkleLine(side*.10, -.15, side*.13, -.178, wrinkle);
    }
    this.scene.background = new T.Color(0x82775b);
    this.camera.position.set(0, 1.35, -2.25);
    this.camera.lookAt(0, 1.31, 0);
    this.avatar.root.rotation.y = -.62;
    this.scene.add(this.avatar.root);
    const backdropGeometry = new T.PlaneGeometry(1.4, 1.4);
    const backdropMaterial = new T.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
        varying vec2 vUv;
        void main(){
          vec2 fromLight = (vUv - vec2(.36,.78)) * vec2(1.,.78);
          float light = 1. - smoothstep(.05,.72,length(fromLight));
          vec3 color = mix(vec3(.008,.012,.016),vec3(.031,.071,.072),light);
          gl_FragColor=vec4(color,1.);
        }`,
      toneMapped: false,
    });
    this.geometries.push(backdropGeometry);
    this.materials.push(backdropMaterial);
    const backdrop = new T.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.set(0, 1.3, .7);
    backdrop.rotation.y = Math.PI;
    this.scene.add(backdrop);
    const screenGeometry = new T.PlaneGeometry(2, 2);
    this.geometries.push(screenGeometry);
    this.screenScene.add(new T.Mesh(screenGeometry, this.filter));
    this.pose();
  }

  private faceMark(geometry: T.BufferGeometry, material: T.Material) {
    // Subdivide before projecting so broad beard triangles follow the curved chin.
    const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    let positions = Array.from(source.getAttribute('position').array);
    source.dispose();
    geometry.dispose();
    for (let pass = 0; pass < 3; pass++) {
      const next: number[] = [];
      for (let i = 0; i < positions.length; i += 9) {
        const a = positions.slice(i, i+3), b = positions.slice(i+3, i+6), c = positions.slice(i+6, i+9);
        const ab = a.map((value, axis) => (value+b[axis])/2);
        const bc = b.map((value, axis) => (value+c[axis])/2);
        const ca = c.map((value, axis) => (value+a[axis])/2);
        next.push(...a,...ab,...ca, ...ab,...b,...bc, ...ca,...bc,...c, ...ab,...bc,...ca);
      }
      positions = next;
    }
    geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    const vertices = geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      vertices.setZ(i, faceSurfaceZ(vertices.getX(i), vertices.getY(i)) - .009);
    }
    this.geometries.push(geometry);
    this.avatar.head.add(new T.Mesh(geometry, material));
  }

  private wrinkleLine(x1: number, y1: number, x2: number, y2: number, material: T.Material) {
    const shape = new T.Shape();
    shape.moveTo(x1, y1);
    shape.quadraticCurveTo((x1+x2)/2, (y1+y2)/2-.005, x2, y2);
    shape.lineTo(x2, y2+.003);
    shape.quadraticCurveTo((x1+x2)/2, (y1+y2)/2-.002, x1, y1+.003);
    shape.closePath();
    this.faceMark(new T.ShapeGeometry(shape, 8), material);
  }

  pose(yaw = PORTRAIT_REST_YAW, pitch = 0, eyesClosed = false) {
    // Tracking is in painting space; remove the shoulders' rotation before
    // applying it to the head. Eyes cover the remaining part of the turn.
    const faceYaw = Math.max(PORTRAIT_REST_YAW, yaw <= PORTRAIT_REST_YAW ? yaw : yaw * .75);
    this.avatar.head.rotation.set(pitch + .025, faceYaw - this.avatar.root.rotation.y, -.045);
    const gazeX = -T.MathUtils.clamp((yaw - faceYaw) / .15, -1, 1) * .027;
    if (gazeX === this.lastGazeX && eyesClosed === this.lastEyesClosed) return;
    this.lastGazeX = gazeX;
    this.lastEyesClosed = eyesClosed;
    // Place the pupil's lower edge against the inner bottom of the spectacle rim.
    const gazeY = -.027;
    for (const { position, open, closed, lensOffsetX } of this.eyeMarks) {
      const rest = eyesClosed ? closed : open;
      for (let i = 0; i < position.count; i++) {
        const x = rest[i * 3] + lensOffsetX + gazeX;
        const y = rest[i * 3 + 1] + .03 + gazeY;
        position.setXYZ(i, x, y, faceSurfaceZ(x, y) - .003);
      }
      position.needsUpdate = true;
    }
  }

  render(renderer: T.WebGLRenderer) {
    const previous = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    const xr = renderer.xr.enabled;
    try {
      renderer.xr.enabled = false;
      renderer.autoClear = true;
      renderer.setRenderTarget(this.source);
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(this.target);
      renderer.render(this.screenScene, this.screenCamera);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.autoClear = autoClear;
      renderer.xr.enabled = xr;
    }
  }

  dispose() {
    this.source.dispose();
    this.target.dispose();
    this.filter.dispose();
    this.geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
    // Avatar geometry/material caches are shared with the hall's characters.
    this.avatar.root.removeFromParent();
  }
}

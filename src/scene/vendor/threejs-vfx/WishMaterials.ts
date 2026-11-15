// Extracted from threejs-vfx (MIT), commit 3d184edec529e5ad8055d8803967ea1f040aede0.
// Upstream: https://github.com/majidmanzarpour/threejs-vfx
// Sources: src/materials/SnareMaterial.js and src/materials/DaystarMaterial.js.
// Uses local frame uniforms and ascending smoothstep edges for WebGL.
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, Vector3 } from 'three';
import { noiseGLSL } from './noise.glsl';
import { commonGLSL } from './common.glsl';

const FIELD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FIELD_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uQuadSize;
  uniform float uRadius;
  uniform float uBoundary;
  uniform float uBoundaryGlow;
  uniform float uFill;
  uniform float uFalloff;
  uniform float uVeins;
  uniform float uVeinScale;
  uniform float uVeinSharp;
  uniform float uWarp;
  uniform float uCrawl;
  uniform float uRings;
  uniform float uRingSpeed;
  uniform float uSpokes;
  uniform float uSpokeLength;
  uniform float uSpin;
  uniform float uCore;
  uniform float uCoreSize;
  uniform float uPulse;
  uniform float uPulseSpeed;
  uniform float uSeed;
  uniform float uFade;
  uniform float uOpacity;
  uniform vec3  uColorField;
  uniform vec3  uColorEdge;
  uniform float uGlobalGlow;

  varying vec2 vUv;

  ${noiseGLSL}
  ${commonGLSL}

  #define TAU 6.28318530718

  void main() {
    vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuadSize;
    float d = length(p);

    float outer = uRadius + uBoundary * 0.4;
    float inner = max(0.01, uRadius - uBoundary * 0.6);

    float aa = fwidth(d) + 0.02;
    if (d > outer + aa * 4.0) discard;

    float band = (1.0 - smoothstep(outer - aa, outer + aa, d)) * smoothstep(inner - aa, inner + aa, d);
    float interior = (1.0 - smoothstep(inner - aa, inner + aa, d));
    float radial = clamp(d / inner, 0.0, 1.0);

    /* ---- the veins burnt across the disc ---- */
    // Sampled in the *plane* and domain warped, never on atan(): an angular
    // lookup hands every radius along a bearing the same value and draws
    // dead-straight spokes out of the centre — a firework, not a burn.
    float warp = fbm3(vec3(p * 0.5, uTime * 0.2 + uSeed)) * uWarp;
    float fil = ridged(vec3(p * uVeinScale + warp, uSeed * 11.0 + uTime * uCrawl), 4);
    float veins = smoothstep(mix(0.55, 0.86, uVeinSharp), 0.98, fil) * interior * uVeins;

    /* ---- pressure rings running out of the middle ---- */
    float ring = 0.5 + 0.5 * cos((radial * uRings - uTime * uRingSpeed) * TAU);
    ring = pow(ring, 8.0) * interior;

    /* ---- ticks stepping around the boundary ---- */
    float ang = atan(p.y, p.x) / TAU + 0.5;
    float spokePhase = fract(ang * uSpokes + uTime * uSpin * uSpokes);
    float spoke = 1.0 - smoothstep(0.22, 0.3, spokePhase);
    spoke *= smoothstep(inner - uSpokeLength, inner, d) * (1.0 - smoothstep(inner, outer, d));

    /* ---- the pool the column stands in ---- */
    float core = (1.0 - smoothstep(0.0, uCoreSize * uRadius, d)) * uCore;

    float breathe = 1.0 + uPulse * sin(uTime * uPulseSpeed * TAU);
    float wash = interior * pow(radial, uFalloff) * uFill;
    float lines = (band * uBoundaryGlow + spoke + core + ring * 0.35) * breathe;
    float body = (wash + veins * 0.9) * breathe;

    float alpha = clamp(body + lines, 0.0, 1.0) * uFade * uOpacity;
    if (alpha < 0.004) discard;

    vec3 color = uColorField * body + uColorEdge * lines;
    gl_FragColor = vec4(color * uGlobalGlow, alpha);
  }
`;

export function createSnareFieldMaterial() {
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uGlobalGlow: { value: 1 },
      uQuadSize: { value: 12 },
      uRadius: { value: 4.4 },
      uBoundary: { value: 0.4 },
      uBoundaryGlow: { value: 2.6 },
      uFill: { value: 0.3 },
      uFalloff: { value: 1.7 },
      uVeins: { value: 1 },
      uVeinScale: { value: 1.5 },
      uVeinSharp: { value: 0.72 },
      uWarp: { value: 0.55 },
      uCrawl: { value: 0.5 },
      uRings: { value: 2.4 },
      uRingSpeed: { value: 0.8 },
      uSpokes: { value: 20 },
      uSpokeLength: { value: 0.5 },
      uSpin: { value: 0.05 },
      uCore: { value: 1.3 },
      uCoreSize: { value: 0.22 },
      uPulse: { value: 0.3 },
      uPulseSpeed: { value: 3.4 },
      uSeed: { value: 0 },
      uFade: { value: 1 },
      uOpacity: { value: 1 },
      uColorField: { value: new Color(0.56, 0.42, 1) },
      uColorEdge: { value: new Color(1, 1, 1) }
    },
    vertexShader: FIELD_VERTEX,
    fragmentShader: FIELD_FRAGMENT
  });
  return material;
}

const DAYSTAR_VERTEX = /* glsl */ `
  uniform vec3  uCentre;
  uniform float uSize;
  uniform float uSpan;

  varying vec2 vPlane;

  void main() {
    // The quad is built around the centre in view space, so it faces the camera
    // whatever the camera does and needs no model matrix of its own.
    vec4 centre = viewMatrix * vec4(uCentre, 1.0);

    // position.xy is the unit quad's -0.5..0.5. vPlane is measured in DISC
    // RADII, so r = 1.0 is exactly the limb wherever the size slider puts it.
    vPlane = position.xy * 2.0 * uSpan;
    centre.xy += position.xy * (2.0 * uSpan * uSize);

    gl_Position = projectionMatrix * centre;
  }
`;

const DAYSTAR_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;

  uniform float uSeed;
  uniform float uFade;
  uniform float uWarm;

  uniform float uSoft;
  uniform float uLimb;
  uniform float uHalo;
  uniform float uHaloFalloff;
  uniform float uFlare;
  uniform float uFlareLength;
  uniform float uFlareWidth;
  uniform float uGranule;
  uniform float uGranuleScale;
  uniform float uGranuleSpeed;

  uniform float uGlow;
  uniform float uOpacity;
  uniform vec3  uColorCore;
  uniform vec3  uColorLow;
  uniform vec3  uColorHalo;

  varying vec2 vPlane;

  ${noiseGLSL}

  void main() {
    float r = length(vPlane);

    /* --- the body, limb-darkened --- */
    float body = 1.0 - smoothstep(1.0 - clamp(uSoft, 0.001, 0.999), 1.0, r);
    float limb = pow(clamp(1.0 - r * r, 0.0, 1.0), max(uLimb, 0.01));
    float cells = fbm4(vec3(vPlane * uGranuleScale, uTime * uGranuleSpeed + uSeed));
    body *= mix(1.0, 0.55 + 0.45 * (cells * 0.5 + 0.5), clamp(uGranule, 0.0, 1.0));

    /* --- the aureole --- */
    float reach = max(uHalo, 1.001);
    float halo = pow(clamp(1.0 - r / reach, 0.0, 1.0), max(uHaloFalloff, 0.05));

    /* --- the streak. Two exponentials, wide in x and tight in y. --- */
    float streak = exp(-abs(vPlane.x) / max(uFlareLength * reach, 1e-3)) *
                   exp(-abs(vPlane.y) / max(uFlareWidth, 1e-3));

    vec3 face = mix(uColorLow, uColorCore, clamp(uWarm, 0.0, 1.0));

    vec3 color = face * (body * (0.35 + 0.65 * limb));
    color += uColorHalo * halo * halo;
    color += uColorHalo * streak * uFlare;

    float alpha = clamp(body + halo * 0.55 + streak * uFlare * 0.5, 0.0, 1.0);
    alpha *= uFade * uOpacity;
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);
    gl_FragColor = vec4(clamp(color, 0.0, 64.0), alpha);
  }
`;

export function createDaystarMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uShaderIntensity: { value: 1 },
      uGlobalGlow: { value: 1 },
      uCentre: { value: new Vector3() },
      uSize: { value: 3 },
      uSpan: { value: 4 },
      uSeed: { value: 0 },
      uFade: { value: 0 },
      uWarm: { value: 0 },

      uSoft: { value: 0.12 },
      uLimb: { value: 0.35 },
      uHalo: { value: 3.4 },
      uHaloFalloff: { value: 2.6 },
      uFlare: { value: 0.55 },
      uFlareLength: { value: 0.85 },
      uFlareWidth: { value: 0.18 },
      uGranule: { value: 0.35 },
      uGranuleScale: { value: 1.6 },
      uGranuleSpeed: { value: 0.15 },

      uGlow: { value: 2.4 },
      uOpacity: { value: 1 },
      uColorCore: { value: new Color(1, 0.98, 0.9) },
      uColorLow: { value: new Color(1, 0.55, 0.22) },
      uColorHalo: { value: new Color(1, 0.78, 0.45) }
    },
    vertexShader: DAYSTAR_VERTEX,
    fragmentShader: DAYSTAR_FRAGMENT
  });
}

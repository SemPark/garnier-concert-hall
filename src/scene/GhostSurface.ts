import * as T from 'three';

/** The body and its ears/tail use the same soft ivory shading in every hall. */
export const GHOST_SURFACE = /* glsl */`
vec3 ghostSurface(vec3 normal,vec3 view,float up){
 float rim=1.-max(dot(normalize(normal),normalize(view)),0.);
 return vec3(.8,.7,.56)*(.6+.32*(.5+.5*up)+.08*rim);
}`;

export function ghostSurfaceMaterial() {
 return new T.ShaderMaterial({
  vertexShader: /* glsl */`
   varying vec3 vNormal;varying vec3 vView;varying float vUp;
   #include <common>
   #include <logdepthbuf_pars_vertex>
   void main(){
    vec4 mv=modelViewMatrix*vec4(position,1.);
    vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);
    vUp=normalize(mat3(modelMatrix)*normal).y;
    gl_Position=projectionMatrix*mv;
    #include <logdepthbuf_vertex>
   }`,
  fragmentShader: /* glsl */`
   varying vec3 vNormal;varying vec3 vView;varying float vUp;
   #include <common>
   #include <logdepthbuf_pars_fragment>
   ${GHOST_SURFACE}
   void main(){
    #include <logdepthbuf_fragment>
    gl_FragColor=vec4(ghostSurface(vNormal,vView,vUp),1.);
    #include <colorspace_fragment>
   }`,
 });
}

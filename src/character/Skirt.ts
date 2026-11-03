import * as T from 'three';

/** The waist stays fixed; the fabric eases onto the lap and drops over the knees. */
export const skirtGeometry=new T.CylinderGeometry(.22,.353,.58,24,10,false);
skirtGeometry.translate(0,-.29,0);
const index=skirtGeometry.index!,normals=skirtGeometry.getAttribute('normal');
skirtGeometry.setIndex(Array.from(index.array).filter((_,i,a)=>normals.getY(a[Math.floor(i/3)*3])<.9));skirtGeometry.clearGroups();
const position=skirtGeometry.getAttribute('position'),seated=position.clone();
for(let i=0;i<position.count;i++){
 const x=position.getX(i),y=position.getY(i),z=position.getZ(i),t=T.MathUtils.clamp(-y/.58,0,1),lap=T.MathUtils.smoothstep(t,0,.6),hem=T.MathUtils.smoothstep(t,.72,1);
 seated.setXYZ(i,x*(1+.06*lap),-.13*lap-.14*hem+z*.12*lap,z*(1-.62*lap)-.46*T.MathUtils.smoothstep(t,.15,1));
}
const copy=skirtGeometry.clone();copy.setAttribute('position',seated);copy.computeVertexNormals();
skirtGeometry.morphAttributes.position=[seated];skirtGeometry.morphAttributes.normal=[copy.getAttribute('normal').clone()];
copy.dispose();skirtGeometry.computeBoundingSphere();

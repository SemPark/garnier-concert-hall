import * as T from 'three';

/** The waist stays fixed; seated, the fabric lies over the level thighs and drops over the knees. */
export const skirtGeometry=new T.CylinderGeometry(.22,.353,.58,24,10,false);
skirtGeometry.translate(0,-.29,0);
const index=skirtGeometry.index!,normals=skirtGeometry.getAttribute('normal');
skirtGeometry.setIndex(Array.from(index.array).filter((_,i,a)=>normals.getY(a[Math.floor(i/3)*3])<.9));skirtGeometry.clearGroups();
const position=skirtGeometry.getAttribute('position'),seated=position.clone();
// Seated at a dining chair the thighs run level and the shins hang down: the cloth falls from the waist onto the lap,
// runs forward over the thighs to the knees, then drops straight down in front of the shins. Behind and at the sides
// it settles onto the seat.
const LAP=-.16,RUN=.15;
for(let i=0;i<position.count;i++){
 const x=position.getX(i),y=position.getY(i),z=position.getZ(i),t=T.MathUtils.clamp(-y/.58,0,1),r=.22+.133*t;
 const front=T.MathUtils.smoothstep(-z/r,.1,.9),onLap=T.MathUtils.smoothstep(t,0,.3),beyond=Math.max(0,t-.3)*.58;
 const run=Math.min(beyond,RUN),drop=Math.max(0,beyond-RUN);
 const settled=LAP-beyond*.25,draped=LAP-drop;
 seated.setXYZ(i,x*(1+.05*onLap),T.MathUtils.lerp(y,T.MathUtils.lerp(settled,draped,front),onLap),z-run*front);
}
const copy=skirtGeometry.clone();copy.setAttribute('position',seated);copy.computeVertexNormals();
skirtGeometry.morphAttributes.position=[seated];skirtGeometry.morphAttributes.normal=[copy.getAttribute('normal').clone()];
copy.dispose();skirtGeometry.computeBoundingSphere();

import * as T from 'three';

export const petEyeDisk=new T.CircleGeometry(1,24);
export const petEyeHighlight=petEyeDisk.clone();
const closedEye=petEyeDisk.getAttribute('position').clone();
// The flat oval closes into a straight stroke, and its catchlight disappears.
for(let i=0;i<closedEye.count;i++){
 const x=closedEye.getX(i),y=closedEye.getY(i);
 const edge=Math.max(Math.abs(x),Math.abs(y))||1;
 closedEye.setXY(i,x/edge,y/edge*.09);
}
petEyeDisk.morphAttributes.position=[closedEye];
petEyeHighlight.morphAttributes.position=[new T.Float32BufferAttribute(new Float32Array(closedEye.count*3),3)];

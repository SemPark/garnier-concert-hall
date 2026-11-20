import * as T from 'three';
const ray=new T.Raycaster(),direction=new T.Vector3(),right=new T.Vector3(),offset=new T.Vector3(),from=new T.Vector3();
const sweepBounds=new T.Box3(),upAxis=new T.Vector3(0,1,0);
const footprint=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]] as const;
/** Sweep the camera's near-plane footprint, including very close wall hits. */
export function constrainCamera(origin:T.Vector3,desired:T.Vector3,walls:readonly T.Object3D[],radius=.22){
 direction.copy(desired).sub(origin);const length=direction.length();if(length<1e-6)return desired.clone();direction.divideScalar(length);
 right.crossVectors(direction,upAxis);if(right.lengthSq()<1e-6)right.set(1,0,0);else right.normalize();
 sweepBounds.set(origin,origin).expandByPoint(desired).expandByScalar(radius*2);
 const nearby=walls.filter(wall=>!wall.userData.cameraBounds||sweepBounds.intersectsBox(wall.userData.cameraBounds));
 if(!nearby.length)return desired.clone();
 let allowed=length;
 for(const [side,up]of footprint){offset.copy(right).multiplyScalar(side*radius);offset.y+=up*radius;from.copy(origin).add(offset);ray.set(from,direction);ray.far=allowed+radius;const hit=ray.intersectObjects(nearby,false).find(hit=>hit.point.y<=(hit.object.userData.openHallCutoff?.value??Infinity));if(hit)allowed=Math.min(allowed,Math.max(0,hit.distance-radius));}
 return origin.clone().addScaledVector(direction,allowed);
}

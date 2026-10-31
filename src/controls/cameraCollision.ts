import * as T from 'three';
const ray=new T.Raycaster(),direction=new T.Vector3(),right=new T.Vector3(),offset=new T.Vector3(),from=new T.Vector3();
/** Sweep the camera's near-plane footprint, including very close wall hits. */
export function constrainCamera(origin:T.Vector3,desired:T.Vector3,walls:readonly T.Object3D[],radius=.22){
 direction.copy(desired).sub(origin);const length=direction.length();if(length<1e-6)return desired.clone();direction.divideScalar(length);
 right.crossVectors(direction,new T.Vector3(0,1,0));if(right.lengthSq()<1e-6)right.set(1,0,0);else right.normalize();
 let allowed=length;
 for(const [side,up]of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){offset.copy(right).multiplyScalar(side*radius);offset.y+=up*radius;from.copy(origin).add(offset);ray.set(from,direction);ray.far=length+radius;const hit=ray.intersectObjects(walls as T.Object3D[],false)[0];if(hit)allowed=Math.min(allowed,Math.max(.025,hit.distance-radius));}
 return origin.clone().addScaledVector(direction,allowed);
}

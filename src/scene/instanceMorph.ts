import * as T from 'three';

/** Allocate by slot capacity, since culled batches may currently draw zero instances. */
export function prepareInstanceMorph(mesh:T.InstancedMesh){
 const count=mesh.geometry.morphAttributes.position?.length??0;if(!count)return;
 const width=count+1,height=mesh.instanceMatrix.count,data=new Float32Array(width*height);
 for(let i=0;i<height;i++)data[i*width]=1;
 mesh.morphTexture=new T.DataTexture(data,width,height,T.RedFormat,T.FloatType);mesh.morphTexture.needsUpdate=true;
}

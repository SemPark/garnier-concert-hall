import * as T from 'three';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {GALLERY_FLOORS} from '../../shared/gallery';
/**
 * The original hall has no staircase in the room; visitors climb in the corridors behind the rear wall.
 * Only invisible walk targets for the gallery floors are needed here.
 */
export function buildStairs(scene:T.Scene){
 const surfaces:T.Mesh[]=[],collision:T.Mesh[]=[];
 for(const r of GALLERY_FLOORS){const target=new T.Mesh(new T.BoxGeometry(r.maxX-r.minX,.01,r.maxZ-r.minZ),new T.MeshBasicMaterial({visible:false}));target.position.set((r.minX+r.maxX)/2,H.balconyHeight-.005,(r.minZ+r.maxZ)/2);scene.add(target);surfaces.push(target);}
 return {surfaces,collision};
}

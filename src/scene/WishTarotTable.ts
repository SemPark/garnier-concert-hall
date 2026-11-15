import * as T from 'three';
import tarotBack from '../assets/tarot/back.svg';
import {buildStoryTableCloth} from './StoryTableCloth';

/** Small cloth laid over the existing table, with three card backs. */
export function buildWishTarotTable(root:T.Group){
 const cloth=buildStoryTableCloth(root,0x754665);

 // All three cards share a single small back texture and one draw call.
 const map=new T.TextureLoader().load(tarotBack);
 map.colorSpace=T.SRGBColorSpace;
 const cardMaterial=new T.MeshStandardMaterial({map,roughness:.8});
 const cardGeometry=new T.PlaneGeometry(.185,.278).rotateX(-Math.PI/2);
 const cards=new T.InstancedMesh(cardGeometry,cardMaterial,3);
 cards.name='소원 타로 뒷면 3장';
 const pose=new T.Object3D();
 for(let i=0;i<3;i++){
  pose.position.set((i-1)*.225,.012,Math.abs(i-1)*.025);
  pose.rotation.y=(i-1)*-.13;
  pose.updateMatrix();
  cards.setMatrixAt(i,pose.matrix);
 }
 cards.computeBoundingSphere();
 root.add(cards);

 return {
  dispose(){
   root.removeFromParent();
   cloth.dispose();
   cards.dispose();cardGeometry.dispose();cardMaterial.dispose();map.dispose();
  },
 };
}

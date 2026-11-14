import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Avatar} from '../src/character/Avatar';

test('tea cup stays outside the face while raised, sipped and lowered',()=>{
 for(const variant of [0,4,5])for(const seated of [false,true]){
  const avatar=new Avatar(0x5a7d8c,undefined,variant);
  avatar.holdingTea=true;
  avatar.update(0,0,seated,false,null,10,10);
  const cup=avatar.rightHand.getObjectByName('모자장수의 찻잔')!;
  const skull=avatar.head.children[0] as T.Mesh;
  const point=new T.Vector3();
  for(let age=0;age<=3.2;age+=.05){
   avatar.update(age,0,seated,false,'drink',age,1/30);
   avatar.root.updateMatrixWorld(true);
   const inverse=skull.matrixWorld.clone().invert();
   cup.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    const transform=inverse.clone().multiply(object.matrixWorld);
    const vertices=object.geometry.getAttribute('position');
    for(let i=0;i<vertices.count;i++){
     point.fromBufferAttribute(vertices,i).applyMatrix4(transform);
     assert.ok(point.length()>=1,`variant ${variant}, seated ${seated}, age ${age.toFixed(2)}: cup inside skull`);
    }
   });
  }
 }
});

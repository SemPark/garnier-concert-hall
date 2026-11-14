import * as T from 'three';
import {box,cylinder,text} from './primitives';
import {PROGRAM_BOOK} from '../../shared/programBook';

function coverLettering() {
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;
 const ink=canvas.getContext('2d')!;
 ink.textAlign='center';ink.textBaseline='middle';
 ink.fillStyle='#ffe3a1';ink.font='bold 123px Georgia, serif';
 ink.fillText('PLEEE',256,190,450);
 ink.font='bold 83px Georgia, serif';
 ink.fillText('PROGRAMME',256,320,460);
 ink.fillStyle='#fff1d2';ink.font='bold 84px sans-serif';
 ink.fillText('공연 프로그램',256,466,460);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const lettering=new T.Mesh(new T.PlaneGeometry(.63,.82),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
 lettering.position.z=.133;
 return lettering;
}

/** One closed folio; the readable pages use the accessible DOM dialog, not dozens of meshes. */
export function buildProgramBook(scene:T.Scene,targets:T.Object3D[]){
 const root=new T.Group(),spot=PROGRAM_BOOK;
 root.name='끝나지 않는 공연 프로그램';root.position.set(spot.x,0,spot.z);root.rotation.y=-Math.PI/8;
 scene.add(root);
 const label=text(root,'눌러서 펼치기',1.6,[0,2.05,0],'#ffe7ae');label.userData.programBook=true;targets.push(label);
 cylinder(root,.28,.08,[0,.04,0],0xa77c3f);
 cylinder(root,.055,1.05,[0,.58,0],0xa77c3f);
 const book=new T.Group();book.position.y=1.2;book.rotation.x=-Math.PI*.26;root.add(book);
 box(book,[.73,.96,.055],[0,0,0],0x551c2c);
 box(book,[.67,.88,.07],[0,0,.05],0xdbc49b);
 box(book,[.73,.96,.035],[0,0,.1],0x702237);
 for(const x of [-.32,.32])box(book,[.016,.85,.012],[x,0,.125],0xd6b264);
 for(const y of [-.42,.42])box(book,[.65,.016,.012],[0,y,.125],0xd6b264);
 const lettering=coverLettering();book.add(lettering);
 const target=new T.Mesh(new T.BoxGeometry(.82,1.05,.2),new T.MeshBasicMaterial({visible:false}));
 target.userData.programBook=true;book.add(target);targets.push(target);
 root.traverse(o=>{o.userData.fullDetail=true;o.userData.preserveSilhouette=true;});
 return {root,dispose(){for(const mesh of [label,lettering]){mesh.material.map?.dispose();mesh.material.dispose();}}};
}

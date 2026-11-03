import {buildEntranceCrest} from './EntranceCrest';
import {buildEntranceGuardians} from './EntranceGuardians';
import * as T from 'three';
import {ATRIUM as A,GRAND_STAIR as S,AMPHITHEATRE_DOOR as DOOR,HALL_INNER_DOOR} from '../../shared/grandStair';
import {box,cylinder,sphere,line,text,wallWithOpenings,material} from './primitives';
import {openDoor,timberDoor} from './GoldenHall';
import {LOBBY_PALETTE as P} from './LobbyDetails';
import {hallImage} from './HallTextures';

/** A masonry landing pavilion with a real passage beneath the upper gallery. */
export function buildLobbyEntrance(scene:T.Scene,cameraWalls:T.Object3D[],walkTargets:T.Object3D[]){
 const front=DOOR.z+.3,rear=A.back-.25,half=S.branchInner;
 const block=box(scene,[half*2,S.rise,rear-S.landingEnd],[0,S.rise/2,(rear+S.landingEnd)/2],P.ivory);block.userData.landmark='entrance-solid-base';cameraWalls.push(block);
 // Close the rear sliver completely, including the ground-floor space behind the old freestanding slab.
 const back=box(scene,[half*2,A.balconyY,.5],[0,A.balconyY/2,A.back-.25],P.ivory);cameraWalls.push(back);
 const room=new T.Group();room.position.set(0,S.rise,front);scene.add(room);
 const walls=wallWithOpenings(room,-half,half,0,A.balconyY-S.rise,0,.45,P.ivory,[{minX:-1.35,maxX:1.35,minY:0,maxY:3.35}]);cameraWalls.push(...walls);
 for(const side of [-1,1]){
  const wall=box(scene,[.4,A.balconyY-S.rise,rear-front],[side*half,(A.balconyY+S.rise)/2,(rear+front)/2],0xc8b48d);cameraWalls.push(wall);
  // Recessed stone panels replace the flat exposed timber either side of the entrance.
  box(room,[2.8,2.85,.12],[side*3.65,1.6,-.3],0xb5a181);
  for(const x of [side*3.65-1.4,side*3.65+1.4])box(room,[.09,2.95,.18],[x,1.6,-.38],P.light);
  for(const y of [.12,3.08])box(room,[2.95,.1,.18],[side*3.65,y,-.38],P.light);
  hallImage(room,'pilaster',.75,2.3,side*3.65,1.6,-.42).rotation.y=Math.PI;
 }
 // The solid pavilion base already supplies the passage floor at S.rise; a second coplanar slab caused z-fighting.
 const passageTarget=new T.Mesh(new T.PlaneGeometry(2.14,rear-front),new T.MeshBasicMaterial({visible:false}));
 passageTarget.rotation.x=-Math.PI/2;passageTarget.position.set(0,S.rise+.01,(rear+front)/2);scene.add(passageTarget);walkTargets.push(passageTarget);
 for(const side of [-1,1])box(scene,[.16,3.55,rear-front],[side*1.45,S.rise+1.78,(rear+front)/2],0xd4c3a2);
 // The roof is the floor of the upper gallery; the portal projects in front of its edge.
 box(scene,[half*2,.42,rear-front],[0,A.balconyY-.21,(rear+front)/2],P.ivory).userData.landmark='entrance-gallery-floor';
 const leaves=new T.Group();leaves.position.set(0,S.rise,DOOR.z);leaves.rotation.y=Math.PI;scene.add(leaves);openDoor(leaves,0,0,2.5,3.3,0);
 const end=new T.Group();end.position.set(HALL_INNER_DOOR.x,S.rise,HALL_INNER_DOOR.z);end.rotation.y=Math.PI;scene.add(end);timberDoor(end,0,0,2.5,3.3,0);
 const facade=new T.Group();facade.position.set(0,S.rise,DOOR.z-.35);scene.add(facade);facade.userData.landmark='entrance-aedicule';
 for(const side of [-1,1]){const x=side*1.7;box(facade,[.6,4.25,.65],[x,2.12,0],0xbda98a);cylinder(facade,.2,3.65,[x,2.1,-.37],0xd4c5a5);box(facade,[.8,.22,.8],[x,.12,-.12],P.deep);}
 box(facade,[4.1,.85,.75],[0,3.85,0],0xbca889);box(facade,[3.25,.58,.1],[0,3.87,-.43],0x423a2e);
 text(facade,'CONCERT HALL',2.95,[0,3.88,-.5],'#e5d3a2').rotation.y=Math.PI;
 for(const y of [3.33,4.36,4.53])box(facade,[4.55,.13,.9],[0,y,-.08],P.light);
 buildEntranceCrest(facade);buildEntranceGuardians(scene);
 // One complete U-shaped railing protects the pavilion roof and joins the rear gallery.
 const railFront=front+.6,railBack=A.back-A.balconyDepth;
 const roofRail=(x1:number,z1:number,x2:number,z2:number)=>{
  for(const [height,radius,color] of [[.06,.12,P.ivory],[.93,.11,0xe2d3a6]])line(scene,new T.Vector3(x1,A.balconyY+height,z1),new T.Vector3(x2,A.balconyY+height,z2),radius,color);
  const count=Math.max(1,Math.round(Math.hypot(x2-x1,z2-z1)/.36));
  // End posts are supplied once at the front corners or by the adjoining rear-gallery rail.
  for(let i=1;i<count;i++){const t=i/count;cylinder(scene,.06,.78,[x1+(x2-x1)*t,A.balconyY+.47,z1+(z2-z1)*t],P.red);}
 };
 roofRail(-half,railFront,half,railFront);
 for(const side of [-1,1]){
  roofRail(side*half,railFront,side*half,railBack);
  box(scene,[.26,1.02,.26],[side*half,A.balconyY+.51,railFront],P.ivory);
 }
}

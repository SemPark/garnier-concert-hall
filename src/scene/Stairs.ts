import * as T from 'three';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {GALLERY_FLOORS,GALLERY_RAIL_HEIGHT,STAIR_CORRIDOR as C,STAIR_DOORS,STAIR_OPENINGS,corridorStairHeight} from '../../shared/gallery';
import {box,cylinder,line,sphere,wallWithOpenings,C as COLOR} from './primitives';
import {hallImageMaterial} from './HallTextures';

const CEILING=14,WALL=0xe3d3b2,DADO=0x8a5e3a;
/**
 * As in the original hall, the staircases are not in the room: each one climbs in a corridor behind the rear
 * wall, so the hall view stays clear and the climb is only seen when a visitor walks through the door.
 */
function corridor(scene:T.Scene,side:number){
 const root=new T.Group();root.userData.landmark='rear-stair';scene.add(root);
 const X=(x:number)=>side*x,width=C.outerX-C.innerX,midX=X((C.innerX+C.outerX)/2),depth=C.back-C.front,midZ=(C.front+C.back)/2;
 // Shell: floor, ceiling, and walls facing inwards (the front wall also hides the corridor from the hall).
 box(root,[width,.1,depth],[midX,-.05,midZ],0x9a7148).material=hallImageMaterial('walnut');
 box(root,[width,.12,depth],[midX,CEILING,midZ],WALL);
 // The front wall has the two real doorways back into the hall; the back wall is solid.
 const lo=Math.min(X(C.innerX),X(C.outerX)),hi=Math.max(X(C.innerX),X(C.outerX));
 wallWithOpenings(root,lo,hi,0,CEILING,C.front+.05,.1,WALL,STAIR_OPENINGS);
 box(root,[width,CEILING,.1],[midX,CEILING/2,C.back-.05],WALL);box(root,[width,1.1,.06],[midX,.55,C.back-.12],DADO);
 for(const x of [C.innerX,C.outerX])box(root,[.1,CEILING,depth],[X(x),CEILING/2,midZ],WALL);
 // Door leaves seen from the corridor side.
 // Open doorways back into the bright hall, seen from the corridor side.
 const leaf=(x:number,y:number,w:number,h:number)=>{
  for(const s of [-1,1])box(root,[.15,h+.2,.08],[X(x)+s*(w/2+.075),y+(h+.2)/2,C.front+.12],COLOR.ivory);box(root,[w+.3,.2,.08],[X(x),y+h+.1,C.front+.12],COLOR.ivory);
  // Threshold bridging the wall thickness between the hall floor and the corridor.
  box(root,[w-.02,.06,.9],[X(x),y-.02,H.rear+.05],0x6b4a30);
 };
 leaf(STAIR_DOORS.lower.x,0,3.8,6.55);leaf(STAIR_DOORS.upper.x,H.balconyHeight,2.15,5.25);
 // One straight walnut flight against the back wall, rising away from the centre.
 const run=(C.flightEnd-C.flightStart)/C.steps,rise=H.balconyHeight/C.steps;
 for(let i=0;i<C.steps;i++){
  const top=(i+1)*rise,x=C.flightStart+(i+.5)*run;
  const tread=box(root,[run+.02,.09,C.flightWidth],[X(x),top-.045,C.flightZ],0x875c36);tread.material=hallImageMaterial('walnut');tread.userData.landmark='stair-tread';
  box(root,[.04,rise-.01,C.flightWidth-.03],[X(C.flightStart+i*run),top-rise/2-.005,C.flightZ],0x503824);
 }
 // A closed stringer below the flight, so the treads read as a solid stair from the passage.
 const slope=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0xcbb68f}));
 const length=Math.hypot(C.flightEnd-C.flightStart,H.balconyHeight);slope.scale.set(length,.3,C.flightWidth-.07);
 slope.position.set(X((C.flightStart+C.flightEnd)/2),H.balconyHeight/2-.3,C.flightZ);slope.rotation.z=side*Math.atan2(H.balconyHeight,C.flightEnd-C.flightStart);root.add(slope);
 // Upper landing in front of the gallery doorway.
 box(root,[C.outerX-C.landingX,.3,depth-.02],[X((C.landingX+C.outerX)/2),H.balconyHeight-.152,midZ],0x9a7148).material=hallImageMaterial('walnut');
 // Handrail with slim balusters along the open side of the flight, and a guard at the landing edge.
 const railZ=C.flightZ-C.flightWidth/2-.03,rail=GALLERY_RAIL_HEIGHT;
 const handrail=line(root,new T.Vector3(X(C.flightStart),rail,railZ),new T.Vector3(X(C.flightEnd),H.balconyHeight+rail,railZ),.04,0x5c3b24);handrail.userData.landmark='stair-handrail';
 for(let i=0;i<=C.steps;i+=2){const x=C.flightStart+i*run,h=corridorStairHeight(x);cylinder(root,.016,rail,[X(x),h+rail/2,railZ],0x353027);}
 line(root,new T.Vector3(X(C.landingX+.05),H.balconyHeight+rail,C.front+.2),new T.Vector3(X(C.landingX+.05),H.balconyHeight+rail,railZ),.04,0x5c3b24);
 for(let z=C.front+.3;z<railZ;z+=.35)cylinder(root,.016,rail,[X(C.landingX+.05),H.balconyHeight+rail/2,z],0x353027);
 // Warm wall lamps light the climb.
 const lamp=new T.MeshLambertMaterial({color:0xffe7bd,emissive:0xffd9a0,emissiveIntensity:.9});
 for(const [x,y]of [[4,3.2],[8.5,6.2],[12.5,10.4],[6,3.2]])sphere(root,.16,[X(x),y,C.back-.2],0xffefd4).material=lamp;
 root.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
 return root;
}

export function buildStairs(scene:T.Scene){
 const surfaces:T.Mesh[]=[],collision:T.Mesh[]=[];
 for(const side of [-1,1])corridor(scene,side);
 for(const r of GALLERY_FLOORS){const target=new T.Mesh(new T.BoxGeometry(r.maxX-r.minX,.01,r.maxZ-r.minZ),new T.MeshBasicMaterial({visible:false}));target.position.set((r.minX+r.maxX)/2,H.balconyHeight-.005,(r.minZ+r.maxZ)/2);scene.add(target);surfaces.push(target);}
 return {surfaces,collision};
}

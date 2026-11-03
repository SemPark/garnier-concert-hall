import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
/** One shared, low-resolution reflection environment for stone, timber and gilt. */
export function interiorEnvironment(renderer:T.WebGLRenderer){
 const generator=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
 const result=generator.fromScene(room,.08);room.dispose();generator.dispose();return result;
}

/** Capture every static caster before camera culling, once per room. Moving avatars retain cheap contact shadows. */
export function bakeArchitectureShadows(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera){
 scene.userData.showArchitectureForShadow?.();
 scene.traverse(o=>{if(o instanceof T.DirectionalLight&&o.castShadow)o.shadow.needsUpdate=true;});
 const target=new T.WebGLRenderTarget(8,8),previous=renderer.getRenderTarget();
 try{renderer.setRenderTarget(target);renderer.render(scene,camera);}finally{renderer.setRenderTarget(previous);target.dispose();}
}

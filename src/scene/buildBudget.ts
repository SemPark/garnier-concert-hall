/** The same scene recipe can run synchronously for geometry consumers or over multiple browser tasks. */
export function finishBuild<T>(steps:Generator<void,T,void>):T{
 let step=steps.next();while(!step.done)step=steps.next();return step.value;
}
/** Yield after a small CPU budget; a timer after rAF gives rendering/input a turn first. */
export async function buildOverFrames<T>(steps:Generator<void,T,void>,cancelled:()=>boolean=()=>false):Promise<T>{
 let started=performance.now();
 try{for(;;){if(cancelled())throw new DOMException('Scene build cancelled','AbortError');const step=steps.next();if(step.done){performance.measure('aurea-build-slice',{start:started,end:performance.now()});return step.value;}
  if(performance.now()-started>=5){performance.measure('aurea-build-slice',{start:started,end:performance.now()});await new Promise<void>(resolve=>{if(document.hidden)setTimeout(resolve,32);else requestAnimationFrame(()=>setTimeout(resolve,0));});started=performance.now();}
 }}finally{steps.return(undefined as T);}
}

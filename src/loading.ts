/** Keep the first loading screen until the first auditorium frame is drawn. */
let initialComplete=false;
function emit(progress:number,label:string){window.dispatchEvent(new CustomEvent('concert-loading',{detail:{progress,label}}));}
export function reportLoading(progress:number,label:string){if(!initialComplete)emit(Math.round(progress*.65),label);}
export function reportInitialHallLoading(progress:number,label:string){if(!initialComplete)emit(progress,label);}
export function completeInitialLoading(){if(initialComplete)return;initialComplete=true;emit(100,'공연장이 준비됐어요');}
export function failLoading(){window.dispatchEvent(new Event('concert-loading-failed'));}

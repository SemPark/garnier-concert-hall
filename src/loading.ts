/** Update the HTML loading screen before React and WebGL are ready. */
export function reportLoading(progress:number,label:string){
 window.dispatchEvent(new CustomEvent('concert-loading',{detail:{progress,label}}));
}
export function failLoading(){window.dispatchEvent(new Event('concert-loading-failed'));}

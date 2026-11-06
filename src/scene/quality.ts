export type RenderQuality='balanced'|'sharp'|'low';
/** Preserve aspect ratio within the selected landscape/portrait resolution envelope. */
export function renderRatio(width:number,height:number,dpr:number,quality:RenderQuality,mobile=false){
 const [long,short]=quality==='sharp'?[1920,1080]:quality==='balanced'?[1600,900]:[1280,720];
 const fit=Math.min(long/Math.max(1,width,height),short/Math.max(1,Math.min(width,height)));
 const cap=quality==='sharp'?Infinity:quality==='balanced'?(mobile?2:1.8):1.5;
 return Math.min(Math.max(1,dpr),cap,fit);
}

/** Bound sustained GPU work independently of ProMotion refresh rate; 'sharp' asks for 60 on every device, phones included. */
export function frameRate(_mobile:boolean,quality:RenderQuality){return quality==='sharp'?60:30;}

/** Keep the same halo strength; spend fewer pixels on the blur rather than removing the candlelight. */
export function bloomResolution(mobile:boolean,quality:RenderQuality){return mobile?(quality==='low'?.25:.375):quality==='low'?.375:.5;}

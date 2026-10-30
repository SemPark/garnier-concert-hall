export type RenderQuality='balanced'|'sharp'|'low';
/** Keep readable edges on Retina screens; never silently drop below CSS resolution. */
export function renderRatio(width:number,height:number,dpr:number,quality:RenderQuality,mobile=false){
 const cap=quality==='sharp'?2:quality==='low'?1:mobile?1.25:1.6;
 const budget=quality==='sharp'?2600000:quality==='low'?1100000:1800000;
 return Math.max(1,Math.min(dpr,cap,Math.sqrt(budget/Math.max(1,width*height))));
}

/** Bound sustained phone GPU work independently of ProMotion refresh rate. */
export function frameRate(mobile:boolean,quality:RenderQuality){return mobile?(quality==='sharp'?60:30):Infinity;}

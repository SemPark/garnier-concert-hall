export type RenderQuality='balanced'|'sharp'|'low';
/** Preserve aspect ratio within the selected landscape/portrait resolution envelope. */
export function renderRatio(width:number,height:number,dpr:number,quality:RenderQuality,mobile=false){
 const [long,short]=quality==='sharp'?[1920,1080]:quality==='balanced'?[1600,900]:[1280,720];
 const fit=Math.min(long/Math.max(1,width,height),short/Math.max(1,Math.min(width,height)));
 const cap=quality==='sharp'?Infinity:quality==='balanced'?(mobile?2:1.8):1.5;
 return Math.min(Math.max(1,dpr),cap,fit);
}

/** Phones target 60 FPS at every quality level, independently of display refresh rate. */
export function frameRate(mobile:boolean,quality:RenderQuality){return mobile||quality==='sharp'?60:30;}

/** Keep the same halo strength; spend fewer pixels on the blur rather than removing the candlelight. */
/** Bloom resolution as a share of the screen. Below 3/8 its blocks are big enough to shimmer on gilded edges whenever a
 * candle moves, so phones on low quality use 3/8 too. */
export function bloomResolution(mobile:boolean,quality:RenderQuality){return mobile?.375:quality==='low'?.375:.5;}

/** Multisampling for the scene buffer: smooth edges where it is affordable. Low quality (the phone default) uses 2×,
 * which already removes most stair-stepping at a fraction of the memory traffic of 4×. */
export function msaaSamples(quality:RenderQuality){return quality==='low'?2:4;}

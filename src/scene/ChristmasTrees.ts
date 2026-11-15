/** The hall's two Christmas trees (the same tree as the lobby's) stand on the flat front wings of the stage,
 * inside the line of the side galleries so the tops rise clear of the gallery rail. */
export const TREE_SPOTS=[{x:-11.3,z:-12.2},{x:11.3,z:-12.2}] as const;
/** No stage candles where a tree would hide them from the audience: under its branches (2.3 m), beside it out to
 * the side wall, and in the strip behind it. */
export function hiddenByTree(x:number,z:number){
 return TREE_SPOTS.some(t=>Math.hypot(x-t.x,z-t.z)<2.6||Math.sign(x)===Math.sign(t.x)&&Math.abs(x)>Math.abs(t.x)-2.7&&z<t.z+2.2&&z>t.z-4.6);
}

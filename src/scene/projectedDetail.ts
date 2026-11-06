/** Fraction of viewport height occupied by a bounding sphere; zoom is included in projectionScale. */
export function projectedHeight(radius:number,distance:number,projectionScale:number){return radius*Math.abs(projectionScale)/Math.max(.01,distance-radius);}
export function musicianInterval(screenFraction:number){return screenFraction<.035?1000/20:1000/30;}

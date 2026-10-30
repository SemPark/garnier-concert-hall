/** Official dimensions are reference data; app units accommodate the existing cast. */
export const GOLDEN_HALL={
 referenceUrl:'https://musikverein.at/en/vermietung/grosser-saal/',
 referenceDimensions:{length:48.9,width:19.1,height:17.75},
 width:32,front:-30,rear:52,height:29.7,balconyHeight:8.3,
 bayCenters:Array.from({length:13},(_,i)=>-24+i*6),
} as const;

export const HALL_CAMERA={eye:[0,15.2,46],look:[0,9,-21]} as const;

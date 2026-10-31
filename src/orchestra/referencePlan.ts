import type {Instrument} from '../character/Avatar';
/** Counted symbol-by-symbol from the user's 1280 × 925 orchestra diagram.
 * Coordinates are symbol centres, not a proposed real-world concert seating standard.
 * Keep this inventory independent of the 3D model and its floor-height calculations. */
export const REFERENCE_INSTRUMENT_COUNTS={
 violin:27,viola:14,cello:10,bass:6,harp:2,piano:1,celesta:1,
 flute:3,piccolo:1,oboe:2,'english-horn':2,clarinet:3,'bass-clarinet':1,bassoon:3,contrabassoon:1,
 horn:7,trumpet:4,trombone:4,tuba:1,
 'bass-drum':1,snare:1,cymbals:1,'sleigh-bells':1,triangle:1,chimes:1,gong:1,timpani:1,xylophone:1,
} satisfies Partial<Record<Instrument,number>>;
export type PlanPoint=readonly [x:number,y:number];
export const STRING_SYMBOLS={
 'first-violins':[[270,705],[370,731],[461,761],[542,787],[268,757],[360,779],[453,811],[542,834],[268,810],[359,827],[267,870],[356,873],[456,868]],
 'second-violins':[[325,478],[287,525],[384,529],[256,573],[361,568],[460,595],[227,624],[336,611],[429,635],[523,662],[325,656],[404,682],[487,708],[626,686]],
 violas:[[1040,486],[990,539],[1081,535],[925,601],[1018,601],[1113,593],[949,651],[1030,655],[1132,658],[841,673],[978,699],[719,685],[781,725],[885,719]],
 cellos:[[800,788],[840,850],[903,779],[939,848],[1001,765],[1041,845],[1100,741],[1122,840],[1186,716],[1204,841]],
 basses:[[980,272],[1043,326],[1107,386],[1154,451],[1211,520],[1254,597]],
} as const satisfies Record<string,readonly PlanPoint[]>;
// Every label in the image, including the auxiliary wind/percussion instruments.
export const OTHER_SYMBOLS:readonly {instrument:Instrument;section:'woodwinds'|'brass'|'percussion'|'harps'|'keyboards';points:readonly PlanPoint[]}[]=[
 {instrument:'flute',section:'woodwinds',points:[[547,632],[579,602],[616,578]]},
 {instrument:'piccolo',section:'woodwinds',points:[[644,548]]},
 {instrument:'oboe',section:'woodwinds',points:[[704,570],[744,585]]},
 {instrument:'english-horn',section:'woodwinds',points:[[786,609],[828,635]]},
 {instrument:'clarinet',section:'woodwinds',points:[[490,548],[537,520],[582,484]]},
 {instrument:'bass-clarinet',section:'woodwinds',points:[[645,469]]},
 {instrument:'bassoon',section:'woodwinds',points:[[723,468],[765,490],[806,515]]},
 {instrument:'contrabassoon',section:'woodwinds',points:[[858,539]]},
 {instrument:'horn',section:'brass',points:[[420,455],[480,414],[554,379],[652,361],[732,366],[804,383],[877,413]]},
 {instrument:'trumpet',section:'brass',points:[[381,410],[464,354],[555,321],[634,299]]},
 {instrument:'trombone',section:'brass',points:[[737,291],[801,309],[864,322],[899,355]]},
 {instrument:'tuba',section:'brass',points:[[963,436]]},
 {instrument:'harp',section:'harps',points:[[190,724],[190,824]]},
 {instrument:'piano',section:'keyboards',points:[[150,372]]},
 {instrument:'celesta',section:'keyboards',points:[[142,549]]},
 {instrument:'bass-drum',section:'percussion',points:[[307,300]]},
 {instrument:'snare',section:'percussion',points:[[383,282]]},
 {instrument:'cymbals',section:'percussion',points:[[450,270]]},
 {instrument:'sleigh-bells',section:'percussion',points:[[490,216]]},
 {instrument:'triangle',section:'percussion',points:[[519,266]]},
 {instrument:'chimes',section:'percussion',points:[[566,172]]},
 {instrument:'gong',section:'percussion',points:[[648,201]]},
 {instrument:'timpani',section:'percussion',points:[[730,172]]},
 {instrument:'xylophone',section:'percussion',points:[[848,194]]},
];

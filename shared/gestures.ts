/** Audience gestures shared by the client, the local preview and the server. */
export const GESTURES=[
 {id:'wave',label:'인사',seconds:2.6},
 {id:'clap',label:'박수',seconds:2.8},
 {id:'bravo',label:'브라보',seconds:2.6},
 {id:'ovation',label:'기립박수',seconds:3.6},
 {id:'bow',label:'목례',seconds:2.4},
 {id:'moved',label:'감동',seconds:3.2},
 {id:'shh',label:'쉿',seconds:2.4},
 {id:'doze',label:'졸기',seconds:4}
] as const;
export type Gesture=typeof GESTURES[number]['id'];
const IDS=new Set<string>(GESTURES.map(g=>g.id));
export function isGesture(value:unknown):value is Gesture{return typeof value==='string'&&IDS.has(value);}
export function gestureSeconds(gesture:Gesture){return GESTURES.find(g=>g.id===gesture)!.seconds;}

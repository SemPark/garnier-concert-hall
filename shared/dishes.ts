/** Dishes a seated diner can order at a dinner table; each is eaten in three bites, then the plate is cleared.
 * A diner may have one food and one drink (coffee, wine) on the table at once. */
export const DISHES=[
 {id:'bread',label:'빵',glyph:'🥖'},
 {id:'soup',label:'수프',glyph:'🥣'},
 {id:'steak',label:'스테이크',glyph:'🥩'},
 {id:'salad',label:'샐러드',glyph:'🥗'},
 {id:'pasta',label:'파스타',glyph:'🍝'},
 {id:'cake',label:'케이크',glyph:'🍰'},
 {id:'coffee',label:'커피',glyph:'☕'},
 {id:'wine',label:'와인',glyph:'🍷'},
] as const;
export type Dish=typeof DISHES[number]['id'];
export const DISH_BITES=3;
const IDS=new Set<string>(DISHES.map(d=>d.id));
export function isDish(value:unknown):value is Dish{return typeof value==='string'&&IDS.has(value);}
/** Drinks are sipped (the drink gesture, cup or glass to the lips) rather than eaten with the fork. */
export const isDrink=(dish:Dish|undefined|null):dish is 'coffee'|'wine'=>dish==='coffee'||dish==='wine';

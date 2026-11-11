// Names hint at the hall's secret without saying it: guests who keep coming back to a concert that never ends.
// Only two kinds of describing word fit the world: a guest who keeps coming back, and a ghostly look. Keep them cute and easy.
const PARTS=['또 온','다시 온','매일 온','늦게 온','먼저 온','몰래 온','돌아온','못 떠난','기다리는','떠도는','맴도는','길 잃은','숨은','투명한','희미한','하얀','뽀얀','반짝이는','둥실둥실','살금살금','낯익은'];
const NOUNS=['손님','관객','단골','친구','짝꿍','단짝','이웃','꼬마','메아리','그림자','귀염둥이'];

/** Every possible name (231): no repeats until that many guests are in at once; a fuller hall has to reuse some. */
export const VISITOR_NAME_COUNT=PARTS.length*NOUNS.length;

/** A random name nobody in `taken` has; repeats only when every name is in use. */
export function visitorName(taken:ReadonlySet<string>=new Set(),random:()=>number=Math.random){
 const start=Math.floor(random()*VISITOR_NAME_COUNT)%VISITOR_NAME_COUNT;
 for(let i=0;i<VISITOR_NAME_COUNT;i++){
  const n=(start+i)%VISITOR_NAME_COUNT,name=`${PARTS[n%PARTS.length]} ${NOUNS[Math.floor(n/PARTS.length)]}`;
  if(!taken.has(name))return name;
 }
 return `${PARTS[start%PARTS.length]} ${NOUNS[Math.floor(start/PARTS.length)]}`;
}

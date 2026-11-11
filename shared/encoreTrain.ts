import {GOLDEN_HALL} from './goldenHall';
/** Authoritative boarding state stays at this safe, walkable return point. */
export const TRAIN_PLATFORM={x:0,y:GOLDEN_HALL.balconyHeight,z:GOLDEN_HALL.rear-4.5};
export const TRAIN_DECK={z:TRAIN_PLATFORM.z+.6,width:7.8,depth:1.35,height:.44};
export const TRAIN_STEP={z:TRAIN_DECK.z-.875,depth:.4,height:.22};
export const TRAIN_EXIT={...TRAIN_PLATFORM,z:TRAIN_STEP.z-.65};

export function onTrainDeck(p:{x:number;y?:number;z:number}){
 return Math.abs(p.x)<=TRAIN_DECK.width/2
  &&Math.abs(p.z-TRAIN_DECK.z)<=TRAIN_DECK.depth/2
  &&Math.abs((p.y??0)-(TRAIN_PLATFORM.y+TRAIN_DECK.height))<.15;
}

export const TRAIN_SEATS=6;
export const TRAIN_PERIOD=120;

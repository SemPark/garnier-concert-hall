import {CHAIRS_PER_TABLE} from './dinnerTables';
import {hasStoryGuest} from './storyGuestSeats';

// The original rear-table chair remains the fallback for older saved state.
export const MAGIC_CHAIR_ID='parterre-128';
export const MAGIC_CHAIR_TRAVEL=.24;

/** Choose the last chair at each table that isn't used by a seated story guest. */
export function isMagicChair(id:string){
 const match=/^parterre-([1-9]\d*)$/.exec(id);
 if(!match)return false;
 const index=Number(match[1])-1;
 const row=Math.floor(index/CHAIRS_PER_TABLE)+1;
 const column=index%CHAIRS_PER_TABLE+1;
 for(let candidate=CHAIRS_PER_TABLE;candidate>=1;candidate--){
  if(!hasStoryGuest(row,candidate))return column===candidate;
 }
 return false;
}

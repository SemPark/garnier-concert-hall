export const TEA_TABLE=23;
export const QUEEN_SEAT={row:21,column:2};
export const TAROT_HOST_SEAT={row:8,column:3};
export const SEATED_STORY_CAST=[
 {role:'queen',...QUEEN_SEAT},
 {role:'vesper',...TAROT_HOST_SEAT},
 {role:'candra',row:8,column:4},
] as const;

export function hasStoryGuest(row:number,column:number){
 return (row===TEA_TABLE&&column<=2)||
  SEATED_STORY_CAST.some(guest=>guest.row===row&&guest.column===column);
}

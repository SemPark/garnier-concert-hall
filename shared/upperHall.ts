import {HALL_CELL_WIDTH,hallCells} from './lowerHall';
/** One complete first-floor portal/ordinary double field carries one door and two windows above. */
export const UPPER_CELLS=hallCells(-27,51.8);
export const UPPER_DOOR_AXES=UPPER_CELLS.map(c=>c.center);
export const UPPER_PANEL_AXES=UPPER_CELLS.slice(1).map(c=>c.start);
export const UPPER_WINDOW_AXES=UPPER_CELLS.flatMap(c=>[c.center-HALL_CELL_WIDTH/4,c.center+HALL_CELL_WIDTH/4]);
export const UPPER_PILASTER_AXES=[...new Set(UPPER_CELLS.flatMap(c=>[c.start,c.center,c.end]))].sort((a,b)=>a-b).filter((z,i,a)=>i===0||z-a[i-1]>.01);

/** Recess second-floor fittings toward the permanent shell while retaining their relief. */
export const UPPER_FINISH_RECESS=.38;
export const UPPER_WALK_LIMIT=15.35;

/** Which hall this visit is in. Each hall has its own stage and server rooms. */
export type HallKind='classic'|'jazz';
const location=(globalThis as {location?:{search?:string}}).location;
const search=new URLSearchParams(location?.search);
const hall=search.get('hall');
// Existing classical program links identify the hall with only the playlist parameter.
const classicalPlaylist=search.get('playlist')?.startsWith('classical-');
export const HALL_KIND:HallKind=hall==='classic'||(hall!=='jazz'&&classicalPlaylist)?'classic':'jazz';
export const JAZZ_HALL=HALL_KIND==='jazz';

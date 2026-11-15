/** Which hall this visit is in. The jazz hall is the same building with a big band on the stage and its own
 * rooms on the server; it is chosen with `?hall=jazz` (switching reloads the page, like changing servers). */
export type HallKind='classic'|'jazz';
const search=(globalThis as {location?:{search?:string}}).location?.search??'';
export const HALL_KIND:HallKind=/[?&]hall=jazz(&|$)/.test(search)?'jazz':'classic';
export const JAZZ_HALL=HALL_KIND==='jazz';

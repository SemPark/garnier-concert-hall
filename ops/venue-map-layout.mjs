// Run with node --import tsx ops/venue-map-layout.mjs [--check].
import { readFile, writeFile } from 'node:fs/promises';
import { ALL_SEATS, SEATS, CAPACITY, STAGE_APRON_Z, seatLabel } from '../shared/venue.ts';
import { DINNER_TABLES, TABLE_RADIUS } from '../shared/dinnerTables.ts';

import { GALLERY_FLOORS } from '../shared/gallery.ts';
import { GOLDEN_HALL } from '../shared/goldenHall.ts';
import { ATRIUM, GRAND_STAIR, LOBBY_BRANCH } from '../shared/grandStair.ts';

const visitorIds = new Set(SEATS.map(seat => seat.id));
const rounded = value => Number(value.toFixed(3));
const seats = ALL_SEATS.map(seat => ({
  id: seat.id, x: rounded(seat.x), z: rounded(seat.z), table: seat.row,
  number: seat.column, floor: seat.level === 'balcony' ? 2 : 1, label: seatLabel(seat), visitor: visitorIds.has(seat.id),
}));
const actions = JSON.parse(await readFile(new URL('../shared/hall-analytics-actions.json', import.meta.url), 'utf8'));
const layout = {
  actions,
  hall: {width: GOLDEN_HALL.width, front: GOLDEN_HALL.front, rear: GOLDEN_HALL.rear},
  gallery: GALLERY_FLOORS, atrium: ATRIUM, stairs: GRAND_STAIR, branch: LOBBY_BRANCH,
  capacity: CAPACITY, stageZ: STAGE_APRON_Z, tableRadius: TABLE_RADIUS, tables: DINNER_TABLES, seats };
const output = new URL('./public/venue-map-layout.js', import.meta.url);
const source = '// Generated from shared venue geometry by ops/venue-map-layout.mjs.\nexport default ' + JSON.stringify(layout) + ';\n';
if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== source) throw new Error('Run node --import tsx ops/venue-map-layout.mjs to refresh the dashboard map.');
} else {
  await writeFile(output, source);
}

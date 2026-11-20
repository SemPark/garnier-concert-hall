import {gestureSeconds} from './gestures';
import {distance, walkable, type Point, type Visitor, type Zone} from './venue';

export const HIGH_FIVE_MS = 1300;
export const HIGH_FIVE_CONTACT_MS = 490;
export const USHER_HIGH_FIVE_ID = 'npc-usher';
export type HighFiveTarget = {id: string; npc?: true};
export type HighFive = HighFiveTarget & {at: number; zone: Zone};
export type HighFivePosition = Point & {sitting: boolean};

export function withinHighFiveReach(zone: Zone, from: HighFivePosition, to: HighFivePosition) {
 const y = from.y ?? 0, otherY = to.y ?? 0;
 if (Math.abs(y - otherY) > .25 || distance(from, to) > (from.sitting || to.sitting ? 1 : 1.35)) return false;
 return walkable(zone, {x:(from.x + to.x) / 2, y:(y + otherY) / 2, z:(from.z + to.z) / 2}, 0);
}

export function activeHighFive(visitor: Visitor, now: number) {
 const event = visitor.highFive;
 return event && visitor.zone === event.zone && now >= event.at && now - event.at < HIGH_FIVE_MS ? event : undefined;
}

export function canHighFive(visitor: Visitor, now: number) {
 return !visitor.dance && visitor.trainSeat === undefined &&
  !((visitor.gesture === 'eat' || visitor.gesture === 'drink') &&
    now - visitor.gestureAt < gestureSeconds(visitor.gesture) * 1000);
}

/** One event on the sender is enough for every client to pose both participants. */
export function startHighFive(sender: Visitor, request: HighFiveTarget | undefined, visitors: readonly Visitor[], now: number) {
 if (!request || typeof request.id !== 'string' || !canHighFive(sender, now)) return;
 const npc = request.npc === true;
 const target = npc ? undefined : visitors.find(v => v.id === request.id && v.id !== sender.id && v.zone === sender.zone);
 if (npc) {
  // NPC positions are evaluated on each client. An NPC request cannot pose a remote visitor.
  if (sender.zone !== 'auditorium' || !/^(?:(?:npc-|tea-party-)[\w-]{1,48}|phantom-gallery)$/.test(request.id)) return;
 } else if (!target || !canHighFive(target, now) || !withinHighFiveReach(sender.zone,
  {...sender, sitting:sender.pose === 'sit'}, {...target, sitting:target.pose === 'sit'})) return;

 for (const visitor of visitors) {
  const event = activeHighFive(visitor, now);
  if (!event || event.zone !== sender.zone) continue;
  if (visitor.id === sender.id || (!event.npc && event.id === sender.id) ||
      visitor.id === target?.id || (event.id === request.id && !!event.npc === npc)) return;
 }
 sender.highFive = {id:request.id, npc:npc ? true : undefined, at:now, zone:sender.zone};
 return true;
}

import { validateClip, type MotionClip } from './clip';
// Only approved, baked JSON enters the venue. The extractor is a separate dev entry.
// Node pose tests run without Vite's asset loader and use the built-in choreography.
const clips = import.meta.env ? import.meta.glob('./clips/*.json', { eager: true, import: 'default' }) : {};
const library = new Map<string, MotionClip>();
for (const [path, value] of Object.entries(clips)) {
  try {
    const clip = validateClip(value);
    if (library.has(clip.id)) throw new Error(`Duplicate motion id: ${clip.id}`);
    library.set(clip.id, clip);
  } catch (error) {
    console.warn(`Ignoring invalid motion ${path}`, error);
  }
}
export const capturedMotion = (id: string) => library.get(id);

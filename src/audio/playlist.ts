import classic from '../../content/playlist.json';
import jazz from '../../content/playlist-jazz.json';
import {JAZZ_HALL} from '../../shared/hallKind';
import type {Playlist} from '../../shared/timeline';
/** One selection shared by playback, the music card, and the lobby programme board. */
const playlist:Playlist=(JAZZ_HALL?jazz:classic) as Playlist;
export default playlist;

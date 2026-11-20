import classic from '../../content/playlist.json';
import autumn from '../../content/playlist-autumn.json';
import fantasy from '../../content/playlist-fantasy.json';
import afternoon from '../../content/playlist-afternoon.json';
import haetsal from '../../content/playlist-haetsal.json';
import jazz from '../../content/playlist-jazz.json';
import warmth from '../../content/playlist-jazz-warmth.json';
import nightscape from '../../content/playlist-jazz-nightscape.json';
import yeoun from '../../content/playlist-jazz-yeoun.json';
import {JAZZ_HALL} from '../../shared/hallKind';
import type {Playlist} from '../../shared/timeline';

export const CONCERT_OPTIONS = [
 {hallId:'classical',playlistId:'classical-carol',label:'클래식 홀 - 캐롤'},
 {hallId:'classical',playlistId:'classical-autumn',label:'클래식 홀 - 가을'},
 {hallId:'classical',playlistId:'classical-fantasy',label:'클래식 홀 - 환상'},
 {hallId:'classical',playlistId:'classical-afternoon',label:'클래식 홀 - 오후'},
 {hallId:'classical',playlistId:'classical-haetsal',label:'클래식 홀 - 햇살'},
 {hallId:'jazz',playlistId:'jazz-carol',label:'재즈 홀 - 캐롤'},
 {hallId:'jazz',playlistId:'jazz-warmth',label:'재즈 홀 - 온기'},
 {hallId:'jazz',playlistId:'jazz-nightscape',label:'재즈 홀 - 야경'},
 {hallId:'jazz',playlistId:'jazz-yeoun',label:'재즈 홀 - 여운'},
] as const;
export type ConcertOption = typeof CONCERT_OPTIONS[number];
export type PlaylistId = ConcertOption['playlistId'];
export const HALL_ID:ConcertOption['hallId'] = JAZZ_HALL ? 'jazz' : 'classical';

export const PLAYLISTS = {
 'classical-carol':classic as Playlist,
 'classical-autumn':autumn as Playlist,
 'classical-fantasy':fantasy as Playlist,
 'classical-afternoon':import.meta.env.VITE_CLASSICAL_AFTERNOON_READY==='true'?afternoon as Playlist:null,
 'classical-haetsal':import.meta.env.VITE_CLASSICAL_HAETSAL_READY==='true'?haetsal as Playlist:null,
 'jazz-carol':jazz as Playlist,
 'jazz-warmth':import.meta.env.VITE_JAZZ_WARMTH_READY==='true'?warmth as Playlist:null,
 'jazz-nightscape':import.meta.env.VITE_JAZZ_NIGHTSCAPE_READY==='true'?nightscape as Playlist:null,
 'jazz-yeoun':import.meta.env.VITE_JAZZ_YEOUN_READY==='true'?yeoun as Playlist:null,
};

export const DEFAULT_PLAYLIST=JAZZ_HALL?'jazz-carol':'classical-carol';
const search=new URLSearchParams(globalThis.location?.search);
const requestedPlaylist=search.get('playlist');
export const INITIAL_PLAYLIST:PlaylistId=CONCERT_OPTIONS.find(
 option=>option.hallId===HALL_ID&&option.playlistId===requestedPlaylist&&PLAYLISTS[option.playlistId],
)?.playlistId??(JAZZ_HALL&&PLAYLISTS['jazz-yeoun']?'jazz-yeoun':DEFAULT_PLAYLIST);
export const LOBBY_ENABLED = true;

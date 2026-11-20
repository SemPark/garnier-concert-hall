import {createRoot} from 'react-dom/client';
import {CONCERT_OPTIONS, PLAYLISTS} from './audio/playlist';

const requested = new URLSearchParams(location.search).get('playlist');
const available = CONCERT_OPTIONS.filter(({playlistId}) => PLAYLISTS[playlistId]);
const selected = available.find(({playlistId}) => playlistId === requested);
const programs = selected ? [selected] : available;

createRoot(document.getElementById('music-credits')!).render(<>
 <h1>음원 출처</h1>
 {programs.map(({playlistId, label}) => {
  const playlist = PLAYLISTS[playlistId];
  if (!playlist) return null;
  return <section key={playlistId}>
   <h2>{label}</h2>
   <ol>
    {playlist.tracks.filter(track => !track.stage).map(({id, title, composer, credit}) => <li key={id}>
     <strong>{title}</strong>
     {credit && <p>
      {credit.artist ?? composer} · <a href={credit.sourceUrl}>{credit.sourceName}</a> · <a href={credit.licenseUrl}>{credit.licenseName}</a>
      {credit.changes && <> · {credit.changes}</>}
     </p>}
    </li>)}
   </ol>
  </section>;
 })}
</>);

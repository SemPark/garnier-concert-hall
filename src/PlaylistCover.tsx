import {CONCERT_OPTIONS,type PlaylistId} from './audio/playlist';
import classicalCarol from './assets/playlist/classical-carol.webp';
import classicalAutumn from './assets/playlist/classical-autumn.webp';
import classicalFantasy from './assets/playlist/classical-fantasy.webp';
import classicalAfternoon from './assets/playlist/classical-afternoon.webp';
import classicalHaetsal from './assets/playlist/classical-haetsal.webp';
import jazzCarol from './assets/playlist/jazz-carol.webp';
import jazzWarmth from './assets/playlist/jazz-warmth.webp';
import jazzNightscape from './assets/playlist/jazz-nightscape.webp';
import jazzYeoun from './assets/playlist/jazz-yeoun.webp';

const covers:Record<PlaylistId,string>={
 'classical-carol':classicalCarol,
 'classical-autumn':classicalAutumn,
 'classical-fantasy':classicalFantasy,
 'classical-afternoon':classicalAfternoon,
 'classical-haetsal':classicalHaetsal,
 'jazz-carol':jazzCarol,
 'jazz-warmth':jazzWarmth,
 'jazz-nightscape':jazzNightscape,
 'jazz-yeoun':jazzYeoun,
};

export function PlaylistCover({playlistId,name}:{playlistId:PlaylistId;name?:string}){
 const title=name??CONCERT_OPTIONS.find(option=>option.playlistId===playlistId)?.label;
 return <img className="playlist-cover" src={covers[playlistId]} alt={`${title} 앨범 커버`}/>;
}

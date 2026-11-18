import {defineConfig} from 'vite';
import {statSync} from 'node:fs';
import warmth from './content/playlist-jazz-warmth.json';
import nightscape from './content/playlist-jazz-nightscape.json';
import yeoun from './content/playlist-jazz-yeoun.json';
import afternoon from './content/playlist-afternoon.json';
import {iphoneProbeBridge} from './scripts/iphone-probe';
import {liveStyles} from './scripts/live-styles';
import {galaxyPresetEditor} from './scripts/galaxy-presets';
export default defineConfig(({mode})=>{
 const iphone=mode==='iphone';
 const audioReady=(list:{tracks:{url:string}[]},count=9)=>list.tracks.length===count
  &&list.tracks.every(track=>statSync('public'+track.url.replace(/^\/api/,''),{throwIfNoEntry:false})?.isFile());
 return {
  base:mode==='pages'?'/garnier-concert-hall/':'/',
  plugins:[iphoneProbeBridge(),liveStyles(),galaxyPresetEditor(),{
   name:'reject-disabled-development-socket',
   configureServer(server){
    server.httpServer?.on('upgrade',(request,socket)=>{
     if(request.headers['sec-websocket-protocol']==='vite-hmr')socket.destroy();
    });
   },
  }],
  define:{
   // Public web-stream ID; the runtime also checks the production origin and explicit visitor consent.
   'import.meta.env.VITE_PLEEE_GA4_ENABLED':JSON.stringify(mode==='production'?'true':'false'),
   'import.meta.env.VITE_GA4_MEASUREMENT_ID':JSON.stringify(mode==='production'?'G-WNQ7FWBJ7N':''),
   'import.meta.env.VITE_JAZZ_WARMTH_READY':JSON.stringify(String(audioReady(warmth))),
   'import.meta.env.VITE_JAZZ_NIGHTSCAPE_READY':JSON.stringify(String(audioReady(nightscape))),
   'import.meta.env.VITE_CLASSICAL_AFTERNOON_READY':JSON.stringify(String(audioReady(afternoon,8))),
   'import.meta.env.VITE_JAZZ_YEOUN_READY':JSON.stringify(String(audioReady(yeoun,10))),
   'import.meta.env.VITE_STATIC_PREVIEW':JSON.stringify(mode==='pages'?'true':'false'),'import.meta.env.VITE_PRESENCE_ORIGIN':JSON.stringify(mode==='pages'?'https://garnier-concert-hall.cleansam7.workers.dev':'')},
  // Vite reloads the page when its development socket reconnects after backgrounding.
  server:{host:iphone?'0.0.0.0':'127.0.0.1',port:5174,strictPort:true,ws:false,proxy:{'/api':{target:`http://127.0.0.1:${iphone?8788:8787}`,ws:true}}},
  build:{target:'es2022',chunkSizeWarningLimit:750},
 };
});

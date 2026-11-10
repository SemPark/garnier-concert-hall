import {defineConfig} from 'vite';
import {iphoneProbeBridge} from './scripts/iphone-probe';
export default defineConfig(({mode})=>{
 const iphone=mode==='iphone';
 return {
  base:mode==='pages'?'/garnier-concert-hall/':'/',
  plugins:[iphoneProbeBridge()],
  define:{'import.meta.env.VITE_STATIC_PREVIEW':JSON.stringify(mode==='pages'?'true':'false'),'import.meta.env.VITE_PRESENCE_ORIGIN':JSON.stringify(mode==='pages'?'https://garnier-concert-hall.cleansam7.workers.dev':'')},
  server:{host:iphone?'0.0.0.0':'127.0.0.1',port:iphone?5174:5173,strictPort:true,proxy:{'/api':{target:`http://127.0.0.1:${iphone?8788:8787}`,ws:true}}},
  build:{target:'es2022',chunkSizeWarningLimit:750},
 };
});

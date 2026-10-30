import {defineConfig} from 'vite';
export default defineConfig(({mode})=>({base:mode==='pages'?'/garnier-concert-hall/':'/',define:{'import.meta.env.VITE_STATIC_PREVIEW':JSON.stringify(mode==='pages'?'true':'false')},server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:8787',ws:true}}},build:{target:'es2022',chunkSizeWarningLimit:750}}));

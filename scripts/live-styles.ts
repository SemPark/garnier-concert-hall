import type {ServerResponse} from 'node:http';
import type {Plugin} from 'vite';

/** Refresh imported styles without letting Vite reload the page on reconnect. */
export function liveStyles():Plugin{
 const clients=new Set<ServerResponse>();
 return {
  name:'pleee-live-styles',
  apply:'serve',
  configureServer(server){
   server.middlewares.use('/__live-styles',(req,res)=>{
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
    res.write(': connected\n\n');
    clients.add(res);
    res.once('close',()=>clients.delete(res));
   });
   const close=server.close.bind(server);
   server.close=()=>{
    for(const client of clients)client.end();
    clients.clear();
    return close();
   };
  },
  transformIndexHtml:()=>[{tag:'script',attrs:{type:'module'},children:`
   const events = new EventSource('/__live-styles');
   events.addEventListener('style', event => {
    const {urls, timestamp} = JSON.parse(event.data);
    for (const path of urls) {
     const url = new URL(path, location.origin);
     url.searchParams.set('t', timestamp);
     import(url.href).catch(error => console.error('Style update failed', error));
    }
   });
   window.addEventListener('pagehide', event => { if (!event.persisted) events.close(); });
  `}],
  hotUpdate({type,file,modules,timestamp}){
   if(this.environment.name!=='client'||type!=='update'||!file.endsWith('.css'))return;
   const urls=modules.filter(mod=>mod.url.endsWith('.css')).map(mod=>mod.url);
   if(!urls.length)return;
   const message='event: style\ndata: '+JSON.stringify({urls,timestamp})+'\n\n';
   for(const client of clients)client.write(message);
  },
 };
}

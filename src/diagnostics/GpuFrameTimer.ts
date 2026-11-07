type TimerExtension={TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number};

/** Samples submitted WebGL work without waiting for the GPU. */
export class GpuFrameTimer{
 readonly extension:TimerExtension|null;
 readonly samples:number[]=[];
 private readonly pending:WebGLQuery[]=[];
 private active:WebGLQuery|null=null;
 private lastSample=-Infinity;

 constructor(private readonly gl:WebGL2RenderingContext){
  this.extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 }

 begin(now:number){
  if(!this.extension||now-this.lastSample<100)return;
  this.lastSample=now;
  this.collect();
  if(this.pending.length>=4)return;
  const query=this.gl.createQuery();
  if(!query)return;
  this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT,query);
  this.active=query;
 }

 end(){
  if(!this.active||!this.extension)return;
  this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
  this.pending.push(this.active);
  this.active=null;
 }

 collect(){
  if(!this.extension)return;
  const gl=this.gl;
  if(gl.getParameter(this.extension.GPU_DISJOINT_EXT)){
   this.dispose();
   return;
  }
  while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const query=this.pending.shift()!;
   const ms=Number(gl.getQueryParameter(query,gl.QUERY_RESULT))/1e6;
   if(Number.isFinite(ms)&&ms>0)this.samples.push(ms);
   gl.deleteQuery(query);
  }
 }

 dispose(){
  this.end();
  for(const query of this.pending) this.gl.deleteQuery(query);
  this.pending.length=0;
 }
}

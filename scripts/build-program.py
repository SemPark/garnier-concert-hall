"""Build the concert program: convert downloaded Commons recordings to 320 kbps MP3 and write content/playlist.json.

Usage: python3 scripts/build-program.py <download-dir-with-meta.json>
The download dir holds the original files fetched from Wikimedia Commons plus meta.json (source, license)."""
import json,os,subprocess,sys,hashlib
src=sys.argv[1];root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));out=os.path.join(root,'public','audio')
meta=json.load(open(os.path.join(src,'meta.json')))
def mp3(key,name,start=None,length=None,fade=None,quiet=False):
  dst=os.path.join(out,name+'.mp3');cmd=['ffmpeg','-y','-loglevel','error']
  # The quiet hall loops the murmur recording, softened to a distant room tone.
  if quiet:cmd+=['-stream_loop','-1']
  if start is not None:cmd+=['-ss',str(start)]
  cmd+=['-i',meta[key]['file'] if os.path.isabs(meta[key]['file']) else os.path.join(src,os.path.basename(meta[key]['file']))]
  if length is not None:cmd+=['-t',str(length)]
  filters=['lowpass=f=700','highpass=f=60','volume=0.3'] if quiet else []
  if fade:filters+=[f"afade=t=in:d={fade[0]}",f"afade=t=out:st={max(0,length-fade[1])}:d={fade[1]}"]
  if filters:cmd+=['-af',','.join(filters)]
  cmd+=['-ac','2','-ar','44100','-codec:a','libmp3lame','-b:a','320k',dst]
  subprocess.run(cmd,check=True)
  d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',dst],capture_output=True,text=True,check=True).stdout)
  return dst,d
def credit(key):
  m=meta[key];return {"sourceName":"Wikimedia Commons","sourceUrl":m["pageUrl"],"licenseName":m["license"] or "Public domain","licenseUrl":m["licenseUrl"] or "https://creativecommons.org/publicdomain/mark/1.0/"}
M='볼프강 아마데우스 모차르트'
# (key, file name, title, work, stage, gap, trim)
program=[
 ('figaro','mozart-figaro-overture','피가로의 결혼 K.492 — 서곡','피가로의 결혼 서곡',None,0,None),
 ('sfx-murmur','hall-quiet-1','곡 사이 — 조용한 공연장',None,'quiet',2,(0,16,(1.5,3),True)),
 ('flute','mozart-magic-flute-overture','마술피리 K.620 — 서곡','마술피리 서곡',None,0,None),
 ('sfx-murmur','hall-quiet-2','곡 사이 — 조용한 공연장',None,'quiet',2,(0,18,(1.5,3),True)),
 ('s35-1','mozart-symphony-35-1','교향곡 35번 D장조 K.385 ‘하프너’ — 1악장 Allegro con spirito','교향곡 35번 ‘하프너’',None,7,None),
 ('s35-2','mozart-symphony-35-2','교향곡 35번 ‘하프너’ — 2악장 Andante','교향곡 35번 ‘하프너’',None,7,None),
 ('s35-3','mozart-symphony-35-3','교향곡 35번 ‘하프너’ — 3악장 Menuetto','교향곡 35번 ‘하프너’',None,7,None),
 ('s35-4','mozart-symphony-35-4','교향곡 35번 ‘하프너’ — 4악장 Finale. Presto','교향곡 35번 ‘하프너’',None,0,None),
 ('sfx-murmur','hall-quiet-3','곡 사이 — 조용한 공연장',None,'quiet',2,(0,24,(1.5,3.5),True)),
 ('s40-1','mozart-symphony-40-1','교향곡 40번 G단조 K.550 — 1악장 Molto allegro','교향곡 40번',None,7,None),
 ('s40-2','mozart-symphony-40-2','교향곡 40번 — 2악장 Andante','교향곡 40번',None,7,None),
 ('s40-3','mozart-symphony-40-3','교향곡 40번 — 3악장 Menuetto. Allegretto','교향곡 40번',None,7,None),
 ('s40-4','mozart-symphony-40-4','교향곡 40번 — 4악장 Finale. Allegro assai','교향곡 40번',None,0,None),
 ('sfx-murmur','hall-quiet-4','곡 사이 — 조용한 공연장',None,'quiet',2,(0,30,(1.5,4),True)),
 ('s34-3','mozart-symphony-34-3','앙코르 — 교향곡 34번 C장조 K.338 — 3악장 Finale','앙코르: 교향곡 34번 피날레',None,0,None),
 ('sfx-murmur','hall-quiet-5','곡 사이 — 조용한 공연장',None,'quiet',2,(0,24,(1.5,4),True)),
]
tracks=[];sizes={}
# A short burst of applause, played only when visitors press clap during the quiet time between pieces.
dst,_=mp3('sfx-applause','hall-clap',9,4.5,(.05,1.6));sizes['/audio/hall-clap.mp3']=os.path.getsize(dst)
for key,name,title,work,stage,gap,trim in program:
  dst,dur=mp3(key,name,*(trim or ()))
  t={"id":name,"title":title,"composer":M if not stage else "공연장 현장음","url":f"/api/audio/{name}.mp3","durationSeconds":round(dur,6),"gapAfterSeconds":gap,"credit":credit(key)}
  if stage:t["stage"]=stage
  if work:t["work"]=work
  tracks.append(t);sizes[f"/audio/{name}.mp3"]=os.path.getsize(dst);print(f"{dur:7.1f}s {name}",flush=True)
old=json.load(open(os.path.join(root,'content','playlist.json')))
json.dump({"version":"mozart-hour-1","epochMs":old["epochMs"],"tracks":tracks},open(os.path.join(root,'content','playlist.json'),'w'),ensure_ascii=False,indent=2)
for f in os.listdir(out):
  if f.endswith('.mp3') and f'/audio/{f}' not in sizes:os.remove(os.path.join(out,f))
sizes.update({k:v for k,v in json.load(open(os.path.join(root,'content','audio-files.json'))).items() if k.endswith('.wav')})
json.dump(sizes,open(os.path.join(root,'content','audio-files.json'),'w'),indent=2)
print('total minutes',round(sum(t["durationSeconds"]+t["gapAfterSeconds"] for t in tracks)/60,1))

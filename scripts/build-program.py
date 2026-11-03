"""Build the concert programs: convert downloaded Commons recordings to 192 kbps MP3 and write content/playlist.json.

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
  # Between pieces: only the sound of the room, the air of a concert hall, with no voices, kept soft and even.
  filters=['highpass=f=60','lowpass=f=9000','acompressor=threshold=0.03:ratio=6:attack=20:release=400'] if quiet else []
  if fade:filters+=[f"afade=t=in:d={fade[0]}",f"afade=t=out:st={max(0,length-fade[1])}:d={fade[1]}"]
  # Every piece at the same average loudness (music -20 LUFS, the murmur between pieces -36), as one static gain:
  # linear loudnorm keeps each recording's own soft and loud passages.
  target=-36 if quiet else -20
  probe=subprocess.run([('info' if c=='error' else c) for c in cmd]+(['-af',','.join(filters+[f'loudnorm=I={target}:TP=-1.5:LRA=20:print_format=json'])])+['-f','null','-'],capture_output=True,text=True,check=True).stderr
  m=json.loads(probe[probe.rindex('{'):probe.rindex('}')+1])
  filters+=[f"loudnorm=I={target}:TP=-1.5:LRA=20:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}"]
  cmd+=['-af',','.join(filters)]
  cmd+=['-ac','2','-ar','44100','-codec:a','libmp3lame','-b:a','192k',dst]
  subprocess.run(cmd,check=True)
  d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',dst],capture_output=True,text=True,check=True).stdout)
  return dst,d
def credit(key):
  m=meta[key];return {"sourceName":"Wikimedia Commons","sourceUrl":m["pageUrl"],"licenseName":m["license"] or "Public domain","licenseUrl":m["licenseUrl"] or "https://creativecommons.org/publicdomain/mark/1.0/"}
# (key, file name, title, work, stage, gap, trim, composer)
Q=lambda n,start,length:('empty-hall',f'hall-quiet-{n}','곡 사이 — 조용한 공연장',None,'quiet',2,(start,length,(2,3.5),True),None)
MZ='볼프강 아마데우스 모차르트';
CO='아르칸젤로 코렐리';SS='서울시립교향악단'
program=[
 # Christmas concert, orchestra only: Corelli's Christmas Concerto, then orchestral carols (Seoul Philharmonic), then an encore.
 ('corelli-1','corelli-christmas-concerto-1','코렐리 — 합주 협주곡 G단조 Op.6 No.8 ‘크리스마스 협주곡’ (1)','크리스마스 협주곡',None,4,None,CO),
 ('corelli-2','corelli-christmas-concerto-2','코렐리 — 합주 협주곡 G단조 Op.6 No.8 ‘크리스마스 협주곡’ (2)','크리스마스 협주곡',None,0,None,CO),
 Q(1,520,15),
 ('xm-joy','christmas-joy-to-the-world','기쁘다 구주 오셨네 (Joy to the World)','기쁘다 구주 오셨네',None,0,None,SS),
 Q(2,540,15),
 ('xm-bethlehem','christmas-o-little-town-of-bethlehem','오 베들레헴 작은 골 (O Little Town of Bethlehem)','오 베들레헴 작은 골',None,0,None,SS),
 Q(3,560,15),
 ('xm-jingle','christmas-jingle-bells','징글벨 (Jingle Bells)','징글벨',None,0,None,SS),
 Q(4,580,15),
 ('xm-merry','christmas-we-wish-you-a-merry-christmas','앙코르 — 우리 모두 즐거운 성탄을 (We Wish You a Merry Christmas)','우리 모두 즐거운 성탄을',None,0,None,SS),
 Q(5,600,15),
]
tracks=[];sizes={}
# A short burst of applause, played only when visitors press clap during the quiet time between pieces.
dst,_=mp3('sfx-applause','hall-clap',9,4.5,(.05,1.6));sizes['/audio/hall-clap.mp3']=os.path.getsize(dst)
for key,name,title,work,stage,gap,trim,composer in program:
  dst,dur=mp3(key,name,*(trim or ()))
  t={"id":name,"title":title,"composer":composer if not stage else "공연장 현장음","url":f"/api/audio/{name}.mp3","durationSeconds":round(dur,6),"gapAfterSeconds":gap,"credit":credit(key)}
  if stage:t["stage"]=stage
  if work:t["work"]=work
  tracks.append(t);sizes[f"/audio/{name}.mp3"]=os.path.getsize(dst);print(f"{dur:7.1f}s {name}",flush=True)
old=json.load(open(os.path.join(root,'content','playlist.json')))
json.dump({"version":"christmas-1","epochMs":old["epochMs"],"tracks":tracks},open(os.path.join(root,'content','playlist.json'),'w'),ensure_ascii=False,indent=2)
for f in os.listdir(out):
  # Keep the lobby room tone, which is made separately from the concert programme.
  if f.endswith('.mp3') and f'/audio/{f}' not in sizes and f!='lobby-ambience.mp3':os.remove(os.path.join(out,f))
sizes.update({k:v for k,v in json.load(open(os.path.join(root,'content','audio-files.json'))).items() if k.endswith('.wav')})
json.dump(sizes,open(os.path.join(root,'content','audio-files.json'),'w'),indent=2)
print('total minutes',round(sum(t["durationSeconds"]+t["gapAfterSeconds"] for t in tracks)/60,1))

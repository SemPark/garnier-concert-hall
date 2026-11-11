"""Build the jazz hall's requested Commons recordings from a directory containing meta.json and originals.
Usage: python3 scripts/build-jazz-program.py /path/to/downloads
The input meta.json records id, title, local, sourceUrl, downloadUrl, author, and license.
"""
import json, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[1]
meta=json.loads((pathlib.Path(sys.argv[1])/'meta.json').read_text())
tracks=[]
for item in meta:
    destination=root/'public/audio'/f"{item['id']}.mp3"
    if not destination.exists():
        base=['ffmpeg','-hide_banner','-nostdin','-i',item['local']]
        probe=subprocess.run(base+['-af','loudnorm=I=-20:TP=-1.5:LRA=20:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
        levels=json.loads(probe[probe.rindex('{'):probe.rindex('}')+1])
        normalize=f"loudnorm=I=-20:TP=-1.5:LRA=20:linear=true:measured_I={levels['input_i']}:measured_TP={levels['input_tp']}:measured_LRA={levels['input_lra']}:measured_thresh={levels['input_thresh']}:offset={levels['target_offset']}"
        subprocess.run(base+['-loglevel','error','-af',normalize,'-map_metadata','-1','-ac','2','-ar','44100','-c:a','libmp3lame','-b:a','192k','-y',str(destination)],check=True)
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(destination)],text=True))
    licensed=item['id']=='jazz-auld-lang-syne'
    performer='Les Deux Love Orchestra' if licensed else 'Airmen of Note · United States Air Force Band'
    # Commons' combined metadata labels the composition PD; the recording is CC BY-SA 3.0.
    license_name='CC BY-SA 3.0' if licensed else 'Public domain (U.S. Air Force)'
    license_url='https://creativecommons.org/licenses/by-sa/3.0/' if licensed else 'https://creativecommons.org/publicdomain/mark/1.0/'
    tracks.append({'id':item['id'],'title':item['title'],'work':item['title'],'composer':performer,'url':f"/api/audio/{item['id']}.mp3",'durationSeconds':duration,'gapAfterSeconds':4,'credit':{'sourceName':'Wikimedia Commons','sourceUrl':item['sourceUrl'],'licenseName':license_name,'licenseUrl':license_url,'artist':performer+' / Eyharburg' if licensed else performer,'changes':'MP3 변환 · 재생 음량 조정'}})
    print(item['id'],round(duration,2),flush=True)
playlist={'version':'jazz-holidays-1','epochMs':1793327798000,'tracks':tracks}
(root/'content/playlist-jazz.json').write_text(json.dumps(playlist,ensure_ascii=False,indent=2)+'\n')
# Keep complete source attribution with the exported audio, not just in the current-track UI.
lines=['# PLEEE jazz recordings','', 'Original sources and credits for the jazz hall. Files were converted to stereo 44.1 kHz / 192 kbps MP3 and loudness adjusted. No excerpts or rearrangements.','']
for t,m in zip(tracks,meta):
    c=t['credit'];lines.extend([f"## {t['title']}",f"- File: {t['id']}.mp3",f"- Performer / credit: {c['artist']}",f"- Original attribution: {m['author']}",f"- Source: {c['sourceUrl']}",f"- Original file: {m['downloadUrl']}",f"- License: {c['licenseName']} — {c['licenseUrl']}",'- Changes: MP3 conversion and loudness adjustment.',''])
(root/'public/audio/JAZZ-CREDITS.md').write_text('\n'.join(lines))

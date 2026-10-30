"""Generate an original, deliberately simple test melody; not the concert soundtrack."""
from array import array
from pathlib import Path
import math, wave
rate=22050
duration=48
samples=array('f',[0.0])*(rate*duration)
def note(midi,start,length,gain):
    hz=440*2**((midi-69)/12)
    begin=int(start*rate)
    for j in range(min(int(length*rate),len(samples)-begin)):
        t=j/rate
        env=min(1,t/.035)*min(1,(length-t)/.22)*math.exp(-t*.9)
        tone=(math.sin(2*math.pi*hz*t)+.22*math.sin(4*math.pi*hz*t)+.07*math.sin(6*math.pi*hz*t))
        samples[begin+j]+=tone*env*gain
melody=[72,76,79,76,74,77,81,77,76,79,83,79,74,77,79,71,72,76,79,84,81,77,74,77,79,76,72,74,71,74,76,72]
for i in range(64):
    note(melody[i%len(melody)],i*.75,.68,.12)
for bar in range(16):
    chord=[[48,55,60],[45,52,57],[53,60,65],[55,59,62]][bar%4]
    note(chord[0],bar*3,2.8,.08)
    for beat in [1,2,3]:
        for tone in chord[1:]:note(tone,bar*3+beat*.75,.65,.037)
peak=max(abs(x) for x in samples)
out=array('h',(int(max(-1,min(1,x/max(1,peak)))*25000) for x in samples))
path=Path(__file__).resolve().parents[1]/'public/audio/preview.wav'
with wave.open(str(path),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(out.tobytes())
print(path)

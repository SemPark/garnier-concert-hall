import test from 'node:test';import assert from 'node:assert/strict';
import {Conducting} from '../src/scene/Conducting';import {ConductCameraInput} from '../src/scene/ConductCameraInput';
test('one finger adjusts view, two fingers zoom, and neither triggers a conducting beat',()=>{
 const d=new Conducting(),input=new ConductCameraInput(d);d.start(0);input.down(1,100,100);input.move(1,150,50);assert.ok(d.angle<0&&d.height>0);assert.equal(d.speed,0);
 input.down(2,250,50);const zoom=d.zoom;input.move(2,350,50);assert.ok(d.zoom<zoom);assert.equal(d.speed,0);input.up(1);input.up(2);const angle=d.angle;input.move(1,0,0);assert.equal(d.angle,angle);
});

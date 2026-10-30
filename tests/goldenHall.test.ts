import test from 'node:test';import assert from 'node:assert/strict';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {DECORATIVE_SEATS,SEATS,SPAWN,walkable} from '../shared/venue';
import {findPath,segmentClear} from '../src/navigation/path';
test('the rectangular hall follows the reference length, width and height proportions',()=>{
 const length=H.rear-H.front;assert.ok(Math.abs(length/H.width-H.referenceDimensions.length/H.referenceDimensions.width)<.01);assert.ok(Math.abs(H.height/H.width-H.referenceDimensions.height/H.referenceDimensions.width)<.01);
 assert.ok(H.balconyHeight>6&&H.balconyHeight<H.height/2);
});
test('dense audience rows preserve a center aisle and both side aisles',()=>{
 assert.equal(DECORATIVE_SEATS.length,320);assert.equal(SEATS.length,8);
 for(const x of [0,-13.5,13.5]){for(let z=5;z<=47;z+=.25)assert.equal(walkable('auditorium',{x,z}),true,`${x},${z}`);const path=findPath('auditorium',SPAWN.auditorium,{x,z:-6});assert.ok(path);let previous=SPAWN.auditorium;for(const p of path){assert.ok(segmentClear('auditorium',previous,p));previous=p;}}
});

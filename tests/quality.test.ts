import test from 'node:test';import assert from 'node:assert/strict';
import {renderRatio,frameRate} from '../src/scene/quality';
test('mobile Retina defaults to a clear render and supports explicit sharper or lighter modes',()=>{assert.equal(renderRatio(390,844,3,'balanced'),1.6);assert.equal(renderRatio(390,844,3,'sharp'),2);assert.equal(renderRatio(390,844,3,'low'),1);});
test('large screens have a pixel budget without automatic sub-CSS blurring',()=>{const ratio=renderRatio(1440,900,2,'balanced');assert.ok(ratio>1&&1440*900*ratio*ratio<=1800001);assert.equal(renderRatio(3840,2160,2,'balanced'),1);});

test('phone balanced mode bounds pixel fill without sub-CSS rendering',()=>{assert.equal(renderRatio(390,844,3,'balanced',true),1.25);assert.equal(renderRatio(844,390,3,'balanced',true),1.25);assert.equal(renderRatio(390,844,3,'sharp',true),2);});

test('phones cap rendering independently of display refresh rate',()=>{assert.equal(frameRate(true,'balanced'),30);assert.equal(frameRate(true,'low'),30);assert.equal(frameRate(true,'sharp'),60);assert.equal(frameRate(false,'balanced'),Infinity);});

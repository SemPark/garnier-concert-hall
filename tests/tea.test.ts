import test from 'node:test';
import assert from 'node:assert/strict';
import {serveTea,TEA_POUR_MS} from '../shared/tea';
import {SEATS} from '../shared/venue';
import {LocalConcert} from '../src/network/LocalConcert';

function diner(column=3){
 const concert=new LocalConcert();
 const seat=SEATS.find(s=>s.row===23&&s.column===column)!;
 Object.assign(concert.visitor,{zone:'auditorium',pose:'sit',seatId:seat.id});
 return concert;
}
test('the teapot serves seated guests in order and rejects duplicate orders',()=>{
 const a=diner(),b=diner(4),now=10000;
 assert.equal(serveTea(a.visitor,[a.visitor,b.visitor],now),true);
 assert.equal(serveTea(b.visitor,[a.visitor,b.visitor],now),true);
 assert.equal(a.visitor.teaReadyAt,now+TEA_POUR_MS);
 assert.equal(b.visitor.teaReadyAt,now+TEA_POUR_MS*2);
 assert.equal(serveTea(a.visitor,[a.visitor,b.visitor],now),false);
 const outsider=new LocalConcert();
 assert.equal(serveTea(outsider.visitor,[],now),false);
});
test('tea waits for pouring, allows three sips and supports discarding or standing',()=>{
 const concert=diner(),v=concert.visitor;
 assert.equal(concert.send({type:'dish',dish:'tea'}),true);
 assert.equal(concert.send({type:'gesture',gesture:'drink'}),false);
 v.teaReadyAt=0;
 for(let sip=1;sip<=3;sip++){
  v.gestureAt=0;
  assert.equal(concert.send({type:'gesture',gesture:'drink'}),true);
  assert.equal(v.drinkSips,sip);
 }
 v.gestureAt=0;
 assert.equal(concert.send({type:'gesture',gesture:'drink'}),false);
 v.drinkEmptyAt=1;concert.snapshot();assert.equal(v.drink,undefined);
 assert.equal(concert.send({type:'dish',dish:'tea'}),true);
 concert.send({type:'clearDish'});assert.equal(v.teaReadyAt,undefined);
 assert.equal(concert.send({type:'dish',dish:'tea'}),true);
 concert.send({type:'release'});assert.equal(v.drink,undefined);
});

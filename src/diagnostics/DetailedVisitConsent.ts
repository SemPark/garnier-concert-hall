import {LocalVisitRecorder} from './LocalVisitRecorder';

/** Separate, tab-only permission for the offline recorder. There is no transport. */
export class DetailedVisitConsent {
 private recorder:LocalVisitRecorder|null=null;
 constructor(private readonly isAllowed:()=>boolean, private readonly makeId:()=>string){}

 private eligible(){
  try{return this.isAllowed();}
  catch{return false;}
 }

 grant(){
  if(!this.eligible()){this.revoke();return null;}
  return this.recorder??=new LocalVisitRecorder(this.makeId());
 }

 current(){
  if(this.recorder&&!this.eligible())this.revoke();
  return this.recorder;
 }

 isCurrent(recorder:LocalVisitRecorder){return this.current()===recorder;}

 revoke(){
  this.recorder?.discard();
  this.recorder=null;
 }
}

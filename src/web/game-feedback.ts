import type {GameEvent} from '../runtime/contracts';
import type {SoundCue} from './audio-settings';

/** Baseline loaded history; only newly committed events may trigger feedback. */
export class FeedbackCursor {
  private session:string|null=null;
  private seen=new Set<string>();
  read(events:GameEvent[],session:string){
    const fresh=this.session===session?events.filter(event=>!this.seen.has(event.id)):[];
    this.session=session;this.seen=new Set(events.map(event=>event.id));return fresh;
  }
}
const RECEIPT_CUES:Record<string,SoundCue>={
  'ring-absorbed':'ascend','ring-skill-preset-replaced':'reroll','ring-skill-choice-rerolled':'reroll','research-candidate-rerolled':'reroll',
  'research-blueprint-created':'craft','blueprint-crafted':'craft','item-equipped':'select','item-unequipped':'back',
  'beast-harvested':'pickup','expedition-beast-harvested':'pickup','expedition-beasts-harvested':'pickup','stored-item-claimed':'pickup','item-looted':'pickup','coins-looted':'pickup',
};
export function receiptCue(event:GameEvent):SoundCue|null {return event.battleView?null:RECEIPT_CUES[event.type]??null;}
export interface Impact {id:string;hp:number;shield:number;miss:boolean;hit:boolean;fell:boolean}
export function battleImpacts(event:GameEvent):Impact[]{
  if(!event.battleView)return [];
  const targets=(event.payload.targets??[]) as Array<{targetId:string;check?:{hit?:boolean}}>,{before,after}=event.battleView;
  return after.units.flatMap(unit=>{
    const prior=before.units.find(v=>v.id===unit.id);if(!prior)return [];
    const target=targets.find(t=>t.targetId===unit.id);
    const hp=unit.hp-prior.hp,shield=unit.shield-prior.shield,miss=target?.check?.hit===false,hit=target?.check?.hit===true;
    const fell=prior.hp>0&&unit.hp<=0;
    return hp||shield||miss||hit||fell?[{id:unit.id,hp,shield,miss,hit,fell}]:[];
  });
}
export function battleCues(event:GameEvent):SoundCue[]{
  const impacts=battleImpacts(event),cues:SoundCue[]=[];
  if(impacts.some(i=>i.hp<0||i.shield<0||i.hit))cues.push('hit');
  if(impacts.some(i=>i.hp>0))cues.push('heal');
  if(impacts.some(i=>i.shield>0))cues.push('shield');
  if(impacts.some(i=>i.miss))cues.push('miss');
  if(impacts.some(i=>i.fell))cues.push('fall');
  const outcome=(event.payload.battleResult as any)?.outcome;
  if(outcome==='胜利'||outcome==='敌方逃散')cues.push('victory');
  else if(outcome==='败北'||outcome==='认输')cues.push('defeat');
  return cues.slice(-4);
}

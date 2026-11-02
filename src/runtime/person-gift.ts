import {rules} from '../rules';
export function respondNpcGift(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['commitmentId','decision'].includes(k)))throw Error('赠物回应只接受原承诺编号与本人决定');
 const r=rules.gifts.record(state,input.commitmentId),d=input.decision;
 if(!r||r.personId===state.角色.主控单位ID)throw Error('主控须手动决定；此入口只回应NPC本人收到的赠物');
 if(!d||Object.keys(d).some(k=>!['accept','reason'].includes(k)))throw Error('赠物回应字段无效');
 return rules.world.settleIntent(state,{id:sourceId,type:'respond-controlled-gift',actorId:r.personId,commitmentId:r.id,accept:d.accept,reason:d.reason});
}

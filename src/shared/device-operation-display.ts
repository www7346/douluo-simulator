export const DEVICE_OPERATION_LABELS:Record<string,string>={'device.lock':'闭合锁具','device.unlock':'打开锁具','device.suppress-lock':'暂时抑制锁效','device.break-rule':'破坏规则器体','device.analyze-lock':'分析锁结构','device.create-key':'创造对应钥匙','device.arcane-lock':'施加魔法锁'};
export function deviceLockLabel(locks:any[],lockId?:string){
 const lock=locks.find(v=>v.lockId===lockId);if(!lock)return '器体';
 const overlays=locks.filter(v=>v.origin==='arcane'),number=overlays.length>1?` ${overlays.findIndex(v=>v.lockId===lockId)+1}`:'';
 return `${lock.origin==='arcane'?`附加魔法锁${number}`:({mechanical:'机械锁',arcane:'魔法锁',rule:'规则锁'} as Record<string,string>)[lock.definition.kind]??'锁'} · 品级${lock.definition.rank}`;
}
export function deviceOperationKey(intent:any){return [intent.itemId??intent.targetItemId,intent.lockId,intent.nodeId??intent.deviceNodeId,intent.knowledgeId].map(v=>v??'').join('|');}
export function deviceOperationOutcome(effect:any){
 const label=DEVICE_OPERATION_LABELS[effect.type];if(!label||typeof effect.success!=='boolean')return '';
 const check=effect.check?`（${effect.check.total} / 难度${effect.check.dc}）`:'';
 const outcome=effect.success?({'device.analyze-lock':'已掌握对应锁结构，可制造对应钥匙','device.create-key':'实体钥匙已收入行囊','device.arcane-lock':'已增加独立魔法锁层'} as Record<string,string>)[effect.type]??'成功':'未成功，本次费用已结算';
 return `${label}：${outcome}${check}`;
}

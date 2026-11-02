export interface ModelRecoveryState {startedAt:number;used:{kind:string;elapsedMs:number}[]}
export interface ModelRecoveryStore {read():ModelRecoveryState;update(edit:(state:ModelRecoveryState)=>void):ModelRecoveryState}
/** Shared by the gateway and its owning workflow; settings remain unchanged. */
export class ModelRecoveryBudget {
 private state:ModelRecoveryState={startedAt:Date.now(),used:[]};
 constructor(readonly maximum=2,private store?:ModelRecoveryStore){}
 private read(){return this.store?.read()??this.state;}
 get started(){return this.read().startedAt;}
 get remaining(){return Math.max(0,this.maximum-this.read().used.length);}
 require(count=1){if(this.remaining<count)throw Error('本轮额外恢复次数已用尽；已结算结果保留，正文未发布');}
 consume(kind:string){
  const edit=(state:ModelRecoveryState)=>{if(state.used.length>=this.maximum)throw Error('本轮额外恢复次数已用尽；已结算结果保留，正文未发布');if(['semantic-rewrite','plan-repair'].includes(kind)&&state.used.some(r=>r.kind===kind))throw Error('本轮已经修复过正文');state.used.push({kind,elapsedMs:Math.max(0,Date.now()-state.startedAt)});};
  if(this.store)this.store.update(edit);else edit(this.state);
 }
 snapshot(){const state=this.read();return {maximum:this.maximum,used:structuredClone(state.used),remaining:Math.max(0,this.maximum-state.used.length),elapsedMs:Math.max(0,Date.now()-state.startedAt)};}
}

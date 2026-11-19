/** A fresh, explicit creation action gets a bounded retry budget, not a new character or checkpoint. */
export function validateCreationAttempt(state:any,kind:string,input:any):void{
 if(input?.creationAttemptId===undefined)return;
 if(kind!=='generation'||input.type!=='player.create'||typeof input.creationAttemptId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.creationAttemptId))throw Error('角色创建重试编号无效');
 if(state?.角色?.已建立)throw Error('角色已经建立，请继续当前旅程');
}

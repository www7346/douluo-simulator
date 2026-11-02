/** Display selections can contain shop metadata. Only native command fields cross the transaction boundary. */
export function nativeEconomyCommand(type:string,selection:{templateId?:string;itemId?:string;fingerprint?:string},quantity:number,maximumGold?:number){
 switch(type){
  case 'supply.buy':return {type,payload:{templateId:selection.templateId,quantity,maximumGold}};
  case 'item.sell':return {type,payload:{itemId:selection.itemId,quantity}};
  case 'material.sell':return {type,payload:{fingerprint:selection.fingerprint,quantity}};
  default:throw Error('请选择已有的购买或出售操作');
 }
}

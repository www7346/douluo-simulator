import {rules} from '../rules';
import {playerText} from './player-text';

/** Both the host and the consignment panel read the rules service's complete bundle quote. */
export function auctionConsignmentQuote(state:any,input:Record<string,any>){
 try{
  const quote=rules.commerceAuction.quoteAsset(state,{...input,actorId:state.角色.主控单位ID});
  return {available:true,valueGold:quote.valueGold,equipmentValueGold:quote.equipmentValueGold,equipmentRecoveryGold:quote.equipmentRecoveryGold,
   minimumReserveGold:quote.minimumReserveGold,defaultReserveGold:quote.defaultReserveGold,defaultNetGold:quote.defaultNetGold,
   devices:quote.devices.map((row:any)=>({itemId:row.itemId,name:row.name,valueGold:row.valueGold,recoveryGold:row.recoveryGold}))};
 }catch(error){return {available:false,reason:playerText((error as Error).message,state)};}
}

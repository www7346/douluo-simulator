import {rules} from '../rules';
import {materialName,materialPartName,playerText} from './player-text';
export function storyMaterialCraftEvidence(stack:any){return {craftValue:stack.unitValue,...rules.expedition.materialBridgeEvidence(stack)};}
/** Read-only inventory projection shared by scene context and the exact query receipt. */
export function storyMaterialFacts(state:any,actorId=state.角色?.主控单位ID){
 const stocks=(value:Record<string,any>)=>Object.values(value).filter(stack=>stack.quantity>0).map(stack=>({fingerprint:stack.fingerprint,name:materialName(stack,state),description:playerText(stack.description,state,'')||null,appearancePart:materialPartName(stack,state),quantity:stack.quantity,quality:stack.quality,provenance:stack.provenance,...storyMaterialCraftEvidence(stack)}));
 return {permanent:stocks(rules.expedition.personMaterials(state,actorId)),expeditionCargo:stocks(rules.expeditionContext.forActor(state,actorId)?.tempMaterials??{})};
}

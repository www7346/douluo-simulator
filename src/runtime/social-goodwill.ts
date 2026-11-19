import {rules} from '../rules';

// Only an accepted delivery or fulfilled promise calls this boundary.
export function recordGoodwill(state:any,targetId:string,sourceId:string,kind:'gift'|'promise'){
 return rules.world.recordPlayerAttitude(state,targetId,sourceId,kind);
}

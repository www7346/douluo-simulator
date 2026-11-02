import {ModelGatewayError,type ModelGateway,type ChatMessage} from '../runtime/model-gateway';
import {ModelPromptCapacityError} from '../runtime/model-prompt-check';

/** Pure compilation only. Never release a reservation after transport begins. */
export function preflightDesignAdvice(gateway:ModelGateway,messages:ChatMessage[],task:string){
 try{return gateway.checkPrompt?.(messages,{task,json:true});}
 catch(error){
  // Keep the already public gateway capacity reason without exposing arbitrary
  // prompt/profile exceptions through the worker's known-error boundary.
  if(error instanceof ModelPromptCapacityError)throw new ModelGatewayError('invalid-response',error.message,{cause:error});
  throw error;
 }
}

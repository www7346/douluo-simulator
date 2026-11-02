import type {CloudReceipt} from '../cloud/protocol';
import type {ModelEvidenceConsumer} from '../shared/model-evidence';
import type {GameCommand,GameSnapshot,TransactionResult} from './contracts';
import type {ModelLog} from './model-gateway';
import type {CalculationWork} from '../shared/calculation-progress';

export interface EngineResult extends TransactionResult {cloudReceipt?:CloudReceipt}
/** Shared by direct rules and receipt-backed workers on this device or a server. */
export interface RuntimeEngine {
  onCalculationWork?:(work:CalculationWork)=>void;
  readonly commitProtocol?:'direct'|'acknowledged';
  /** Compatibility with older injected adapters. */
  readonly remote?:boolean;
  readonly revision?:number;
  getSnapshot():GameSnapshot;
  readSnapshot?():GameSnapshot;
  restore(snapshot:GameSnapshot):void|Promise<void>;
  connect?(snapshot?:GameSnapshot):Promise<void>;
  dispatch(command:GameCommand):EngineResult|Promise<EngineResult>;
  requestBattleTakeover?(operationId:string,revision:number):Promise<void>;
  dispatchReadOnly?(command:GameCommand):EngineResult|Promise<EngineResult>;
  accept?(snapshot:GameSnapshot,receipt?:CloudReceipt):void;
  acknowledge?(resultId:string,revision:number):Promise<void>;
  query?(name:string,input:Record<string,unknown>,signal?:AbortSignal):Promise<any>;
  model?(request:Record<string,unknown>,signal?:AbortSignal,observe?:(log:ModelLog)=>void,consume?:(result:any)=>Promise<void>,retainEvidence?:ModelEvidenceConsumer):Promise<any>;
  discardRetainedModel?(expectedJobId?:string):Promise<void>;
  hasRetainedModel?():boolean;
  listBattleActions(actorId:string):any[]|Promise<any[]>;
  previewBattleAction(input:Record<string,unknown>,signal?:AbortSignal):Record<string,any>|Promise<Record<string,any>>;
  previewWorldIntent(input:Record<string,unknown>,signal?:AbortSignal):Record<string,any>|Promise<Record<string,any>>;
  previewExpeditionRisk(dungeonId:string,difficultyId:string):Record<string,any>|Promise<Record<string,any>>;
  close?():Promise<void>;
  connectionDiagnostics?():Record<string,unknown>;
}

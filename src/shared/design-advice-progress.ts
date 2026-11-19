/** Unadopted model proposals, never a replacement for rule validation. */
export interface DesignAdviceProgress {version:1;requested?:Array<'initial'|'repaired'>;initial?:unknown;repaired?:unknown}
export interface DesignAdviceProgressStore {
 read():DesignAdviceProgress;
 write(stage:'initial'|'repaired',value:unknown):void;
 reserve?(stage:'initial'|'repaired'):void;
}

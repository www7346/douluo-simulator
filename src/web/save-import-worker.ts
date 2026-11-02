import {readFullSaveBundle} from '../shared/save-bundle';
import {readSaveFile} from './file-transfer';

self.onmessage=async(event:MessageEvent<File|string>)=>{
  try{const input=event.data;const text=typeof input==='string'?input:await readSaveFile(input);
    self.postMessage({bundle:readFullSaveBundle(text)});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:'无法读取存档'});}
};

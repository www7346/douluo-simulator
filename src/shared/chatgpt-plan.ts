export const CHATGPT_API='https://api.openai.com/v1';
export interface ModelChannelSettings {channelMode?:'custom'|'vertex'|'chatgpt';chatgptAccountId?:string}
export interface ChatGPTAccount {id:string;label:string;email:string;connected:boolean;sharing:boolean}
export interface DesktopChatGPT {
  accounts():Promise<ChatGPTAccount[]>;
  signIn(id?:string):Promise<ChatGPTAccount>;
  cancel():Promise<void>;
  disconnect(id:string):Promise<{revoked:boolean}>;
  permit(id:string,target:string,method:string):Promise<string>;
  usage():Promise<void>;
}

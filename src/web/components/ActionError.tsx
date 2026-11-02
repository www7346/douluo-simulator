import {Button} from '../components';

export default function ActionError({message,onDismiss}:{message:string;onDismiss:()=>void}){
  return message?<div role="alert"><p>{message}</p><Button variant="ghost" onClick={onDismiss}>关闭提示</Button></div>:null;
}

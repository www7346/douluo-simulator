import type {KeyboardEvent} from 'react';

export function sendMessageOnEnter(event:KeyboardEvent<HTMLTextAreaElement>,send?:()=>void){
 if(event.key!=='Enter'||event.defaultPrevented||event.shiftKey||event.ctrlKey||event.altKey||event.metaKey)return;
 // Some input methods report 229 on the Enter that commits a candidate.
 if(event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)return;
 event.preventDefault();
 if(event.repeat)return;
 if(send){send();return;}
 const form=event.currentTarget.form;
 const button=form?.querySelector<HTMLButtonElement>('button[type="submit"]:enabled');
 if(form&&button)form.requestSubmit(button);
}

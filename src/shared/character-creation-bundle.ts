import {saveCodec} from './save-codec';

function appearanceAttachments(attachments:Array<Record<string,any>>):Array<Record<string,any>> {
  if(attachments.some(item=>!['avatar','figure'].includes(item.kind))||['avatar','figure'].some(kind=>attachments.filter(item=>item.kind===kind).length>1))throw new Error('角色方案只可携带一幅头像和一幅立绘');
  return attachments;
}

/** Portrait bytes stay local while the creation service validates the character configuration. */
export function readCharacterCreationBundle(input:string):{draft:Record<string,any>;attachments:Array<Record<string,any>>;serializedDraft:string} {
  const envelope=saveCodec.parseEnvelope(input,{expectedKinds:[saveCodec.KINDS.character],rulesetVersion:saveCodec.VERSION});
  const attachments=appearanceAttachments(envelope.attachments??[]);
  const textOnly=saveCodec.createEnvelope(saveCodec.KINDS.character,envelope.payload,{rulesetVersion:envelope.rulesetVersion,summary:envelope.summary,exportedAt:envelope.exportedAt});
  return {draft:envelope.payload,attachments,serializedDraft:saveCodec.stringifyEnvelope(textOnly)};
}

export function withCharacterCreationAppearance(input:string,attachments:Array<Record<string,any>>):string {
  const envelope=saveCodec.parseEnvelope(input,{expectedKinds:[saveCodec.KINDS.character],rulesetVersion:saveCodec.VERSION});
  return saveCodec.stringifyEnvelope(saveCodec.createEnvelope(saveCodec.KINDS.character,envelope.payload,{rulesetVersion:envelope.rulesetVersion,summary:envelope.summary,exportedAt:envelope.exportedAt,attachments:appearanceAttachments(attachments)}));
}

import {rules} from '../rules';
const clone=<T,>(value:T):T=>structuredClone(value);
export function buildCreationDraft(input: {
  name: string;
  age: number;
  gender: string;
  origin: string;
  appearance: string;
  soulCount: number;
  soulIds: string[];
  description?: string;
}): Record<string, any> {
  const selected = Array.from({length: Math.max(1, Math.min(3, input.soulCount))}, (_, index) =>
    input.soulIds[index],
  );
  const martialSoulDrafts = selected.map((id, index) => {
    const template = rules.world.MARTIAL_SOUL_TEMPLATES[id];
    if (!template) return rules.martialSoul.normalizeDraft({draftId:`creation-${index+1}`});
    const definition = clone(template?.结构化武魂?.definition ?? template?.结构化武魂 ?? {});
    return {
      ...definition,
      name: String(template?.名称 ?? `武魂${index + 1}`),
      sourceDescription: input.description?.trim() || definition.sourceDescription || `希望拥有${template?.名称 ?? '属于自己的武魂'}，踏上魂师的旅途。`,
      playerConfirmed: true,
    };
  });
  return {
    mode: 'awakening',
    name: input.name.trim() || '无名魂师',
    age: Math.max(6, Math.min(120, Math.round(input.age || 12))),
    gender: input.gender || '未知',
    origin: input.origin.trim() || '圣魂村',
    appearance: input.appearance.trim() || '眉目清朗，穿着便于行动的布衣。',
    background:{id:'custom',perspective:'player',contacts:[{name:'林照',relationship:'friends',history:'幼时相识的旧友，曾一同处理村中的日常杂事。',contact:true},{name:'周砚',relationship:'mentor',history:'教过你识字与基础修习的师长，仍愿意听你讲述近况。',contact:true}],ringChoices:[]},
    opening: rules.talents.emptySelection(),
    attributes: Object.fromEntries(rules.foundation.ATTRIBUTE_KEYS.map((key:string)=>[key,rules.world.CREATION_RULES.attributeBaseline])),
    martialSoulCount: martialSoulDrafts.length,
    martialSoulDrafts,
  };
}

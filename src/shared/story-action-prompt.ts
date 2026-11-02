/** Exact shared constraints; optional references must not become required by inference. */
export function sharedActionReferenceRules(actions:ReadonlyArray<{kind:string;exactlyOneOf?:string[][]}>){
 const rules=new Map<string,{fields:string[];actions:string[]}>();
 for(const action of actions)for(const fields of action.exactlyOneOf??[]){const key=JSON.stringify(fields),rule=rules.get(key)??{fields:[...fields],actions:[]};rule.actions.push(action.kind);rules.set(key,rule);}
 return [...rules.values()];
}
export function storyActionCatalog(actions:ReadonlyArray<{kind:string;parameters:string[];integerParameters?:string[];exactlyOneOf?:string[][]}>){
 return actions.map(({kind,parameters,integerParameters,exactlyOneOf,...constraints})=>{
  const emitted=new Set<string>(),signature=parameters.flatMap(parameter=>{
   const pair=exactlyOneOf?.find(fields=>fields.includes(parameter));if(!pair)return [parameter];
   const choice=pair.join('|');if(emitted.has(choice))return [];emitted.add(choice);return [choice];
  }).join(',');
  return Object.keys(constraints).length?[kind,signature,constraints]:[kind,signature];
 });
}

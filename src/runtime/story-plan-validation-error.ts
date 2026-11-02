/** Machine-readable validation evidence for an unexecuted proposal, not a new rule. */
export interface StoryPlanValidationIssue {
 instancePath:string;
 keyword:string;
 submitted:unknown;
 reference:{instancePath:string;value:unknown};
 evidence?:{uncoveredInput:{start:number;end:number;text:string}[];unmatchedSourceIndexes:number[]};
}
export class StoryPlanValidationError extends Error {
 constructor(message:string,readonly issue:StoryPlanValidationIssue,readonly issues:StoryPlanValidationIssue[]=[issue]){super(message);this.name='StoryPlanValidationError';}
}

/** Describe the existing object schema at its actual location; never move or drop fields. */
export function storyPlanObjectIssues(value:unknown,allowed:readonly string[],path:string):StoryPlanValidationIssue[]{
 const reference={instancePath:path,value:{allowedFields:[...allowed]}};
 if(!value||typeof value!=='object'||Array.isArray(value))return [{instancePath:path,keyword:'object-type',submitted:value??null,reference}];
 return Object.entries(value).filter(([key])=>!allowed.includes(key)).map(([key,submitted])=>({
  instancePath:path+'/'+key.replaceAll('~','~0').replaceAll('/','~1'),keyword:'additional-property',submitted,reference,
 }));
}

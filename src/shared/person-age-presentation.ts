import displayLabels from './display-labels.json';

const people:Record<string,{name:string;apparentAge?:number}>=displayLabels.people;
const persistent:Record<string,string>=displayLabels.persistentPeople;

/** Appearance is a label; it never replaces an unknown real age or a life clock. */
export function personAgePresentation(person:any,characterId?:string){
 const b=person?.background,slot=b?.actors?.[b.perspective];
 const id=characterId??person?.canonicalId??person?.扩展?.角色库ID??b?.canonicalPlayer?.characterId??(slot?.source==='canon'?slot.characterId:undefined)??persistent[person?.id]??person?.id;
 const age=typeof person?.age==='number'&&Number.isFinite(person.age)&&person.age>0?person.age:null;
 const apparentAge=age===null?people[id]?.apparentAge:undefined;
 return {age,apparentAge,label:apparentAge?`${apparentAge}岁（表面年龄）`:age?`${age}岁`:'年龄未载'};
}

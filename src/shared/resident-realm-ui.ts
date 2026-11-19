/** Read-only UI selection. Mechanical ownership and action legality remain server checked. */
export function ownedNineBeautiesSouls(state:any,personId=state?.角色?.主控单位ID):any[]{
 if(!personId)return [];
 return (state?.成长?.列表?.[personId]?.武魂ID列表??[]).map((id:string)=>state?.武魂?.列表?.[id]).filter((soul:any)=>soul?.持有者单位ID===personId&&soul?.扩展?.结构化武魂?.mechanicalHooks?.some((hook:any)=>hook.type==='independentRealm'&&hook.parameter==='nine-beauties-v1'));
}

export function residentRingSlot(realms:any[],soulId:string,ordinal:number):any|null{
 return realms?.find(realm=>realm.soulId===soulId)?.slots?.find((slot:any)=>slot.index===ordinal)??null;
}

/** An outside deployment is a view filter, never an invented interior position. */
export const OUTSIDE_REALM_VIEW='outside';
export function initialRealmSelection(realm:any,personId?:string):{regionId:string;personId:string}{
 const person=realm.slots?.find((slot:any)=>slot.personId===personId);
 if(person)return {regionId:person.regionId||OUTSIDE_REALM_VIEW,personId:person.personId};
 const region=realm.regions?.find((entry:any)=>entry.id==='common')??realm.regions?.[0];
 const resident=realm.slots?.find((slot:any)=>slot.regionId===region?.id);
 return {regionId:region?.id??OUTSIDE_REALM_VIEW,personId:resident?.personId??''};
}

export function residentsInRealmRegion(realm:any,regionId:string):any[]{
 return (realm.slots??[]).filter((slot:any)=>regionId===OUTSIDE_REALM_VIEW?!slot.regionId:slot.regionId===regionId);
}

export function realmArrangementPrompt(realmName:string,personName?:string,regionName?:string):string{
 return personName?`关于${realmName}中的${personName}，我想安排：`:`关于${realmName}${regionName?'的'+regionName:''}，我想安排：`;
}

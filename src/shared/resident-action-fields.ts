export const RESIDENT_ACTION_FIELDS:Record<string,string[]>={
 'request-person-growth':['characterId','growth'],
 'set-realm-arrangement':['characterId','fixture','hands','legs','footwear','mouth'],
 'end-realm-visit':['realmId','characterId'],'move-realm-guest':['realmId','characterId','regionId'],
 'reshape-realm':['realmId','regionId','environment'],'arrange-realm-resident':['characterId','regionId'],'set-resident-permissions':['characterId','permissions'],
 'reward-resident':['characterId','method'],'punish-resident':['characterId','method'],
 'propose-performance-agreement':['realmId','characterId','terms'],'respond-performance-agreement':['agreementId','accept','reason'],'end-performance-agreement':['agreementId'],
 'deploy-resident':['characterId','mode'],'recall-resident':['characterId'],'discuss-resident-tactics':['characterId','text','reservePercent'],
};
export const RESIDENT_ACTION_KINDS=Object.keys(RESIDENT_ACTION_FIELDS);

/** Presentation progress stays outside the game snapshot. */
export const OPENING_SCENE_VERSION=2;
export function openingPlaybackKey(profileId:string,sourceId:string){
 let hash=14695981039346656037n;for(const ch of profileId+'\0'+sourceId)hash=BigInt.asUintN(64,(hash^BigInt(ch.codePointAt(0)!))*1099511628211n);
 return 'opening-'+hash.toString(16)+'-v'+OPENING_SCENE_VERSION;
}
export interface OpeningPerson {id:string;name:string;gender:string;age:number;appearance:string;canonicalId:string;title:string;present:boolean}
export interface OpeningSceneFacts {
 sourceId:string;backgroundId:string;acquisitionKind?:'auction'|'found';perspective:string;buyerKind:string;title:string;playerId:string;buyerId:string;subjectId:string;guideId:string;
 people:OpeningPerson[];devices:{name:string;templateId:string;mode:string;binding?:{part:string;pose:string}}[];locationName?:string;
 containment?:{mode:'awake'|'open';itemId:string};
 realm?:{opened:number;prisonerNames:string[]};
 guideContact?:boolean;
}
export interface OpeningLine {speakerId?:string;text:string;memory?:boolean;platform?:'closed'|'open'}
export interface OpeningScript {chapter:string;scene:string;lines:OpeningLine[]}
export function openingScript(f:OpeningSceneFacts):OpeningScript {
 const person=(id:string)=>f.people.find(p=>p.id===id),player=person(f.playerId)!,buyer=person(f.buyerId),subject=person(f.subjectId),guide=person(f.guideId);
 const n=(text:string):OpeningLine=>({text}),say=(id:string,text:string):OpeningLine=>({speakerId:id,text,...(person(id)?.present?{}:{memory:true})});
 const name=player?.name??'你',captive=f.perspective==='captive';
 if(f.backgroundId==='prince-cat')return {chapter:'府门之后',scene:'palace',lines:captive?[
  n('车轮声停在府门外。拍卖场的灯火被抛在身后，厚重的门扉缓缓合拢。'),
  n(`${name}，你已经被${buyer!.name}买下，带回了皇子府。拍卖场的喧嚣远去，房门在身后合拢。`),
  n(f.devices.length?`身上的${f.devices.map(d=>d.name).join('、')}仍在。你先听见门外的脚步，随后才看清来人的面孔。`:'门外有脚步声靠近。你抬起眼，看清了来人的面孔。'),
  say(buyer!.id,'这里是皇子府。从今天起，我就是你的主人。府里的规矩，我会让你一一记住。'),
  say(buyer!.id,`${name}，我买你回来，是要你留在身边侍奉。你的武魂也不能荒废，往后还要学着替我办事。`),
  n('他在几步之外停下，目光扫过束具，又回到你的脸上，等着你回应。'),
  n('先观察这间房，问清对方的打算，或把想说的话说出口。接下来，由你选择。'),
 ]:[
  n('檐影落在皇子府的石阶上。侍从送走最后一辆马车，管事在门前停下。'),
  n(`${name}，你在拍卖会上买下的猫女${subject!.name}已经被带回府内。交付的手续都已办妥。`),
  n('你走进安置猫女的房间。对方抬起眼，看向刚刚买下自己的主人。'),
  say(subject!.id,'这里……已经是皇子府了？'),
  n('你买下这名奴隶，打算留在身边侍奉，也准备培养猫科武魂的战斗本领，日后作为随从替你办事。'),
  n('府外的天斗城仍旧热闹。交付已经结束，如何安排此后的生活与训练，将从这次交谈开始。'),
  n('可以先问清姓名与来历，也可以查看眼下的拘束。你的第一句话，会是什么？'),
 ]};
 if(f.backgroundId==='sealed-titled'){
  if(f.acquisitionKind==='found')return {chapter:'旧道拾遗',scene:'sealed',lines:[
   n(captive?`${name}，你从封神台内醒来。金色罩壁依旧闭合，外面是一间陌生的房。`:`${name}，你在城外旧道发现的封神台已经运回自宅。罩壁仍闭合，${subject!.name}缓缓睁开眼睛。`),
   ...(captive?[say(buyer!.id,'我在城外旧道发现了这座封神台，把它带回了这里。你听得见吗？')]:[say(subject!.id,'这里是什么地方？')]),
   n('封神台仍压制着罩内的力量，囚锁与控制器具都没有消失。发现、带回与唤醒已经发生，双方对彼此的来历仍需交谈、核实。'),
   say(captive?buyer!.id:subject!.id,captive?'先说说你现在的情况。我们可以隔着罩壁谈。':'既然你把我带到了这里，就说说你的来意吧。'),
   n('可以先观察器具、问清处境，或寻找改变眼前局面的办法。下一步由你决定。')
  ]};
  const title=subject?.title?`${subject.title}斗罗`:'封号斗罗';
  const motive=f.buyerKind==='merchant'?'我花这笔钱，是想请到一位有本事的护卫。条件可以谈，但得先说清你的来历，还有你愿意做些什么。':f.buyerKind==='noble'?'我的家族正处在多事之秋。我买下你，是要在这场争端里多一枚筹码。至于怎么用，先把你的来历说清楚。':'驻地收到过与你有关的矛盾消息。我将你买回，是要查清你的身份和牵涉的旧事。先从你的来历说起。';
  if(f.containment?.mode==='awake'){
   const lines=captive?[
    n('低沉的嗡鸣将你唤醒。金色封锁罩近在眼前，环台的魂纹依旧明亮，锁链没有松开。'),
    n(`${name}，你仍在封神台内。${buyer!.name}已将你买下，带回了天斗城的宅邸。隔着罩壁，你看见一间陌生的囚室。`),
    n(`魂力被封神台压住。${f.devices.length?f.devices.map(d=>d.name).join('、')+'仍留在身上。':''}你试着抬头，罩外的人也正看着你。`),
    say(buyer!.id,`${title}，听得见我说话吗？`),say(buyer!.id,motive),
    n('记忆逐渐清晰。曾经行走大陆的岁月、自己的武魂，还有那些未了的旧事，都不曾远去。'),
    n('先隔着封锁罩问清来意，观察四周，或试着挣脱眼下的束缚。你的第一步，由你决定。'),
   ]:[
    n('封神台被送入宅内的囚室。金色封锁罩始终合拢，环台的魂纹沿着锁链明灭。'),
    n(`${name}，罩内是${title}${subject!.name}。你只唤醒了对方，封锁罩与禁魂回路仍在运转。`),
    n('罩内的人缓缓睁开眼，先扫过陌生的房间，随后将目光停在你身上。'),
    say(subject!.id,'这里是什么地方？'),
    n(f.buyerKind==='merchant'?'你在台前停下脚步。想谈护卫合作，得先听听对方愿意说些什么。':f.buyerKind==='noble'?'家族的争端仍盘旋在心头。隔着封锁罩，你打量着这场重金交易带回的人。':'你合上手中的卷宗，走到封神台前。那些互相冲突的记载，此刻都有了可以询问的对象。'),
    say(subject!.id,'既然把我带到了这里，就说说你的来意吧。'),
    n('可以先隔罩交谈，也可以查看封神台与囚锁。屋内安静下来，等着你开口。'),
   ];
   return {chapter:'封锁罩内的苏醒',scene:{merchant:'merchant',noble:'noble',spirit:'sanctum'}[f.buyerKind]??'merchant',lines:lines.map(line=>({...line,platform:'closed' as const}))};
  }
  const arrival={...n('片刻之前，封神台刚被送入宅邸。宝石环拱起金色封锁罩，锁链与魂纹围住了罩内的人影。'),platform:'closed' as const};
  return {chapter:'光纹熄灭之时',scene:{merchant:'merchant',noble:'noble',spirit:'sanctum'}[f.buyerKind]??'merchant',lines:captive?[
   arrival,{...n('最后一缕光纹从眼前退去。封锁罩已经打开，知觉一点点回到身体，门外传来低低的脚步声。'),platform:'open'},
   n(`${name}，你已离开拍卖场。${buyer!.name}买下封神台，将你带回了天斗城的宅邸。`),
   n(`封神台已经开启。${f.devices.length?f.devices.map(d=>d.name).join('、')+'仍留在身上。':'你向四周看去。'}房门之外有人守候。`),
   say(buyer!.id,`${title}，终于能当面交谈了。`),say(buyer!.id,motive),
   n('曾经行走大陆的岁月并未远去。你记得自己的武魂，也记得那些尚未了结的旧事。'),
   n('是先问清处境，试探眼前的人，还是暂且观察？房内安静下来，等着你的回答。'),
  ]:[
   arrival,{...n('宅内的房门合拢，封神台的罩体沿台缘展开，光纹逐渐熄灭。拍卖时隔着台体看不清的身影，终于睁开了眼睛。'),platform:'open'},
   n(`${name}，你带回的是${title}${subject!.name}。封存已解除，对方仍留在安排好的房内。`),
   say(subject!.id,'这里是什么地方？'),
   n(f.buyerKind==='merchant'?'你把未饮的茶盏搁在一旁。护卫合作的念头，终究要从一次谈话开始。':f.buyerKind==='noble'?'走廊的脚步声渐远。家族的争端盘旋在心头，你打量着这场重金交易带回的人。':'案上的卷宗尚未合拢。那些互相冲突的记载，此刻都有了可以询问的对象。'),
   say(subject!.id,'既然已经把我带到这里，就说说你的来意吧。'),
   n('封神台与囚锁的控制仍在手边。你可以先查看器具，也可以从对方的姓名和旧事问起。'),
   n('这场交易已经结束，你们之间的故事才刚刚开始。'),
  ]};
 }
 const sects:Record<string,{chapter:string;scene:string;lines:string[]}>={
  'seven-treasure':{chapter:'琉璃初光',scene:'seven',lines:['琉璃色的光从檐角落下来，修习院里传出清脆的铃声。','塔的力量不只在自己手中，也在伙伴最需要的那个时刻。','先熟悉自己的武魂。看清它能帮人做到什么，再想该与谁并肩。','宗门的路很长，第一步不必走得急。']},
  'clear-sky':{chapter:'山门之外',scene:'mountain',lines:['山风掠过石阶，云海在昊天宗的山门下翻涌。重锤落在掌心，分量熟悉而沉稳。','锤要握稳，路也要自己走。出了山门，更要记住分寸。','这次历练，先看清山外的人与事。遇到拿不准的，就回来问。','门中的同辈已经各自收拾行囊。属于你的行程，还等着你落下第一笔。']},
  'blue-dragon':{chapter:'初闻雷鸣',scene:'dragon',lines:['训练院的石地留着旧日雷击的痕迹。龙纹旗在风中舒展，远处有人收起了武魂。','龙化不是一味逞强。先学会让力量听你的，再谈如何压过对手。','今日先熟悉训练的安排。身边的同辈，往后也会是与你较量的人。','雷声仿佛仍留在耳畔。下一场考核以前，你还有自己的时间。']},
 };
 const sect=sects[f.backgroundId];if(sect)return {chapter:sect.chapter,scene:sect.scene,lines:[n(sect.lines[0]),n(`${name}，作为${f.title}，你的修习从这里开始。`),...(guide?[say(guide.id,sect.lines[1]),say(guide.id,sect.lines[2])]:[n(sect.lines[1]),n(sect.lines[2])]),n(sect.lines[3]),n('看看自己的武魂，联系熟悉的人，或直接写下接下来的打算。此后的路由你来走。')]};
 if(f.backgroundId==='jiumeitu-heir')return {chapter:'九庭初醒',scene:'academy',lines:[n('晨光穿过薄雾，一幅黑玉金轴的长卷在掌中徐徐舒展。'),n(`${name}，绢面上的九间居室与公共庭院静候来客。${f.realm?.opened?`你已有${f.realm.opened}枚魂环，画中开放了${f.realm.opened}个永久席位。`:'每取得一枚魂环，就能开放一个永久席位。'}${f.realm?.prisonerNames.length?f.realm.prisonerNames.join('、')+'已被安置在画中。':'此刻画中尚无人居住。'}`),n('先看看九美图的力量，整理行囊，再决定下一步旅途。想改变画境主题或安排，只需直接告诉主持人。'),n(f.guideId?'大师留下的指点仍在记忆里。'+(f.guideContact?'你可以联系他，也可以迈出属于自己的第一步。':'前方的路，正等着你迈出第一步。'):'前方的路，正等着你迈出第一步。')]};
 if(f.backgroundId==='canonical-character')return {chapter:'旧名，新途',scene:'academy',lines:[n(`晨光越过屋檐，${f.locationName??'眼前的小镇'}的道路上渐渐有了行人。`),n(`${name}，记忆与传承仍伴随着你。此刻的相遇和选择，将写出属于你的另一段旅途。`),n('整理行囊，看看已经掌握的力量，或找人聊聊接下来的打算。'),n('往事仍在记忆里，眼前的道路等着你迈出下一步。')]};
 return {chapter:'风起之处',scene:'academy',lines:[n('行囊已经收好，远处的路在光中延展开去。'),n(`${name}，武魂的力量已在你体内苏醒。故乡的路口人来人往，未曾见过的大陆就在前方。`),n('先整理行囊，联系牵挂的人，或者顺着自己的心意走一段路。'),n('把你的第一步写下来，故事就从这里开始。')]};
}

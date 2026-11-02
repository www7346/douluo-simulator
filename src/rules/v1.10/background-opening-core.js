(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulBackgroundOpening=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const clone=v=>JSON.parse(JSON.stringify(v));const bg=()=>globalThis.SoulBackgroundCore,cp=()=>globalThis.SoulCustodyCore,people=()=>globalThis.SoulPersonCore,social=()=>globalThis.SoulWorldSocial,history=()=>globalThis.SoulBackgroundHistory;
 const valid=r=>r&&r.hash===bg().hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='hash')));
 const CONTENT_REVISION=2;
 const genericProfile=d=>d?.speech==='陈述所知，遇到不清楚的事会询问。'&&d?.shortTermGoal==='处理当前的日常安排。'&&d?.longTermGoal==='维持自己的生活与关系。';
 // Existing authored and player profiles are primary. These records fill absent
 // fields and replace only the precisely identifiable, formerly destructive template.
 const PERSONAS={
  'xue-beng':['天斗帝国皇子，熟悉宫廷礼仪与皇室中的利害，外在骄纵之下也会衡量局势。','重视皇子身份、自己的安全和可掌握的人手。','带着皇子的主导口吻，交代安排直接；遇到风险会追问具体条件。','经营府内人手，关注皇室与天斗城的动静。','保全自己在皇室中的位置，积累可靠的力量。'],
  'xue-xing':['天斗皇室亲王，长年处理皇室与贵族事务。','重视皇室利益、人情和政治分寸。','措辞老练，谈到后辈时带有长辈的威严。','处理皇室事务，留意雪崩的处境。','维护皇室与自己一系的地位。'],
  'xue-ke':['天斗皇室公主，自幼受宫廷礼仪教育。','重视家人与尊严，也向往宫廷外的见闻。','有礼而带少女的好奇，熟悉的亲人面前较直接。','完成日常学习与皇室安排。','找到与自己身份相称、又能自主选择的生活。'],
  'xue-qinghe':['以天斗太子的身份参与宫廷事务，待人温和，善于察言观色。','重视礼仪、人才与稳定的政治关系。','谦和克制，询问对方经历时耐心而有分寸。','处理太子职责，留意各方人才和宫廷变化。','巩固自己在宫廷中的地位。'],
  'yu-xiaogang-notting':['史莱克学院师长，长期研究武魂理论，负责指导学员认识魂兽、魂环与训练方法。','重视理论依据、训练成效与学生安全。','严谨简练，常先分析问题，再说明训练方法。','安排学生的首次猎魂课与合适的训练。','通过培养学生验证并完善自己的武魂理论。'],
  flender:['史莱克学院院长，重视学院经营，也看重学生的本领和担当。','珍惜钱财与学院，护短但要求学生独立。','精明直爽，谈资源时算得清楚，认真时有院长的威严。','安排天斗校区的教学与学院事务。','让史莱克学院和学生在大陆立足。'],
  'zhao-wuji':['史莱克学院师长，经历丰富，擅长以实战磨炼学生。','护短，重视实力、胆识与同伴责任。','粗犷直接，习惯指出实战里的破绽。','带学生完成体能与实战训练。','守护学院，培养能独当一面的魂师。'],
  'liu-erlong-lanba':['史莱克天斗校区的师长，熟悉校园与本地事务，训练风格果断。','重情护短，厌恶拖泥带水和欺侮弱者。','直率有力，关心学生时也常用命令口吻。','处理校区事务并指导学生训练。','守住学院与自己珍视的人。'],
  'tang-san-slaughter':['史莱克同门，练习与思考都很细致，重视同伴。','看重承诺、实用的方法和伙伴安全。','温和清楚，讨论技术时认真具体。','完善自己的修炼与团队配合。','变强并守护自己珍视的人。'],
  'xiao-wu-tournament':['史莱克同门，活泼机敏，与伙伴经历过共同训练。','护短仗义，珍惜被认可的伙伴。','直率有活力，熟悉的人面前会开玩笑。','参与学院训练，与伙伴互相照应。','守护重要的人，继续自己的修炼。'],
  'dai-mubai-tournament':['史莱克同门，习惯在团队中承担领头与正面承压的责任。','重实力与尊严，认可共同担当的伙伴。','豪爽果断，安排配合时颇有主导性。','磨练战斗技巧与团队协作。','以实力掌握自己的命运。'],
  'oscar-tournament':['史莱克食物系同门，乐观幽默，重要的事情上坚定认真。','珍惜伙伴，也重视自身成长。','爱用玩笑缓和气氛，谈正事能收起戏谑。','提升食物系能力并参与团队训练。','走出属于自己的食物系魂师道路。'],
  'ma-hongjun-tournament':['史莱克同门，性情直率，喜欢热闹，重视兄弟情谊。','看重朋友与自身实力。','口语化，爱调侃，认真时直来直去。','参加学院训练，磨练凤凰武魂的运用。','成为能保护同伴的强者。'],
  'ning-rongrong-tournament':['七宝琉璃宗出身的史莱克同门，机敏，已在团队经历中学会承担责任。','希望凭本领获得认可，珍惜同伴。','熟悉时俏皮，讨论辅助配合时观察细致。','完善增幅技巧与团队协作。','成为值得同伴信赖的辅助魂师。'],
  'zhu-zhuqing-tournament':['史莱克同门，寡言自律，以长期训练争取自己的选择。','重视实力、行动与值得信任的人。','简短直接，不热衷无谓寒暄。','磨练敏攻身法与实战配合。','凭自己的力量掌握命运。'],
  'ning-fengzhi':['七宝琉璃宗宗主，善于衡量局势与人才，负责宗门发展。','看重宗门、人才与长远的合作。','温和周全，谈安排时讲清利弊。','安排弟子修习，处理宗门事务。','维系宗门传承与大陆上的立足之地。'],
  'chen-xin':['七宝琉璃宗护宗长老，对战斗与修习有严格要求。','重视剑道、守护责任与扎实的本领。','少说空话，指出问题直截了当。','指导有潜力的弟子，留意宗门安全。','精进自身修为，守护七宝琉璃宗。'],
  'gu-rong':['七宝琉璃宗护宗长老，熟悉宗门众人，善于留意危险。','重情，重视宗门安全和后辈成长。','熟人面前带着诙谐，谈到风险时认真。','照应宗门弟子，处理护宗事务。','让宗门与后辈有安稳的未来。'],
  'tang-xiao':['昊天宗宗主，肩负封闭山门时期的宗门责任。','重视宗门传承、纪律与族人平安。','沉稳威严，安排历练时强调责任和准备。','安排弟子首次外出历练，处理宗务。','守住昊天宗传承与族人的未来。'],
  'tang-hao-village':['昊天宗出身的前辈，经历沉重，对外界多有保留。','重视亲人与责任，不喜空谈。','寡言直接，谈起修习时要求面对实际问题。','按自己的行程处理旧事与修炼。','保护珍视之人，面对未了的责任。'],
  'tang-yuehua':['昊天宗出身，熟悉天斗贵族礼仪与人情往来。','重视分寸、情义与内在修养。','温和从容，愿意把礼仪和处世道理讲清。','照料自己的教学与日常往来。','在纷乱的人情中照应亲人与有缘的后辈。'],
  'yu-yuanzhen':['蓝电霸王龙宗宗主，对传承与族人训练要求严格。','重视家族尊严、实力与传承。','威严简洁，考校时直指本领。','安排族内考核，关注弟子龙化训练。','维护蓝电霸王龙宗的传承和地位。'],
  'yu-luomian':['蓝电霸王龙宗前辈，参与族内事务，熟悉家族规矩。','重视族内地位、秩序与家族实力。','讲究长幼分寸，安排事务时条理清楚。','检查弟子训练与族内考核准备。','巩固家族传承与自身应尽的职责。'],
  'yu-tianheng':['蓝电霸王龙宗同辈，重视战斗中的实力与配合。','珍惜家族荣誉，也认可对手的本领。','自信直接，愿意认真讨论切磋结果。','磨练龙化技巧与实战配合。','成为能承担家族责任的强者。'],
  'yu-tianxin-sect':['蓝电霸王龙宗同辈，勤于修炼，关心族内考核。','重视本领、家族荣誉与竞争。','爽快而有争胜心，讨论训练时具体。','准备族内考核，寻找切磋机会。','以实力赢得族人的认可。'],
  'background-clear-elder':['昊天宗长老唐承岳，常年负责基础锤法与外出规矩。','重视纪律、基本功与弟子平安。','少寒暄，交代事情时要求对方复述要点。','核对弟子外出前的准备。','让后辈把宗门传承真正练到手里。'],
  'background-clear-peer':['昊天宗弟子唐知远，与新入门的同辈一同训练。','看重公平切磋与同门情分。','健谈爽朗，喜欢拿训练里的小事开玩笑。','准备自己的历练，与同门交换经验。','走出山门，凭锤法闯出名声。'],
  'background-wen-jingning':['闻景行的妹妹闻景宁，熟悉家中商事，常与兄长交换消息。','重视家人平安与稳妥的生意。','亲人面前直接，谈商事时细致。','核对家中往来账目与消息。','让家人和家业都有安稳的退路。'],
  'background-fang-zhizhou':['闻宅管事方支舟，负责府内人手、物资与日常安排。','重视办事准确与宅内秩序。','汇报简练，先说情况，再说明待处理的事。','安排闻宅日常事务并向雇主汇报。','保持可靠的管事声誉。'],
  'background-gu-tingyuan':['顾晏廷的兄长顾廷渊，熟悉家族内部的纷争与贵族往来。','重视家族地位、自己的判断与亲属情分。','谨慎，讨论家事时会反复核对利害。','处理家族争端中的往来与消息。','稳住家族在天斗的地位。'],
  'background-liang-zhiqiu':['顾宅管事梁知秋，熟悉家族来客与府内规矩。','重视秩序、保密与雇主交代的事务。','有礼而简练，不在客前多谈家事。','安排宅内值守与物资。','把家宅事务办得稳妥。'],
  'background-he-yuncen':['祁玄策麾下执事贺云岑，负责驻地任务的落实与汇报。','重视职责、准确消息和行事次序。','公事上直接，先汇报已查明的情况。','核对驻地任务并等候上级安排。','凭可靠的办事能力取得认可。'],
  'background-liu-guanlan':['武魂殿驻地同僚柳观澜，与祁玄策有长期公事往来。','重视职责与可靠的情报。','平和审慎，遇到疑点会追问依据。','处理驻地事务，交换必要消息。','维系驻地运转与自己的职责。'],
  salas:['武魂殿驻地高层萨拉斯，熟悉天斗的宗门与政治局势。','重视武魂殿的影响力、秩序与部属成效。','威严克制，要求下属说清结果与依据。','检查驻地事务与各项报告。','巩固武魂殿在当地的影响力。'],
  'background-prince-steward':['皇子府管事程砚，负责府内人手与物资。','重视皇子交代的事务与府内秩序。','恭谨简练，先汇报已办和待办之事。','安排皇子府日常事务。','把管事职责办得稳妥。']
 };
 const isFound=b=>b?.id==='sealed-titled'&&b.acquisitionKind==='found';
 function acquisition(r){return isFound(r?.config?.background)?r?.discovery:r?.purchase;}
 const previousHolder=p=>p?.kind==='found'?p.previousCustodianId:p?.sellerId;
 const acquisitionOperator=p=>p?.kind==='found'?p.buyerId:previousHolder(p);
 const acquisitionLink=p=>p?.kind==='found'?{backgroundAcquisitionId:p.id}:{backgroundPurchaseId:p.id};
 const profileFrom=row=>Object.fromEntries(['biography','values','speech','shortTermGoal','longTermGoal'].map((key,i)=>[key,row[i]]));
 function personaData(s,key){
  if(!PERSONAS[key])return null;
  const data=profileFrom(PERSONAS[key]),r=record(s),b=r?.config?.background;
  if(b?.id==='sealed-titled'){
   const design=bg().BUYERS[b.buyerId],buyer=s.人物.列表[r.buyerId??design?.entityId];
   if(buyer&&design?.relations.some(([id])=>id===key)){
    for(const field of Object.keys(data))data[field]=data[field].replaceAll(design.name,buyer.name);
    if(key==='background-wen-jingning'&&buyer.gender==='女')for(const field of Object.keys(data))data[field]=data[field].replaceAll('兄长','姐姐');
   }
  }
  return data;
 }
 function registeredProfile(s,id){
  const p=s.人物?.列表?.[id];if(!p)return null;
  const key=s.战斗单位?.列表?.[id]?.扩展?.角色库ID??p.扩展?.角色库ID;
  const found=PERSONAS[key]?key:PERSONAS[id]?id:Object.keys(PERSONAS).find(k=>backgroundPersonId(k)===id);
  return found?personaData(s,found):null;
 }
 function buyerProfile(s,r){
  const b=r.config.background,p=s.人物.列表[r.buyerId],subject=s.人物.列表[r.subjectId];
  if(isFound(b))return profileFrom([`${p.name}在城外旧道发现一座仍封闭的封神台，将它运回自宅并唤醒了罩内的${subject.name}，尚未弄清对方的来历。`,'重视自身与家人的安全，也会考虑眼前陌生人的处境和意愿。','先问清实情，再说明自己的打算。','了解封神台与其中人物，决定如何处理眼前的发现。','保全自己与家人的生活。']);
  if(b.id==='prince-cat')return profileFrom([
   '天斗皇子雪崩熟悉宫廷的礼仪与利害。他已经从阮承砚处买下猫女'+subject.name+'，亲自将其带回皇子府。',
   '重视皇子身份、自身安全和对府内人手的掌控；将买下的猫女视作自己的奴隶，要求其听从安排。',
   '带着皇子的主导口吻，交代规矩直接；会观察对方的配合、能力与反抗风险。',
   '了解'+subject.name+'的能力，安排府内侍奉与修炼，把其培养成可用的随从与战力。',
   '保全自己在皇室中的位置，积累可掌握的人手与力量。'
  ]);
  const x={merchant:[p.name+'经营天斗商事，花重金买下'+subject.name+'，希望与被囚者商议护卫合作。','看重交易的实际收益、履约条件和家人安全，面对高阶强者会先衡量风险。','说话稳妥，先谈眼下能提供的条件，再问对方的打算。','核实'+subject.name+'的处境与能力，试探有限护卫合作的条件。','让商路与家人得到可靠保护，稳固家业。'],noble:[p.name+'是天斗世袭伯爵，买下'+subject.name+'，希望在家族争端中取得有分量的筹码。','重视家族地位、保密与可掌握的优势，做事先权衡对手与后果。','有礼而审慎，谈条件时保留余地，触及家族利益时更强硬。','摸清'+subject.name+'的立场与来历，决定怎样用于处理家族争端。','稳住家族地位，获得能制衡争端对手的力量。'],spirit:[p.name+'在武魂殿驻地任职，买下'+subject.name+'，准备核查其身份与旧有冲突。','重视驻地职责、可靠情报与风险控制。','有条理地询问，区分已知事实、疑点和需要核实的回答。','核实'+subject.name+'的身份、经历和旧有冲突，决定后续处置。','稳固驻地秩序并完成自己的职责。']}[b.buyerId];
  return x?profileFrom(x):null;
 }
 function initialBackgroundProfile(s,id){
  const r=record(s);if(!r||!valid(r))return null;
  if(r.config.background.id==='sealed-titled'){const a=Object.values(bg().resolveSlots(r.config)).find(a=>a.id===id);if(a&&a.source!=='default')return null;}
  if(acquisition(r)&&id===r.buyerId&&strictAcquisitionFacts(s))return buyerProfile(s,r);
  if(r.config.background.id==='prince-cat'&&id===r.subjectId&&strictAcquisitionFacts(s))return profileFrom([
   s.人物.列表[id].name+'是猫科武魂觉醒后身体发生变异的人类，曾在裁衣铺生活。遭掳后被阮承砚寄售，现已被雪崩买下并带回皇子府。',
   '谨慎耐心，珍惜自己的名字与生活，对突如其来的命运保持警惕。',
   '起初简短，观察对方的态度后再准确表达自己的想法。',
   '弄清雪崩的安排与皇子府的规矩，观察眼前处境并寻找自己的选择。',
   '保全自己，争取能由自己作主的生活。'
  ]);
  if(isFound(r.config.background)&&id===r.subjectId&&strictAcquisitionFacts(s))return profileFrom([`${s.人物.列表[id].name}从封神台的沉眠中醒来，发现自己被带到陌生的宅邸；对方说在城外旧道找到了封神台，自己尚未亲眼核实这段来历。`,'珍惜自己的判断与选择。','沉着观察，先问清处境。','了解带回封神台之人的意图，寻找改变处境的方法。','保全自己，争取自由并处理未了之事。']);
  if(r.config.background.id==='sealed-titled'&&id===r.subjectId&&strictAcquisitionFacts(s)){
   const p=s.人物.列表[id],soul=s.武魂.列表[s.成长.列表[id]?.武魂ID列表[0]],title=s.成长.列表[id]?.封号?.封号;
   return profileFrom([`${p.name}曾以${soul?.名称??'自己的武魂'}修炼至${s.成长.列表[id].魂力等级}级，${title?'封号'+title+'。':''}与阮承砚的旧有冲突后被囚禁，继而被买下带回天斗城宅邸。`,`珍惜多年修行、同门情义与自己的选择。`,'沉着明确，先观察处境，再问清对方的条件与打算。','观察封神台与囚锁，弄清买主的目的，寻找可以改变处境的机会。','保全自己，争取自由并处理未了的旧事。']);
  }
  return null;
 }
 function backgroundProfile(s,id){
  const profile=initialBackgroundProfile(s,id),r=record(s);if(!profile)return null;
  const current=currentPurchase(s,strictAcquisitionFacts(s));if(!current)return profile;
  if(id===r.buyerId&&(current.released||current.ownerId!==id)){
   profile.biography+=current.endedReason==='death'?'被购入者后来已经去世。':current.released?'被购入者后来已经获得正式释放。':'此人后来已经转交给另一位买主。';
   profile.shortTermGoal='处理交易之后的事务，并根据双方现在的关系决定往来。';
   if(r.config.background.id==='prince-cat')profile.values='重视皇子身份、自身安全和府内人手，知道原购入者已不再归自己所有。';
  }
  if(id===r.subjectId){
   if(current.released){
    profile.biography+=current.endedReason==='death'?'此人后来已经去世。':'此人后来已经获得正式释放。';
    profile.shortTermGoal=current.endedReason==='death'?'此人的生命已经结束。':'安排获释后的生活，继续自己的修炼与打算。';
   }else if(current.ownerId!==r.buyerId){
    profile.biography+='此人后来又被转交给'+s.人物.列表[current.ownerId].name+'。';
    profile.shortTermGoal='观察现任买主的安排，弄清眼下处境并寻找自己的选择。';
   }else if(current.escaped)profile.shortTermGoal='已经逃离关押，设法保全自己并安排接下来的去向。';
   else if(r.config.background.id==='sealed-titled'&&!globalThis.SoulSealingCore.active(s,id))profile.shortTermGoal='观察当前囚锁与周围的环境，弄清买主的安排并寻找自己的选择。';
  }
  return profile;
 }
 function effectiveProfile(s,id){
  const p=s.人物?.列表?.[id];if(!p)return null;
  const original=p.扩展?.characterProfile,data=original?.data??{},replacement=registeredProfile(s,id),background=backgroundProfile(s,id),initial=initialBackgroundProfile(s,id),generic=original?.source==='preset'&&genericProfile(data);
  const fill={...(replacement??{})};
  // A specific current background replaces the old template or this background's
  // default authored role, but never a later custom/generated character profile.
  const mayApply=(!original||generic||original.source==='preset'&&(!!initial&&Object.entries(initial).some(([key,value])=>['biography','shortTermGoal'].includes(key)&&data[key]===value)||['background-opening-v2','authored-commerce-opening'].includes(p.generatedBy)));
  const next=generic?{...data,...fill}:{...fill,...data};
  if(background&&mayApply){
   const r=record(s);
   for(const [key,value] of Object.entries(background))if(!data[key]||generic||initial&&data[key]===initial[key]||!original||id===r?.subjectId&&data[key]===(key==='biography'?globalThis.SoulCommerceDesigns.PEOPLE.find(p=>p.id===id)?.biography:key==='shortTermGoal'?globalThis.SoulCommerceDesigns.PEOPLE.find(p=>p.id===id)?.goal:undefined))next[key]=value;
  }
  if(!Object.keys(next).length)return original?clone(original):null;
  const result={...(original?clone(original):{version:1,status:'complete',source:'preset'}),data:next};
  if(background&&mayApply){
   const r=record(s),event=cp().table(s).events.find(e=>e.id===acquisition(r).custodyTransferEventId);
   result.backgroundSource={sourceId:acquisition(r).id,at:r.createdAt,order:event.order,remembered:social().remembers(s,id,r.createdAt,[],event.order)};
   result.backgroundFields=Object.keys(background).filter(key=>next[key]===background[key]&&(['biography','shortTermGoal'].includes(key)||key==='values'&&r.config.background.id==='prince-cat'&&id===r.buyerId));
   result.backgroundFallback=replacement??{};
  }
  return result;
 }
 function installProfiles(s,r){
  const ids=new Set([r.mainId,r.buyerId,r.subjectId,...r.relationshipIds.flatMap(id=>{
   const q=Object.values(s.人物.列表).flatMap(p=>p.扩展?.社交约定??[]).find(q=>q.id===id);return q?[q.playerId,q.personId]:[];
  })].filter(Boolean));
  // Give the source a valid hash before the read-only projection is consulted.
  cp().stamp(r);
  for(const person of Object.values(s.人物.列表)){
   const original=person.扩展?.characterProfile;
   if(original?.source==='rules-draft'&&original.status==='draft'&&Object.values(original.data??{}).every(value=>typeof value==='string'&&value.trim())){original.status='complete';original.source='preset';original.data.biography=original.data.biography.replace(/具体出身和经历待人物创建完成。/g,'');}
   localNames(s,person.id,r.sourceId);
  }
  for(const id of ids){const p=s.人物.列表[id],profile=effectiveProfile(s,id);if(profile){delete profile.backgroundSource;delete profile.backgroundFields;delete profile.backgroundFallback;p.扩展??={};p.扩展.characterProfile=profile;}}
 }
 function replace(s,next){if(s===next)return;const opening=s.世界?.opening?.background;for(const key of Object.keys(s))delete s[key];Object.assign(s,next);if(opening)s.世界.opening.background=opening;}
 function localNames(s,id,sourceId){const p=s.人物.列表[id];if(!p)return;for(const soulId of s.成长.列表[id]?.武魂ID列表??[]){const soul=s.武魂.列表[soulId];soul.扩展.baseActionNaming={source:'background-local',sourceId};for(const ringId of soul.魂环ID列表??[])for(const skillId of s.魂环.列表[ringId].魂技ID列表){const skill=s.技能.列表[skillId];if(/程序组合|本能运用/.test(skill.name)){const label=globalThis.SoulNarrative.packageNarrative({skills:[skill]},soul.名称,new Set()).skills[0];skill.name=label.name;skill.名称=label.name;skill.description=label.description;globalThis.SoulAbilityContract.seal(skill);}skill.namingSource='background-local';skill.扩展.命名来源='background-local';}}}
 function labelOwnedSkills(s,sourceId){for(const skill of Object.values(s.技能.列表)){if(!skill.effectGraph&&!skill.效果图)continue;skill.扩展??={};if(/程序组合|本能运用/.test(skill.name??skill.名称??'')){const owner=s.武魂.列表[skill.来源武魂ID],label=globalThis.SoulNarrative.packageNarrative({skills:[skill]},owner?.名称??'魂纹',new Set()).skills[0];skill.name=label.name;skill.名称=label.name;skill.description=label.description;globalThis.SoulAbilityContract.seal(skill);}if(!skill.namingSource&&!skill.扩展.命名来源){skill.namingSource='background-local';skill.扩展.命名来源='background-local';}const item=s.物品.实例[skill.sourceItemId??skill.扩展.来源物品ID],index=(skill.扩展.技能序号??1)-1,blueprint=item?.payload?.activeSkills?.[index]??item?.payload?.activeSkill;if(blueprint&&!item.provenance?.type?.startsWith('canon-character-'))Object.assign(blueprint,{name:skill.name,description:skill.description,namingSource:skill.namingSource,generationNaming:{source:'background-local',sourceId}});}} function createPerson(s,id,draft,level,sourceId,w,budget=9999,historyOptions={}){
  if(s.人物.列表[id])return s.人物.列表[id];
  const souls=draft.martialSoulDrafts.map((definition,index)=>{const compiled=globalThis.SoulMartialSoulCore.finalizeDraft({...definition,playerConfirmed:true},{budget,id:`soul-${id}-${index+1}`});return {id:compiled.id,持有者单位ID:id,名称:compiled.name,形态:compiled.definition.form,定位:compiled.definition.role,结构化武魂:compiled,魂环ID列表:[],扩展:{generatedBy:'background-custom',结构化武魂:compiled}};});
  replace(s,globalThis.SoulCycleEngine.createCharacter(s,{id,name:draft.name,level,attributes:draft.attributes,martialSouls:souls,controller:'npc'},`${sourceId}:body:${id}`).state);
  s.人物.列表[id]={id,tier:'full',name:draft.name,age:draft.age,gender:draft.gender,identity:level>=91?'被囚封号斗罗':'背景人物',occupation:'魂师',faction:'独立',appearance:draft.appearance,personality:'沉稳谨慎，习惯先观察处境再表明立场。',locationId:'loc-heaven-dou-city',relationship:{},walletId:`wallet-${id}`,inventoryContainerId:`container-${id}-inventory`,equipmentConfigId:id,combatantId:id,generatedBy:'background-opening-v2',seed:`background:${id}`,status:'active',扩展:{}};
  (globalThis.SoulGenericVisuals??(typeof require==='function'?require('../../shared/generic-human-art-core.js'):null)).assign(s,s.人物.列表[id]);
  people().initialize(s,id);w.ensurePossessionShell(s,id);history().install(s,id,draft,{manual:false,...historyOptions,sourceId});localNames(s,id,sourceId);return s.人物.列表[id];
 }
 function prepareRare(s,config,sourceId,w){if(!config.background)return;const b=config.background;if(b.id==='sealed-titled')for(const actor of Object.values(bg().resolveSlots(config))){if(actor.id===s.角色.主控单位ID)continue;if(actor.source==='canon'){const made=globalThis.SoulCanonArenaEngine.configureOpeningCharacter(s,actor.characterId,{draft:actor.draft,level:actor.level,sourceId});replace(s,made.state);}else {const person=createPerson(s,actor.id,actor.draft,actor.level,sourceId,w,actor.budget,{manual:false,selectedIds:actor.ringChoices,designs:actor.ringDesigns});if(actor.side==='buyer'){person.identity=actor.source==='default'?bg().BUYERS[b.buyerId].identity:'买主';person.扩展.backgroundBuyerId=b.buyerId;s.钱包.列表[person.walletId].gold=bg().BUYERS[b.buyerId].wallet;}}}const target=bg().targetId(b);if(target&&s.人物.列表[target])w.commerceHooks().move(s,[target],'loc-heaven-auction');}
 function ensurePerson(s,key,name,w,sourceId){const arena=globalThis.SoulCanonArenaEngine;if(arena.CHARACTER_CATALOG[key]){const found=arena.ensurePersistentCharacter(s,arena.WORLD_STORY_SELECTIONS[arena.worldCharacterIdentityId(key)]??key);replace(s,found.state);if(key==='xue-beng'&&s.人物.列表[found.unitId].age===0){const d=bg().princeDraft(),person=s.人物.列表[found.unitId];Object.assign(person,{age:d.age,gender:d.gender,appearance:d.appearance});delete person.life;people().initialize(s,person.id,{source:'background-profile'});}return found.unitId;}if(s.人物.列表[key])return key;w.commerceHooks().spawn(s,{id:key,name,archetypeId:'civilian',tier:'light',locationId:s.地图.当前地点ID,age:35,level:10,generatedBy:'background-opening-v2',profile:PERSONAS[key]?personaData(s,key):{biography:`${name}有着自己的日常生活与熟悉的人情往来，言谈间常会提起相识的旧事。`,values:'看重熟人间的情分，做事细致，有自己的主见。',speech:'言语平实，谈起熟悉的事时会多说几句。',shortTermGoal:'处理自己的日常事务。',longTermGoal:'维持可靠的生活。'}});localNames(s,key,sourceId);return key;}
 function bond(s,actorId,targetId,kind,reason,contact,sourceId,record){if(actorId===targetId)return;const existing=social().relationshipBetween(s,actorId,targetId);const ids=[];for(const type of ['relationship',...(contact?['contact']:[])]){if(type==='relationship'&&existing?.kind===kind)continue;const r={id:`background-${type}:${sourceId}:${actorId}:${targetId}`,kind:type,playerId:actorId,personId:targetId,locationId:s.人物.列表[actorId].locationId,status:'pending',events:[],...(type==='relationship'?{relationship:kind}:{channel:'soul-device'})};for(const status of ['pending','accepted','completed'])social().appendCommitmentEvent(s,r,status,`${sourceId}:${type}:${targetId}:${status}`,{reason,...(type==='relationship'?{relationship:kind}:{channel:'soul-device'})});(s.人物.列表[targetId].扩展.社交约定??=[]).push(r);ids.push(r.id);}record.relationshipIds.push(...ids);}
 function purchase(s,config,sourceId,w,record){const b=config.background,found=isFound(b),targetId=bg().targetId(b);if(!targetId)return;const buyerId=b.id==='prince-cat'?ensurePerson(s,'xue-beng','雪崩',w,sourceId):bg().actorId(b,'buyer');const sellerId='commerce-consignor-ruan',c=cp().active(s,targetId);if(!c||c.custodianId!==sellerId)throw Error('背景成交缺少原看管');const canonical=b.id==='sealed-titled'&&b.actors?.buyer?.source==='canon',balanceGold=canonical?s.钱包.列表[s.人物.列表[buyerId].walletId].gold:b.id==='prince-cat'?50000:bg().BUYERS[b.buyerId].wallet;const id=`background-${found?'found':'purchase'}:${sourceId}`,prior=cp().authorityRef(c),items=cp().attached(s,targetId);const p={id,sourceId,backgroundId:b.id,buyerId,...(found?{}:{sellerId}),personId:targetId,at:people().now(s),...(found?{kind:'found',previousCustodianId:sellerId,discovery:{locationId:'loc-heaven-dou-city',scene:'城外旧道',platformItemId:'sample-titled-platform'}}:{amountGold:b.id==='prince-cat'?100000:1800000}),previousAuthority:clone(prior),deviceItemIds:items.map(i=>i.id),deviceTransferEventIds:[],platformItemId:b.id==='sealed-titled'?'sample-titled-platform':null,sealControlEventId:null,openingSealEventId:null,assetHistory:{...(found?{}:{purchaseGold:b.id==='prince-cat'?100000:1800000}),homeGold:900,balanceGold}};if(found){record.discovery=p;p.discoveryEventId=cp().event(s,'platform-found',buyerId,targetId,`${id}:found`,{acquisitionId:id,discovery:clone(p.discovery),previousAuthority:clone(prior),deviceItemIds:clone(p.deviceItemIds)}).id;}else record.purchase=p;
   c.custodianId=buyerId;c.authorityVersion++;c.authorityEventId=`custody-event:${id}:custody-transferred:${targetId}`;cp().stamp(c);const event=cp().event(s,'custody-transferred',acquisitionOperator(p),targetId,id,{custodyId:c.id,offerId:id,previousAuthority:prior,authority:cp().authorityRef(c)});p.custodyTransferEventId=event.id;
   for(const [index,item] of items.entries()){const e=cp().transferDeviceRights(s,{itemId:item.id,targetId,sellerId,buyerId,operatorId:acquisitionOperator(p),offerId:id,transferEventId:event.id,transferOwnership:true,transferControl:true},`${id}:device:${index}`);p.deviceTransferEventIds.push(e.eventId);}
   if(p.platformItemId){const item=s.物品.实例[p.platformItemId];const before={containerId:item.containerId,ownerEntityId:item.ownerEntityId,legalOwnerEntityId:item.legalOwnerEntityId};const e=globalThis.SoulSealingCore.transferControl(s,item.id,sellerId,buyerId,`${id}:seal-control`,null,id);p.sealControlEventId=e.id;w.transferItem(s,item.id,s.人物.列表[buyerId].inventoryContainerId,1,{reason:found?'发现封神台后运回自宅':'背景既往成交交付'});item.legalOwnerEntityId=buyerId;const delivered=cp().event(s,'background-platform-delivered',acquisitionOperator(p),targetId,`${p.id}:platform`,{...acquisitionLink(p),itemId:item.id,initialAssetSourceId:globalThis.SoulCommerceProvenance.batch(s).assets.find(a=>a.itemId===item.id).sourceId,before,after:{containerId:item.containerId,ownerEntityId:item.ownerEntityId,legalOwnerEntityId:item.legalOwnerEntityId}});p.platformOwnershipEventId=delivered.id;}
   s.钱包.列表[s.人物.列表[buyerId].walletId].gold=p.assetHistory.balanceGold;const facilitySource=`${sourceId}:home`,facilityId=`facility:${facilitySource}`,now=people().now(s);const facility={id:facilityId,templateId:'holding-house',name:(b.id==='prince-cat'?'皇子府':s.人物.列表[buyerId].name+'自宅')+'囚室',locationId:'loc-heaven-dou-city',ownerId:buyerId,operatorIds:[buyerId],sourceId:facilitySource,createdAt:now,acquisition:{mode:'buy',price:900,estateId:''},status:'active',condition:100,cells:[1,2].map(i=>({id:`cell-${i}`,spaceId:`${facilityId}:cell-${i}`,capacity:1,locked:false,condition:100}))};globalThis.SoulCustodyLogistics.save(s,'facilities',facility,buyerId,facilitySource,'背景既往置办囚室');const assets=cp().event(s,'background-assets-initialized',buyerId,buyerId,`${p.id}:assets`,{...acquisitionLink(p),kind:'opening-historical-assets',historicalTotalGold:Object.values(p.assetHistory).reduce((a,v)=>a+v,0),assetHistory:clone(p.assetHistory),facilityId,accounts:[{walletId:s.人物.列表[buyerId].walletId,ownerEntityId:buyerId,gold:p.assetHistory.balanceGold}]});p.assetHistoryEventId=assets.id;w.commerceHooks().move(s,[buyerId],'loc-heaven-dou-city',facility.cells[0].spaceId);
   const h=w.commerceHooks().logistics;
   if(p.platformItemId){const r=globalThis.SoulSealingCore.execute(s,{type:'awaken-seal',actorId:buyerId,itemId:p.platformItemId},`${id}:awaken`,w);p.awakeningSealEventId=r.receipt.sourceEventId;}
   else {w.commerceHooks().move(s,[targetId],'loc-heaven-dou-city',facility.cells[0].spaceId);globalThis.SoulCustodyLogistics.execute(s,{type:'admit-captive',actorId:buyerId,targetId,facilityId,cellId:'cell-1'},`${id}:admit`,h);}
   globalThis.SoulCustodyLogistics.execute(s,{type:'set-custody-cell-door',actorId:buyerId,facilityId,cellId:'cell-1',locked:true},`${id}:door`,h);globalThis.SoulBackgroundRestraints.configureDelivered(s,config,p,w);p.delivery={locationId:'loc-heaven-dou-city',facilityId,cellId:'cell-1'};cp().stamp(p);record.buyerId=buyerId;record.subjectId=targetId;
   localNames(s,buyerId,sourceId);localNames(s,targetId,sourceId);
 }
 function initialize(s,config,sourceId,w){if(!config.background)return;const b=config.background,p=bg().policy(b),mainId=s.角色.主控单位ID;const record={version:2,contentRevision:CONTENT_REVISION,sourceId,mainId,config:clone(config),createdAt:people().now(s),relationshipIds:[],historyEntityIds:[],intro:''};s.世界.opening.background=record;
   if(bg().targetId(b))purchase(s,config,sourceId,w,record);else {w.commerceHooks().move(s,[mainId],p.definition.locationId);s.地图.扩展??={};if(b.id==='clear-sky')s.地图.扩展.flags=[...new Set([...(s.地图.扩展.flags??[]),'knows-clear-sky-route'])];}
   const relations=globalThis.SoulOpeningRelations.initialize(s,config,sourceId,w,{mainId,buyerId:record.buyerId,subjectId:record.subjectId,ensurePerson});record.relationshipIds.push(...relations.entries.flatMap(row=>[row.relationshipId,row.contactId].filter(Boolean)));
   if(b.id==='shrek-student')s.世界.opening.guidance={status:'pending',giftStatus:'available',giftId:'',itemId:'',tutorialSkipped:false};else delete s.世界.opening.guidance;s.远征??=globalThis.SoulExpeditionEngine.normalizeState(s).远征;s.远征.配置.firstHuntingEscort={characterId:'yu-xiaogang-notting',consumedExpeditionId:'',rescueUsed:false,status:'unused',enabled:b.id==='shrek-student',eligible:b.id==='shrek-student'};
   const main=s.人物.列表[mainId];if(!main.扩展?.角色库ID)main.generatedBy='background-opening-v2';localNames(s,mainId,sourceId);if(b.id==='sealed-titled')record.historyEntityIds.push(...Object.values(bg().resolveSlots(config)).filter(a=>a.source!=='canon').map(a=>a.id));else if(b.id==='jiumeitu-heir'&&p.level>10)record.historyEntityIds.push(mainId);labelOwnedSkills(s,sourceId);record.intro=intro(s,b,record);s.世界.opening.background=record;installProfiles(s,record);cp().stamp(record);social().ingest(s);
 }
 function pLocation(s){return s.场景.地点??'故事的起点';}
 function intro(s,b,r){
  const name=s.人物.列表[r.mainId].name;
  if(b.id==='prince-cat'){
   const subject=s.人物.列表[r.subjectId],buyer=s.人物.列表[r.buyerId];
   return b.perspective==='buyer'
    ? `拍卖场的喧声已经远去，皇子府厚重的门扉在身后合拢。${buyer.name}，你买下的猫女${subject.name}已被带到府内，安置在一间有人看守的房里。窗外是天斗城熟悉的车马声，廊下的侍从却比平日安静。叔父雪星、妹妹雪珂，还有府中的管事程砚，都是你熟悉的人；眼前的猫女已经是你买下的奴隶。你打算了解她的能力，安排府内侍奉，再将她培养成可用的随从与战力。钱已付清，人也带回来了。先交代府内规矩，看看她的处境，还是听她说说自己的打算？`
    : `皇子府的门在身后关上，拍卖场的喧闹终于被隔在了另一头。${name}，你已经被${buyer.name}买下，带进这座陌生的宅邸。房里有人看守，身边的器具提醒着你眼下的处境；走廊上传来轻轻的脚步声，又渐渐远去。天斗城的生活似乎仍照常继续，你的故事却已拐向一条未曾预料的路。${buyer.name}站在房内，打量着自己买回的奴隶，准备交代府内的规矩。他想了解你的能力，安排日后的侍奉和修炼。先观察这间房，问清他的打算，再想想自己的下一步吧。在做出下一步选择前，你还有许多想要知道的事。`;
  }
  if(b.id==='sealed-titled'){
   const buyer=s.人物.列表[r.buyerId],subject=s.人物.列表[r.subjectId];
   if(isFound(b))return b.perspective==='buyer'?`${name}，你在城外旧道发现的封神台已经运回自宅。金色封锁罩仍闭合，${subject.name}在你的唤醒操作后睁开眼睛。你没有为这座封神台或其中的人付款，也尚未弄清它为何遗落在旧道。眼前的力量与囚锁都是真实的，对方有自己的记忆与打算。先隔着罩壁交谈，了解来历，或检查如何打开封神台？`:`${name}从沉眠中醒来，仍被封在封神台内。罩外是陌生的宅邸，${buyer.name}说自己在城外旧道发现了封神台，将它带回并唤醒了你。你没有亲眼见过发现与搬运经过；眼下能够确认的，是仍闭合的封锁罩和面前这个人。先问清对方的意图，观察器具与周围，或寻找改变处境的机会。`;
   return b.perspective==='buyer'
    ? `${name}，封神台已经运回你的宅邸。罩内的${subject.name}缓缓睁开眼，封锁罩与锁链仍牢牢闭合。隔着金色光纹，你终于能看清这位${s.成长.列表[r.subjectId].魂力等级>=91?'封号斗罗':'被囚者'}的神情；囚锁上的魂纹压着对方的力量，厚重的房门外有人守候。你花重金将人带回，抱着${b.actors?.buyer?.source&&b.actors.buyer.source!=='default'?'了解对方来历与处境':bg().BUYERS[b.buyerId].motive.replace(/^希望|^试图/,'')}的打算，却还没有听过对方亲口讲述来历。宅外的天斗城依旧热闹，房内的气氛却格外安静。先查看封神台与囚锁，还是隔着封锁罩交谈？这场拍卖已经结束，你们之间的故事才刚刚揭开第一页。`
    : `${name}从漫长的沉寂中醒来。金色封锁罩仍合拢在四周，锁链和囚锁贴着身体，魂力被沉重的封印压住。罩外没有拍卖场的喧哗，只有一间陌生的房和门外低低的脚步声。你已经被${buyer.identity}${buyer.name}买下，带回天斗城的宅邸；此刻能够看见、说话，眼前的封锁却没有解除。${s.成长.列表[r.subjectId].魂力等级>=91?'曾经以封号斗罗之名行走大陆的日子仿佛还在昨日。':'过往的修行与经历仍留在心里。'}先观察器具和房内的人，问清买主的打算，或寻找脱困的机会。罩外的世界依然在继续，而你的下一步，将从这里开始。`;
  }
  if(b.id==='jiumeitu-heir'){
   const soul=s.武魂.列表[s.成长.列表[r.mainId].武魂ID列表[0]],opened=soul.魂环ID列表.length,prisoners=(s.世界.opening.relations?.entries??[]).filter(e=>e.initialRealm).map(e=>s.人物.列表[e.targetId].name),mentor=(s.世界.opening.relations?.entries??[]).find(e=>e.actorId===r.mainId&&e.targetId===globalThis.SoulCanonArenaEngine.persistentCharacterId('yu-xiaogang-notting')&&e.kind==='mentor');
   return `${name}，掌中的长卷迎着晨光徐徐展开。绢面上，九间居室围绕着一座安静的庭院，门扉之间有细金色的光流转。${opened?`已有${opened}枚魂环，画中开放了${opened}个永久席位。`:'魂环还需在旅途中取得；每得到一枚魂环，便能开放一个永久席位。'}${prisoners.length?prisoners.join('、')+'已被安置在画中。':'此刻画中还没有居民。'}${mentor?'你记得大师曾指点过这种空间武魂。'+(mentor.contact?'如有疑问，可以与他联系。':''):''}先看看自己的武魂与行囊，再决定下一步旅途。庭院的样貌与今后的安排，都可以直接告诉主持人。`;
  }
  if(b.relations!==undefined){const rows=s.世界.opening.relations?.entries??[],names=rows.filter(e=>e.actorId===r.mainId||e.targetId===r.mainId).map(e=>s.人物.列表[e.actorId===r.mainId?e.targetId:e.actorId]?.name).filter(Boolean);return `${name}，你已来到${pLocation(s)}。行囊和往事伴你启程，${names.length?'与你相识的'+names.join('、')+'也有各自的生活。':'眼前的道路等待你亲自探索。'}先熟悉周围，或找人聊聊接下来的打算吧。`;}

  if(b.id==='shrek-student')return `${name}，欢迎来到史莱克学院。天斗校区的晨光越过树梢，落在训练场边；远处传来学员切磋时的喝声，熟悉的学院生活正向你展开。大师、弗兰德、赵无极与柳二龙是你的师长，七怪也是你认识的同门。从今天起，你有了一个可以学习、修炼，也可以结识伙伴的地方。大师正准备第一堂猎魂课：魂兽、魂环，以及每个魂师迟早都要面对的选择。先收好行囊，熟悉一下学院，或者去见大师，听听接下来的安排。你未来会成为怎样的魂师，此刻还没有人能替你写下答案。`;
  if(b.id==='seven-treasure')return `${name}，新一日的修习将从七宝琉璃宗开始。掌中的七宝琉璃塔映着晨光，流转的色泽让人想起每一道增幅背后的学问。宁风致、尘心与古榕是你熟悉的师长，宁荣荣也是相识的同门。这里教你的不仅是如何催动武魂，还有如何在战斗中看清伙伴的需要，挑选最合适的时机。首次修习的安排已经备好，宗门里仍有许多值得认识的人与事。你可以先看看今日的课程，或联系师长，问问该从哪一项练起。一座小小的琉璃塔，或许会在将来的某一天，成为许多人放心托付后背的理由。`;
  if(b.id==='clear-sky')return `${name}，山间云雾尚未散尽，昊天宗的新一日已经开始。手中的昊天锤沉甸甸的，握柄上熟悉的触感陪着你度过了许多个练习的清晨。唐啸与长老唐承岳已经交代首次外出历练，唐知远也是你相识的同辈；唐昊与唐月华的名字，则与宗门的往事紧紧相连。通向山外的路，你早已熟悉，真正陌生的是路尽头的大陆。先收拾行囊，看看自己的武魂与所学，或联系师长问清历练的安排。山门不会替你挡住所有风雨，但你带出去的每一次挥锤，都将写成自己的经历。`;
  if(b.id==='blue-dragon')return `${name}，蓝电霸王龙宗的修习生活正等着你。武魂显现时，细小的蓝色雷光沿着龙鳞游走；怎样让这股力量在身体里更加自如，是接下来龙化训练的课题。玉元震与玉罗冕是你的师长，玉天恒、玉天心也是熟悉的同辈。族内考核的安排已经摆在眼前，练习中的每一次进步，都可能成为你在考核里站稳脚跟的底气。先熟悉今日的训练，或联系一位师长，谈谈自己的打算吧。你传承着一个响亮的武魂名字，而名字之外的本领与道路，还要靠自己的脚步慢慢走出来。`;
  if(b.id==='canonical-character')return `${name}，你带着自己的记忆与传承来到${pLocation(s)}。眼前的大陆有熟悉的轮廓，也有等待你重新认识的人与事。先看看周围，整理行囊，决定这段旅途的第一步吧。`;
  const familiar=b.contacts.length?`想起${b.contacts[0].name}，那些相识的往事仍历历在目。`:'村里熟悉的道路之外，还有许多未曾相识的人。';
  return `${name}，你的旅程从圣魂村开始。武魂已经觉醒，随身的行囊与盘缠也已收好，家乡的晨光照着那条走过许多次的小路。过去的一切并不会在启程时消失：你的来历、习惯、那些难忘的日子，都将陪你走进更大的大陆。${familiar}第一枚魂环仍在前方，关于魂师的许多事，也等待你亲自去认识。你可以先看看自己的武魂与行囊，想好眼下最想做的一件事。也许是找人说说话，也许是迈出村口，去看看更远的风景。故事的第一页已经翻开，接下来，轮到你留下自己的脚印。`;
 }
 function record(s){return s.世界.opening?.background;}
 function validate(s){const r=record(s);if(!r)return Object.values(s.人物.列表).some(p=>p.generatedBy==='background-opening-v2')?['背景来源记录缺失']:[];const errors=[];if(!valid(r)||r.version!==2||!([undefined,CONTENT_REVISION].includes(r.contentRevision))||r.sourceId!==s.世界.opening.committedTransactionId||r.mainId!==s.角色.主控单位ID)errors.push('背景创建合同来源无效');errors.push(...validateBackgroundRelationships(s));errors.push(...globalThis.SoulBackgroundRestraints.validate(s));const p=acquisition(r);if(bg().targetId(r.config.background)&&!p)errors.push('背景取得来源记录缺失');if(p)errors.push(...validateAcquisitionEvidence(s));const expectedHistory=r.config.background.id==='sealed-titled'?Object.values(bg().resolveSlots(r.config)).filter(a=>a.source!=='canon').map(a=>a.id):r.config.background.id==='jiumeitu-heir'&&bg().policy(r.config.background,r.config.difficulty).level>10?[r.mainId]:[];if(bg().stable(r.historyEntityIds)!==bg().stable(expectedHistory))errors.push('背景历史能力承担者列表被更改');for(const id of expectedHistory)errors.push(...history().validate(s,id));return errors;}

function backgroundPersonId(key){
  const arena=globalThis.SoulCanonArenaEngine;
  if(!arena.CHARACTER_CATALOG[key])return key;
  const selected=arena.WORLD_STORY_SELECTIONS[arena.worldCharacterIdentityId(key)]??key;
  return arena.persistentCharacterId(selected);
}

function validateBackgroundRelationships(s){return globalThis.SoulOpeningRelations.validate(s);}

function bgSame(a,b){return bg().stable(a)===bg().stable(b);}
function only(rows,predicate){const matches=rows.filter(predicate);return matches.length===1?matches[0]:null;}
function bgEventValid(e){return !!e&&valid(e)&&Number.isSafeInteger(e.order)&&e.order>0;}

function strictAcquisitionFacts(s){
  try{
    const r=record(s),p=acquisition(r);
    if(!valid(r)||!valid(p)||r.version!==2||![undefined,CONTENT_REVISION].includes(r.contentRevision)||r.sourceId!==s.世界.opening.committedTransactionId||
       r.mainId!==s.角色.主控单位ID) return null;
    const b=bg().selection(r.config.background),policy=bg().policy(b),found=isFound(b);
    if(found?(!!r.purchase||p.kind!=='found'||p.sellerId!==undefined||p.amountGold!==undefined):!!r.discovery)return null;
    if(!['prince-cat','sealed-titled'].includes(b.id))return null;
    const expectedBuyerId=b.id==='prince-cat'
      ? globalThis.SoulCanonArenaEngine.persistentCharacterId('xue-beng')
      : bg().actorId(b,'buyer');
    const expectedTargetId=bg().targetId(b),sellerId='commerce-consignor-ruan';
    const expectedMainId=b.perspective==='captive'?expectedTargetId:expectedBuyerId;
    const expectedAssets={
      ...(found?{}:{purchaseGold:b.id==='prince-cat'?100000:1800000}),
      homeGold:900,
      balanceGold:b.id==='prince-cat'?50000:b.actors?.buyer?.source==='canon'?bg().resolveActor(r.config,'buyer').canonical.wallet:bg().BUYERS[b.buyerId].wallet
    };
    const at=r.createdAt,facilitySource=`${r.sourceId}:home`,facilityId=`facility:${facilitySource}`;
    const spaceId=`${facilityId}:cell-1`;
    if(p.id!==`background-${found?'found':'purchase'}:${r.sourceId}`||p.sourceId!==r.sourceId||
       p.backgroundId!==b.id||p.buyerId!==expectedBuyerId||previousHolder(p)!==sellerId||
       p.personId!==expectedTargetId||r.mainId!==expectedMainId||r.buyerId!==expectedBuyerId||
       r.subjectId!==expectedTargetId||p.at!==at||!Number.isSafeInteger(at)||
       (!found&&p.amountGold!==expectedAssets.purchaseGold)||!bgSame(p.assetHistory,expectedAssets)||
       !s.人物.列表[expectedBuyerId]||!s.人物.列表[sellerId]||!s.人物.列表[expectedTargetId]||
       !bgSame(p.delivery,{locationId:'loc-heaven-dou-city',facilityId,cellId:'cell-1'}))return null;
    const batch=globalThis.SoulCommerceProvenance.batch(s);
    if(!valid(batch)||batch.sourceId!==r.sourceId||batch.at!==at||
       batch.catalog.some(v=>v.personId===expectedTargetId))return null;
    const initial=only(batch.custodies,v=>v.personId===expectedTargetId);
    const events=cp().table(s).events;
    const initialEvent=initial&&only(events,e=>e.type==='custody-initialized'&&
      e.targetId===expectedTargetId&&e.sourceId===initial.sourceId);
    if(!valid(initial)||!bgEventValid(initialEvent)||initial.captorId!==sellerId||
       initial.custodianId!==sellerId||initial.at!==at||
       initial.level!==(b.id==='prince-cat'?9:bg().resolveActor(r.config,'captive').level)||
       !bgSame(initialEvent.initialSource,initial)||!bgSame(initialEvent.authority,initial.authority)||
       !bgSame(p.previousAuthority,initial.authority))return null;
    if(!Array.isArray(p.deviceItemIds)||!Array.isArray(p.deviceTransferEventIds)||
       !bgSame(p.deviceItemIds,initial.restraintItemIds)||
       new Set(p.deviceItemIds).size!==p.deviceItemIds.length||
       new Set(p.deviceTransferEventIds).size!==p.deviceTransferEventIds.length||
       p.deviceTransferEventIds.length!==p.deviceItemIds.length||!p.deviceItemIds.length)return null;
    const expectedPlatform=b.id==='sealed-titled'?'sample-titled-platform':null;
    if(p.platformItemId!==expectedPlatform)return null;
    if(!expectedPlatform&&(p.sealControlEventId!==null||p.openingSealEventId!==null||
       p.awakeningSealEventId!=null||p.platformOwnershipEventId!=null))return null;
    if(expectedPlatform&&[p.openingSealEventId,p.awakeningSealEventId].filter(Boolean).length!==1)return null;
    if(found){const discovered=only(events,e=>e.id===p.discoveryEventId);if(!bgEventValid(discovered)||discovered.type!=='platform-found'||discovered.sourceId!==`${p.id}:found`||discovered.actorId!==p.buyerId||discovered.targetId!==p.personId||discovered.at!==at||discovered.order<=initialEvent.order||!bgSame(discovered.discovery,{locationId:'loc-heaven-dou-city',scene:'城外旧道',platformItemId:expectedPlatform})||!bgSame(discovered.discovery,p.discovery)||!bgSame(discovered.previousAuthority,p.previousAuthority)||!bgSame(discovered.deviceItemIds,p.deviceItemIds))return null;}
    return {r,p,b,policy,events,batch,initial,initialEvent,at,facilitySource,facilityId,
      spaceId,expectedAssets,expectedBuyerId,expectedTargetId,sellerId};
  }catch{return null;}
}

function validateTransfer(s,e,prior){
  const x=strictAcquisitionFacts(s);if(!x)return false;const {p,at,initialEvent}=x;
  const previous=prior?.authority;
  return !!(bgEventValid(e)&&bgEventValid(prior)&&previous&&
    e.type==='custody-transferred'&&e.offerId===p.id&&e.sourceId===p.id&&
    e.id===p.custodyTransferEventId&&e.id===`custody-event:${p.id}:custody-transferred:${p.personId}`&&
    e.actorId===acquisitionOperator(p)&&e.targetId===p.personId&&e.at===at&&e.order>initialEvent.order&&(!isFound(x.b)||e.order>x.events.find(v=>v.id===p.discoveryEventId)?.order)&&
    bgSame(previous,p.previousAuthority)&&bgSame(e.previousAuthority,previous)&&
    bgSame(e.authority,{
      custodyId:previous.custodyId,personId:p.personId,custodianId:p.buyerId,
      version:previous.version+1,eventId:e.id
    })&&e.custodyId===previous.custodyId);
}

function validateDeviceTransfer(s,e){
  const x=strictAcquisitionFacts(s);if(!x)return false;const {p,at,events}=x;
  const index=p.deviceItemIds.indexOf(e?.itemId);if(index<0)return false;
  const transferred=only(events,v=>v.id===p.custodyTransferEventId);
  const attached=only(events,v=>v.type==='restraint-attached'&&v.itemId===e.itemId&&
    v.targetId===p.personId&&v.actorId===previousHolder(p)&&v.at===at&&
    v.attachment?.captureSourceId===x.initial.sourceId);
  if(!validateTransfer(s,transferred,x.initialEvent)||!bgEventValid(attached))return false;
  const expectedAttachment=clone(attached.attachment);
  expectedAttachment.controllers=[...new Set(expectedAttachment.controllers.map(id=>
    id===previousHolder(p)?p.buyerId:id))];cp().stamp(expectedAttachment);
  return !!(bgEventValid(e)&&e.type==='restraint-rights-transferred'&&e.at===at&&
    e.id===p.deviceTransferEventIds[index]&&e.sourceId===`${p.id}:device:${index}`&&
    e.id===`custody-event:${e.sourceId}:restraint-rights-transferred:${p.personId}`&&
    e.offerId===p.id&&e.transferEventId===transferred.id&&e.actorId===acquisitionOperator(p)&&
    (p.kind!=='found'||e.previousControllerId===previousHolder(p))&&
    e.targetId===p.personId&&e.buyerId===p.buyerId&&e.order>transferred.order&&
    bgSame(e.terms,{transferOwnership:true,transferControl:true})&&
    bgSame(e.ownership,{before:{owner:previousHolder(p),legalOwner:previousHolder(p)},
      after:{owner:p.buyerId,legalOwner:p.buyerId}})&&
    bgSame(e.previousAttachment,attached.attachment)&&
    e.previousAttachmentHash===attached.attachment.hash&&
    bgSame(e.attachment,expectedAttachment));
}

function validateSealTransfer(s,e){
  const x=strictAcquisitionFacts(s);if(!x||!x.p.platformItemId)return false;
  const {p,at}=x,db=globalThis.SoulSealingCore.table(s);
  const created=only(db.events,v=>v.type==='device-created'&&v.itemId===p.platformItemId);
  const transferred=only(x.events,v=>v.id===p.custodyTransferEventId);
  if(!bgEventValid(created)||!validateTransfer(s,transferred,x.initialEvent))return false;
  const expected=clone(created.control);expected.controllers=[p.buyerId];
  globalThis.SoulSealingCore.stamp(expected);
  return !!(bgEventValid(e)&&e.type==='control-transferred'&&
    (e.backgroundPurchaseId??e.backgroundAcquisitionId)===p.id&&e.auctionId===null&&p.sealControlEventId===e.id&&
    e.itemId===p.platformItemId&&e.fromId===previousHolder(p)&&e.toId===p.buyerId&&
    e.at===at&&e.order>transferred.order&&e.sourceId===`${p.id}:seal-control`&&
    bgSame(e.before,created.control)&&bgSame(e.after,expected));
}

function validateAcquisitionEvidence(s){
  const errors=[],x=strictAcquisitionFacts(s);
  if(!x)return ['背景既往成交身份、资产配置或初始原件集合无效'];
  const {r,p,b,events,initialEvent,at,facilitySource,facilityId,spaceId,expectedAssets}=x;
  const transfer=only(events,e=>e.id===p.custodyTransferEventId);
  if(!validateTransfer(s,transfer,initialEvent))errors.push('背景看管交割缺少原权限事件');
  const devices=events.filter(e=>e.type==='restraint-rights-transferred'&&e.offerId===p.id);
  if(!bgSame(devices.map(e=>e.id),p.deviceTransferEventIds)||
     devices.some(e=>!validateDeviceTransfer(s,e)))errors.push('背景器具交付全集或原条款来源无效');
  const home=only(events,e=>e.type==='logistics-facilities'&&e.sourceId===facilitySource);
  const f=home?.record;
  if(!bgEventValid(home)||home.actorId!==p.buyerId||home.targetId!==p.buyerId||
     home.previousHash!==null||home.at!==at||!valid(f)||f.id!==facilityId||
     f.sourceId!==facilitySource||f.ownerId!==p.buyerId||
     !bgSame(f.operatorIds,[p.buyerId])||f.templateId!=='holding-house'||
     f.locationId!=='loc-heaven-dou-city'||f.createdAt!==at||
     !bgSame(f.acquisition,{mode:'buy',price:900,estateId:''})||
     f.status!=='active'||f.condition!==100||
     !bgSame(f.cells,[1,2].map(i=>({id:`cell-${i}`,spaceId:`${facilityId}:cell-${i}`,
       capacity:1,locked:false,condition:100}))))errors.push('背景既往家宅缺少唯一购置与房间事件');
  const assets=only(events,e=>e.id===p.assetHistoryEventId);
  const expectedAccounts=[
    {walletId:s.人物.列表[p.buyerId].walletId,ownerEntityId:p.buyerId,gold:expectedAssets.balanceGold}
  ];
  if(!bgEventValid(assets)||assets.type!=='background-assets-initialized'||
     assets.sourceId!==`${p.id}:assets`||(assets.backgroundPurchaseId??assets.backgroundAcquisitionId)!==p.id||
     assets.kind!=='opening-historical-assets'||assets.actorId!==p.buyerId||assets.targetId!==p.buyerId||
     assets.at!==at||assets.order<=home?.order||assets.facilityId!==facilityId||
     assets.historicalTotalGold!==Object.values(expectedAssets).reduce((a,v)=>a+v,0)||
     !bgSame(assets.assetHistory,expectedAssets)||!bgSame(assets.accounts,expectedAccounts)||
     expectedAccounts.some(v=>s.钱包.列表[v.walletId]?.ownerEntityId!==v.ownerEntityId))
    errors.push('背景既往资金与成交来源不一致');
  const admit=only(events,e=>e.type==='custody-arranged'&&e.sourceId===`${p.id}:admit`);
  const admitSave=only(events,e=>e.type==='logistics-facilities'&&e.sourceId===`${p.id}:admit`);
  const door=only(events,e=>e.type==='logistics-facilities'&&e.sourceId===`${p.id}:door`);
  const closedArrival=Boolean(p.platformItemId&&p.awakeningSealEventId);
  if(closedArrival){
    if(admit||admitSave)errors.push('封神台内的人物不能另记为已离台入住');
  }else if(!bgEventValid(admit)||admit.actorId!==p.buyerId||admit.targetId!==p.personId||
     admit.at!==at||admit.order<=transfer?.order||
     !bgSame(admit.authority,transfer?.authority)||
     !bgSame(admit.arrangement,{kind:'facility',facilityId,cellId:'cell-1'})||
     !bgSame(admit.position,{kind:'location',locationId:'loc-heaven-dou-city',sceneId:spaceId})||
     !bgEventValid(admitSave)||admitSave.entityId!==facilityId||admitSave.actorId!==p.buyerId||
     admitSave.order<=admit.order||admitSave.previousHash!==home?.record.hash||
     !bgSame(admitSave.record,home?.record))errors.push('背景到宅入住缺少实际场景与权限来源');
  const doorBefore=closedArrival?home:admitSave;
  const expectedDoor=clone(doorBefore?.record??{});
  if(expectedDoor.cells?.[0])expectedDoor.cells[0].locked=true;cp().stamp(expectedDoor);
  if(!bgEventValid(door)||door.entityId!==facilityId||door.actorId!==p.buyerId||
     door.targetId!==p.buyerId||door.at!==at||door.order<=doorBefore?.order||
     door.previousHash!==doorBefore?.record.hash||!bgSame(door.record,expectedDoor))
    errors.push('背景锁门缺少实际房门操作来源');
  if(p.platformItemId){
    const db=globalThis.SoulSealingCore.table(s);
    const initialAsset=only(x.batch.assets,a=>a.itemId===p.platformItemId);
    const control=only(db.events,e=>e.id===p.sealControlEventId);
    const ownership=only(events,e=>e.id===p.platformOwnershipEventId);
    if(!valid(initialAsset)||initialAsset.initialOwnerId!==previousHolder(p)||
       initialAsset.templateId!=='seal-platform'||!validateSealTransfer(s,control)||
       !bgEventValid(ownership)||ownership.type!=='background-platform-delivered'||
       ownership.sourceId!==`${p.id}:platform`||(ownership.backgroundPurchaseId??ownership.backgroundAcquisitionId)!==p.id||
       ownership.actorId!==acquisitionOperator(p)||ownership.targetId!==p.personId||ownership.itemId!==p.platformItemId||
       ownership.initialAssetSourceId!==initialAsset.sourceId||ownership.at!==at||
       ownership.order<=control?.order||
       !bgSame(ownership.before,{containerId:s.人物.列表[previousHolder(p)].inventoryContainerId,
         ownerEntityId:previousHolder(p),legalOwnerEntityId:previousHolder(p)})||
       !bgSame(ownership.after,{containerId:s.人物.列表[p.buyerId].inventoryContainerId,
         ownerEntityId:p.buyerId,legalOwnerEntityId:p.buyerId}))
      errors.push('背景封神台物权与实际器体交付来源无效');
    const entered=only(db.events,e=>e.type==='entered'&&e.sourceId===`${r.sourceId}:initial-seal:${p.personId}`);
    if(!bgEventValid(entered)||entered.targetId!==p.personId||entered.itemId!==p.platformItemId||
       entered.record?.status!=='sealed'||
       entered.record?.operatorId!==previousHolder(p)||entered.record?.permissionId!==null||
       !bgSame(entered.record?.custodyAuthority,p.previousAuthority)||
       entered.at!==at||entered.order>=transfer?.order)
      errors.push('背景封神台缺少原实体实际封入与交付');
    if(closedArrival){
      const awakened=only(db.events,e=>e.id===p.awakeningSealEventId);
      if(p.openingSealEventId!==null||!bgEventValid(awakened)||awakened.type!=='awakened'||awakened.at!==at||
         awakened.sourceId!==`${p.id}:awaken`||awakened.targetId!==p.personId||awakened.itemId!==p.platformItemId||
         awakened.record?.id!==entered?.record?.id||awakened.record?.status!=='confined'||
         ['sourceId','targetId','itemId','operatorId','level','powerOwnerId','permissionId','releaseAt','custodyAuthority'].some(key=>!bgSame(awakened.record?.[key],entered?.record?.[key]))||
         awakened.record?.enteredAt!==entered?.record?.enteredAt||awakened.record?.lock!==entered?.record?.lock||
         awakened.record?.endedAt!==null||
         !bgSame(awakened.request,{type:'awaken-seal',actorId:p.buyerId,itemId:p.platformItemId})||
         !bgSame(awakened.position,{kind:'location',locationId:'loc-heaven-dou-city',sceneId:spaceId})||
         awakened.order<=ownership?.order||awakened.order<=assets?.order||awakened.order>=door?.order||
         db.events.some(e=>e.type==='released'&&e.record?.id===entered?.record?.id&&e.order<=awakened.order))
        errors.push('背景封神台缺少闭罩交付与到宅唤醒来源');
    }else{
      const opened=only(db.events,e=>e.id===p.openingSealEventId);
      if(!bgEventValid(opened)||opened.type!=='released'||opened.reason!=='manual'||opened.at!==at||
         opened.sourceId!==`${p.id}:open`||opened.targetId!==p.personId||opened.itemId!==p.platformItemId||
         opened.record?.id!==entered?.record?.id||opened.record?.endSourceId!==`${p.id}:open`||
         !bgSame(opened.request,{type:'open-seal',actorId:p.buyerId,itemId:p.platformItemId})||
         !bgSame(opened.position,{kind:'location',locationId:'loc-heaven-dou-city',sceneId:spaceId})||
         opened.order<=ownership?.order||opened.order<=home?.order||opened.order>=admit?.order)
        errors.push('背景封神台缺少原实体实际到宅与买主开封');
    }
  }
  return errors;
}

 function currentPurchase(s,x){
  const first=x.events.find(e=>e.id===x.p.custodyTransferEventId);
  if(!first||!validateTransfer(s,first,x.initialEvent))return null;
  let ownerId=x.p.buyerId,prior=first,released=false,escaped=false,endedReason=null,last=first;
  for(const e of x.events.filter(e=>e.custodyId===first.custodyId&&e.order>first.order&&['custody-transferred','released','escaped','custody-death'].includes(e.type))){
   if(!bgEventValid(e)||e.targetId!==x.p.personId||released)return null;
   if(e.type==='custody-transferred'){
    const transferred=e.offerId?.startsWith('asset-lot:')?globalThis.SoulSealingCore.validateAuctionTransfer(s,e,prior):globalThis.SoulCustodyMarket.validateTransfer(s,e,prior);
    if(!transferred||e.actorId!==ownerId)return null;
    ownerId=e.authority.custodianId;prior=e;escaped=false;
   }else{
    if(!bgSame(e.authority,prior.authority))return null;
    if(e.type==='released'){released=true;endedReason='released';}
    if(e.type==='escaped')escaped=true;
    if(e.type==='custody-death'){released=true;endedReason='death';}
   }
   last=e;
  }
  return {ownerId,released,escaped,endedReason,last};
 }
 function personContext(s,personId,viewerId=s.角色.主控单位ID){
  const r=record(s),empty={backgroundId:null,contentRevision:null,relationship:null,history:[]};
  if(!r||!valid(r)||![undefined,CONTENT_REVISION].includes(r.contentRevision)||!s.人物?.列表?.[personId]||!s.人物.列表[viewerId])return empty;
  const b=bg().selection(r.config.background),result={backgroundId:b.id,contentRevision:r.contentRevision??1,relationship:null,history:[]};
  if(personId!==viewerId){
   try{
    const current=social().relationshipBetween(s,viewerId,personId);
    if(current)result.relationship={...current,label:current.otherRole??current.label,viewerRole:current.selfRole,personRole:current.otherRole};
   }catch{/* Invalid source records cannot manufacture a directional relationship. */}
  }
  if(!acquisition(r))return result;
  const possible=new Set([r.buyerId,r.subjectId,cp().table(s).byPerson[r.subjectId]?.custodianId]);
  if(!possible.has(personId))return result;
  const x=strictAcquisitionFacts(s);if(!x||validateAcquisitionEvidence(s).length)return result;
  const current=currentPurchase(s,x);if(!current)return result;
  const participant=[x.p.personId,x.p.buyerId,current.ownerId].includes(viewerId);
  const knowledge=social().latest(s,viewerId,x.p.personId),knownTransfer=knowledge?.fact.kind==='custody-transferred'&&knowledge.fact.sourceId===x.p.custodyTransferEventId;
  const remembers=participant&&social().remembers(s,viewerId,x.at,[],x.events.find(e=>e.id===x.p.custodyTransferEventId).order);
  if(!participant&&!knownTransfer)return result;
  if(![x.p.personId,x.p.buyerId,current.ownerId].includes(personId))return result;
  const buyer=s.人物.列表[x.p.buyerId],subject=s.人物.列表[x.p.personId],seller=s.人物.列表[previousHolder(x.p)];
  if(isFound(b)){if(remembers||knownTransfer)result.history.push({kind:'found',text:viewerId===x.p.buyerId?`${buyer.name}在城外旧道发现仍封闭的封神台，将它带回自宅并唤醒${subject.name}；没有进行买卖，也尚未弄清封神台如何遗落在旧道。`:`${subject.name}醒来时仍被封在封神台内。${buyer.name}自称在城外旧道发现后将其带回；${subject.name}没有亲历发现与搬运，不能据此确认遗落原因或先前经手人。`,sourceId:x.p.id,at:x.at,order:x.events.find(e=>e.id===x.p.discoveryEventId).order});}else if(remembers||knownTransfer)result.history.push({kind:'purchase',text:`${buyer.name}已经从${seller.name}处买下${subject.name}，并带回${b.id==='prince-cat'?'皇子府':'自宅'}。${seller.name}是这次交易的卖方。`,sourceId:x.p.id,at:x.at,order:x.events.find(e=>e.id===x.p.custodyTransferEventId).order});
  const subjectView=viewerId===x.p.personId&&personId===current.ownerId,ownerView=viewerId===current.ownerId&&personId===x.p.personId;
  if(subjectView||ownerView){
   const cat=b.id==='prince-cat',label=current.released?(subjectView?(cat?'前主人':'原买主'):current.endedReason==='death'?'已故之人':'已释放的人'):(subjectView?(cat?'主人':'买主'):(cat?'奴隶':'被囚者'));
   result.relationship={kind:current.released?(cat?'former-owner-slave':'former-purchase'):(cat?'owner-slave':'purchased-captive'),label,sourceId:current.last.id,participants:[viewerId,personId],viewerRole:current.released?(subjectView?(current.endedReason==='death'?'已故之人':'已获释放'):cat?'前主人':'原买主'):(subjectView?(cat?'奴隶':'被囚者'):(cat?'主人':'买主')),personRole:label};
   result.situation=current.released?(current.endedReason==='death'?`${subject.name}已经死亡，原买卖与囚禁经历保留。`:cat?'双方的主奴关系已经结束。':'买主已经正式释放被囚者。'):current.escaped?`${subject.name}已经逃离实际关押，原买卖经历仍然存在。`:`${subject.name}是${s.人物.列表[current.ownerId].name}买下的${cat?'奴隶':'被囚者'}。`;
  }else if(viewerId===x.p.personId&&personId===x.p.buyerId&&current.ownerId!==personId){
   result.relationship={kind:b.id==='prince-cat'?'former-owner-slave':'former-purchase',label:b.id==='prince-cat'?'前主人':'原买主',sourceId:current.last.id,participants:[viewerId,personId],viewerRole:'原被购者',personRole:'前主人'};
  }
  if(isFound(b)&&result.relationship){result.relationship={...result.relationship,label:result.relationship.label==='买主'?'发现者':result.relationship.label,kind:result.relationship.kind==='purchased-captive'?'found-captive':result.relationship.kind,viewerRole:result.relationship.viewerRole==='买主'?'发现者':result.relationship.viewerRole,personRole:result.relationship.personRole==='买主'?'发现者':result.relationship.personRole};if(result.situation)result.situation=result.situation.replace('买下的','发现并带回的').replaceAll('买主','发现者').replaceAll('买卖','发现与囚禁');}
  return result;
 }
 return Object.freeze({acquisition,CONTENT_REVISION,createPerson,prepareRare,initialize,localNames,record,validate,validateTransfer,validateDeviceTransfer,validateSealTransfer,personContext,effectiveProfile});
});

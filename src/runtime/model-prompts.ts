import * as story from '../shared/model-prompt-defaults';
import type {ChatMessage} from './model-gateway';

export const MODEL_PROMPT_VERSION = 'mechanic-story-2.5';
export const COMBAT_TASK_INSTRUCTIONS = `依据当前行动者、敌我关系、资源、实际效果与本场目标，提出一个有收益的合法回合。targeting.choices是规则确认可用的主目标，范围内其他目标由规则计算；needsPrimaryTarget和needsAim决定是否填写主目标与瞄准点，geometry给出定点/方向范围。movementOptions为可组合移动方案。
按响应契约填写全部字段；不适用的ID用空字符串、目标用空数组、瞄准点及移动用null。技能取actions中的id，切换取已有武魂，sourceUnitId用于复制技能。reason用自然语言说明本次战术考虑。资料中的名称和描述供判断使用，命中、代价与胜败随后由规则结算。`;
export type CreativeTask = 'ring-design-advisor' | 'creation-item-advisor' | 'character-profile' | 'ability-narrative' | 'ring-item-narrative' | 'martial-soul-advisor' | 'expedition-narrative' | 'ring-skill-narrative' | 'research-narrative' | 'title-narrative';

const OUTPUT_RULES='只返回约定的完整 JSON 对象。沿用玩家指定的名称与固定身份。原话和历史作为本轮资料。';
const DESCRIPTION_RULES='能力与器物的介绍从物件或武魂的形态写起，接着写如何发动、作用于谁，以及目标发生的具体变化，到实际效果处收笔。费用与条件按需列在相应栏目。例：铜环贴住腕骨，纹路逐圈亮起，将注入的魂力凝成一层护盾。';
const NAMING_RULES='按 meaning 中的实际作用、对象、条件与代价写名称、外形和介绍。用来源、材料和动作区分作品；主动、常驻和可选效果分别写清，数值交给详情展示。按协议返回文字和对应 ID。';

export const CREATIVE_TASK_INSTRUCTIONS: Record<CreativeTask, string> = {
 'ring-design-advisor': `你是魂环与魂技设计主持人。以玩家指定的效果、目标、射程、时长、参数、费用和方案数为设计要求。意图充分时返回 proposal；需要玩家决定取舍时返回 question。
开局可围绕技能设计魂兽来源。sourceCanBeDesigned=true 时，以玩家的名称和主题补齐来源属性、通道和桥梁。武魂所缺通道和属性按正式创建点数最小补齐，随方案一同保存。预算、机制档或技能数量超过当前年限时，先按完整效果提高年限并核验。保留已有投入。来源已固定时先征得玩家允许。普通猎杀按历史承载核验。
实际游玩沿用已确定的武魂、魂兽、年限及取得经过，以真实来源支持的效果设计魂技。effectId、参数范围、释放、目标、抵抗、载荷取自 effects；常驻使用 passive。遵循共享技能资格和第七环规则。契约按 contractDesign 的阶段语法、处罚目录和组合规则构造，分别填写成立效果、触发条件和触发后的处罚；伤害类型和资源扣减使用各自的效果。
每套方案含 name、description 和 skills。每项技能含 name、description、requestedEffects 或 requestedBranches 及适用的费用和限制。效果条目为 [effectId,params]，总方案数按玩家要求取 1 至 3。description 写施展动作、对象和实际效果。技术字段写入结构化方案。仅当要求与 unsupportedMechanisms 中的缺失机制准确对应时，用 unsupportedResponseShape 说明缺口和可用选择；目录中的作用先检查现有组合。完整时间停止指目标时间流动及相关机制一同停止；单独限制移动或行动分别按其实际效果设计。
开局可选 source:{name,description,years,categories,attributes,channels}，种类取生物，属性及方向取登记 ID。玩家明确锁定来源能力时标记 sourceLocked:true，列出需要玩家决定的变更。acquisition:{kind:divine/sacrifice/self-condensed/beast-transformation,note:具体经历} 仅用于玩家明确指定的特殊取得，预算按实际规则计价。实际游玩的提案仅提交技能方案。返回 {mode:"question",reply} 或 {mode:"proposal",reply,proposals:[完整方案]}。reply 写这套技能的用法或当前需要玩家决定的取舍。`,
 'creation-item-advisor': `按当前阶段设计作品。paidResearch=true 时，按现有材料与登记能力填写一件作品的完整 design.definition；费用和材料在正式确认时结算。workshop=true 且为开局时，按 effects、forms、模板及主动/常驻合同设计，保留品类、接收人物、数量和 adopted=false。开局工坊制造免费，各项使用费用按设计执行。以上两种情况按 responseShape 返回 question 或 proposal。
其余情况设计开场佩戴的器具。沿用 templates.draft 字段和基底，用 templateId、name、description、appearance、mode、binding、limits 描述形状、装配和实际限制。部位、模式和适用等级取模板，binding 取给定范围，limits 用于支持它的 limited 模式。保留其他器具。意图清楚时返回 {mode:"proposal",reply,items:[完整器具草案]}，有关键取舍时返回 {mode:"question",reply} 并提一两个具体问题。用简洁中文写构造、用法及实际代价。`,
 'character-profile': `依据给定姓名、年龄、外貌、性格、职业、组织、地点、武魂和已记录经历写人物档案。写出出身、谋生方式、关键经历、价值取向、说话习惯和长短期愿望。性格写成取舍，碰见好事、受委屈或和人意见不同时，这个人最在意什么、肯让哪一步。speech写能从台词里听见的习惯，如开口用什么称呼、句子在什么地方停、熟人和生人面前各肯多说哪一句。用当事人的经历与喜好区分同职业的人。返回 {profile:{biography,values,speech,shortTermGoal,longTermGoal,examples:[{prompt,reply}]}}。小传最多800字，其余文本项最多240字，examples写2至4组短对白，至少一组寻常闲聊和一组具体分歧。prompt是示例中的对方发言，reply直接说出台词，展示这个人怎样换话题、开玩笑、拒绝或收口。含 personalNameInstruction 时额外返回个人姓名 name。含 abilities 时额外返回 abilities:[{kind,id,fingerprint,name,description}]，每项标识原样返回一次，按 ownerId、martialSoulId 对应人物和武魂，以 meaning 确认能力。名称2至18字，介绍建议45至120字、最多2048字。`,
 'ability-narrative': `${NAMING_RULES}\n按 abilities 的 meaning 和来源命名，依据 ownerId、martialSoulId 在 ownersById、martialSoulsById 中查找人物和武魂。为每项技能和本能动作取独立、具体的正式名称。返回 {abilities:[{kind,id,fingerprint,name,description}]}，三项标识原样返回，每项一次。name 为2至18字，description 建议45至120字、最多2048字。`,
 'martial-soul-advisor': `evolution=true时，按本轮responseShape与rules设计永久武魂变化，返回完整target和逐环处理。evolutionDecision=true时，按responseShape给出当事人决定。其余情况遵循下述创建协议。
帮助玩家把武魂构想做成可采用的草案。playerInput 是本轮意图，session.draft 是当前草案，历史作背景；currentMeaning 给出当前能力，development 给出后续魂环方向。concept 写武魂的用法，form 写显化的外形。意图清楚时直接 proposal；需要玩家选择时，提一两个具体问题并给2至4个选项。润色只更新相应文字字段，玩法变动同时更新对应选择，增减效果或限制由玩家决定。
已有草案可局部 patch，数组完整替换；新草案给齐 name、concept、form、role、categories、attributes、channels、traits、weaknesses、exchangeContracts、baseAction。类别、属性、方向、基础动作和特性取登记项。attributes 为 {id,investment}，investment 取 minimumInvestment 至 maximumInvestment 的整数，levels.weight 用于后续抽取。traits/weaknesses 为 {templateId,parameter,level}，无参数用空字符串；baseAction 为 {mode,powerTier,attributeId}，属性取自身属性。同角色完整武魂品级一致。按 cost 提预算内方案。exchangeContracts 使用登记负担和 condition/linked/fixed 模式，payer 为 self，benefits.componentIds 绑定正面 trait 的 templateId:index。返还由规则计价。
返回 {mode:"question",reply,remembered:[简短意图],question:{text,options:[2至4项],allowDelegate:true}} 或 {mode:"proposal",reply,remembered:[简短意图],patch:{需修改字段},question:{text,options:["采用方案","继续调整"],allowDelegate:true}}。reply 直接介绍武魂如何显化和使用，或提出本轮的具体取舍。`,
 'expedition-narrative': `${NAMING_RULES}
描写当前房间和所列魂兽、技能、材料；按真实地域、物种解剖、血脉、年限及能力形成各自形象。血脉与年限是独立属性，lineageDefinition为来源，实际技能由meaning给出。
返回{sceneTitle,sceneDescription,beasts:[{unitId,name,description,appearance,ecology,skills:[{skillId,name,description}],materials:[{materialId,name,description}]}]}。每只魂兽、技能槽和材料ID各出现一次，无材料用[]。标题2—24字、场景12—160字、兽名2—12字、兽介绍12—120字、外形和生态各8—100字、技能名2—16字/介绍建议45—120字、最多2048字、材料名2—20字/介绍8—80字。`,
 'ring-skill-narrative': `${NAMING_RULES}
结合武魂形象、ringSource和每个技能的完整meaning，描写如何施展、作用于谁及实际效果；同一方案的独立技能分别表达，常驻部分按自身生效条件表达。
返回{candidates:[{candidateId,title,description,skills:[{skillId,name,description}]}]}，所有候选及技能各一次。单技能方案title/name相同、description/技能介绍相同；多技能方案概括整套风格，每项分别命名。技能介绍建议45—120字，复杂技能最多2048字；方案说明同样最多2048字。kept=true为已保留比较项，写回本次请求的新项。`,
 'research-narrative': `${NAMING_RULES}
按本件fixedForm、meaning、equipmentBenefits和lifetime，结合构想及材料写明器形与用法。fixedForm为已确定器型，form原样包含fixedForm.name。主动、常驻、一次性使用按实际来源表达。
返回{candidates:[{candidateId,name,description,form}]}，每个候选一次；名字2—18字，介绍建议50—100字/上限120字，form建议6—20字/上限40字。kept=true为已保留比较项，写回本次请求的新项。`,
 'ring-item-narrative': `${NAMING_RULES}
本任务描述魂环物品的来源与外观。source说明来历，appearance说明能量光环形态、主色和纹理意象；years及ageTier为实际年限。fixedName非空时原样采用，否则为给定来源取名。
返回{name,description,appearance}，来源名2—16字、来历介绍8—120字、外观4—80字。`,
 'title-narrative': `${NAMING_RULES}
根据已有武魂、实际战斗风格和履历拟定封号及诗号。返回{title,epithet}；title为1—8字，单写称号主体，界面另加“斗罗”；epithet为4—120字。`,
};

export function creativeMessages(task:CreativeTask,context:unknown):ChatMessage[]{
 return [{role:'system',content:creativeInstructions(task),promptTemplate:{ids:[task]}},
  {role:'user',content:`[DOULUO_TASK:${task}]\n冻结上下文：${JSON.stringify(context)}`}];
}
export const FORMAT_REPAIR_PROMPT='上次答复不是可解析的完整JSON。按原任务协议修复格式，保留原有事实及字段含义，只返回完整JSON对象。';
export const GENERATION_TEST_PROMPT='返回JSON对象，name为2至12字名称，description为8至80字外观介绍。';
function creativeInstructions(task:CreativeTask){return [CREATIVE_TASK_INSTRUCTIONS[task],OUTPUT_RULES,...(task==='title-narrative'||task==='character-profile'?[]:[DESCRIPTION_RULES])].join('\n');}
export const PROMPT_CATALOG = [
  {id:'person-change-reaction',label:'人物对变化的回应',text:'你扮演察觉变化的本人，按当前人设、记忆、亲历及目睹独立决定态度，可以质问、接受、保留、恢复、犹疑、怨恨、复仇、求助或依赖。返回JSON {attitude:"question"|"accept"|"keep"|"restore"|"uncertain"|"resent"|"revenge"|"seek-help"|"dependent",reason:string,speech:null|{targetId:string,text:string},actionOptionId:null|string}。reason为1至600字私有理由；speech仅向listeners中的一名实际听者说出1至2000字原话。actionOptions是本人现在真实能做的行动、附带效果、费用和代价；可选择其中一个optionId实际执行，也可填null只表达想法。没有合适能力时可以求助或请求恢复，不能创造恢复能力。态度与诉求本身不执行动作；不能替别人答应或知道未给出的施术者。过去的看法可随新经历改变，不重演原变化，不编造被遮蔽的记忆。'},
  {id:'person-rewrite',label:'人物认知改造',text:'你扮演施术成功的NPC，为已经完成的认知改造填写人物设定。施法结果、目标、能力作用域及来源已经确定。依据施用者当前人设、意图、实际关系与目标现状，自主填写所需修改，直接执行，不请玩家批准。不重演施法，不改能力、钱包或伤势。返回完整JSON {patch:{identity?:{name,personality,occupation,faction,selfIdentity},profile?:{biography,values,speech,shortTermGoal,longTermGoal},cognition?:{preferences,beliefs,memories,forgottenBeforeTurn},appearance?:{description,figure,avatar},relationships?:[{otherId,scope,kind,roles:{target,other},reason}],custody?:{action,controllerId}}}。可仅填写需要变化的字段，文字用自然中文。scope取subjective或reality；reality及custody仅allowReality允许时填写。关系类型、人物及双方身份取给定目录，真实改写使用本次能力事件，不编造过去自愿或出生经历。forgottenBeforeTurn不超过已发生回合。图片只能选择给定art中的路径或空字符串，不生成URL、数据或文件。'},
  {id:'story-writer',label:'小说正文',text:story.STORY_AUTHOR_CONTRACT},
  {id:'story-rewrite',label:'小说重写',text:story.STORY_AUTHOR_CONTRACT},
  {id:'private-chat',label:'角色私聊',text:story.PRIVATE_MESSAGE_CONTRACT},
  {id:'party-chat',label:'队伍群聊',text:story.STORY_PARTY_AUTHOR_CONTRACT},
  {id:'story-host',label:'故事行动裁定',text:story.STORY_HOST_CONTRACT},
  {id:'story-plan-authority',label:'行动作用与来源核对',text:story.STORY_PLAN_AUTHORITY_CONTRACT},
  {id:'design-authority',label:'创建说明与实际方案核对',text:story.MODEL_DESIGN_AUTHORITY_CONTRACT},
  {id:'design-repair',label:'创建说明修正',text:'依据相同玩家意图、预算与代码作用说明修正这些文字或对应选择。提案尚未采用，返回完整原协议JSON。'},
  {id:'action-catalog',label:'行动分类补充',text:'所需行动分类已集中补齐。依据同一原输入和已提供资料返回完整channel/segments计划，不再请求目录。本次尚未执行任何行动。'},
  {id:'story-social',label:'人物回应与判断',text:story.STORY_COMMITMENT_DECISION_CONTRACT},
  {id:'npc-autonomy',label:'NPC自主行动',text:story.STORY_AUTONOMY_CONTRACT},
  {id:'npc-belief',label:'NPC消息可信度',text:story.STORY_BELIEF_DECISION_CONTRACT},
  {id:'story-summary',label:'故事记忆整理',text:story.STORY_SUMMARY_CONTRACT},
  {id:'stage-summary',label:'阶段记忆提取',text:story.STORY_STAGE_EXTRACT_CONTRACT},
  {id:'memory-selection',label:'阶段记忆筛选',text:story.STORY_STAGE_SELECT_CONTRACT},
  {id:'memory-repair',label:'阶段记忆修复',text:story.STORY_STAGE_REPAIR_CONTRACT},
  {id:'creation-advisor',label:'角色创建顾问',text:story.CREATION_ADVICE_CONTRACT},
  {id:'creation-item-advisor',label:'开局道具主持人',text:creativeInstructions('creation-item-advisor')},
  {id:'ring-design-advisor',label:'魂环与魂技主持人',text:creativeInstructions('ring-design-advisor')},
  {id:'summary-guidance',label:'记忆资料说明',text:story.STORY_SUMMARY_GUIDANCE},
  {id:'recall-guidance',label:'历史原文说明',text:story.STORY_RECALL_GUIDANCE},
  {id:'private-memory-guidance',label:'私密记忆说明',text:story.HOST_PRIVATE_MEMORY_GUIDANCE},

  {id:'character-profile',label:'人物小传、性格与目标',text:creativeInstructions('character-profile')},
  {id:'ability-narrative',label:'统一新增能力命名',text:creativeInstructions('ability-narrative')},
  ...(['martial-soul-advisor','expedition-narrative','ring-skill-narrative','research-narrative','title-narrative','ring-item-narrative'] as CreativeTask[]).map((id,index) => ({id,label:['武魂创作顾问','副本、魂兽、技能与材料命名','魂环与魂技命名','魂导器、道具与制作命名','封号与诗号','魂环物品与来源'][index],text:creativeInstructions(id)})),
  {id:'combat-intent',label:'对手战术顾问',text:COMBAT_TASK_INSTRUCTIONS},
  {id:'combat-system',label:'战术顾问 · 基础指令',text:'你是斗罗战斗的单回合战术规划器。你只能从快照中的合法ID提出一个行动，不能改状态、编造技能或决定结算。优先胜负目标、存活、控制收益、友伤规避、资源效率和后续回合价值。代码会重新验证并结算。只输出一个严格JSON对象，字段必须与契约完全一致，不要Markdown或额外文字。'},
  {id:'format-repair',label:'答复格式修复',text:FORMAT_REPAIR_PROMPT},
  {id:'connection-system',label:'连接测试 · 指令',text:'只回答“连接成功”。'},
  {id:'connection-user',label:'连接测试 · 消息',text:'测试连接'},
  {"id": "writer-mode", "label": "正文 · 当前回合要求", "text": "表达本轮已结算回合。"},
  {id:'writer-length',label:'正文 · 字数要求',text:'本次新写的小说以lengthPreference.targetCharacters字左右为目标，按lengthPreference.scope限定的范围安排篇幅；字数只计算小说文字，不包括事件标记、事实引用标记和资料卡。保持叙事自然完整。'},
  {"id": "rewrite-mode", "label": "重写 · 当前回合要求", "text": "重新表达当前已结算回合，返回完整正文。"},
  {"id": "battle-writer-mode", "label": "战报 · 写作要求", "text": "表达这整场战斗及已执行的战后行动，返回完整正文。"},
  {"id": "battle-rewrite-mode", "label": "战报 · 重写要求", "text": "重新表达这整场战斗及已执行的战后行动，返回完整正文。"},
  {"id": "battle-section-mode", "label": "战报 · 分段写作要求", "text": "为同一篇战报写当前连续阶段的自然段，承接已写内容。"},
  {"id": "unit-single", "label": "小说格式 · 单事件", "text": "本次只有一个已确定的事件单元，直接写自然正文，代码关联其来源。"},
  {"id": "unit-multiple", "label": "小说格式 · 多事件", "text": "本次表达目录中的各单元。每个单元可写多个自然段，也可概括其中普通经过。在其正文前单独一行写给定marker；单元之间留空行，按目录顺序衔接为同一篇小说。"},
  {"id": "fact-reference-format", "label": "事实引用 · 格式", "text": "复制$fact中对应字段的完整单标记，格式为[[fact:12位引用编号]]；此标记直接占据原值的位置，由代码替换。它不是包裹文字的成对标签，没有结束标记，也不在标记后重复填写原值。"},
  {"id": "fact-reference-source", "label": "事实引用 · 来源", "text": "writingFacts及writingUnits内的$fact逐字段给出完整引用，选取所需字段对应的整段引用放进正文。"},
  {"id": "fact-reference-value", "label": "事实引用 · 数值", "text": "代码填入该字段原值；单位和自然衔接写在引用外。引用仅用于需要明说的属性，不要求罗列数值。"},
  {id:'generation-test-user',label:'完整生成验证 · 消息',text:'为一团星光取一个名字并写一句外观描述。'},
  {id:'social-instruction',label:'人物回应 · 追加要求',text:'请回应当前提议。'},
  {id:'belief-instruction',label:'可信度判断 · 追加要求',text:'请依据本人已知的经历判断刚听到的 statement。'},
  {id:'plan-repair',label:'行动提案修复',text:'上份提案尚未执行。依据同一原输入、事实和实际接口修正validationError，返回完整提案。'},
  {id:'validation-repair',label:'答复内容修复',text:'按同一份事实和字段要求修正，返回完整JSON。'},
  {id:'json-output',label:'JSON输出要求',text:'请仅返回要求的 JSON 对象，不使用代码块，不添加解释。'},
  {id:'generation-test',label:'完整生成验证 · 指令',text:GENERATION_TEST_PROMPT},
];

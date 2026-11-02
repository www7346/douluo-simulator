// Use on descriptive fields only. A player's dialogue, input and stored source text are separate.
const aside = /^(?:但(?:是)?|然而|而|也|且)?(?:这(?:一(?:招|点|效果))?|它|该(?:效果|能力|技能)|此(?:效果|举|招))?(?:并|也)?(?:不(?:代表|意味着)|不等于(?!\s*[\d零一二三四五六七八九十=])|不会(?:自动|额外)?(?:向目标|给目标|对目标)?施加|不(?:会)?(?:额外|自动)(?:附加|赋予))/u;
const condition = /(?:若|如(?:果|遇)|即使|除非|仅当|当|直到|未命中|命中失败|豁免成功|抵抗成功|免疫时|(?:对象|目标|自身)(?:为|是|处于|具有)|未满足|期间|状态下|前提|时(?:候)?$|否则|反之)/u;

export function descriptionProse(value:string):string {
 if(!/(?:不代表|不意味着|不等于|施加|附加|赋予)/u.test(value))return value;
 return value.replace(/[^。！？；;\n]+[。！？；;]?/gu,sentence=>{
  if(/[“”「」『』"‘’？?]/u.test(sentence))return sentence;
  const end=sentence.match(/[。！；;]$/u)?.[0]??'';
  const clauses=(end?sentence.slice(0,-1):sentence).split(/([，,])/u);
  let kept='',previous='',removed=false;
  for(let i=0;i<clauses.length;i+=2){
   const clause=clauses[i],plain=clause.trim();
   // A condition can precede its outcome across a comma: “豁免成功时，不会施加流血。”
   if(aside.test(plain)&&!condition.test(previous)&&!condition.test(plain)){
    removed=true;
   }else{
    const content=removed&&!kept?clause.replace(/^而是/u,''):clause;
    kept+=(kept?clauses[i-1]:'')+content;
   }
   previous=plain;
  }
  return removed?(kept.trim()?kept+end:''):sentence;
 });
}

const aliases:Record<string,string[]>={减伤:['伤害减免'],反伤:['反弹'],即死:['死亡'],回血:['治疗','恢复'],回蓝:['魂力恢复','魂力'],吸血:['汲取','转化']};

/** Search the allowed variants too: the default example is only one use. */
export function matchesEffectSearch(effect:any,query:string):boolean {
 const haystack=[effect.name,effect.displayName,effect.description,JSON.stringify(effect.parameterBounds??{}),JSON.stringify(effect.optionalParameterBounds??{})].join(' ').toLocaleLowerCase();
 return query.trim().toLocaleLowerCase().split(/\s+/).every(term=>[term,...(aliases[term]??[])].some(word=>haystack.includes(word)));
}

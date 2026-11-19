/** Read a complete, explicit suggestion footer. */
export function storyActionOptions(prose:string):string[]{
 return storyActionFooter(prose)?.options??[];
}

/** Display boundary only; stored prose and its fact/card offsets stay unchanged. */
export function storyActionFooter(prose:string):{start:number;options:string[]}|undefined{
 const headings=[...prose.matchAll(/^[ \t]*(?:#{1,6}[ \t]*)?(\*{1,3}|_{1,3})?下一步可选行动(?:[（(]([346])项[）)])?(?:[：:]\1|\1[：:]?)[ \t]*$/gm)];
 const heading=headings.at(-1);if(!heading)return;
 const count=Number(heading[2]??4);
 const tail=prose.slice(heading.index!+heading[0].length).trim();
 const lines=tail.split(/\r?\n/).filter(line=>line.trim());
 if(lines.length!==count)return;
 const options=lines.map((line,index)=>line.match(new RegExp('^\\s*'+(index+1)+'[.、．]\\s*(.+?)\\s*$'))?.[1]??'');
 if(!options.every(text=>text.length>0&&text.length<=1000)||new Set(options).size!==count)return;
 const before=prose.slice(0,heading.index!).trimEnd();
 const divider=before.match(/(?:^|\r?\n)[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/);
 return {start:divider?.index??heading.index!,options};
}

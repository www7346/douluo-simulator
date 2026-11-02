import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SoulRing,SoulRingHalo} from '../src/web/components';

test('人物、战斗和吸收魂环使用规则年限分档，包括百万年边界',()=>{
  const cases = [
    [1,'十年','白'],[99,'十年','白'],[100,'百年','黄'],[999,'百年','黄'],
    [1000,'千年','紫'],[9999,'千年','紫'],[10000,'万年','黑'],[99999,'万年','黑'],
    [100000,'十万年','红'],[999999,'十万年','红'],[1000000,'百万年','金'],[1500000,'百万年','金'],
  ] as const;
  for(const [years,tier,color] of cases){
    const ring=renderToStaticMarkup(createElement(SoulRing,{years,index:1,active:true}));
    const halo=renderToStaticMarkup(createElement(SoulRingHalo,{years}));
    for(const markup of [ring,halo]){
      assert.ok(markup.includes(`data-tier="${tier}"`),`${years}年应为${tier}`);
      assert.ok(markup.includes('soul-ring-palette'));
      assert.ok(markup.includes(`<span>${tier}</span>`),`${years}年魂环图形应显示中文分档`);
    }
    assert.ok(ring.includes(`${years}年魂环 · ${color}色`));
    assert.ok(ring.includes('is-active'));
  }
});

test('同屏魂环各自引用自己的渐变，避免不同年限串色',()=>{
  const markup=renderToStaticMarkup(createElement('div',null,...[10,100,1000,10000,100000,1000000].flatMap((years,index)=>[
    createElement(SoulRing,{key:`ring-${years}`,years,index:index+1}),createElement(SoulRingHalo,{key:`halo-${years}`,years})
  ])));
  const ids=[...markup.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  const paints=[...markup.matchAll(/url\(#([^\)]+)\)/g)].map(match=>match[1]);
  assert.ok(ids.length>0);
  assert.equal(new Set(ids).size,ids.length);
  for(const paint of paints)assert.ok(ids.includes(paint),`渐变不存在：${paint}`);
});

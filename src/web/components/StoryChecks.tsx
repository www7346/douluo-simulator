export default function StoryChecks({results}:{results:any[]}){
 const checks=results.map(r=>r.receipt?.type==='story-free-action'&&r.receipt.check?{...r,receipt:r.receipt.check}:r).filter(r=>['story-attribute-check','story-opposed-check'].includes(r.receipt?.type));
 if(!checks.length)return null;
 return <section aria-label="行动检定">{checks.map(result=><details key={result.step}><summary>{result.receipt.summary}</summary><p>{result.receipt.reason}</p></details>)}</section>;
}

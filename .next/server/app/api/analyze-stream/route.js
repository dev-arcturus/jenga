(()=>{var a={};a.id=903,a.ids=[903],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3526:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>K,patchFetch:()=>J,routeModule:()=>F,serverHooks:()=>I,workAsyncStorage:()=>G,workUnitAsyncStorage:()=>H});var d={};c.r(d),c.d(d,{POST:()=>E,maxDuration:()=>w});var e=c(9225),f=c(4006),g=c(8317),h=c(9373),i=c(4775),j=c(4235),k=c(261),l=c(4365),m=c(771),n=c(3461),o=c(7798),p=c(2280),q=c(2018),r=c(5696),s=c(7929),t=c(6439),u=c(7527),v=c(4794);let w=300,x=`You are a logical analyst. Given a text, identify every distinct ARGUMENT (a chain of reasoning leading to a conclusion). Two claims belong to the SAME argument if one depends on the other. Two claims belong to DIFFERENT arguments if they are logically independent.

For each argument, output:
- argument_id: unique identifier (e.g., "ARG-001")
- conclusion: the final claim
- text_spans: the exact text spans

Output ONLY valid JSON: { "arguments": [...] }`,y=`Decompose this argument into atomic logical steps. Order from FOUNDATIONAL to DERIVED:
Level 1: Direct evidence/factual claims
Level 2: Interpretations of evidence
Level 3: Causal or analytical claims
Level 4: Comparative judgments
Level 5+: Final conclusions

For each block output:
- block_id, level, claim_text, depends_on (array of block_ids), inference_type ("evidence"|"interpretation"|"causal"|"comparative"|"conclusion")

Output ONLY valid JSON: { "blocks": [...] }`,z=`You are a logical validity judge. Evaluate this claim on 4 dimensions.

Given:
- CLAIM: The claim to evaluate
- PREMISES: Claims this depends on (may be empty for base evidence)
- ALL_CLAIMS: Other claims in the analysis for contradiction checking

Score each dimension 0.0-1.0:
1. evidence_grounding: How well is this grounded in stated facts? (1.0=well-grounded, 0.0=no evidence)
2. inferential_validity: Does the conclusion follow from premises? (1.0=necessarily follows, 0.0=non-sequitur)
3. completeness: Are there unstated assumptions? (1.0=none needed, 0.0=critical assumptions missing)
4. contradiction_check: Does it contradict other claims? (1.0=no contradictions, 0.0=direct contradiction)

Output ONLY valid JSON:
{
  "evidence_grounding": float,
  "inferential_validity": float,
  "completeness": float,
  "contradiction_check": float,
  "overall_score": float,
  "reasoning": "string",
  "unstated_assumptions": ["string"],
  "placement_recommendation": "foundation" | "middle" | "top" | "weak_spot"
}`,A=`You are the master judge of an argument analysis system called Evidence Jenga.

Given the current state of argument towers (each tower is a chain of reasoning with scored blocks), decide:
1. Are the arguments collectively strong enough? (score > 0.55 avg)
2. Are there obvious gaps or weak points that need strengthening?
3. Should we generate more arguments or strengthen existing ones?

Respond with:
{
  "satisfied": boolean,
  "overall_quality": float (0-1),
  "verdict": "string explaining your assessment",
  "action": "done" | "strengthen" | "add_argument",
  "strengthen_target": "tower argument_id to strengthen, if applicable",
  "weakness_description": "what to address, if applicable"
}`,B=`You are strengthening a weak argument by adding better evidence or more rigorous intermediate steps.

Given an existing argument tower with its blocks and scores, generate 1-2 NEW blocks that would make the argument stronger. These could be:
- Additional evidence that supports a weak interpretation
- A missing intermediate step that bridges a logical gap
- A qualification that makes an overreach more defensible

For each new block:
- block_id, level, claim_text, depends_on (existing block_ids), inference_type

Output ONLY valid JSON: { "new_blocks": [...] }`,C=`You are synthesizing a final, well-supported answer based on the surviving argument towers from an Evidence Jenga analysis.

Given the towers and their block scores, write a concise, balanced answer that:
1. Only relies on claims that scored well (stable blocks)
2. Acknowledges weaknesses where blocks collapsed or wobbled
3. Presents the strongest surviving reasoning chain
4. Notes important caveats or unstated assumptions

Write 2-4 paragraphs. Be direct and authoritative where evidence is strong, but honest about limitations.`;async function D(a,b,c,d){let e=c.map(a=>`- [${a.block_id}] ${a.claim_text}`).join("\n"),f=d.filter(a=>a.block_id!==b.block_id).map(a=>`- ${a.claim_text}`).join("\n");try{let c=await (0,v.ei)(a,v.oM,z,`CLAIM: ${b.claim_text}

PREMISES:
${e||"(Base evidence - no premises)"}

ALL_CLAIMS:
${f||"(None yet)"}`),d=c.inputTokens+c.outputTokens,g=(0,v.Ol)(c.text),h="evidence"===b.inference_type?.35*g.evidence_grounding+.3*g.inferential_validity+.2*g.completeness+.15*g.contradiction_check:.45*g.inferential_validity+.3*g.completeness+.25*g.contradiction_check;return{scored:{...b,stability_score:Math.round(100*h)/100,dimension_scores:{evidence_grounding:g.evidence_grounding,inferential_validity:g.inferential_validity,completeness:g.completeness,contradiction_check:g.contradiction_check},unstated_assumptions:g.unstated_assumptions||[],scoring_reasoning:g.reasoning},tokens:d}}catch{return{scored:{...b,stability_score:.5,dimension_scores:{evidence_grounding:.5,inferential_validity:.5,completeness:.5,contradiction_check:.5},unstated_assumptions:[],scoring_reasoning:"Scoring parse error — assigned default"},tokens:0}}}async function E(a){let{text:b,apiKey:c}=await a.json();if(!c)return new Response("API key required",{status:400});if(!b?.trim())return new Response("Text required",{status:400});let d=(0,v.UU)(c),e=0,f=0,g=new ReadableStream({async start(a){let c=b=>{try{a.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(b)}

`))}catch{}},g=a=>{f+=a,c({type:"tokens",data:{tokens:a,total:f}})};try{c({type:"status",data:{message:"Identifying argument chains..."}}),c({type:"thinking",data:{phase:"decompose",message:"Analyzing text structure to find distinct lines of reasoning..."}});let a=await (0,v.ei)(d,v.TR,x,`Analyze this text and identify all distinct arguments:

${b}`);g(a.inputTokens+a.outputTokens);let{arguments:h}=(0,v.Ol)(a.text),i=h.slice(0,5);c({type:"thinking",data:{phase:"decompose",message:`Found ${i.length} distinct argument${1!==i.length?"s":""} to analyze.`}});let j=[],k=[];for(let a of i){if(e>=30)break;c({type:"tower_start",data:{argument_id:a.argument_id,conclusion:a.conclusion}}),c({type:"status",data:{message:`Decomposing: ${a.conclusion.slice(0,50)}...`}}),c({type:"thinking",data:{phase:"decompose",towerId:a.argument_id,message:`Breaking down "${a.conclusion.slice(0,60)}..." into atomic logical steps by level.`}});let b=await (0,v.ei)(d,v.TR,y,`Argument ID: ${a.argument_id}
Conclusion: ${a.conclusion}

Text:
${a.text_spans.join("\n\n")}`);g(b.inputTokens+b.outputTokens);let{blocks:f}=(0,v.Ol)(b.text),h=f.slice(0,8),i=[];for(let b of(c({type:"thinking",data:{phase:"decompose",towerId:a.argument_id,message:`Extracted ${h.length} logical blocks across ${new Set(h.map(a=>a.level)).size} levels. Scoring bottom-up...`}}),[...h].sort((a,b)=>a.level-b.level))){if(e>=30)break;let f={block_id:b.block_id,level:b.level,claim_text:b.claim_text,depends_on:b.depends_on||[],source_refs:[],source_spans:[],inference_type:b.inference_type,stability_score:0,dimension_scores:{evidence_grounding:0,inferential_validity:0,completeness:0,contradiction_check:0},state:"stable",collapse_reason:null,unstated_assumptions:[],scoring_reasoning:""};c({type:"block_added",data:{argument_id:a.argument_id,block:f}}),c({type:"status",data:{message:`Scoring: "${f.claim_text.slice(0,40)}..."`}}),c({type:"thinking",data:{phase:"scoring",towerId:a.argument_id,blockId:f.block_id,message:`Haiku judging L${f.level} ${f.inference_type}: "${f.claim_text.slice(0,50)}..." against ${f.depends_on.length} premise(s).`}});let h=i.filter(a=>f.depends_on.includes(a.block_id)),{scored:k,tokens:l}=await D(d,f,h,[...j,...i]);g(l),k.state=k.stability_score>=.7?"stable":k.stability_score>=.4?"wobble":"collapsed",i.push(k),j.push(k),e++,c({type:"block_scored",data:{argument_id:a.argument_id,block:k}}),c({type:"thinking",data:{phase:"scoring",towerId:a.argument_id,blockId:k.block_id,score:k.stability_score,message:`Score: ${k.stability_score.toFixed(2)} [EG:${k.dimension_scores.evidence_grounding.toFixed(2)} IV:${k.dimension_scores.inferential_validity.toFixed(2)} C:${k.dimension_scores.completeness.toFixed(2)} CC:${k.dimension_scores.contradiction_check.toFixed(2)}] => ${k.state}. ${k.scoring_reasoning?.slice(0,100)||""}`}})}let l={argument_id:a.argument_id,conclusion:a.conclusion,blocks:i};k.push(l);let m=i.length>0?i.reduce((a,b)=>a+b.stability_score,0)/i.length:0,n=i.filter(a=>"stable"===a.state||"wobble"===a.state).length;c({type:"tower_complete",data:{tower:l}}),c({type:"thinking",data:{phase:"tower_done",towerId:a.argument_id,message:`Tower ${a.argument_id} complete: ${i.length} blocks, avg score ${m.toFixed(2)}, ${n}/${i.length} standing.`}})}let l=0;for(;l<2&&e<30;){let a;c({type:"status",data:{message:"Judge evaluating overall argument quality..."}}),c({type:"thinking",data:{phase:"verdict",message:`Round ${l+1}: Haiku judge reviewing all ${k.length} towers for quality and gaps...`}});let b=k.map(a=>{let b=a.blocks.length>0?a.blocks.reduce((a,b)=>a+b.stability_score,0)/a.blocks.length:0;return`Tower ${a.argument_id} (${a.conclusion.slice(0,60)}): avg=${b.toFixed(2)}, blocks=${a.blocks.length}, collapsed=${a.blocks.filter(a=>"collapsed"===a.state).length}`}).join("\n"),f=await (0,v.ei)(d,v.oM,A,`Current tower state:
${b}

Total blocks: ${e}`);g(f.inputTokens+f.outputTokens);try{a=(0,v.Ol)(f.text)}catch{a={satisfied:!0,overall_quality:.5,verdict:"Parse error — accepting current state",action:"done"}}if(c({type:"judge_verdict",data:a}),c({type:"thinking",data:{phase:"verdict",message:`Judge verdict: ${a.verdict} (quality: ${(100*a.overall_quality).toFixed(0)}%, satisfied: ${a.satisfied})`}}),a.satisfied||"done"===a.action)break;if("strengthen"===a.action&&a.strengthen_target){let b=k.find(b=>b.argument_id===a.strengthen_target);if(b&&b.blocks.length<8){c({type:"status",data:{message:`Strengthening ${b.argument_id}...`}}),c({type:"thinking",data:{phase:"strengthen",towerId:b.argument_id,message:`Strengthening ${b.argument_id}: ${a.weakness_description||"improving evidence"}.`}});let f=b.blocks.map(a=>`[${a.block_id}] L${a.level} (${a.stability_score.toFixed(2)}): ${a.claim_text}`).join("\n");try{let h=await (0,v.ei)(d,v.TR,B,`Tower: ${b.argument_id}
Conclusion: ${b.conclusion}
Weakness: ${a.weakness_description||"general"}

Existing blocks:
${f}`);g(h.inputTokens+h.outputTokens);let{new_blocks:i}=(0,v.Ol)(h.text);for(let a of i.slice(0,2)){if(e>=30)break;let f={block_id:a.block_id||`${b.argument_id}-BS${e}`,level:a.level,claim_text:a.claim_text,depends_on:a.depends_on||[],source_refs:[],source_spans:[],inference_type:a.inference_type,stability_score:0,dimension_scores:{evidence_grounding:0,inferential_validity:0,completeness:0,contradiction_check:0},state:"stable",collapse_reason:null,unstated_assumptions:[],scoring_reasoning:""};c({type:"block_added",data:{argument_id:b.argument_id,block:f}}),c({type:"thinking",data:{phase:"strengthen",towerId:b.argument_id,blockId:f.block_id,message:`Added reinforcement block: "${f.claim_text.slice(0,50)}..."`}});let h=b.blocks.filter(a=>f.depends_on.includes(a.block_id)),{scored:i,tokens:k}=await D(d,f,h,j);g(k),i.state=i.stability_score>=.7?"stable":i.stability_score>=.4?"wobble":"collapsed",b.blocks.push(i),j.push(i),e++,c({type:"block_scored",data:{argument_id:b.argument_id,block:i}}),c({type:"thinking",data:{phase:"strengthen",towerId:b.argument_id,blockId:i.block_id,score:i.stability_score,message:`Reinforcement scored ${i.stability_score.toFixed(2)} => ${i.state}.`}})}}catch{c({type:"thinking",data:{phase:"strengthen",message:"Strengthening attempt failed, moving on."}})}}}l++}c({type:"status",data:{message:"Synthesizing final answer from surviving evidence..."}}),c({type:"thinking",data:{phase:"final",message:"Generating a stable, evidence-backed answer based on surviving blocks..."}});let m=k.map(a=>{let b=a.blocks.filter(a=>"stable"===a.state||"wobble"===a.state),c=a.blocks.filter(a=>"collapsed"===a.state||"removed"===a.state);return`Tower "${a.conclusion}":
  Standing blocks:
${b.map(a=>`    - [${a.stability_score.toFixed(2)}] ${a.claim_text}`).join("\n")||"    (none)"}
  Collapsed blocks:
${c.map(a=>`    - [${a.stability_score.toFixed(2)}] ${a.claim_text}`).join("\n")||"    (none)"}`}).join("\n\n");try{let a=await (0,v.ei)(d,v.TR,C,`Original text:
${b.slice(0,2e3)}

Analysis results:
${m}`);g(a.inputTokens+a.outputTokens),c({type:"final_answer",data:{answer:a.text}}),c({type:"thinking",data:{phase:"final",message:"Final answer synthesized from surviving evidence."}})}catch{c({type:"final_answer",data:{answer:"Unable to generate final synthesis."}})}c({type:"done",data:{analysis_id:`analysis-${Date.now()}`,towers:k,shared_blocks:[],total_blocks:e,total_tokens:f}})}catch(a){c({type:"error",data:{message:a instanceof Error?a.message:"Unknown error"}})}finally{a.close()}}});return new Response(g,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive"}})}let F=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/analyze-stream/route",pathname:"/api/analyze-stream",filename:"route",bundlePath:"app/api/analyze-stream/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/kaeyu/jenga/src/app/api/analyze-stream/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:G,workUnitAsyncStorage:H,serverHooks:I}=F;function J(){return(0,g.patchFetch)({workAsyncStorage:G,workUnitAsyncStorage:H})}async function K(a,b,c){c.requestMeta&&(0,h.setRequestMeta)(a,c.requestMeta),F.isDev&&(0,h.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let d="/api/analyze-stream/route";"/index"===d&&(d="/");let e=await F.prepare(a,b,{srcPage:d,multiZoneDraftMode:!1});if(!e)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:g,params:v,nextConfig:w,parsedUrl:x,isDraftMode:y,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D,clientReferenceManifest:E,serverActionsManifest:G}=e,H=(0,k.normalizeAppPath)(d),I=!!(z.dynamicRoutes[H]||z.routes[D]),J=async()=>((null==A?void 0:A.render404)?await A.render404(a,b,x,!1):b.end("This page could not be found"),null);if(I&&!y){let a=!!z.routes[D],b=z.dynamicRoutes[H];if(b&&!1===b.fallback&&!a){if(w.adapterPath)return await J();throw new t.NoFallbackError}}let K=null;!I||F.isDev||y||(K="/index"===(K=D)?"/":K);let L=!0===F.isDev||!I,M=I&&!L;G&&E&&(0,j.setManifestsSingleton)({page:d,clientReferenceManifest:E,serverActionsManifest:G});let N=a.method||"GET",O=(0,i.getTracer)(),P=O.getActiveScopeSpan(),Q=!!(null==A?void 0:A.isWrappedByNextServer),R=!!(0,h.getRequestMeta)(a,"minimalMode"),S=(0,h.getRequestMeta)(a,"incrementalCache")||await F.getIncrementalCache(a,w,z,R);null==S||S.resetRequestCache(),globalThis.__incrementalCache=S;let T={params:v,previewProps:z.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:L,incrementalCache:S,cacheLifeProfiles:w.cacheLife,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d,e)=>F.onRequestError(a,b,d,e,A)},sharedContext:{buildId:g}},U=new l.NodeNextRequest(a),V=new l.NodeNextResponse(b),W=m.NextRequestAdapter.fromNodeNextRequest(U,(0,m.signalFromNodeResponse)(b));try{let e,g=async a=>F.handle(W,T).finally(()=>{if(!a)return;a.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let c=O.getRootSpanAttributes();if(!c)return;if(c.get("next.span_type")!==n.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${c.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let f=c.get("next.route");if(f){let b=`${N} ${f}`;a.setAttributes({"next.route":f,"http.route":f,"next.span_name":b}),a.updateName(b),e&&e!==a&&(e.setAttribute("http.route",f),e.updateName(b))}else a.updateName(`${N} ${d}`)}),h=async e=>{var h,i;let j=async({previousCacheEntry:f})=>{try{if(!R&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let d=await g(e);a.fetchMetrics=T.renderOpts.fetchMetrics;let h=T.renderOpts.pendingWaitUntil;h&&c.waitUntil&&(c.waitUntil(h),h=void 0);let i=T.renderOpts.collectedTags;if(!I)return await (0,p.I)(U,V,d,T.renderOpts.pendingWaitUntil),null;{let a=await d.blob(),b=(0,q.toNodeOutgoingHttpHeaders)(d.headers);i&&(b[s.NEXT_CACHE_TAGS_HEADER]=i),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==T.renderOpts.collectedRevalidate&&!(T.renderOpts.collectedRevalidate>=s.INFINITE_CACHE)&&T.renderOpts.collectedRevalidate,e=void 0===T.renderOpts.collectedExpire||T.renderOpts.collectedExpire>=s.INFINITE_CACHE?void 0:T.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:d.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:e}}}}catch(b){throw(null==f?void 0:f.isStale)&&await F.onRequestError(a,b,{routerKind:"App Router",routePath:d,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:B})},!1,A),b}},k=await F.handleResponse({req:a,nextConfig:w,cacheKey:K,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:j,waitUntil:c.waitUntil,isMinimalMode:R});if(!I)return null;if((null==k||null==(h=k.value)?void 0:h.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==k||null==(i=k.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});R||b.setHeader("x-nextjs-cache",B?"REVALIDATED":k.isMiss?"MISS":k.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let l=(0,q.fromNodeOutgoingHttpHeaders)(k.value.headers);return R&&I||l.delete(s.NEXT_CACHE_TAGS_HEADER),!k.cacheControl||b.getHeader("Cache-Control")||l.get("Cache-Control")||l.set("Cache-Control",(0,r.getCacheControlHeader)(k.cacheControl)),await (0,p.I)(U,V,new Response(k.value.body,{headers:l,status:k.value.status||200})),null};Q&&P?await h(P):(e=O.getActiveScopeSpan(),await O.withPropagatedContext(a.headers,()=>O.trace(n.BaseServerSpan.handleRequest,{spanName:`${N} ${d}`,kind:i.SpanKind.SERVER,attributes:{"http.method":N,"http.target":a.url}},h),void 0,!Q))}catch(b){if(b instanceof t.NoFallbackError||await F.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:B})},!1,A),I)throw b;return await (0,p.I)(U,V,new Response(null,{status:500})),null}}},4794:(a,b,c)=>{"use strict";c.d(b,{Ol:()=>i,TR:()=>e,UU:()=>g,ei:()=>h,oM:()=>f});var d=c(6051);let e="claude-sonnet-4-20250514",f="claude-haiku-4-5-20251001";function g(a){return new d.Ay({apiKey:a})}async function h(a,b,c,d,e=0){let f=await a.messages.create({model:b,max_tokens:4096,temperature:e,system:c,messages:[{role:"user",content:d}]}),g=f.content.find(a=>"text"===a.type);return{text:g?.text??"",inputTokens:f.usage?.input_tokens??0,outputTokens:f.usage?.output_tokens??0}}function i(a){let b=a.match(/```(?:json)?\s*([\s\S]*?)```/)||a.match(/(\{[\s\S]*\})/);return JSON.parse(b?b[1].trim():a.trim())}},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[741,306],()=>b(b.s=3526));module.exports=c})();
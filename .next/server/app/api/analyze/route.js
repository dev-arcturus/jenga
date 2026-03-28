(()=>{var a={};a.id=786,a.ids=[786],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4794:(a,b,c)=>{"use strict";c.d(b,{Ol:()=>i,TR:()=>e,UU:()=>g,ei:()=>h,oM:()=>f});var d=c(6051);let e="claude-sonnet-4-20250514",f="claude-haiku-4-5-20251001";function g(a){return new d.Ay({apiKey:a})}async function h(a,b,c,d,e=0){let f=await a.messages.create({model:b,max_tokens:4096,temperature:e,system:c,messages:[{role:"user",content:d}]}),g=f.content.find(a=>"text"===a.type);return{text:g?.text??"",inputTokens:f.usage?.input_tokens??0,outputTokens:f.usage?.output_tokens??0}}function i(a){let b=a.match(/```(?:json)?\s*([\s\S]*?)```/)||a.match(/(\{[\s\S]*\})/);return JSON.parse(b?b[1].trim():a.trim())}},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6330:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>T,patchFetch:()=>S,routeModule:()=>O,serverHooks:()=>R,workAsyncStorage:()=>P,workUnitAsyncStorage:()=>Q});var d={};c.r(d),c.d(d,{POST:()=>N,maxDuration:()=>M});var e=c(9225),f=c(4006),g=c(8317),h=c(9373),i=c(4775),j=c(4235),k=c(261),l=c(4365),m=c(771),n=c(3461),o=c(7798),p=c(2280),q=c(2018),r=c(5696),s=c(7929),t=c(6439),u=c(7527),v=c(3211),w=c(4794);let x=`You are a logical analyst. Given a text, identify every distinct ARGUMENT (a chain of reasoning leading to a conclusion). Two claims belong to the SAME argument if one depends on the other. Two claims belong to DIFFERENT arguments if they are logically independent (removing one does not affect the other).

For each argument, output:
- argument_id: unique identifier (e.g., "ARG-001")
- conclusion: the final claim this argument supports
- text_spans: the exact text spans that constitute this argument
- shared_premises: any premises shared with other arguments

Output ONLY valid JSON in this format:
{
  "arguments": [
    {
      "argument_id": "ARG-001",
      "conclusion": "...",
      "text_spans": ["..."],
      "shared_premises": ["..."]
    }
  ]
}

No preamble. No explanation. Just JSON.`,y=`You are decomposing an argument into its logical steps. Each step must be an ATOMIC claim (one idea, one inference). Order them from FOUNDATIONAL to DERIVED:

Level 1: Direct evidence claims (things stated by sources or presented as facts)
Level 2: Interpretations of evidence
Level 3: Causal or analytical claims built on interpretations
Level 4: Comparative judgments or syntheses
Level 5+: Final conclusions

For each block, output:
- block_id: unique within this argument (e.g., "ARG-001-B1")
- level: integer (1 = base)
- claim_text: the atomic claim
- depends_on: array of block_ids this block relies on
- source_refs: array of source IDs (if evidence-level)
- source_spans: exact quotes from sources (if applicable)
- inference_type: "evidence" | "interpretation" | "causal" | "comparative" | "conclusion"

Output ONLY valid JSON in this format:
{
  "blocks": [
    {
      "block_id": "...",
      "level": 1,
      "claim_text": "...",
      "depends_on": [],
      "source_refs": [],
      "source_spans": [],
      "inference_type": "evidence"
    }
  ]
}

No preamble. No explanation. Just JSON.`;async function z(a,b){let c=await (0,w.ei)(a,w.TR,x,`Analyze this text and identify all distinct arguments:

${b}`);return(0,w.Ol)(c).arguments}async function A(a,b,c,d){let e=await (0,w.ei)(a,w.TR,y,`Decompose this argument into logical blocks.

Argument ID: ${b}
Conclusion: ${c}

Argument text:
${d.join("\n\n")}`);return(0,w.Ol)(e).blocks}async function B(a,b){let c=await z(a,b),d=c.map(async b=>{let c=await A(a,b.argument_id,b.conclusion,b.text_spans);return{argument_id:b.argument_id,conclusion:b.conclusion,blocks:c.map(a=>({...a,stability_score:0,dimension_scores:{evidence_grounding:0,inferential_validity:0,completeness:0,contradiction_check:0},state:"stable",collapse_reason:null,unstated_assumptions:[],scoring_reasoning:""}))}}),e=await Promise.all(d),f=[],g=new Map;c.forEach(a=>{a.shared_premises.forEach(b=>{let c=g.get(b)||[];c.push(a.argument_id),g.set(b,c)})});let h=0;return g.forEach((a,b)=>{a.length>1&&f.push({block_id:`SHARED-${String(h++).padStart(3,"0")}`,used_by:a,claim_text:b,source_refs:[]})}),{towers:e,shared_blocks:f}}let C=`You are evaluating evidence grounding. You are given:
- CLAIM: A claim that allegedly comes from a source
- SOURCE_SPANS: The exact text from the source

Evaluate how well the source supports the claim.
Score 1.0: The source directly and exactly supports the claim.
Score 0.7: The source supports the claim with minor paraphrasing.
Score 0.5: The source partially supports the claim but with some drift.
Score 0.3: The source loosely relates but doesn't directly support the claim.
Score 0.0: The source does not support the claim at all.

Output JSON only: { "score": float, "reasoning": "string" }`,D=`You are evaluating logical validity. You are given:
- PREMISES: A set of claims assumed to be true
- CONCLUSION: A claim that allegedly follows from the premises

Evaluate ONLY whether the conclusion follows logically. Do NOT evaluate whether the premises are true.

Score 1.0: The conclusion follows necessarily.
Score 0.7: The conclusion follows with reasonable, commonly-accepted assumptions.
Score 0.4: The conclusion requires significant unstated assumptions to hold.
Score 0.1: The conclusion is weakly related but does not follow.
Score 0.0: The conclusion is a non-sequitur.

Output JSON only: { "score": float, "reasoning": "string", "unstated_assumptions": ["string"] }`,E=`You are evaluating argument completeness. You are given:
- CLAIM: A claim or conclusion
- STATED_PREMISES: The premises explicitly provided

Identify any UNSTATED assumptions that the claim implicitly requires but does not declare.

Score 1.0: No unstated assumptions needed. The claim follows from stated premises alone.
Score 0.7: Minor, commonly-accepted assumptions needed.
Score 0.5: Moderate assumptions needed that reasonable people might disagree on.
Score 0.3: Major unstated assumptions that significantly affect the claim's validity.
Score 0.0: Critical unstated assumptions that could invalidate the claim entirely.

Output JSON only: { "score": float, "reasoning": "string", "unstated_assumptions": ["string"] }`,F=`You are checking for contradictions. You are given:
- CLAIM: A claim to check
- OTHER_CLAIMS: Other claims in the same analysis

Check if the claim contradicts any of the other claims.

Score 1.0: No contradictions found.
Score 0.7: Minor tension but not direct contradiction.
Score 0.5: Significant tension that weakens the overall argument.
Score 0.3: Near-contradiction that undermines credibility.
Score 0.0: Direct contradiction found.

Output JSON only: { "score": float, "reasoning": "string" }`;async function G(a,b){if("evidence"!==b.inference_type||0===b.source_spans.length)return{score:1,reasoning:"Non-evidence block; evidence grounding N/A"};let c=await (0,w.ei)(a,w.oM,C,`CLAIM: ${b.claim_text}

SOURCE_SPANS:
${b.source_spans.join("\n")}`);return(0,w.Ol)(c)}async function H(a,b,c){if(0===c.length&&"evidence"===b.inference_type)return{score:1,reasoning:"Base evidence block; no inference to validate",unstated_assumptions:[]};let d=c.map(a=>`- ${a.claim_text}`).join("\n"),e=await (0,w.ei)(a,w.oM,D,`PREMISES:
${d||"(No explicit premises; this is a standalone claim)"}

CONCLUSION: ${b.claim_text}`);return(0,w.Ol)(e)}async function I(a,b,c){let d=c.map(a=>`- ${a.claim_text}`).join("\n"),e=await (0,w.ei)(a,w.oM,E,`CLAIM: ${b.claim_text}

STATED_PREMISES:
${d||"(None)"}`);return(0,w.Ol)(e)}async function J(a,b,c){let d=c.filter(a=>a.block_id!==b.block_id).map(a=>`- ${a.claim_text}`).join("\n"),e=await (0,w.ei)(a,w.oM,F,`CLAIM: ${b.claim_text}

OTHER_CLAIMS:
${d||"(None)"}`);return(0,w.Ol)(e)}async function K(a,b,c,d){let e,f=b.depends_on.map(a=>c.blocks.find(b=>b.block_id===a)).filter(a=>void 0!==a),[g,h,i,j]=await Promise.all([G(a,b),H(a,b,f),I(a,b,f),J(a,b,d)]);e=Math.round(100*(e="evidence"===b.inference_type&&b.source_spans.length>0?.35*g.score+.3*h.score+.2*i.score+.15*j.score:.45*h.score+.3*i.score+.25*j.score))/100;let k=[...h.unstated_assumptions||[],...i.unstated_assumptions||[]],l=[`Evidence: ${g.reasoning}`,`Inference: ${h.reasoning}`,`Completeness: ${i.reasoning}`,`Contradiction: ${j.reasoning}`];return{...b,stability_score:e,dimension_scores:{evidence_grounding:g.score,inferential_validity:h.score,completeness:i.score,contradiction_check:j.score},unstated_assumptions:k,scoring_reasoning:l.join(" | ")}}async function L(a,b){let c=b.flatMap(a=>a.blocks),d=[];for(let e of b){let b=[...new Set(e.blocks.map(a=>a.level))].sort((a,b)=>a-b),f=new Map;for(let d of b){let b=e.blocks.filter(a=>a.level===d);(await Promise.all(b.map(b=>K(a,b,e,c)))).forEach(a=>f.set(a.block_id,a))}d.push({...e,blocks:e.blocks.map(a=>f.get(a.block_id)||a)})}return d}let M=120;async function N(a){try{let{text:b,mode:c,apiKey:d}=await a.json();if(!d)return v.NextResponse.json({error:"API key is required. Please add it in Settings."},{status:400});if(!b||0===b.trim().length)return v.NextResponse.json({error:"Text is required."},{status:400});let e=(0,w.UU)(d),f=`analysis-${Date.now()}`,{towers:g,shared_blocks:h}=await B(e,b);if(0===g.length)return v.NextResponse.json({error:"No arguments detected in the provided text."},{status:422});let i=await L(e,g);return v.NextResponse.json({analysis_id:f,towers:i,shared_blocks:h,raw_text:b,source_mode:c||"paste"})}catch(b){console.error("Analysis error:",b);let a=b instanceof Error?b.message:"Analysis failed";return v.NextResponse.json({error:a},{status:500})}}let O=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/analyze/route",pathname:"/api/analyze",filename:"route",bundlePath:"app/api/analyze/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/kaeyu/jenga/src/app/api/analyze/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:P,workUnitAsyncStorage:Q,serverHooks:R}=O;function S(){return(0,g.patchFetch)({workAsyncStorage:P,workUnitAsyncStorage:Q})}async function T(a,b,c){c.requestMeta&&(0,h.setRequestMeta)(a,c.requestMeta),O.isDev&&(0,h.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let d="/api/analyze/route";"/index"===d&&(d="/");let e=await O.prepare(a,b,{srcPage:d,multiZoneDraftMode:!1});if(!e)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:g,params:v,nextConfig:w,parsedUrl:x,isDraftMode:y,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D,clientReferenceManifest:E,serverActionsManifest:F}=e,G=(0,k.normalizeAppPath)(d),H=!!(z.dynamicRoutes[G]||z.routes[D]),I=async()=>((null==A?void 0:A.render404)?await A.render404(a,b,x,!1):b.end("This page could not be found"),null);if(H&&!y){let a=!!z.routes[D],b=z.dynamicRoutes[G];if(b&&!1===b.fallback&&!a){if(w.adapterPath)return await I();throw new t.NoFallbackError}}let J=null;!H||O.isDev||y||(J="/index"===(J=D)?"/":J);let K=!0===O.isDev||!H,L=H&&!K;F&&E&&(0,j.setManifestsSingleton)({page:d,clientReferenceManifest:E,serverActionsManifest:F});let M=a.method||"GET",N=(0,i.getTracer)(),P=N.getActiveScopeSpan(),Q=!!(null==A?void 0:A.isWrappedByNextServer),R=!!(0,h.getRequestMeta)(a,"minimalMode"),S=(0,h.getRequestMeta)(a,"incrementalCache")||await O.getIncrementalCache(a,w,z,R);null==S||S.resetRequestCache(),globalThis.__incrementalCache=S;let T={params:v,previewProps:z.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:K,incrementalCache:S,cacheLifeProfiles:w.cacheLife,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d,e)=>O.onRequestError(a,b,d,e,A)},sharedContext:{buildId:g}},U=new l.NodeNextRequest(a),V=new l.NodeNextResponse(b),W=m.NextRequestAdapter.fromNodeNextRequest(U,(0,m.signalFromNodeResponse)(b));try{let e,g=async a=>O.handle(W,T).finally(()=>{if(!a)return;a.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let c=N.getRootSpanAttributes();if(!c)return;if(c.get("next.span_type")!==n.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${c.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let f=c.get("next.route");if(f){let b=`${M} ${f}`;a.setAttributes({"next.route":f,"http.route":f,"next.span_name":b}),a.updateName(b),e&&e!==a&&(e.setAttribute("http.route",f),e.updateName(b))}else a.updateName(`${M} ${d}`)}),h=async e=>{var h,i;let j=async({previousCacheEntry:f})=>{try{if(!R&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let d=await g(e);a.fetchMetrics=T.renderOpts.fetchMetrics;let h=T.renderOpts.pendingWaitUntil;h&&c.waitUntil&&(c.waitUntil(h),h=void 0);let i=T.renderOpts.collectedTags;if(!H)return await (0,p.I)(U,V,d,T.renderOpts.pendingWaitUntil),null;{let a=await d.blob(),b=(0,q.toNodeOutgoingHttpHeaders)(d.headers);i&&(b[s.NEXT_CACHE_TAGS_HEADER]=i),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==T.renderOpts.collectedRevalidate&&!(T.renderOpts.collectedRevalidate>=s.INFINITE_CACHE)&&T.renderOpts.collectedRevalidate,e=void 0===T.renderOpts.collectedExpire||T.renderOpts.collectedExpire>=s.INFINITE_CACHE?void 0:T.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:d.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:e}}}}catch(b){throw(null==f?void 0:f.isStale)&&await O.onRequestError(a,b,{routerKind:"App Router",routePath:d,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:L,isOnDemandRevalidate:B})},!1,A),b}},k=await O.handleResponse({req:a,nextConfig:w,cacheKey:J,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:j,waitUntil:c.waitUntil,isMinimalMode:R});if(!H)return null;if((null==k||null==(h=k.value)?void 0:h.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==k||null==(i=k.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});R||b.setHeader("x-nextjs-cache",B?"REVALIDATED":k.isMiss?"MISS":k.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let l=(0,q.fromNodeOutgoingHttpHeaders)(k.value.headers);return R&&H||l.delete(s.NEXT_CACHE_TAGS_HEADER),!k.cacheControl||b.getHeader("Cache-Control")||l.get("Cache-Control")||l.set("Cache-Control",(0,r.getCacheControlHeader)(k.cacheControl)),await (0,p.I)(U,V,new Response(k.value.body,{headers:l,status:k.value.status||200})),null};Q&&P?await h(P):(e=N.getActiveScopeSpan(),await N.withPropagatedContext(a.headers,()=>N.trace(n.BaseServerSpan.handleRequest,{spanName:`${M} ${d}`,kind:i.SpanKind.SERVER,attributes:{"http.method":M,"http.target":a.url}},h),void 0,!Q))}catch(b){if(b instanceof t.NoFallbackError||await O.onRequestError(a,b,{routerKind:"App Router",routePath:G,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:L,isOnDemandRevalidate:B})},!1,A),H)throw b;return await (0,p.I)(U,V,new Response(null,{status:500})),null}}},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[741,306,592],()=>b(b.s=6330));module.exports=c})();
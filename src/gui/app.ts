const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export function renderGui(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Git Commit Test Graph</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#e8ecf7}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 20% 0%,#172448 0,#0b1020 42%);overflow:hidden}
button,select{font:inherit;color:inherit;background:#141c33;border:1px solid #2c3858;border-radius:8px;padding:8px 10px}
button{cursor:pointer}button:hover{border-color:#6f8fe8}button:disabled{opacity:.5;cursor:not-allowed}select{min-width:280px}
header{height:64px;display:flex;align-items:center;gap:14px;padding:0 18px;border-bottom:1px solid #202b46;background:#0d1428cc;backdrop-filter:blur(12px)}
.brand{font-weight:800;letter-spacing:.2px;margin-right:10px}.status{font-size:12px;color:#94a3c7}.spacer{flex:1}
main{height:calc(100vh - 64px);display:grid;grid-template-columns:250px minmax(0,1fr) 360px}
aside,.inspector{border-right:1px solid #202b46;background:#0d1428aa;overflow:auto}.inspector{border-right:0;border-left:1px solid #202b46}
.panel{padding:14px}.panel h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#8291b5}
.commit{display:block;width:100%;text-align:left;margin:6px 0;padding:9px;border:1px solid transparent;background:transparent}
.commit:hover,.commit.active{background:#182340;border-color:#33466e}.commit .sha{font-family:ui-monospace,monospace;font-size:11px;color:#8da7e8}.commit .subject{font-size:12px;margin-top:3px;line-height:1.35}
.canvas{position:relative;overflow:hidden}.toolbar{position:absolute;z-index:3;top:12px;left:12px;display:flex;gap:8px;align-items:center}
.legend{position:absolute;z-index:3;right:12px;top:12px;background:#10182ccc;border:1px solid #293758;border-radius:10px;padding:10px;font-size:11px;color:#aab6d3}
svg{width:100%;height:100%;display:block}.edge{stroke:#425176;stroke-width:1.2;opacity:.65}.edge.changed{stroke:#e5a84f;stroke-width:2}.edge.affects{stroke:#8b9ff5;stroke-width:1.8}
.node{cursor:pointer}.node rect{fill:#121b32;stroke:#344463;stroke-width:1.2}.node.changed rect{fill:#342713;stroke:#e5a84f}.node.affected rect{fill:#172043;stroke:#8b9ff5}.node.test rect{fill:#132c29;stroke:#55c6a7}.node text{fill:#dce5fb;font-size:11px;pointer-events:none}.node .kind{fill:#8796b8;font-size:9px}
.card{background:#111a30;border:1px solid #263554;border-radius:10px;padding:11px;margin-bottom:10px}.metric{display:flex;justify-content:space-between;padding:5px 0;color:#aeb9d3;font-size:12px}.metric b{color:#f1f5ff}
pre{white-space:pre-wrap;overflow:auto;font-size:11px;line-height:1.45;color:#b9c5df;margin:0}
.small{font-size:11px;color:#8c9bbb}.tag{display:inline-block;border:1px solid #354568;border-radius:999px;padding:2px 7px;margin:2px;font-size:10px;color:#b9c8ea}
.empty{padding:20px;text-align:center;color:#7e8ca9}.section{margin-top:16px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.section-head h3{margin:0}
.step{border-left:3px solid #3d4f76;padding:8px 10px;margin:7px 0;background:#111a30;border-radius:0 8px 8px 0}.step.pass{border-left-color:#55c6a7}.step.fail{border-left-color:#e36d6d}.step.running{border-left-color:#e5a84f}.step .cmd{font-family:ui-monospace,monospace;font-size:10px;color:#b9c5df;word-break:break-word;margin-top:4px}
.feedback{font-size:11px;color:#aeb9d3;line-height:1.5}.primary{background:#273d78;border-color:#4d6fca}.danger{background:#4a2228;border-color:#8e414b}
</style>
</head>
<body>
<header><div class="brand">Git Commit Test Graph</div><select id="commit"></select><select id="baseBranch"></select><select id="headBranch"></select><button id="reviewBranch" class="primary">Review branch</button><button id="refresh">Refresh</button><span class="spacer"></span><span id="status" class="status">Loading…</span></header>
<main>
<aside><div class="panel"><h3>Recent commits</h3><div id="commits"></div></div></aside>
<section class="canvas">
<div class="toolbar"><button id="zoomOut">−</button><button id="zoomReset">Reset</button><button id="zoomIn">+</button></div>
<div class="legend">Changed · Impact · Test</div><svg id="graph" viewBox="0 0 1000 700" role="img" aria-label="Code and test impact graph"></svg>
</section>
<section class="inspector"><div class="panel">
<h3>Inspector</h3><div id="inspector" class="empty">Select a node.</div>
<div class="section"><div class="section-head"><h3>Branch review</h3></div><div id="branchReview" class="empty">Select a base/head branch and review.</div></div>
<div class="section"><div class="section-head"><h3>Test impact</h3></div><div id="tests" class="empty">Select a commit to inspect impacted tests.</div></div>
<div class="section"><div class="section-head"><h3>Execution</h3><button id="runPlan" class="primary">Run impacted tests</button></div><div id="execution" class="empty">Loading execution plan…</div></div>
</div></section>
</main>
<script>
const state={commit:"",graph:null,scale:1,selected:null,plan:null,feedback:null,running:false,branches:[],review:null};
const $=id=>document.getElementById(id);
async function api(path,options){const r=await fetch(path,options);if(!r.ok)throw new Error(await r.text());return r.json();}
function esc(v){return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function commandText(command){return command?.executable?command.executable+" "+(command.args||[]).join(" "):"No command";}
async function load(){
  const status=await api("/api/status"); $("status").textContent=status.root+" · "+status.head.slice(0,8);
  const [commits,branches]=await Promise.all([api("/api/commits?limit=30"),api("/api/branches")]); renderCommits(commits); renderBranches(branches);
  const selected=state.commit||status.head; state.commit=selected; $("commit").value=selected; await loadCommit(selected);
}
function renderBranches(data){
  state.branches=data.branches||[];
  const locals=state.branches.filter(b=>!b.name.includes("/"));
  const current=data.current;
  const head=current||locals[0]?.name||"";
  const base=locals.find(b=>b.name==="main")?.name||locals.find(b=>b.name!==head)?.name||head;
  $("baseBranch").innerHTML=locals.map(b=>'<option value="'+esc(b.name)+'">Base · '+esc(b.name)+'</option>').join("");
  $("headBranch").innerHTML=locals.map(b=>'<option value="'+esc(b.name)+'">Head · '+esc(b.name)+'</option>').join("");
  $("baseBranch").value=base; $("headBranch").value=head;
}
function renderCommits(items){
  $("commit").innerHTML=items.map(c=>'<option value="'+esc(c.hash)+'">'+esc(c.hash.slice(0,8)+" · "+c.subject)+'</option>').join("");
  $("commits").innerHTML=items.map(c=>'<button class="commit '+(c.hash===state.commit?"active":"")+'" data-sha="'+esc(c.hash)+'"><div class="sha">'+esc(c.hash.slice(0,8))+'</div><div class="subject">'+esc(c.subject)+'</div></button>').join("");
  document.querySelectorAll(".commit").forEach(b=>b.onclick=()=>{state.commit=b.dataset.sha;$("commit").value=state.commit;loadCommit(state.commit);renderCommits(items);});
}
async function loadCommit(commit){
  $("status").textContent="Indexing "+commit.slice(0,8)+"…";
  const [overview,graph,tests,plan,feedback]=await Promise.all([
    api("/api/overview?commit="+encodeURIComponent(commit)),
    api("/api/graph-view?commit="+encodeURIComponent(commit)),
    api("/api/test-impact?commit="+encodeURIComponent(commit)),
    api("/api/execution-plan?commit="+encodeURIComponent(commit)),
    api("/api/execution-feedback?commit="+encodeURIComponent(commit))
  ]);
  state.graph=graph;state.plan=plan;state.feedback=feedback;
  renderOverview(overview);renderGraph(graph);renderTests(tests);renderExecution(plan,feedback);
  $("status").textContent=overview.repository+" · "+commit.slice(0,8);
}
async function reviewBranch(){
  const base=$("baseBranch").value, head=$("headBranch").value;
  if(!base||!head)return;
  $("status").textContent="Reviewing "+head+" against "+base+"…";
  try{state.review=await api("/api/branch-review?base="+encodeURIComponent(base)+"&head="+encodeURIComponent(head)); renderBranchReview(state.review); $("status").textContent=state.review.decision+" · "+head+" ← "+base;}
  catch(e){$("status").textContent=e.message;$("branchReview").innerHTML='<div class="empty">'+esc(e.message)+'</div>';}
}
function renderBranchReview(r){
  if(!r){$("branchReview").innerHTML='<div class="empty">Select a base/head branch and review.</div>';return;}
  const c=r.changeSet;
  const evidence=(c.commitEvidence||[]).map(x=>'<div class="card"><b>'+esc(x.commit.slice(0,8))+'</b><div class="small">'+esc(x.subject)+'</div><div class="small">'+x.changedPaths.length+' changed path(s)</div></div>').join("");
  $("branchReview").innerHTML='<div class="card"><div class="tag">'+esc(r.decision)+'</div><div class="tag">Risk � '+esc(r.risk)+'</div><div class="metric"><span>Branch</span><b>'+esc(c.head)+'</b></div><div class="metric"><span>Base</span><b>'+esc(c.base)+'</b></div><div class="metric"><span>Merge base</span><b>'+esc(c.mergeBase.slice(0,8))+'</b></div><div class="metric"><span>Commits</span><b>'+c.commits.length+'</b></div><div class="metric"><span>Changed symbols</span><b>'+r.changedSymbolIds.length+'</b></div><div class="metric"><span>Removed symbols</span><b>'+(r.removedSymbolIds||[]).length+'</b></div><div class="metric"><span>Affected symbols</span><b>'+r.affectedSymbolIds.length+'</b></div><div class="metric"><span>Impacted tests</span><b>'+r.testImpact.impactedTestCases+'</b></div></div><div class="section"><div class="section-head"><h3>Commit evidence</h3></div>'+evidence+'</div>'+(r.reasons||[]).map(x=>'<div class="card">'+esc(x)+'</div>').join("")+(r.uncertainty||[]).map(x=>'<div class="card small">Uncertainty � '+esc(x)+'</div>').join("");
}
function renderOverview(o){
  $("inspector").innerHTML='<div class="card"><div class="metric"><span>Commit</span><b>'+esc(o.commit.slice(0,8))+'</b></div><div class="metric"><span>Files</span><b>'+o.changedFiles+'</b></div><div class="metric"><span>Changed symbols</span><b>'+o.changedSymbols+'</b></div><div class="metric"><span>Affected symbols</span><b>'+o.affectedSymbols+'</b></div><div class="metric"><span>Impacted tests</span><b>'+o.impactedTestCases+'</b></div></div><div class="card"><div class="small">'+esc(o.subject)+'</div></div>';
}
function renderTests(t){
  const impacts=t.impacts||[];
  if(!impacts.length){$("tests").innerHTML='<div class="empty">No statically impacted test cases for this commit.</div>';return;}
  $("tests").innerHTML=impacts.slice(0,30).map(x=>'<div class="card"><b>'+esc(x.testCaseId.slice(0,14))+'</b><div class="small">'+esc(x.relation)+" · "+esc(commandText(x.testCommand))+'</div></div>').join("");
}
function renderExecution(plan,feedback){
  const steps=plan?.steps||[];
  const execution=feedback?.execution;
  const summary=execution?'<div class="feedback">Last run: '+(execution.passed?"PASSED":"FAILED")+' · '+esc(feedback?.feedback?.executionId||"")+'</div>':"";
  if(!steps.length){$("execution").innerHTML=summary+'<div class="empty">No executable impacted tests.</div>';return;}
  $("execution").innerHTML=summary+'<div class="small">'+steps.length+" planned step(s)</div>"+steps.slice(0,30).map((s,i)=>{
    const result=execution?.steps?.find(x=>x.stepId===s.id);const status=result?.status||"planned";
    return '<div class="step '+esc(status.toLowerCase())+'"><b>'+(i+1)+". "+esc(s.id)+'</b><div class="small">'+esc((s.affectedTestCaseIds||[]).join(", ")||"test")+'</div><div class="cmd">'+esc(commandText(s.command))+'</div></div>';
  }).join("");
}
function renderGraph(g){
  const svg=$("graph");const nodes=g.nodes||[];const edges=g.edges||[];
  const cols={commit:120,symbol:350,"test-project":580,"test-file":760,"test-case":900,command:900};
  const counts={};nodes.forEach(n=>{counts[n.kind]=(counts[n.kind]||0)+1;});
  const idx={};Object.keys(counts).forEach(k=>idx[k]=0);const pos=new Map();
  nodes.forEach(n=>{const x=cols[n.kind]||500;const i=idx[n.kind]++;const y=80+(i%10)*58+Math.floor(i/10)*18;pos.set(n.id,[x,y]);});
  svg.innerHTML='<g id="world" transform="scale('+state.scale+')">'+edges.map(e=>{const a=pos.get(e.source),b=pos.get(e.target);if(!a||!b)return "";return '<line class="edge '+e.relation.toLowerCase()+'" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>';}).join("")+
  nodes.map(n=>{const [x,y]=pos.get(n.id);const cls=n.attributes?.changed?" changed":n.attributes?.affected?" affected":n.kind.startsWith("test")?" test":"";const label=n.label.length>32?n.label.slice(0,31)+"…":n.label;return '<g class="node'+cls+'" data-id="'+esc(n.id)+'" transform="translate('+(x-80)+","+(y-18)+')"><rect width="160" height="36" rx="7"/><text x="8" y="14" class="kind">'+esc(n.kind)+'</text><text x="8" y="29">'+esc(label)+'</text></g>';}).join("")+'</g>';
  svg.querySelectorAll(".node").forEach(n=>n.onclick=()=>selectNode(n.dataset.id));
}
async function selectNode(id){
  state.selected=id;const n=(state.graph.nodes||[]).find(x=>x.id===id);if(!n)return;
  const detail=await api("/api/node?commit="+encodeURIComponent(state.commit)+"&nodeId="+encodeURIComponent(id));
  $("inspector").innerHTML='<div class="card"><div class="tag">'+esc(n.kind)+'</div><h4>'+esc(n.label)+'</h4><pre>'+esc(JSON.stringify(detail,null,2))+'</pre></div><div class="section"><h3>Test impact</h3><div id="tests"></div></div><div class="section"><div class="section-head"><h3>Execution</h3><button id="runPlan" class="primary">Run impacted tests</button></div><div id="execution"></div></div>';
  const tests=await api("/api/test-impact?commit="+encodeURIComponent(state.commit));renderTests(tests);
  renderExecution(state.plan,state.feedback);$("runPlan").onclick=runPlan;
}
async function runPlan(){
  if(state.running)return;
  if(!confirm("Run all statically impacted test commands for commit "+state.commit.slice(0,8)+"?"))return;
  state.running=true;$("runPlan").disabled=true;$("status").textContent="Running impacted tests…";
  try{
    const result=await api("/api/run-execution-plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({commit:state.commit})});
    state.feedback=result;renderExecution(state.plan,result);$("status").textContent="Execution "+(result.execution?.status||"completed");
  }catch(e){$("status").textContent=e.message;alert(e.message);}
  finally{state.running=false;if($("runPlan"))$("runPlan").disabled=false;}
}
$("commit").onchange=e=>{state.commit=e.target.value;loadCommit(state.commit);};
$("reviewBranch").onclick=reviewBranch;
$("refresh").onclick=()=>load();
$("runPlan").onclick=runPlan;
$("zoomIn").onclick=()=>{state.scale=Math.min(2,state.scale+.1);renderGraph(state.graph);};
$("zoomOut").onclick=()=>{state.scale=Math.max(.5,state.scale-.1);renderGraph(state.graph);};
$("zoomReset").onclick=()=>{state.scale=1;renderGraph(state.graph);};
load().catch(e=>{$("status").textContent=e.message;$("inspector").innerHTML='<div class="empty">'+esc(e.message)+'</div>';});
</script>
</body>
</html>`;
}

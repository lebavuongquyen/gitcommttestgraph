import { GUI_CLIENT_SCRIPT } from "./client.js";

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
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(circle at 20% 0%,#172448 0,#0b1020 42%);color:#e8ecf7}body{min-height:100vh;overflow:auto}
button,select,input{font:inherit;color:inherit;background:#141c33;border:1px solid #2c3858;border-radius:8px;padding:8px 10px;min-width:0}
button{cursor:pointer}button:hover{border-color:#6f8fe8}button:disabled{opacity:.5;cursor:not-allowed}select{min-width:0;max-width:100%}
header{min-height:64px;display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid #202b46;background:#0d1428cc;backdrop-filter:blur(12px);flex-wrap:wrap}
.brand{font-weight:800;letter-spacing:.2px;margin-right:10px;white-space:nowrap}.status{font-size:12px;color:#94a3c7;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.spacer{flex:1}
main{min-height:calc(100vh - 64px);display:grid;grid-template-columns:minmax(220px,250px) minmax(0,1fr) minmax(300px,360px)}
aside,.inspector{border-right:1px solid #202b46;background:#0d1428aa;overflow:auto;min-width:0}.inspector{border-right:0;border-left:1px solid #202b46}
@media (max-width:1200px){main{grid-template-columns:220px minmax(0,1fr)}.inspector{grid-column:1 / -1;border-left:0;border-top:1px solid #202b46;max-height:none}.inspector .panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.inspector .section{min-width:0}.inspector .panel>h3{grid-column:1 / -1}.inspector .section-head{margin-top:0}}
@media (max-width:760px){header{align-items:stretch;padding:10px}.brand{width:100%;margin-right:0}header select,header input,header button{flex:1 1 140px}.status{width:100%;order:10}.spacer{display:none}main{display:flex;flex-direction:column;min-height:0}aside{order:1;max-height:260px;border-right:0;border-bottom:1px solid #202b46}.canvas{order:2;min-height:520px}.inspector{order:3;max-height:none}.inspector .panel{display:block}.panel{padding:10px}.toolbar{left:10px;top:10px}.legend{right:10px;top:10px;max-width:45vw}.section{margin-top:12px}}
@media (max-width:420px){header select,header input,header button{flex-basis:100%}.canvas{min-height:440px}.legend{display:none}.commit{padding:8px}}

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
<header><div class="brand">Git Commit Test Graph</div><select id="commit"></select><select id="baseBranch"></select><select id="headBranch"></select><button id="reviewBranch" class="primary">Review branch</button><input id="prRepo" placeholder="owner/repo" size="14"><input id="prNumber" placeholder="PR #" size="5" inputmode="numeric"><button id="reviewPr" class="primary">Review PR</button><button id="refresh">Refresh</button><span class="spacer"></span><span id="status" class="status">Loadingâ€¦</span></header>
<main>
<aside><div class="panel"><h3>Recent commits</h3><div id="commits"></div></div></aside>
<section class="canvas">
<div class="toolbar"><button id="zoomOut">âˆ’</button><button id="zoomReset">Reset</button><button id="zoomIn">+</button></div>
<div class="legend">Changed Â· Impact Â· Test</div><svg id="graph" viewBox="0 0 1000 700" role="img" aria-label="Code and test impact graph"></svg>
</section>
<section class="inspector"><div class="panel">
<h3>Configuration</h3><div id="ecosystem" class="card"><div class="small">Loading repository ecosystem...</div></div><div id="monorepo" class="card"><div class="small">Loading monorepo intelligence...</div></div><div id="historical" class="card"><div class="small">Loading historical intelligence...</div></div><div id="ci" class="card"><div class="small">Loading CI analysis...</div></div><div id="diagnostics" class="card"><div class="small">Loading diagnostics...</div></div><div id="testGaps" class="card"><div class="small">Loading test-gap analysis...</div></div><div id="configuration" class="card"><div class="small">Loading configurationâ€¦</div></div><div class="section"><div class="section-head"><h3>Recovery</h3></div><div class="card"><button id="createBackup" class="primary">Create backup</button> <button id="inspectBackup">Inspect</button><div style="margin-top:8px"><input id="backupPath" placeholder="Backup file path" style="width:100%;box-sizing:border-box"></div><div style="margin-top:8px"><button id="restoreBackup" class="danger">Restore backup</button><div style="margin-top:8px"><button id="repairPlan" class="primary">Repair preview</button> <button id="repairApply" class="danger">Apply repair</button></div><div style="margin-top:8px"><button id="resumeInterrupted" class="primary">Resume interrupted</button> <button id="rollbackInterrupted" class="danger">Rollback interrupted</button></div></div><div id="recoveryStatus" class="small" style="margin-top:8px">GCTG-owned state only. Git history is never modified.</div></div></div><div class="section"><div class="section-head"><h3>Inspector</h3></div><div id="intelligence" class="empty">Loading change intelligenceâ€¦</div><div id="inspector" class="empty">Select a node.</div>
<div class="section"><div class="section-head"><h3>Branch review</h3></div><div id="branchReview" class="empty">Select a base/head branch and review.</div></div>
<div class="section"><div class="section-head"><h3>Pull request intelligence</h3></div><div id="prReview" class="empty">Enter owner/repo and PR number to review a GitHub pull request.</div></div>
<div class="section"><div class="section-head"><h3>Test impact</h3></div><div id="tests" class="empty">Select a commit to inspect impacted tests.</div></div>
<div class="section"><div class="section-head"><h3>Execution</h3><button id="runPlan" class="primary">Run impacted tests</button></div><div id="execution" class="empty">Loading execution planâ€¦</div></div>
</div></section>
</main>
<script>${GUI_CLIENT_SCRIPT}</script>
</body>
</html>`;
}

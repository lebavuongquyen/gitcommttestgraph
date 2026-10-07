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
*{box-sizing:border-box}html,body{margin:0;height:100%;background:radial-gradient(circle at 20% 0%,#172448 0,#0b1020 42%);color:#e8ecf7}body{height:100vh;display:flex;flex-direction:column;overflow:hidden}
button,select,input{font:inherit;color:inherit;background:#141c33;border:1px solid #2c3858;border-radius:8px;padding:8px 10px;min-width:0}
button{cursor:pointer}button:hover{border-color:#6f8fe8}button:disabled{opacity:.5;cursor:not-allowed}select{min-width:0;max-width:100%}
header{min-height:64px;display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid #202b46;background:#0d1428cc;backdrop-filter:blur(12px);flex-wrap:wrap}
.brand{font-weight:800;letter-spacing:.2px;margin-right:10px;white-space:nowrap}.status{font-size:12px;color:#94a3c7;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.spacer{flex:1}
main{flex:1 1 auto;height:auto;min-height:0;display:grid;grid-template-columns:minmax(220px,250px) minmax(0,1fr) minmax(300px,360px)}
aside,.inspector{border-right:1px solid #202b46;background:#0d1428aa;overflow:auto;min-width:0}.inspector{border-right:0;border-left:1px solid #202b46}
@media (max-width:1200px){main{grid-template-columns:220px minmax(0,1fr)}.inspector{grid-column:1 / -1;border-left:0;border-top:1px solid #202b46;max-height:none}.inspector .panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.inspector .section{min-width:0}.inspector .panel>h3{grid-column:1 / -1}.inspector .section-head{margin-top:0}}
@media (max-width:760px){header{align-items:stretch;padding:10px}.brand{width:100%;margin-right:0}header select,header input,header button{flex:1 1 140px}.status{width:100%;order:10}.spacer{display:none}main{display:flex;flex-direction:column;min-height:0;overflow:auto}aside{order:1;flex:0 0 180px;max-height:none;border-right:0;border-bottom:1px solid #202b46}.canvas{order:2;flex:0 0 440px;min-height:440px}.inspector{order:3;flex:0 0 auto;max-height:none}.inspector .panel{display:block}.panel{padding:10px}.toolbar{left:10px;top:10px}.legend{right:10px;top:10px;max-width:45vw}.section{margin-top:12px}}
@media (max-width:420px){header select,header input,header button{flex-basis:100%}.canvas{min-height:440px}.legend{display:none}.commit{padding:8px}}

.panel{padding:14px}.panel h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#8291b5}
.commit{display:block;width:100%;text-align:left;margin:6px 0;padding:9px;border:1px solid transparent;background:transparent}
.commit:hover,.commit.active{background:#182340;border-color:#33466e}.commit .sha{font-family:ui-monospace,monospace;font-size:11px;color:#8da7e8}.commit .subject{font-size:12px;margin-top:3px;line-height:1.35}
.canvas{position:relative;overflow:hidden;min-width:0;min-height:0;overscroll-behavior:contain;background:#0a1020}.canvas::-webkit-scrollbar{width:12px;height:12px}.canvas::-webkit-scrollbar-track{background:#0b1224}.canvas::-webkit-scrollbar-thumb{background:#344463;border:3px solid #0b1224;border-radius:10px}.toolbar{position:sticky;z-index:4;top:12px;left:12px;display:flex;gap:8px;align-items:center;width:max-content;margin-bottom:-44px}.graph-status{fill:#aeb9d3;font-size:13px}.graph-column-title{fill:#8fa2c8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.graph-help{position:sticky;z-index:4;left:50%;bottom:12px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 24px);background:#10182ccc;border:1px solid #293758;border-radius:999px;padding:6px 10px;font-size:10px;color:#aab6d3;pointer-events:none}
.legend{position:absolute;z-index:3;right:12px;top:12px;background:#10182ccc;border:1px solid #293758;border-radius:10px;padding:10px;font-size:11px;color:#aab6d3}.graph-menu{position:fixed;z-index:20;min-width:190px;background:#111a30;border:1px solid #3a4d73;border-radius:10px;box-shadow:0 16px 40px #0008;padding:6px}.graph-menu button{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:7px;padding:9px}.graph-menu button:hover{background:#1b2948}.graph-breadcrumb{position:absolute;z-index:3;left:14px;top:14px;background:#10182ccc;border:1px solid #293758;border-radius:9px;padding:7px 10px;font-size:11px;color:#d4def5}.diff-panel{position:absolute;inset:58px 14px 14px;z-index:10;display:none;background:#0d1428f5;border:1px solid #334568;border-radius:12px;overflow:auto;padding:14px}.diff-panel.open{display:block}.diff-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.diff-side{min-width:0}.diff-side h4{margin:0 0 8px}.diff-code{background:#09101e;border:1px solid #263554;border-radius:8px;padding:10px;white-space:pre;overflow:auto;font:11px/1.45 ui-monospace,monospace}
.canvas{touch-action:none}.canvas.panning{cursor:grabbing}svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}.panning{cursor:grabbing!important}.edge{stroke:#425176;stroke-width:1.2;opacity:.65}.edge.changed{stroke:#e5a84f;stroke-width:2}.edge.affects{stroke:#8b9ff5;stroke-width:1.8}
.node{cursor:pointer;outline:none}.node rect{fill:#121b32;stroke:#344463;stroke-width:1.2}.node.selected rect{stroke:#ffffff;stroke-width:2.5;filter:drop-shadow(0 0 5px rgba(255,255,255,.35))}.node:focus rect{stroke:#a9bfff;stroke-width:2.2}.node.changed rect{fill:#342713;stroke:#e5a84f}.node.affected rect{fill:#172043;stroke:#8b9ff5}.node.test rect{fill:#132c29;stroke:#55c6a7}.node .hit-area{fill:transparent!important;stroke:none!important;pointer-events:all}.node .visual-area{pointer-events:none}.node text{fill:#dce5fb;font-size:11px;pointer-events:none}.node .kind{fill:#8796b8;font-size:9px}
.card{background:#111a30;border:1px solid #263554;border-radius:10px;padding:11px;margin-bottom:10px}.metric{display:flex;justify-content:space-between;padding:5px 0;color:#aeb9d3;font-size:12px}.metric b{color:#f1f5ff}
pre{white-space:pre-wrap;overflow:auto;font-size:11px;line-height:1.45;color:#b9c5df;margin:0}
.small{font-size:11px;color:#8c9bbb}.tag{display:inline-block;border:1px solid #354568;border-radius:999px;padding:2px 7px;margin:2px;font-size:10px;color:#b9c8ea}
.empty{padding:20px;text-align:center;color:#7e8ca9}.section{margin-top:16px}.secondary{margin-top:14px}.secondary summary{cursor:pointer;color:#aeb9d3;font-size:12px;padding:8px 0}.secondary[open] summary{margin-bottom:8px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.section-head h3{margin:0}
.step{border-left:3px solid #3d4f76;padding:8px 10px;margin:7px 0;background:#111a30;border-radius:0 8px 8px 0}.step.pass{border-left-color:#55c6a7}.step.fail{border-left-color:#e36d6d}.step.running{border-left-color:#e5a84f}.step .cmd{font-family:ui-monospace,monospace;font-size:10px;color:#b9c5df;word-break:break-word;margin-top:4px}
.feedback{font-size:11px;color:#aeb9d3;line-height:1.5}.primary{background:#273d78;border-color:#4d6fca}.danger{background:#4a2228;border-color:#8e414b}
</style>
</head>
<body>
<header><div class="brand">Git Commit Test Graph</div><select id="commit"></select><select id="baseBranch"></select><select id="headBranch"></select><button id="reviewBranch" class="primary">Review branch</button><input id="prRepo" placeholder="owner/repo" size="14"><input id="prNumber" placeholder="PR #" size="5" inputmode="numeric"><button id="reviewPr" class="primary">Review PR</button><button id="refresh">Refresh</button><span class="spacer"></span><span id="status" class="status">Loading...</span></header>
<main>
<aside><div class="panel"><h3>Recent commits</h3><div id="commits"></div></div></aside>
<section class="canvas">
<div id="graphBreadcrumb" class="graph-breadcrumb">Changed files & symbols</div><div class="toolbar"><button id="graphBack" title="Back to changed files" style="display:none">← Back</button><button id="zoomOut" title="Zoom out">−</button><button id="zoomReset" title="Reset zoom">Reset</button><button id="zoomIn" title="Zoom in">+</button></div>
<div class="legend"><b>How to read this</b><div>🟧 Changed code</div><div>🟦 Affected code</div><div>🟩 Test</div></div><svg id="graph" viewBox="0 0 1000 700" role="img" aria-label="Code and test impact graph"></svg>
<div id="diffPanel" class="diff-panel"></div><div class="graph-help">Start with changed files. Click a file to choose Diff, Dependencies, or Tests.</div>
</section>
<section class="inspector"><div class="panel">
<h3>Details</h3><div class="card"><div class="tag">Selected commit</div><h4 id="commitTitle">Commit</h4><div class="small">Start with changed files. Select a file to choose Dependencies, Tests, Changes, or Diff.</div></div><div id="inspector" class="card"><div class="empty">Select a graph node.</div></div><details class="secondary"><summary>Advanced analysis</summary><div id="intelligence" class="card"><div class="small">Available when detailed analysis is requested.</div></div><div id="tests" class="card"><div class="small">Available from the Tests view.</div></div><div id="execution" class="card"><div class="small">Available from the Tests view.</div></div><details class="secondary"><summary>Additional intelligence</summary><div id="ecosystem" class="card"><div class="small">Not loaded yet.</div></div><div id="monorepo" class="card"><div class="small">Not loaded yet.</div></div><div id="historical" class="card"><div class="small">Not loaded yet.</div></div><div id="ci" class="card"><div class="small">Not loaded yet.</div></div><div id="diagnostics" class="card"><div class="small">Not loaded yet.</div></div><div id="testGaps" class="card"><div class="small">Not loaded yet.</div></div><div id="configuration" class="card"><div class="small">Not loaded yet.</div></div></details><details class="secondary"><summary>Recovery & maintenance</summary><div class="card"><button id="createBackup" class="primary">Create backup</button> <button id="inspectBackup">Inspect</button><div style="margin-top:8px"><input id="backupPath" placeholder="Backup file path" style="width:100%;box-sizing:border-box"></div><div style="margin-top:8px"><button id="restoreBackup" class="danger">Restore backup</button><div style="margin-top:8px"><button id="repairPlan" class="primary">Repair preview</button> <button id="repairApply" class="danger">Apply repair</button></div><div style="margin-top:8px"><button id="resumeInterrupted" class="primary">Resume interrupted</button> <button id="rollbackInterrupted" class="danger">Rollback interrupted</button></div></div><div id="recoveryStatus" class="small" style="margin-top:8px">GCTG-owned state only. Git history is never modified.</div></div></div><div class="section"><div class="section-head"><h3>Branch review</h3></div><div id="branchReview" class="empty">Select a base/head branch and review.</div></div>
<div class="section"><div class="section-head"><h3>Pull request intelligence</h3></div><div id="prReview" class="empty">Enter owner/repo and PR number to review a GitHub pull request.</div></div>
</div></section>
</main>
<script>${GUI_CLIENT_SCRIPT}</script>
</body>
</html>`;
}

export const GUI_GRAPH_INTERACTION_SCRIPT = String.raw`
(function(){
  function graphViewportSize(){
    const canvas=$("graph").parentElement;
    return {width:Math.max(1,canvas?.clientWidth||1),height:Math.max(1,canvas?.clientHeight||1)};
  }
  function cameraTransform(){
    const size=graphViewportSize();
    return "translate("+(size.width/2+state.camera.x*state.camera.scale)+" "+(size.height/2+state.camera.y*state.camera.scale)+") scale("+state.camera.scale+")";
  }
  function updateCamera(){
    const world=$("graph").querySelector("#world");
    if(world)world.setAttribute("transform",cameraTransform());
  }
  function clampScale(value){return Math.max(.2,Math.min(4,value));}
  function setScaleAt(clientX,clientY,nextScale){
    const svg=$("graph");
    const rect=svg.getBoundingClientRect();
    const size={width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    const px=clientX-rect.left-size.width/2;
    const py=clientY-rect.top-size.height/2;
    const oldScale=state.camera.scale;
    const graphX=px/oldScale-state.camera.x;
    const graphY=py/oldScale-state.camera.y;
    const scale=clampScale(nextScale);
    state.camera.scale=scale;
    state.camera.x=px/scale-graphX;
    state.camera.y=py/scale-graphY;
    updateCamera();
  }
  function zoomAtViewportCenter(factor){
    const rect=$("graph").getBoundingClientRect();
    setScaleAt(rect.left+rect.width/2,rect.top+rect.height/2,state.camera.scale*factor);
  }
  function resetCamera(){
    state.camera={x:0,y:0,scale:1};
    updateCamera();
  }
  function fitGraph(){
    const layout=state.graphLayout;
    if(!layout||!layout.bounds)return resetCamera();
    const rect=$("graph").getBoundingClientRect();
    const bounds=layout.bounds;
    const width=Math.max(1,bounds.maxX-bounds.minX+180);
    const height=Math.max(1,bounds.maxY-bounds.minY+100);
    const scale=clampScale(Math.min((rect.width-40)/width,(rect.height-40)/height));
    state.camera={x:-(bounds.minX+bounds.maxX)/2,y:-(bounds.minY+bounds.maxY)/2,scale};
    updateCamera();
  }
  function applySelection(){
    $("graph").querySelectorAll(".node").forEach(node=>node.classList.toggle("selected",node.dataset.id===state.selectedNode));
  }
  renderGraph=function(g){
    const svg=$("graph");
    const allNodes=g?.nodes||[];
    const mode=state.graphMode||"edited-files";
    const nodes=mode==="edited-files"?allNodes.filter(n=>n.kind==="File"||((n.kind==="Symbol")&&n.attributes?.changed===true)):allNodes;
    const ids=new Set(nodes.map(n=>n.id));
    const edges=(g?.edges||[]).filter(e=>ids.has(e.source)&&ids.has(e.target));
    const columns=mode==="edited-files"?new Map([
      ["File",{x:260,label:"Changed files"}],
      ["Symbol",{x:650,label:"Changed symbols"}]
    ]):new Map([
      ["File",{x:180,label:"Files"}],["Symbol",{x:480,label:"Symbols"}],["TestProject",{x:700,label:"Test projects"}],["TestFile",{x:900,label:"Test files"}],["TestCase",{x:1120,label:"Tests"}]
    ]);
    const grouped=new Map();
    nodes.forEach(n=>{
      const key=columns.has(n.kind)?n.kind:"Related";
      const items=grouped.get(key)||[];
      items.push(n);
      grouped.set(key,items);
    });
    const pos=new Map();
    const rowHeight=68;
    const top=110;
    for(const [kind,column] of columns){
      (grouped.get(kind)||[]).forEach((n,i)=>pos.set(n.id,{x:column.x,y:top+i*rowHeight}));
    }
    (grouped.get("Related")||[]).forEach((n,i)=>pos.set(n.id,{x:560,y:top+i*rowHeight}));
    const values=[...pos.values()];
    const bounds=values.length
      ? {minX:Math.min(...values.map(p=>p.x)),maxX:Math.max(...values.map(p=>p.x)),minY:Math.min(...values.map(p=>p.y)),maxY:Math.max(...values.map(p=>p.y))}
      : {minX:0,maxX:0,minY:0,maxY:0};
    state.graphLayout={pos,bounds};
    state.graphStatus=nodes.length===0?"empty":edges.length===0?"relationships-unavailable":"valid";
    svg.setAttribute("viewBox","0 0 1280 1400");
    const statusMessage=state.graphStatus==="relationships-unavailable"?'<text class="graph-status" x="50%" y="32" text-anchor="middle">Relationships are unavailable for this commit. The nodes below are shown as changed-code evidence, not as a dependency graph.</text>':state.graphStatus==="empty"?'<text class="graph-status" x="50%" y="50%" text-anchor="middle">No graph nodes are available for this commit.</text>':"";
    const headers=[...columns.entries()].filter(([kind])=>(grouped.get(kind)||[]).length).map(([kind,column])=>'<text class="graph-column-title" x="'+column.x+'" y="48" text-anchor="middle">'+esc(column.label)+'</text>').join("");
    svg.innerHTML=statusMessage+headers+'<g id="world">'+
      edges.map(e=>{
        const a=pos.get(e.source),b=pos.get(e.target);
        if(!a||!b)return "";
        return '<line class="edge '+esc(e.relation?.toLowerCase())+'" data-source="'+esc(e.source)+'" data-target="'+esc(e.target)+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>';
      }).join("")+
      nodes.map(n=>{
        const p=pos.get(n.id);
        const cls=n.attributes?.changed?" changed":n.attributes?.affected?" affected":n.kind.toLowerCase().startsWith("test")?" test":"";
        const label=n.label.length>32?n.label.slice(0,31)+"...":n.label;
        return '<g class="node'+cls+'" data-id="'+esc(n.id)+'" tabindex="0" role="button" aria-label="'+esc(n.label)+'" transform="translate('+(p.x-80)+","+(p.y-18)+')"><rect class="hit-area" width="160" height="36" rx="7"/><rect class="visual-area" width="160" height="36" rx="7"/><text x="8" y="14" class="kind">'+esc(n.kind)+'</text><text x="8" y="29">'+esc(label)+'</text></g>';
      }).join("")+
      '</g>';
    svg.querySelectorAll(".node").forEach(node=>{
      node.addEventListener("click",event=>{
        if(node.dataset.dragged==="true"){node.dataset.dragged="false";return;}
        if(node.dataset.pointerHandled==="true"){delete node.dataset.pointerHandled;return;}
        handleGraphNodeClick(node);
      });
      node.addEventListener("dblclick",()=>focusNode(node.dataset.id));
      node.addEventListener("keydown",event=>{
        if(event.key==="Enter"||event.key===" "){event.preventDefault();selectNode(node.dataset.id);}
      });
      node.addEventListener("pointerdown",event=>beginNodeDrag(event,node));
    });
    bindGraphViewport();
    const breadcrumb=$("graphBreadcrumb");
    if(breadcrumb)breadcrumb.textContent=mode==="edited-files"?"Changed files & symbols":(mode==="dependencies"?"Dependencies":"Tests");
    const back=$("graphBack");
    if(back)back.style.display=mode==="edited-files"?"none":"inline-block";
    updateCamera();
    applySelection();
    if(!values.length)state.camera={x:0,y:0,scale:1};
    else fitGraph();
  };
  function showGraphMenu(node){
    document.querySelector(".graph-menu")?.remove();
    const menu=document.createElement("div");menu.className="graph-menu";
    const actions=[["View Changes",()=>selectNode(node.dataset.id)],["View Dependencies",()=>openDrilldown(node.dataset.id,"dependencies")],["View Tests",()=>openDrilldown(node.dataset.id,"tests")],["View Diff",()=>openDiff(node.dataset.id)],["Focus",()=>focusNode(node.dataset.id)]];
    for(const [label,action] of actions){const b=document.createElement("button");b.textContent=label;b.onclick=()=>{menu.remove();action();};menu.appendChild(b);}
    document.body.appendChild(menu);
    const r=node.getBoundingClientRect();menu.style.left=Math.min(r.left,window.innerWidth-205)+"px";menu.style.top=Math.min(r.bottom+6,window.innerHeight-240)+"px";
    const close=e=>{if(!menu.contains(e.target)&&e.target!==node){menu.remove();document.removeEventListener("pointerdown",close);}};setTimeout(()=>document.addEventListener("pointerdown",close),0);
  }
  function handleGraphNodeClick(node){
    if(state.graphMode!=="edited-files"){selectNode(node.dataset.id);return;}
    showGraphMenu(node);
  }
  async function openDrilldown(id,mode){
    try{
      state.graphMode=mode;state.selectedNode=id;$("status").textContent="Loading "+mode+"...";
      const graph=await api(capability("graphDrilldown",query({commit:state.commit,nodeId:id,mode})));state.graph=toGuiGraphViewModel(graph);renderGraph(state.graph);
      const n=(state.graph.nodes||[]).find(x=>x.id===id);if(n)$("inspector").innerHTML='<div class="card"><div class="tag">'+esc(mode)+'</div><h4>'+esc(n.label)+'</h4><div class="small">Drill-down view for this item.</div></div>';
      $("status").textContent=state.commit.slice(0,8)+" · "+mode;
    }catch(e){$("status").textContent=e.message;}
  }
  function returnToEditedFiles(){state.graphMode="edited-files";renderGraph(state.graph);}
  function parentCommit(){return state.commitParents?.[state.commit]||null;}
  async function openDiff(id){
    const n=(state.graph?.nodes||[]).find(x=>x.id===id);const path=n?.attributes?.path;
    if(!path){$("status").textContent="Diff is available for file nodes only.";return;}
    const from=parentCommit();if(!from){$("status").textContent="No parent commit is available for this commit.";return;}
    try{
      const d=await api(capability("fileDiff",query({from,to:state.commit,path})));
      const panel=$("diffPanel");panel.innerHTML='<div class="section-head"><h3>Diff · '+esc(path)+'</h3><button id="closeDiff">Close</button></div><div class="small">'+esc(d.status)+' · '+esc(d.from.slice(0,8))+' → '+esc(d.to.slice(0,8))+'</div><div class="diff-grid"><div class="diff-side"><h4>Previous · '+esc(d.from.slice(0,8))+'</h4><pre class="diff-code">'+esc(d.oldContent??"")+'</pre></div><div class="diff-side"><h4>Current · '+esc(d.to.slice(0,8))+'</h4><pre class="diff-code">'+esc(d.newContent??"")+'</pre></div></div>';
      panel.classList.add("open");$("closeDiff").onclick=()=>panel.classList.remove("open");
    }catch(e){$("status").textContent=e.message;}
  }
  function focusNode(id){
    const p=state.graphLayout?.pos?.get(id);
    if(!p)return;
    state.camera.x=-p.x;
    state.camera.y=-p.y;
    state.camera.scale=Math.max(state.camera.scale,1.2);
    updateCamera();
    selectNode(id);
  }
  function beginNodeDrag(event,node){
    if(event.button!==0)return;
    event.stopPropagation();
    const pointerId=event.pointerId;
    const originX=event.clientX,originY=event.clientY;
    const id=node.dataset.id;
    const p=state.graphLayout?.pos?.get(id);
    if(!p)return;
    const originGraphX=p.x,originGraphY=p.y;
    let moved=false;
    const svg=$("graph");
    try{svg.setPointerCapture(pointerId);}catch{}
    const move=e=>{
      if(e.pointerId!==pointerId)return;
      const dx=(e.clientX-originX)/state.camera.scale;
      const dy=(e.clientY-originY)/state.camera.scale;
      if(Math.abs(e.clientX-originX)+Math.abs(e.clientY-originY)>4)moved=true;
      if(!moved)return;
      p.x=originGraphX+dx;p.y=originGraphY+dy;
      node.setAttribute("transform","translate("+(p.x-80)+","+(p.y-18)+")");
      updateGraphEdges();
    };
    const end=()=>{
      try{svg.releasePointerCapture(pointerId);}catch{}
      node.dataset.dragged=moved?"true":"false";
      if(!moved){node.dataset.pointerHandled="true";handleGraphNodeClick(node);}
      svg.removeEventListener("pointermove",move);
      svg.removeEventListener("pointerup",end);
      svg.removeEventListener("pointercancel",end);
      if(moved)updateGraphEdges();
    };
    svg.addEventListener("pointermove",move);
    svg.addEventListener("pointerup",end);
    svg.addEventListener("pointercancel",end);
  }
  function updateGraphEdges(){
    const svg=$("graph");
    svg.querySelectorAll(".edge").forEach(edge=>{
      const source=edge.getAttribute("data-source"),target=edge.getAttribute("data-target");
      const a=state.graphLayout.pos.get(source),b=state.graphLayout.pos.get(target);
      if(a&&b){edge.setAttribute("x1",a.x);edge.setAttribute("y1",a.y);edge.setAttribute("x2",b.x);edge.setAttribute("y2",b.y);}
    });
  }
  function bindGraphViewport(){
    const svg=$("graph");
    if(svg.dataset.interactionBound==="true")return;
    svg.dataset.interactionBound="true";
    let pan=null;
    svg.addEventListener("wheel",event=>{
      event.preventDefault();
      setScaleAt(event.clientX,event.clientY,state.camera.scale*(event.deltaY<0?1.12:1/1.12));
    },{passive:false});
    svg.addEventListener("pointerdown",event=>{
      const target=event.target;
      const isNode=target.closest&&target.closest(".node");
      const spacePan=event.button===0&&event.shiftKey;
      if(isNode&&!spacePan)return;
      if(event.button!==0&&event.button!==1&&!spacePan)return;
      pan={pointerId:event.pointerId,lastX:event.clientX,lastY:event.clientY};
      svg.setPointerCapture(event.pointerId);
      svg.classList.add("panning");
    });
    svg.addEventListener("pointermove",event=>{
      if(!pan||pan.pointerId!==event.pointerId)return;
      state.camera.x+=(event.clientX-pan.lastX)/state.camera.scale;
      state.camera.y+=(event.clientY-pan.lastY)/state.camera.scale;
      pan.lastX=event.clientX;pan.lastY=event.clientY;
      updateCamera();
    });
    const endPan=event=>{
      if(!pan||pan.pointerId!==event.pointerId)return;
      pan=null;svg.classList.remove("panning");
      try{svg.releasePointerCapture(event.pointerId);}catch{}
    };
    svg.addEventListener("pointerup",endPan);
    svg.addEventListener("pointercancel",endPan);
    svg.addEventListener("dblclick",event=>{
      if(event.target===svg)resetCamera();
    });
    window.addEventListener("keydown",event=>{
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;
      if(event.key==="Escape"){state.selectedNode=null;applySelection();}
      if(event.key==="+"||event.key==="=")zoomAtViewportCenter(1.12);
      if(event.key==="-")zoomAtViewportCenter(1/1.12);
      if(event.key==="0")resetCamera();
      if(event.key==="f"||event.key==="F")fitGraph();
    });
    window.addEventListener("resize",()=>{updateCamera();});
    $("zoomIn").onclick=()=>zoomAtViewportCenter(1.15);
    $("zoomOut").onclick=()=>zoomAtViewportCenter(1/1.15);
    $("zoomReset").onclick=()=>resetCamera();
    if(!$("fitGraph")){const button=document.createElement("button");button.id="fitGraph";button.textContent="Fit";button.title="Fit graph";$("zoomReset").after(button);button.onclick=fitGraph;}
    if($("graphBack"))$("graphBack").onclick=returnToEditedFiles;
  }
  const previousSelectNode=selectNode;
  selectNode=function(id){
    Object.assign(state,selectGuiNode(state,id));
    applySelection();
    const n=(state.graph?.nodes||[]).find(x=>x.id===id);
    if(!n)return;
    $("inspector").innerHTML='<div class="card"><div class="tag">'+esc(n.kind)+'</div><h4>'+esc(n.label)+'</h4><div class="small">Selected. Loading additional evidence...</div><div class="small" style="margin-top:6px">Impact and tests remain available while details load.</div></div>';
    previousSelectNode(id);
  };
  window.addEventListener("load",()=>{if(state.graph)renderGraph(state.graph);});
})();
`;


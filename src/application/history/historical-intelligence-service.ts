import type { Commit } from "../../domain/git/model.js";
import type { GraphEdge, GraphNode, GraphSnapshot } from "../../domain/graph/model.js";
import type { Evidence } from "../../domain/evidence/model.js";
import { diffSnapshots, changedSymbolIdsFromDiff } from "../analysis/graph-diff.js";
import { TestGapAnalyzer } from "../impact/test-gap-analyzer.js";
import { TestImpactAnalyzer } from "../impact/test-impact-analyzer.js";
import type { HistoricalCommit, HistoricalDependencyTransition, HistoricalIntelligence, HistoricalSymbolTransition, HistoricalTestImpactTransition, HistoricalUncertainty } from "../../domain/historical-intelligence.js";
import type { GitRepositoryPort } from "../ports/git.js";

export interface HistoricalIntelligenceInput { readonly repository:string; readonly fromCommit:string; readonly toCommit:string; readonly maxCommits?:number; }
export interface HistoricalSnapshotLoader { readonly load:(commit:string)=>Promise<GraphSnapshot>; }

export class HistoricalIntelligenceService {
  private readonly gaps=new TestGapAnalyzer();
  private readonly tests=new TestImpactAnalyzer();
  constructor(private readonly git:GitRepositoryPort, private readonly snapshots:HistoricalSnapshotLoader) {}
  async analyze(input:HistoricalIntelligenceInput):Promise<HistoricalIntelligence>{
    const maxCommits=Math.max(2,Math.min(200,Math.floor(input.maxCommits??50)));
    const fromInfo=await this.git.getCommit(input.fromCommit);
    const toInfo=await this.git.getCommit(input.toCommit);
    const between=await this.git.getCommitsBetween(fromInfo.hash,toInfo.hash);
    const sequence=[fromInfo.hash,...between.filter(commit=>commit!==fromInfo.hash)];
    if(!sequence.includes(toInfo.hash))sequence.push(toInfo.hash);
    const commits=[...new Set(sequence)];
    if(commits.length>maxCommits)throw new Error(`Historical analysis window exceeds maxCommits (${maxCommits}).`);
    const snapshots=await Promise.all(commits.map(commit=>this.snapshots.load(commit)));
    const commitModels=await Promise.all(commits.map(commit=>this.git.getCommit(commit)));
    const symbolTransitions:HistoricalSymbolTransition[]=[];
    const dependencyTransitions:HistoricalDependencyTransition[]=[];
    const testImpactTransitions:HistoricalTestImpactTransition[]=[];
    const uncertainty:HistoricalUncertainty[]=[];
    const evidence:Evidence[]=[];
    for(let i=1;i<snapshots.length;i++){
      const from=snapshots[i-1]!,to=snapshots[i]!,diff=diffSnapshots(from,to);
      const changedSymbols=changedSymbolIdsFromDiff(from,to,diff);
      symbolTransitions.push(...buildSymbolTransitions(from,to,diff));
      dependencyTransitions.push(...buildDependencyTransitions(from,to));
      testImpactTransitions.push(...await this.testTransitions(from,to,changedSymbols));
      evidence.push(...transitionEvidence(from,to,diff));
      if(commitModels[i]!.parents.length>1)uncertainty.push({code:"MERGE_COMMIT",message:`Commit ${commitModels[i]!.hash} has multiple parents; progression does not invent a single-parent explanation.`,confidence:"MEDIUM"});
    }
    return {schemaVersion:1,repository:input.repository,fromCommit:snapshots[0]!.commit,toCommit:snapshots.at(-1)!.commit,commits:commitModels.map(toHistoricalCommit),symbolTransitions:sortSymbols(symbolTransitions),dependencyTransitions:sortDependencies(dependencyTransitions),testImpactTransitions:sortTestTransitions(testImpactTransitions),evidence:dedupeEvidence(evidence),uncertainty:dedupeUncertainty(uncertainty),deterministic:true};
  }
  private async testTransitions(from:GraphSnapshot,to:GraphSnapshot,changedSymbolIds:readonly string[]):Promise<HistoricalTestImpactTransition[]>{
    if(!changedSymbolIds.length)return[];
    const previous=this.tests.analyze(from,{changedSymbolIds,coverageLinks:this.gaps.analyze(from,{changedNodeIds:changedSymbolIds}).coverageLinks});
    const current=this.tests.analyze(to,{changedSymbolIds,coverageLinks:this.gaps.analyze(to,{changedNodeIds:changedSymbolIds}).coverageLinks});
    const before=new Map(previous.impacts.map(item=>[item.testCaseId,item]));
    const after=new Map(current.impacts.map(item=>[item.testCaseId,item]));
    const result:HistoricalTestImpactTransition[]=[];
    for(const [id,item] of after)if(!before.has(id))result.push({kind:"BECAME_IMPACTED",fromCommit:from.commit,toCommit:to.commit,testCaseId:id,changedSymbolIds:[...item.changedSymbolIds].sort(),evidence:item.evidence});
    for(const [id,item] of before)if(!after.has(id))result.push({kind:"CEASED_IMPACTED",fromCommit:from.commit,toCommit:to.commit,testCaseId:id,changedSymbolIds:[...item.changedSymbolIds].sort(),evidence:item.evidence});
    return result;
  }
}

function toHistoricalCommit(commit:Commit):HistoricalCommit{return{hash:commit.hash,parents:[...commit.parents],timestamp:commit.timestamp,message:commit.message,merge:commit.parents.length>1};}
function buildSymbolTransitions(from:GraphSnapshot,to:GraphSnapshot,diff:ReturnType<typeof diffSnapshots>):HistoricalSymbolTransition[]{
  const fromNodes=new Map(from.nodes.filter(n=>n.type==="Symbol").map(n=>[n.id,n])),toNodes=new Map(to.nodes.filter(n=>n.type==="Symbol").map(n=>[n.id,n]));
  const added=new Set(diff.addedNodes),removed=new Set(diff.removedNodes),changed=new Set(diff.changedNodes);const result:HistoricalSymbolTransition[]=[];
  for(const [id,node] of toNodes){if(added.has(id))result.push(symbolTransition("ADDED",from,to,node));else if(changed.has(id))result.push(symbolTransition("CHANGED",from,to,node));}
  for(const [id,node] of fromNodes)if(removed.has(id)&&!toNodes.has(id)&&![...toNodes.values()].some(candidate=>symbolIdentity(candidate)===symbolIdentity(node)))result.push(symbolTransition("REMOVED",from,to,node));
  return result;
}
function symbolTransition(kind:HistoricalSymbolTransition["kind"],from:GraphSnapshot,to:GraphSnapshot,node:GraphNode):HistoricalSymbolTransition{const path=symbolPath(node,to)??symbolPath(node,from);return{kind,fromCommit:from.commit,toCommit:to.commit,symbolId:node.id,name:String(node.attributes.name??node.id),symbolKind:String(node.attributes.kind??"unknown"),...(path?{filePath:path}:{}),confidence:"EXACT",evidence:[{kind:"historical-symbol-transition",filePath:path??"",details:{fromCommit:from.commit,toCommit:to.commit,symbolId:node.id,transition:kind}}]};}
function symbolPath(node:GraphNode,snapshot:GraphSnapshot):string|undefined{if(typeof node.attributes.path==="string")return String(node.attributes.path);if(typeof node.attributes.fileId!=="string")return undefined;const file=snapshot.nodes.find(candidate=>candidate.id===node.attributes.fileId&&candidate.type==="File");return typeof file?.attributes.path==="string"?String(file.attributes.path):undefined;}
function buildDependencyTransitions(from:GraphSnapshot,to:GraphSnapshot):HistoricalDependencyTransition[]{
  const result:HistoricalDependencyTransition[]=[];const a=new Map(from.edges.filter(isDependencyEdge).map(e=>[edgeKey(e),e])),b=new Map(to.edges.filter(isDependencyEdge).map(e=>[edgeKey(e),e]));
  for(const [key,e] of b)if(!a.has(key))result.push(dependencyTransition("ADDED",from,to,e));
  for(const [key,e] of a)if(!b.has(key))result.push(dependencyTransition("REMOVED",from,to,e));
  return result;
}
function dependencyTransition(kind:HistoricalDependencyTransition["kind"],from:GraphSnapshot,to:GraphSnapshot,edge:GraphEdge):HistoricalDependencyTransition{return{kind,fromCommit:from.commit,toCommit:to.commit,edgeType:edge.type,sourceId:edge.source,targetId:edge.target,confidence:"EXACT",evidence:edge.evidence};}
function transitionEvidence(from:GraphSnapshot,to:GraphSnapshot,diff:ReturnType<typeof diffSnapshots>):Evidence[]{return[{kind:"historical-graph-diff",filePath:"",details:{fromCommit:from.commit,toCommit:to.commit,addedNodes:diff.addedNodes.length,removedNodes:diff.removedNodes.length,changedNodes:diff.changedNodes.length,addedEdges:diff.addedEdges.length,removedEdges:diff.removedEdges.length}}];}
function symbolIdentity(node:GraphNode):string{return JSON.stringify([node.attributes.name??null,node.attributes.kind??null,node.attributes.qualifiedName??null]);}
function isDependencyEdge(edge:GraphEdge):boolean{return["IMPORTS","DEPENDS_ON","EXPORTS","CALLS","EXTENDS","IMPLEMENTS"].includes(edge.type);}
function edgeKey(edge:GraphEdge):string{return JSON.stringify([edge.type,edge.source,edge.target]);}
function sortSymbols(items:readonly HistoricalSymbolTransition[]):HistoricalSymbolTransition[]{return[...items].sort((a,b)=>[a.toCommit,a.kind,a.symbolId].join("\u0000").localeCompare([b.toCommit,b.kind,b.symbolId].join("\u0000")));}
function sortDependencies(items:readonly HistoricalDependencyTransition[]):HistoricalDependencyTransition[]{return[...items].sort((a,b)=>[a.toCommit,a.kind,a.edgeType,a.sourceId,a.targetId].join("\u0000").localeCompare([b.toCommit,b.kind,b.edgeType,b.sourceId,b.targetId].join("\u0000")));}
function sortTestTransitions(items:readonly HistoricalTestImpactTransition[]):HistoricalTestImpactTransition[]{return[...items].sort((a,b)=>[a.toCommit,a.kind,a.testCaseId].join("\u0000").localeCompare([b.toCommit,b.kind,b.testCaseId].join("\u0000")));}
function dedupeEvidence(items:readonly Evidence[]):Evidence[]{const map=new Map<string,Evidence>();for(const item of items)map.set(JSON.stringify(item),item);return[...map.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
function dedupeUncertainty(items:readonly HistoricalUncertainty[]):HistoricalUncertainty[]{const map=new Map<string,HistoricalUncertainty>();for(const item of items)map.set(JSON.stringify(item),item);return[...map.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}

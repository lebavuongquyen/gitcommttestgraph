import { EdgeType, NodeType, type GraphSnapshot } from "../../domain/graph/model.js";

export interface MonorepoPackage { readonly id:string; readonly name:string; readonly rootPath:string; readonly manifestPath:string; readonly dependencies:readonly string[]; readonly dependents:readonly string[]; readonly testProjects:readonly string[]; readonly sourceFiles:number; }
export interface MonorepoWorkspace { readonly id:string; readonly rootPath:string; readonly packages:readonly string[]; }
export interface MonorepoAnalysis { readonly schemaVersion:1; readonly repository:string; readonly commit:string; readonly isMonorepo:boolean; readonly workspaceCount:number; readonly packageCount:number; readonly workspaces:readonly MonorepoWorkspace[]; readonly packages:readonly MonorepoPackage[]; readonly impactedPackages:readonly string[]; }

export function analyzeMonorepo(snapshot:GraphSnapshot, changedNodeIds:readonly string[]=[]):MonorepoAnalysis {
 const packageNodes=snapshot.nodes.filter(n=>n.type===NodeType.PACKAGE); const packageIds=new Set(packageNodes.map(n=>n.id));
 const packageEdges=snapshot.edges.filter(e=>e.type===EdgeType.DEPENDS_ON&&packageIds.has(e.source)&&packageIds.has(e.target));
 const deps=new Map<string,string[]>(), dependents=new Map<string,string[]>();
 for(const e of packageEdges){deps.set(e.source,[...(deps.get(e.source)??[]),e.target]);dependents.set(e.target,[...(dependents.get(e.target)??[]),e.source]);}
 const fileCount=new Map<string,number>();
 for(const n of snapshot.nodes.filter(n=>n.type===NodeType.FILE)){const p=typeof n.attributes.packageId==="string"?String(n.attributes.packageId):undefined;if(p)fileCount.set(p,(fileCount.get(p)??0)+1);}
 const tests=snapshot.nodes.filter(n=>n.type===NodeType.TEST_PROJECT);
 const packages=packageNodes.map(n=>({id:n.id,name:String(n.attributes.name??n.id),rootPath:String(n.attributes.rootPath??"."),manifestPath:String(n.attributes.manifestPath??""),dependencies:[...new Set(deps.get(n.id)??[])].sort(),dependents:[...new Set(dependents.get(n.id)??[])].sort(),testProjects:tests.filter(t=>snapshot.edges.some(e=>e.type===EdgeType.CONTAINS&&e.source===n.id&&e.target===t.id)).map(t=>t.id).sort(),sourceFiles:fileCount.get(n.id)??0})).sort((a,b)=>a.name.localeCompare(b.name));
 const workspaces=buildWorkspaces(packages);
 return {schemaVersion:1,repository:snapshot.repository,commit:snapshot.commit,isMonorepo:packageNodes.length>1||workspaces.length>1,workspaceCount:workspaces.length,packageCount:packages.length,workspaces,packages,impactedPackages:impactedPackageIds(snapshot,changedNodeIds,packageIds)};
}
function impactedPackageIds(snapshot:GraphSnapshot,ids:readonly string[],packageIds:Set<string>):string[]{const direct=new Set<string>();const fileMap=new Map(snapshot.nodes.filter(n=>n.type===NodeType.FILE&&typeof n.attributes.packageId==="string").map(n=>[n.id,String(n.attributes.packageId)]));for(const id of ids){if(packageIds.has(id))direct.add(id);const p=fileMap.get(id);if(p)direct.add(p);}const reverse=new Map<string,string[]>();for(const e of snapshot.edges.filter(e=>e.type===EdgeType.DEPENDS_ON))reverse.set(e.target,[...(reverse.get(e.target)??[]),e.source]);const queue=[...direct],result=new Set(direct);while(queue.length){const current=queue.shift()!;for(const dependent of reverse.get(current)??[])if(!result.has(dependent)){result.add(dependent);queue.push(dependent);}}return [...result].sort();}
function buildWorkspaces(packages:readonly MonorepoPackage[]):MonorepoWorkspace[]{const grouped=new Map<string,string[]>();for(const pkg of packages){const root=workspaceRoot(pkg.rootPath);grouped.set(root,[...(grouped.get(root)??[]),pkg.id]);}return [...grouped.entries()].map(([rootPath,ids])=>({id:"workspace:"+rootPath,rootPath,packages:ids.sort()})).sort((a,b)=>a.rootPath.localeCompare(b.rootPath));}
function workspaceRoot(rootPath:string):string{if(rootPath===".")return ".";const segments=rootPath.split("/").filter(Boolean);return segments.length>1?segments.slice(0,-1).join("/")||".":".";}

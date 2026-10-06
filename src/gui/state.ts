export type GuiLoadState = "idle" | "loading" | "ready" | "empty" | "error" | "stale";
export type GuiExecutionState = "idle" | "running" | "completed" | "failed";

export interface GuiState {
  load: GuiLoadState;
  execution: GuiExecutionState;
  commit: string;
  selectedNode: string | null;
  error: string | null;
  stale: boolean;
}

export const createGuiState = (): GuiState => ({ load: "idle", execution: "idle", commit: "", selectedNode: null, error: null, stale: false });
export const beginGuiLoad = (state: GuiState, commit: string): GuiState => ({ ...state, load: "loading", commit, error: null, stale: false });
export const completeGuiLoad = (state: GuiState, empty = false): GuiState => ({ ...state, load: empty ? "empty" : "ready", error: null, stale: false });
export const failGuiLoad = (state: GuiState, error: string): GuiState => ({ ...state, load: "error", error, stale: false });
export const markGuiStale = (state: GuiState): GuiState => ({ ...state, load: "stale", stale: true });
export const beginGuiExecution = (state: GuiState): GuiState => ({ ...state, execution: "running", error: null });
export const completeGuiExecution = (state: GuiState, success: boolean): GuiState => ({ ...state, execution: success ? "completed" : "failed" });
export const selectGuiNode = (state: GuiState, nodeId: string): GuiState => ({ ...state, selectedNode: nodeId });

export const GUI_STATE_SCRIPT = [
  'const createGuiState=()=>({load:"idle",execution:"idle",commit:"",selectedNode:null,error:null,stale:false});',
  'const beginGuiLoad=(state,commit)=>({...state,load:"loading",commit,error:null,stale:false});',
  'const completeGuiLoad=(state,empty=false)=>({...state,load:empty?"empty":"ready",error:null,stale:false});',
  'const failGuiLoad=(state,error)=>({...state,load:"error",error,stale:false});',
  'const markGuiStale=state=>({...state,load:"stale",stale:true});',
  'const beginGuiExecution=state=>({...state,execution:"running",error:null});',
  'const completeGuiExecution=(state,success)=>({...state,execution:success?"completed":"failed"});',
  'const selectGuiNode=(state,nodeId)=>({...state,selectedNode:nodeId});'
].join("\n");

export interface GuiStatusViewModel {
  readonly repository: string;
  readonly head: string;
}
export interface GuiCommitViewModel {
  readonly hash: string;
  readonly subject: string;
}
export interface GuiGraphNodeViewModel {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly attributes: Record<string, unknown>;
}
export interface GuiGraphEdgeViewModel {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
}
export interface GuiGraphViewModel {
  readonly schemaVersion: string;
  readonly repository: string;
  readonly commit: string;
  readonly nodes: readonly GuiGraphNodeViewModel[];
  readonly edges: readonly GuiGraphEdgeViewModel[];
}
export interface GuiExecutionStepViewModel {
  readonly id: string;
  readonly affectedTestCaseIds: readonly string[];
  readonly command: unknown;
}
export interface GuiExecutionViewModel {
  readonly steps: readonly GuiExecutionStepViewModel[];
  readonly execution?: unknown;
}
export interface GuiChangeIntelligenceViewModel {
  readonly intelligence: unknown | null;
}
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const asString = (value: unknown): string => typeof value === "string" ? value : "";
const asArray = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
export function toGuiStatusViewModel(value: unknown): GuiStatusViewModel {
  const source = asRecord(value);
  return { repository: asString(source.root), head: asString(source.head) };
}
export function toGuiCommitViewModels(value: unknown): readonly GuiCommitViewModel[] {
  return asArray(value).map(item => {
    const source = asRecord(item);
    return { hash: asString(source.hash), subject: asString(source.subject) };
  });
}
export function toGuiGraphViewModel(value: unknown): GuiGraphViewModel {
  const source = asRecord(value);
  const nodes = asArray(source.nodes).map(item => {
    const node = asRecord(item);
    return { id: asString(node.id), kind: asString(node.kind), label: asString(node.label), attributes: asRecord(node.attributes) };
  });
  const edges = asArray(source.edges).map(item => {
    const edge = asRecord(item);
    return { source: asString(edge.source), target: asString(edge.target), relation: asString(edge.relation) };
  });
  return { schemaVersion: asString(source.schemaVersion), repository: asString(source.repository), commit: asString(source.commit), nodes, edges };
}
export function toGuiExecutionViewModel(plan: unknown, feedback?: unknown): GuiExecutionViewModel {
  const source = asRecord(plan);
  const feedbackRecord = asRecord(feedback);
  const steps = asArray(source.steps).map(item => {
    const step = asRecord(item);
    return { id: asString(step.id), affectedTestCaseIds: asArray(step.affectedTestCaseIds).filter((id): id is string => typeof id === "string"), command: step.command };
  });
  return { steps, execution: feedbackRecord.execution };
}
export function toGuiChangeIntelligenceViewModel(value: unknown): GuiChangeIntelligenceViewModel {
  const source = asRecord(value);
  return { intelligence: source.intelligence ?? null };
}
export const GUI_VIEW_MODEL_SCRIPT = `
function guiRecord(value){return value&&typeof value==="object"?value:{};}
function guiArray(value){return Array.isArray(value)?value:[];}
function guiString(value){return typeof value==="string"?value:"";}
function toGuiStatusViewModel(value){const source=guiRecord(value);return {repository:guiString(source.root),head:guiString(source.head)};}
function toGuiCommitViewModels(value){return guiArray(value).map(item=>{const source=guiRecord(item);return {hash:guiString(source.hash),subject:guiString(source.subject)};});}
function toGuiGraphViewModel(value){const source=guiRecord(value);return {schemaVersion:guiString(source.schemaVersion),repository:guiString(source.repository),commit:guiString(source.commit),nodes:guiArray(source.nodes).map(item=>{const node=guiRecord(item);return {id:guiString(node.id),kind:guiString(node.kind),label:guiString(node.label),attributes:guiRecord(node.attributes)};}),edges:guiArray(source.edges).map(item=>{const edge=guiRecord(item);return {source:guiString(edge.source),target:guiString(edge.target),relation:guiString(edge.relation)};})};}
function toGuiExecutionViewModel(plan,feedback){const source=guiRecord(plan);const feedbackRecord=guiRecord(feedback);return {steps:guiArray(source.steps).map(item=>{const step=guiRecord(item);return {id:guiString(step.id),affectedTestCaseIds:guiArray(step.affectedTestCaseIds).filter(id=>typeof id==="string"),command:step.command};}),execution:feedbackRecord.execution};}
function toGuiChangeIntelligenceViewModel(value){const source=guiRecord(value);return {intelligence:source.intelligence??null};}
`;


import type { PullRequestMetadata } from "../../domain/pull-request/model.js";

export interface PullRequestContext extends PullRequestMetadata {
  readonly base: string;
  readonly head: string;
  readonly headRepository?: string;
}

export interface PullRequestProvider {
  get(ownerRepo: string, number: number): Promise<PullRequestContext>;
}

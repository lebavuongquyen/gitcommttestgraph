export interface TestProject {
  readonly id: string;
  readonly packageId?: string;
  readonly framework: string;
  readonly rootPath: string;
  readonly configurationFiles: readonly string[];
  readonly commandResolverId: string;
}

export interface TestFile {
  readonly id: string;
  readonly fileId: string;
  readonly testProjectId: string;
}

export interface TestCase {
  readonly id: string;
  readonly testFileId: string;
  readonly title: string;
  readonly qualifiedTitle?: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly frameworkMetadata?: Readonly<Record<string, unknown>>;
}

export class GctgError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GctgError";
    this.code = code;
  }
}
export class RepositoryNotFoundError extends GctgError { constructor(message = "Git repository not found") { super("REPOSITORY_NOT_FOUND", message); } }
export class UnsupportedLanguageError extends GctgError { constructor(message: string) { super("UNSUPPORTED_LANGUAGE", message); } }
export class UnsupportedFrameworkError extends GctgError { constructor(message: string) { super("UNSUPPORTED_FRAMEWORK", message); } }
export class InvalidCommitError extends GctgError { constructor(message: string) { super("INVALID_COMMIT", message); } }
export class GitOperationError extends GctgError { constructor(message: string, cause?: unknown) { super("GIT_OPERATION_FAILED", message, { cause }); } }
export class ParseError extends GctgError { constructor(message: string, cause?: unknown) { super("PARSE_FAILED", message, { cause }); } }
export class ResolutionError extends GctgError { constructor(message: string) { super("RESOLUTION_FAILED", message); } }
export class IndexCorruptError extends GctgError { constructor(message: string) { super("INDEX_CORRUPT", message); } }
export class TestExecutionError extends GctgError { constructor(message: string, cause?: unknown) { super("TEST_EXECUTION_FAILED", message, { cause }); } }

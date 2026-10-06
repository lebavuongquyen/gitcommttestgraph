import { isAbsolute, resolve, sep } from "node:path";

export const SECURITY_POLICY = Object.freeze({
  maxHttpBodyBytes: 256 * 1024,
  maxConfigurationDepth: 8,
  maxConfigurationKeys: 128,
  maxGitReferenceLength: 256,
  maxGitHubOwnerRepoLength: 200,
  allowSensitiveEnvironmentByDefault: false
} as const);

export const SENSITIVE_ENVIRONMENT_KEYS = Object.freeze([
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "GIT_ASKPASS",
  "GIT_SSH_COMMAND",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AZURE_DEVOPS_EXT_PAT",
  "NPM_TOKEN",
  "NODE_AUTH_TOKEN"
] as const);

export function validateGitReference(value: string, name = "Git reference"): string {
  if (typeof value !== "string" || !value || value.length > SECURITY_POLICY.maxGitReferenceLength) throw new Error(name + " is invalid.");
  if (/[\u0000-\u001f\u007f\s]/.test(value) || value.startsWith("-")) throw new Error(name + " is invalid.");
  return value;
}

export function validateGitPath(value: string, name = "Git path"): string {
  if (typeof value !== "string" || !value || value.length > SECURITY_POLICY.maxGitReferenceLength) throw new Error(name + " is invalid.");
  if (/^[\\/]|^[A-Za-z]:|[\u0000-\u001f\u007f]/.test(value)) throw new Error(name + " is invalid.");
  const normalized = value.replaceAll("\\", "/");
  if (normalized.split("/").some(part => part === ".." || part === ".")) throw new Error(name + " is invalid.");
  return value;
}

export function validateGitHubOwnerRepo(value: string): string {
  if (typeof value !== "string" || value.length < 3 || value.length > SECURITY_POLICY.maxGitHubOwnerRepoLength) throw new Error("Invalid GitHub repository identifier.");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})\/[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})$/.test(value)) throw new Error("Invalid GitHub repository identifier.");
  if (value.includes("..") || /[%?#\\\s\u0000-\u001f\u007f]/.test(value)) throw new Error("Invalid GitHub repository identifier.");
  return value;
}

export function validateGitHubApiBase(value: string | undefined): string {
  const candidate = value ?? "https://api.github.com";
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error("Invalid GitHub API endpoint."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || url.port || url.hostname !== "api.github.com") throw new Error("Invalid GitHub API endpoint.");
  return url.origin;
}

export function sanitizeErrorMessage(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/(Authorization:\s*(?:Bearer|Basic)\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|access_token|password|secret|apikey|api_key)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/(https?:\/\/)([^\s/@]+):([^\s/@]+)@/gi, "$1[REDACTED]:[REDACTED]@")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]");
}

export function createChildEnvironment(overrides?: Readonly<Record<string, string>>, allowSensitiveEnvironment = false): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, ...(overrides ?? {}) };
  if (!allowSensitiveEnvironment) for (const key of SENSITIVE_ENVIRONMENT_KEYS) delete environment[key];
  return environment;
}

export function assertSafeRepositoryPath(repositoryRoot: string, relativePath: string): string {
  const root = resolve(repositoryRoot);
  const candidate = resolve(root, relativePath);
  if (!isAbsolute(root) || !isAbsolute(candidate)) throw new Error("Repository path is invalid.");
  const prefix = root.endsWith(sep) ? root : root + sep;
  if (candidate !== root && !candidate.startsWith(prefix)) throw new Error("Path escapes repository root.");
  return candidate;
}

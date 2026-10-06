import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packageJsonPath = join(root, "package.json");
const packageLockPath = join(root, "package-lock.json");

function run(command, args, cwd = root) {
  console.log("\n$ " + command + " " + args.join(" "));
  execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

function runCapture(command, args, cwd = root) {
  return execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log("PASS " + message);
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersion(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function validateDependencyProvenance(lock) {
  assert(lock.lockfileVersion === 3, "lockfileVersion 3");
  const serialized = JSON.stringify(lock);
  assert(!serialized.includes("node_modules/.pnpm/"), "lockfile has no pnpm-store paths");
  assert(!serialized.includes("..\\node_modules\\.pnpm"), "lockfile has no Windows pnpm-store paths");

  const packages = Object.entries(lock.packages ?? {}).filter(([key]) => key.startsWith("node_modules/"));
  assert(packages.length > 0, "lockfile contains resolved dependencies");

  for (const [key, metadata] of packages) {
    if (metadata.link) continue;
    assert(typeof metadata.resolved === "string" && metadata.resolved.startsWith("https://registry.npmjs.org/"),
      "dependency provenance: " + key);
    assert(typeof metadata.integrity === "string" && metadata.integrity.length > 20,
      "dependency integrity: " + key);
  }
}

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const lock = JSON.parse(await readFile(packageLockPath, "utf8"));
const version = packageJson.version;
const sourceVersion = await readFile(join(root, "src/version.ts"), "utf8");
const changelog = await readFile(join(root, "CHANGELOG.md"), "utf8");
const release = await readFile(join(root, "docs/releases/" + version + ".md"), "utf8");
const readme = await readFile(join(root, "README.md"), "utf8");
const versioning = await readFile(join(root, "docs/VERSIONING.md"), "utf8");

console.log("GCTG Release Gate v2");
console.log("Version: " + version);

const parsedVersion = parseVersion(version);
assert(parsedVersion !== null, "valid semantic version");
assert(packageJson.version === version, "package version is self-consistent");
assert(sourceVersion.includes('GCTG_VERSION = "' + version + '"'), "source version is self-consistent");
assert(changelog.includes("## [" + version + "]"), "changelog entry exists");
assert(release.includes("# Release " + version), "release document exists");
assert(release.includes("## Release status"), "release status exists");
assert(release.includes("- [x] Feature is complete and accepted for release."), "release feature acceptance is complete");
assert(release.includes("- [x] This release represents a complete capability, not a partial implementation slice."), "release completeness is explicit");
assert(release.includes("## Acceptance"), "release acceptance section exists");
assert(release.includes("## Publish rule"), "release publish rule exists");
assert(readme.includes("## GUI"), "README GUI documentation exists");
assert(readme.includes("## Release discipline"), "README release discipline exists");
assert(versioning.includes("## Rules") && versioning.includes("## Release Gate"), "versioning policy exists");

let latestTag = "";
try {
  latestTag = runCapture("git", ["tag", "--sort=-version:refname"]);
} catch {
  latestTag = "";
}
const latestTagName = latestTag.split(/\r?\n/)[0] ?? "";
const latestVersion = parseVersion(latestTagName.replace(/^v/, ""));
assert(!latestVersion || compareVersion(parsedVersion, latestVersion) >= 0, "version is not lower than latest tag");

const status = runCapture("git", ["status", "--porcelain"]);
assert(status === "", "working tree is clean");
run("git", ["diff", "--check"]);
validateDependencyProvenance(lock);
console.log("PASS dependency provenance");

const temp = await mkdtemp(join(tmpdir(), "gctg-release-gate-"));
try {
  const cleanRepo = join(temp, "repo");
  run("git", ["clone", "--no-hardlinks", root, cleanRepo], root);
  const cleanStatus = runCapture("git", ["status", "--porcelain"], cleanRepo);
  assert(cleanStatus === "", "clean clone has no uncommitted files");

  run(npmCommand, ["ci", "--ignore-scripts"], cleanRepo);
  run(npmCommand, ["run", "typecheck"], cleanRepo);
  run(npmCommand, ["run", "build"], cleanRepo);
  run(npmCommand, ["test"], cleanRepo);

  const packOutput = runCapture(npmCommand, ["pack", "--dry-run", "--json"], cleanRepo);
  const pack = JSON.parse(packOutput)[0];
  assert(pack && Array.isArray(pack.files), "package dry-run produced file manifest");
  const names = pack.files.map(file => file.path);
  assert(names.some(name => name.startsWith("dist/")), "package contains dist output");
  assert(names.includes("bin/gctg.mjs"), "package contains gctg CLI");
  assert(names.includes("bin/gctg-mcp.mjs"), "package contains gctg MCP CLI");
  assert(!names.some(name => name.startsWith("tests/")), "package excludes tests");
  assert(!names.some(name => name.startsWith("docs/")), "package excludes docs");
  console.log("PASS package manifest verification");
} finally {
  await rm(temp, { recursive: true, force: true });
}

console.log("\nRelease Gate v2 passed for " + version);

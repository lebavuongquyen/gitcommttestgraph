import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = packageJson.version;
const sourceVersion = await readFile(new URL("../src/version.ts", import.meta.url), "utf8");
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const release = await readFile(new URL("../docs/releases/" + version + ".md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const versioning = await readFile(new URL("../docs/VERSIONING.md", import.meta.url), "utf8");

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return null;
  return match.slice(1).map(Number);
}

function compareVersion(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

const parsedVersion = parseVersion(version);
let latestTag = "";
try {
  latestTag = execFileSync("git", ["tag", "--sort=-version:refname"], { encoding: "utf8" }).trim().split(/\r?\n/)[0] ?? "";
} catch {
  latestTag = "";
}
const latestVersion = parseVersion(latestTag.replace(/^v/, ""));
const versionBumpValid = !latestVersion || !parsedVersion || compareVersion(parsedVersion, latestVersion) >= 0;
const releaseIsComplete = release.includes("## Release status") &&
  release.includes("- [x] Feature is complete and accepted for release.") &&
  release.includes("- [x] This release represents a complete capability, not a partial implementation slice.");

const checks = [
  ["valid semantic version", parsedVersion !== null],
  ["package version", packageJson.version === version],
  ["source version", sourceVersion.includes('GCTG_VERSION = "' + version + '"')],
  ["changelog entry", changelog.includes("## [" + version + "]")],
  ["release document", release.includes("# Release " + version)],
  ["release status complete", releaseIsComplete],
  ["release acceptance", release.includes("## Acceptance")],
  ["release publish rule", release.includes("## Publish rule")],
  ["README GUI documentation", readme.includes("## GUI")],
  ["README release discipline", readme.includes("## Release discipline")],
  ["versioning policy", versioning.includes("## Rules") && versioning.includes("## Release Gate")],
  ["version is not lower than latest tag", versionBumpValid]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + label);
if (failed.length) process.exit(1);
console.log("Release documentation gate passed for " + version);

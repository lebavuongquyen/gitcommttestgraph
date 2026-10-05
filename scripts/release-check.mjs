import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = packageJson.version;
const sourceVersion = await readFile(new URL("../src/version.ts", import.meta.url), "utf8");
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const release = await readFile(new URL("../docs/releases/" + version + ".md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

const checks = [
  ["package version", packageJson.version === version],
  ["source version", sourceVersion.includes('GCTG_VERSION = "' + version + '"')],
  ["changelog entry", changelog.includes("## [" + version + "]")],
  ["release document", release.includes("# Release " + version)],
  ["release acceptance", release.includes("## Acceptance")],
  ["release publish rule", release.includes("## Publish rule")],
  ["README GUI documentation", readme.includes("## GUI")],
  ["README release discipline", readme.includes("## Release discipline")]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + label);
if (failed.length) process.exit(1);
console.log("Release documentation gate passed for " + version);

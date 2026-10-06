import { execFileSync } from "node:child_process";
const npm = process.platform === "win32" ? process.env.ComSpec : "npm";
const args = command => process.platform === "win32" ? ["/d", "/s", "/c", command] : ["run", command];
function run(command) { execFileSync(npm, args(command), { stdio: "inherit", shell: false }); }
try {
  run("npm run build");
  execFileSync(process.execPath, ["--test", "tests/unit/configuration.test.mjs", "tests/contracts/cli.contract.test.mjs", "tests/contracts/http.contract.test.mjs", "tests/contracts/mcp.contract.test.mjs", "tests/contracts/gui-http.contract.test.mjs"], { stdio: "inherit" });
  console.log("Configuration gate passed.");
} catch (error) {
  console.error("Configuration gate failed.");
  process.exitCode = 1;
}

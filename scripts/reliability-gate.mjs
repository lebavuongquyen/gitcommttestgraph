import { execFileSync } from "node:child_process";

const tests = [
  "tests/unit/persistence-hardening.test.mjs",
  "tests/unit/git.test.mjs",
  "tests/unit/pull-request.test.mjs",
  "tests/unit/incremental.test.mjs",
  "tests/unit/result-store.test.mjs"
];

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  const cwd = new URL("..", import.meta.url);
  if (process.platform === "win32" && command === npm) {
    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], { cwd, stdio: "inherit" });
    return;
  }
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

console.log("Reliability gate");
run(npm, ["run", "build"]);
run(process.execPath, ["--test", ...tests]);
console.log("PASS reliability gate");

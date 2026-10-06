import { execFileSync } from "node:child_process";

const root = process.cwd();

function run(command, args) {
  if (process.platform === "win32" && command === "npm") {
    execFileSync(process.env.ComSpec, ["/d", "/s", "/c", [command, ...args].join(" ")], { cwd: root, stdio: "inherit" });
    return;
  }
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

run("npm", ["run", "typecheck"]);
run("npm", ["run", "build"]);
run("node", ["--test", "tests/contracts/m04-change-intelligence.contract.test.mjs"]);
run("node", ["--test", "tests/**/*.test.mjs"]);
console.log("M04 Quality Gate passed");

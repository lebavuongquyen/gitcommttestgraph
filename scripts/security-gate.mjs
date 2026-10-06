import { execFileSync } from "node:child_process";

function run(command, args) {
  console.log("\n$ " + command + " " + args.join(" "));
  execFileSync(command, args, { stdio: "inherit", cwd: process.cwd() });
}

try {
  console.log("GCTG 0.8.4 Security Gate");
  run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
  run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"]);
  run(process.execPath, ["--test", "tests/unit/security.test.mjs"]);
  run(process.execPath, ["--test", "tests/contracts/0.8.4-security.contract.test.mjs"]);
  console.log("Security gate passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

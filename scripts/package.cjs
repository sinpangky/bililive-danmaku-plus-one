const { execFileSync } = require("node:child_process");
const { resolve } = require("node:path");
const root = resolve(__dirname, "..");

function packageInvocation(platformName, outputDir = "") {
  if (platformName === "win32") {
    const args = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      resolve(root, "scripts", "package.ps1"),
    ];
    if (outputDir) args.push(outputDir);
    return { command: "powershell.exe", args };
  }

  const args = [resolve(root, "scripts", "package.sh")];
  if (outputDir) args.push(outputDir);
  return { command: "bash", args };
}

function run() {
  const outputDir = process.argv[2] || "";
  const invocation = packageInvocation(process.platform, outputDir);
  execFileSync(invocation.command, invocation.args, {
    stdio: "inherit",
    cwd: root,
  });
}

if (require.main === module) run();

module.exports = { packageInvocation };

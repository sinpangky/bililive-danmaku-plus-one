const { execSync } = require("child_process");
const { platform } = require("os");
const { resolve } = require("path");
const root = resolve(__dirname, "..");

const outputDir = process.argv[2] || "";

if (platform === "win32") {
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve(root, "scripts", "package.ps1")];
  if (outputDir) args.push(outputDir);
  execSync(`powershell ${args.join(" ")}`, { stdio: "inherit", cwd: root });
} else {
  const args = [resolve(root, "scripts", "package.sh")];
  if (outputDir) args.push(outputDir);
  execSync(`bash ${args.join(" ")}`, { stdio: "inherit", cwd: root });
}

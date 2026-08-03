const assert = require("node:assert/strict");
const test = require("node:test");
const { resolve } = require("node:path");

const { packageInvocation } = require("../scripts/package.cjs");

const root = resolve(__dirname, "..");

test("uses PowerShell with argument-safe paths on Windows", () => {
  const invocation = packageInvocation("win32", "release packages");

  assert.equal(invocation.command, "powershell.exe");
  assert.deepEqual(invocation.args, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    resolve(root, "scripts", "package.ps1"),
    "release packages",
  ]);
});

test("uses Bash with argument-safe paths on Fedora and other Unix systems", () => {
  const invocation = packageInvocation("linux", "release packages");

  assert.equal(invocation.command, "bash");
  assert.deepEqual(invocation.args, [
    resolve(root, "scripts", "package.sh"),
    "release packages",
  ]);
});

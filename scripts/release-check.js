import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const jsRoots = ["server.js", "public", "scripts", "calendar"];

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n[check] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function collectJsFiles(target) {
  const fullPath = path.join(root, target);
  const stats = statSync(fullPath);
  if (stats.isFile()) return target.endsWith(".js") ? [target] : [];
  const files = [];
  for (const entry of readdirSync(fullPath)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const relative = path.join(target, entry);
    const child = statSync(path.join(root, relative));
    if (child.isDirectory()) files.push(...collectJsFiles(relative));
    if (child.isFile() && relative.endsWith(".js")) files.push(relative);
  }
  return files;
}

const jsFiles = [...new Set(jsRoots.flatMap(collectJsFiles))].sort();
for (const file of jsFiles) {
  run(process.execPath, ["--check", file]);
}

run("npx", ["prisma", "validate"]);

if (process.env.RUN_INTEGRATION === "1" || process.env.RUN_BOOKING_TEST === "1") {
  run("npm", ["run", "test:booking"]);
}

if (process.env.RUN_TELNYX_TESTS === "1") {
  run("npm", ["run", "test:telnyx"]);
}

if (process.env.RUN_ONBOARDING_MEDIA_TEST === "1") {
  run("npm", ["run", "test:onboarding-media"]);
}

console.log("\n[check] release readiness checks passed");

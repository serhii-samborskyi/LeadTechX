import { spawn } from "node:child_process";

const port = "3102";

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(" ")} exited with ${code}`))));
  });
}

const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: port },
  stdio: ["ignore", "pipe", "inherit"],
});

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Test server did not start")), 10000);
    server.on("error", reject);
    server.on("exit", (code) => reject(new Error(`Test server exited with ${code}`)));
    server.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (chunk.toString().includes("AI receptionist demo running")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  await run(process.execPath, ["scripts/test-telnyx.js"]);
  await run(process.execPath, ["scripts/test-telnyx-media-bridge.js"], { PORT: port });
} finally {
  server.kill("SIGTERM");
}

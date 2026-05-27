import { access } from "node:fs/promises";
import { resolve } from "node:path";

const serverPath = resolve("dist", "server.js");

try {
  await access(serverPath);
  console.log("Build output verified: dist/server.js");
} catch {
  console.error("Build failed: dist/server.js not found. Did tsc emit output?");
  process.exit(1);
}

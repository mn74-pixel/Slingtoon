import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const files = ["sw.js", ...readdirSync("src").filter((file) => file.endsWith(".js")).map((file) => `src/${file}`)];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax: ${files.length} JavaScript modules OK.`);

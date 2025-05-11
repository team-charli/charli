// dev.ts
import { $ } from "bun";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const appsDir = path.resolve("apps");
const apps = fs.readdirSync(appsDir);

for (const app of apps) {
  const appPath = path.join(appsDir, app);
  const pkgPath = path.join(appPath, "package.json");
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const hasDev = pkg.scripts?.dev;
  if (!hasDev) continue;

  const envPath = path.join(appPath, ".env.dev");
  const envVars = fs.existsSync(envPath)
    ? dotenv.parse(fs.readFileSync(envPath))
    : {};

  console.log(`\n🔧 Starting dev server for ${app}...`);
  await $`bun run start:dev`.cwd(appPath).env({
    ...process.env,
    ...envVars
  } as Record<string, string>);
}

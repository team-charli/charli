#!/usr/bin/env bun
import { join } from "path";
import { readdirSync, existsSync, readFileSync } from "fs";
import dotenv from "dotenv";

/* ------------------------------------------------------------------ */
/*  Config / flags                                                    */
/* ------------------------------------------------------------------ */
const ROOT        = process.cwd();
const ENV_REQ     = ".env.requirements";
const IS_PROD     = Bun.argv.includes("--prod");
const DEFAULTS_FN = IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev";

/* ------------------------------------------------------------------ */
/*  Load chosen defaults                                              */
/* ------------------------------------------------------------------ */
let defaults: Record<string, string> = {};
if (existsSync(DEFAULTS_FN)) {
  defaults = dotenv.parse(readFileSync(DEFAULTS_FN, "utf8"));
}

/* ------------------------------------------------------------------ */
/*  Collect all *.env.requirements files                              */
/* ------------------------------------------------------------------ */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory())   walk(p, out);
    else if (entry.isFile() && entry.name === ENV_REQ) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const keyFrom      = (line: string) => line.split("=")[0].trim();
const isDynamic    = (line: string) => line.includes("__DYNAMIC__");

/* ------------------------------------------------------------------ */
/*  Report                                                            */
/* ------------------------------------------------------------------ */
console.log(`\n=== Env Requirements Summary (${IS_PROD ? "prod" : "dev"}) ===\n`);

for (const envFile of walk(join(ROOT, "apps"))) {
  const appDir = envFile.replace(`/${ENV_REQ}`, "");
  console.log(`${appDir}/`);

  const lines = readFileSync(envFile, "utf8").split(/\r?\n/).filter(Boolean);
  for (const raw of lines) {
    if (isDynamic(raw)) continue;          // skip __DYNAMIC__ placeholders
    const key    = keyFrom(raw);
    const val    = process.env[key] ?? defaults[key];
    const origin = process.env[key] ? "env"
                : defaults[key]      ? "defaults"
                : "-";
    console.log(`  ${val ? "✅" : "❌"}  ${key}  (${origin})`);
  }
  console.log();
}

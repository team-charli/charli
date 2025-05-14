// scripts/lib/logger.ts  (Bun runtime)
import { join } from "path";
import { mkdirSync } from "fs";

export function createLogger(opts: {
  mode: "dev" | "prod";
  dryRun?: boolean;
  rootDir?: string;      // default "scripts/logs"
}) {
  const { mode, dryRun = false, rootDir = "scripts/logs" } = opts;

  /* ── make folder --------------------------------------------------- */
  const dir = join(rootDir, `${mode}-deploys`);
  mkdirSync(dir, { recursive: true });

  /* ── open file & sink --------------------------------------------- */
  const stamp   = new Date().toISOString().replace(/[:.]/g, "_");
  const logfile = join(dir, `${mode}-${stamp}.log`);
  const sink    = Bun.file(logfile).writer();   // FileSink (append-friendly)

  /* header */
  sink.write(
    `──── ${mode.toUpperCase()} DEPLOY @ ${new Date().toISOString()} ────\n`,
  );

  /* real log function */
  function log(msg: string) {
    const line = (dryRun ? `(dry) ${msg}` : msg) + "\n";
    console.log(line.trimEnd());
    sink.write(line);                 // fast, append-only
  }

  /* always flush on exit */
  const done = async () => {
    await sink.flush();
    sink.end();
  };
  process.on("exit", done);
  process.on("SIGINT", () => { done().then(() => process.exit(130)); });

  // bonus: capture crashes
  process.on("unhandledRejection", (r) => log(`✖ unhandledRejection: ${r}`));
  process.on("uncaughtException",  (e) => log(`✖ uncaughtException: ${e}`));

  return log;
}

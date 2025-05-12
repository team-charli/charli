#!/usr/bin/env bun
/** Orchestrate deploys.
 *  Flags:
 *    --dry-run        print plan, exit
 *    --only <regex>   deploy subset
 *    --prod           use .env.defaults.prod (default: .env.defaults.dev)
 */
import { $, file } from "bun";
import { join, basename } from "path";
import {PinataSDK} from "pinata";

const DRY      = Bun.argv.includes("--dry-run");
const ONLY_RE  = (() => { const i = Bun.argv.indexOf("--only"); return i > -1 ? new RegExp(Bun.argv[i+1]) : null;})();
const IS_PROD  = Bun.argv.includes("--prod");
type EnvMap    = Record<string,string>;

function log(m:string){ console.log(DRY?`(dry) ${m}`:m); }


/*
-- Deploy outline

- Lit Actions




*/

(async function main(){
  const dynamic  = await pinLitActions("apps/LitActions");
  const targets  = collectTargets().filter(t => !ONLY_RE || ONLY_RE.test(t.path));

  log("\n=== Deploy targets ===");
  targets.forEach((t,i)=>log(`${i+1}. ${t.type.padEnd(11)} — ${t.path}`));
  log("==============\n");
  if (DRY) return;


// await $`bun run scripts/setup-pkp-permissions.ts \
//   --token ${process.env.RELAYER_PKP_TOKEN_ID} \
//   --permit ${cids.VITE_PERMIT_ACTION_IPFSID} \
//   --transferFrom ${cids.VITE_TRANSFER_FROM_ACTION_IPFSID} \
//   --relayer ${cids.VITE_RELAYER_ACTION_IPFSID} \
//   --resetNonce ${cids.VITE_RESET_PKP_NONCE_IPFSID} \
//   --transferController ${cids.VITE_LIT_ACTION_CID_TRANSFER_CONTROLLER_TO_TEACHER}`;

  const defaults = await loadDefaults(IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev");

  for (const t of targets){
    const env     = {...defaults,...dynamic};

    await injectSecrets(t,env);
    await runDeploy(t);
  }
})();










/*──────────────────────── HELPERS ─────────────────────────*/

/** Pin every `.ts` file in apps/LitActions with Pinata and
 *  return an env-map like { LIT_ACTION_CID_TRANSFERFROM: "bafy…" } */

async function pinLitActions(dir: string): Promise<EnvMap> {
  log("› Pinning Lit Actions via Pinata");

  const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT!,
  });

  const out: EnvMap = {};

  /* grab every *.ts file in apps/LitActions */
  const files = Bun.spawnSync(["bash", "-c", `ls ${dir}/*.ts`])
  .stdout.toString()
  .trim()
  .split("\n")
  .filter(Boolean);

  for (const filePath of files) {
    const name = basename(filePath).replace(/\.ts$/, ""); // transferFromAction

    try {
      /* Bun has a built-in File implementation (like browser) */
      const buf   = await file(filePath).arrayBuffer();
      const f     = new File([buf], `${name}.ts`, { type: "text/typescript" });

      const { cid } = await pinata.upload.public
        .file(f)       // returns UploadBuilder<UploadResponse>
        .name(name);   // set Pinata display name

      out[`LIT_ACTION_CID_${name.toUpperCase()}`] = cid;
      log(`  • ${name} → ${cid}`);
    } catch (err) {
      log(`  ✖ failed to pin ${name}: ${(err as Error).message}`);
      throw err; // stop deploy so the failure is noticed
    }
  }

  return out;
}

function collectTargets(){
  const supa = findDirs("apps/supabase/functions");
  const wkrs = findDirs("apps/Cloudflare-Workers");
  return [
    ...supa.map(p=>({type:"supabase",path:p})),
    ...wkrs.map(p=>({type:"cf-worker",path:p})),
    {type:"frontend",path:"apps/vite-frontend"},
  ];
}

async function loadDefaults(file:string){ return readEnv(file); }

async function readEnv(p:string):Promise<EnvMap>{
  if(!(await file(p).exists())) return {};
  const txt=await file(p).text();
  return Object.fromEntries(
    txt.split(/\r?\n/).filter(Boolean).map(l=>{
      const [k,...v]=l.split("="); return [k.trim(),v.join("=").trim()];
    }),
  );
}

async function injectSecrets(t:{type:string,path:string},env:EnvMap){
  if(t.type==="cf-worker"){
    // bulk—create JSON object and pipe to wrangler
    const json = JSON.stringify(env);
    await $`echo ${json} | wrangler secret bulk --name ${basename(t.path)}${DRY?" --dry-run":""}`;
  }else if(t.type==="supabase"){
    const pairs=Object.entries(env).map(([k,v])=>`${k}=${v}`);
    await $`supabase secrets set ${pairs.join(" ")} --project-ref onhlhmondvxwwiwnruvo${DRY?" --dry-run":""}`;
  }
}

async function runDeploy(t:{type:string,path:string}){
  // if package.json with deploy script exists, use it
  const pkg = join(t.path, "package.json");
  if (await file(pkg).exists() &&
    JSON.parse(await file(pkg).text()).scripts?.deploy) {
    await $`bun run deploy --cwd ${t.path}`;
  }else if(t.type==="supabase"){
    await $`supabase functions deploy --project-ref onhlhmondvxwwiwnruvo --cfw --import-map=false --no-verify-jwt --fail-on-warnings ${t.path}`;
  }else{
    log(`⚠️  no deploy script for ${t.path} (skipped)`);
  }
}

function findDirs(root:string){
  const {stdout}=Bun.spawnSync(["bash","-c",`find ${root} -type d -maxdepth 1`]);
  return stdout.toString().trim().split("\n").filter(Boolean).slice(1); // drop root itself
}

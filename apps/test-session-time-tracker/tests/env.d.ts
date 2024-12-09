// tests/env.d.ts
import { DOEnv } from "../src/env";

declare module "cloudflare:test" {
	// Controls the type of `import("cloudflare:test").env`
	interface ProvidedEnv extends DOEnv {}
}


// tests/env.d.ts
// declare module "cloudflare:test" {
//   interface ProvidedEnv extends Env {}

//   export function runDurableObjectAlarm(stub: DurableObjectStub): Promise<boolean>;
//   export function runInDurableObject<O extends DurableObject, R>(
//     stub: DurableObjectStub<O>,
//     callback: (instance: O, state: DurableObjectState) => R | Promise<R>
//   ): Promise<R>;
// }
declare module "cloudflare:test" {
	// Controls the type of `import("cloudflare:test").env`
	interface ProvidedEnv extends Env {}
}


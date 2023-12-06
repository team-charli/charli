declare module 'npm:ethers' {
  export * from 'ethers';
}
declare module 'npm:jsonwebtoken' {
  export * from 'jsonwebtoken';
  export { sign } from 'jsonwebtoken';
}
declare const SUPABASE_JWT_SECRET: string;


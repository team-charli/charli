import ky from 'ky'
export const useGenerateControllerPKP = () => {
  asyncGenControllerPKP();
//TODO: call hook

  async function asyncGenControllerPKP() {
    const pkpCreateResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/identifier', {
  }



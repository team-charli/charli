import ky from 'ky'
export const useGenerateControllerPKP = () => {
  asyncGenControllerPKP();


  async function asyncGenControllerPKP() {
    const pkpCreateResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/identifier', {
  }



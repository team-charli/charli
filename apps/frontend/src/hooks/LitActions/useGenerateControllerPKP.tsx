import ky from 'ky'
export const useGenerateControllerPKP = () => {
  return asyncGenControllerPKP();

  async function asyncGenControllerPKP() {
    const controllerPKPInfo = await ky.post('https://supabase-auth.zach-greco.workers.dev/identifier', {
  }



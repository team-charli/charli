import { pkpWalletAtom } from "@/atoms/atoms";
import { currentAccountAtom } from "@/atoms/litAccountAtoms";
import { NonceData } from "@/types/types";
import ky from "ky";
import { selector } from "recoil";

export const supabaseJWTSelector = selector<string | null>({
  key: 'supabaseJWTSelector',
  get: async ({get}) => {

    const pkpWallet = get(pkpWalletAtom);
    const currentAccount = get(currentAccountAtom);
    try {
      if (!pkpWallet || !currentAccount) {
        return null;  // Return null if conditions are not met
      }
      const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
      const nonce = nonceResponse.nonce;
      const signature = await pkpWallet.signMessage(nonce);
      const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
        json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
      }).json<{ token: string }>();
      console.log("JWT Response:", jwtResponse);
      if (jwtResponse.token) {
        console.log("JWT set successfully:", jwtResponse.token);
        return jwtResponse.token;
      } else {
        console.error("Failed to set JWT");
        return null;  // Return null if token is not present
      }
    } catch (e) {
      console.error("Error fetching JWT", e);
      return null;
    }

  }
})

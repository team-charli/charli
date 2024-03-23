import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { ethers } from "ethers";

export default async function signApproveFundController(
  sessionSigs: SessionSigs | null,
  currentAccount: IRelayPKP | null,
  contractAddress: string,
  spenderAddress: string,
  amount: ethers.BigNumberish
) {
  if (sessionSigs && currentAccount) {
    let pkpWallet;
    try {
      pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
        // debug: true,
      });
    } catch (e) {
      console.error("new PKPEthersWallet", e);
      throw new Error(`Wallet Constructor: ${e}`);
    }

    try {
      await pkpWallet.init();
    } catch (e) {
      console.error("pkpWallet.init", e);
      throw new Error(`error initializing pkpWallet: ${e}`);
    }

    const erc20AbiFragment = [
      "function approve(address spender, uint256 amount) returns (bool)",
    ];
    const iface = new ethers.Interface(erc20AbiFragment);
    const data = iface.encodeFunctionData("approve", [spenderAddress, amount]);

    const tx = {
      to: contractAddress,
      data: data,
      // other necessary transaction fields such as gasLimit, gasPrice, etc., if needed
    };

    let signedTx;
    try {
      signedTx = await pkpWallet.signTransaction(tx);
      console.log("Signed Approve transaction:", signedTx);
    } catch (e) {
      console.error("problem signing transaction", e);
      throw new Error(`problem signing transaction: ${e}`);
    }
    return signedTx
  }
}

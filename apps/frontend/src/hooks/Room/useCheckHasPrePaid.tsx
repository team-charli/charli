import ethers from 'ethers';
import { useEffect, useState } from 'react';
import { calculateSessionCost } from '../../utils/app';
export const useCheckHasPrePaid = (controller_address: string, requested_session_duration: number | undefined) => {
  const [hasPrePaid, setHasPrePaid] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
    const hasPrepaidRes =  await checkHasPrepaid(controller_address, requested_session_duration)
    setHasPrePaid(hasPrepaidRes);
    })();
  }, [])

async function checkHasPrepaid(controllerPKPAddress: string, duration: number | undefined): Promise<boolean> {
  if (!duration) {
    throw new Error(`no duration set`)
  }
  const abi = ["function balanceOf(address owner) view returns (uint256)"];
  const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
  const usdcContractInstance = new ethers.Contract(import.meta.env.VITE_USDC_CONTRACT_ADDRESS, abi, provider )
  const balance = await usdcContractInstance.balanceOf(controllerPKPAddress);
  const expectedBalance = ethers.parseUnits(String(calculateSessionCost(duration)), 16);
  if (balance >= expectedBalance){
    return true;
  } else {
    console.log("ControllerPKP balance (simple units)", ethers.formatEther(balance))
    return false;
  }
}
  return hasPrePaid;
}

import {useEffect} from 'react'
import { Web3Auth } from "@web3auth/modal";

export const useConnectWeb3Auth= () => {
  useEffect(() => {
    (async () => {
      const web3auth = new Web3Auth({
        clientId: "BDtDy2Qb5RYIm02djM8ZmUrbFtjRGtjUhMzp8SZaBWotjPU05UzpNjkapRSCVqCdbVS1K3nhcv86qJN0kWg4jM4", // Get your Client ID from the Web3Auth Dashboard
        web3AuthNetwork: "sapphire_mainnet", // Web3Auth Network
        chainConfig: {
          chainNamespace: "eip155", //TODO: read https://eips.ethereum.org/EIPS/eip-1193#rationale, https://eips.ethereum.org/EIPS/eip-155
          chainId: "0x5",
          rpcTarget: "https://rpc.ankr.com/eth_goerli",
          displayName: "Ethereum Goerli",
          blockExplorer: "https://goerli.etherscan.io",
          ticker: "ETH",
          tickerName: "Ethereum",
        },
      });
      await web3auth.initModal();
    })();
  })
  // Initialize within useEffect()
}

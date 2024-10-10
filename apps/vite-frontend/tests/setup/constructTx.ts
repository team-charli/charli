import {ethers} from 'ethers';

async function getPendingTransactions(address) {
  const apiKey = 'CD7WKK5TS3RZRM7A6HQER9GJQZQM5SG8HN';
  const url = `https://api-sepolia.etherscan.io/api?module=account&action=txlistpending&address=${address}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1') {
      return data.result; // Array of pending transactions
    } else {
      return []; // No pending transactions or an error occurred
    }
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    return [];
  }
}

function getHighestPendingNonce(pendingTxs) {
  if (pendingTxs.length === 0) {
    return null;
  }
  const nonces = pendingTxs.map((tx) => Number(tx.nonce));
  return Math.max(...nonces);
}

export async function createSignedTransaction(learnerWallet: ethers.Wallet) {
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID');
  const learnerAddress = learnerWallet.address;

  // Fetch the highest pending nonce
  const pendingTxs = await getPendingTransactions(learnerAddress);
  const highestPendingNonce = getHighestPendingNonce(pendingTxs);

  // Determine the nonce to use
  let nonce;
  if (highestPendingNonce !== null) {
    nonce = highestPendingNonce + 1;
  } else {
    nonce = await provider.getTransactionCount(learnerAddress, 'latest');
  }

  // Fetch current gas fee data
  const feeData = await provider.getFeeData();

  // Construct the transaction
  const usdcContractAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  const controllerAddress = 'CONTROLLER_ADDRESS';
  const amountScaled = ethers.parseUnits('0.10', 6); // Assuming 6 decimals for USDC

  const approveTx = {
    to: usdcContractAddress,
    gasLimit: 100000,
    chainId: 11155111, // Sepolia chain ID
    nonce,
    data: new ethers.Interface([
      'function approve(address spender, uint256 amount)',
    ]).encodeFunctionData('approve', [controllerAddress, amountScaled]),
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  };

  // Sign the transaction
  const signedApproveTx = await learnerWallet.signTransaction(approveTx);

  return signedApproveTx;
}

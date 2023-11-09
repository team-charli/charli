import { useConnect } from 'wagmi';
import { useIsMounted } from '../../hooks/utils/useIsMounted';

interface WalletMethodsProps {
  authWithEthWallet: (connector: any) => Promise<void>;
  setView: React.Dispatch<React.SetStateAction<string>>;
}

const WalletMethods = ({ authWithEthWallet, setView }: WalletMethodsProps) => {
  const isMounted = useIsMounted();
  const { connectors } = useConnect();

  if (!isMounted) return null;

  return (
    <>
      <h1>Connect your web3 wallet</h1>
      <p>
        Connect your wallet then sign a message to verify you're the owner of
        the address.
      </p>
      <div className="buttons-container">
        {connectors.map(connector => (
          <button
            type="button"
            className="btn btn--outline"
            disabled={!connector.ready}
            key={connector.id}
            onClick={() => authWithEthWallet({ connector })}
          >
            {connector.name.toLowerCase() === 'metamask' && (
              <div className="btn__icon">
                <img
                  src="/metamask.png"
                  alt="MetaMask logo"
                ></img>
              </div>
            )}
            {connector.name.toLowerCase() === 'coinbase wallet' && (
              <div className="btn__icon">
                <img
                  src="/coinbase.png"
                  alt="Coinbase logo"
                ></img>
              </div>
            )}
            <span className="btn__label">Continue with {connector.name}</span>
          </button>
        ))}
        <button onClick={() => setView('default')} className="btn btn--link">
          Back
        </button>
      </div>
    </>
  );
};

export default WalletMethods;


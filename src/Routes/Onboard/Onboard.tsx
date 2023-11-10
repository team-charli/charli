import { IRelayPKP } from '@lit-protocol/types';
interface OnboardPropTypes { currentAccount: IRelayPKP; }

export const Onboard = ({currentAccount}: OnboardPropTypes) => {
  return (
    <>
      <div>
        <h1>Charli</h1>
      </div>
      <div>
        <button type="button">Learn 🎓</button> //TODO: do routes
        <button type="button">Teach 🤑 </button>
      </div>
    </>
  )
}

export default Onboard;

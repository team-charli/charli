import {useState, useEffect} from 'react'

export function useHasBalance() {
  // checks if user has balance > 1 hour talk time @ $0.20 /min

  const [hasBalance, setHasBalance] = useState(false)

  useEffect(() => {
    //TODO: check balance call for submitAPI

    let balance // = contract call (userid => contract(contractAddr)) // need user id system that maps to wallet <address>

    balance = 11;  // placeholder
    if (balance > 12) {
      setHasBalance(true)
    } else {
      setHasBalance(false)
    }
  })

  return hasBalance
}

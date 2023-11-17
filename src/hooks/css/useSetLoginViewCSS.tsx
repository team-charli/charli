import { useEffect, useState } from 'react'

export const useSetLoginViewCSS = (parentIsRoute: boolean) => {
  const [marginTop, setMarginTop] = useState("");
  const [flex, setFlex] = useState("");
  useEffect(() => {
    if (parentIsRoute) {
      setMarginTop("mt-64")
      setFlex("flex")
    } else {
      setMarginTop("mt-32")
      setFlex("flex")
    }
  }, [parentIsRoute])
  return {marginTop, flex}
}



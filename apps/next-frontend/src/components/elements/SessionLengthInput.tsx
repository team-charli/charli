import { Dispatch, SetStateAction } from "react";

type Props = {setSessionLength: Dispatch<SetStateAction<string>>; sessionLength: string | undefined}

const SessionLengthInput = ({setSessionLength, sessionLength}: Props) => {
  const handleSessionLengthChange = (event:React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setSessionLength(event.target.value)
  }
  return (
    <>
      <label htmlFor="session-length">Charli duration</label>
      <input type="range" id="points" step="15" name="session-length" min="20" max="90" value={sessionLength} onChange={handleSessionLengthChange} />
    </>
  )
}

export default SessionLengthInput

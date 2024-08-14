import { Dispatch, SetStateAction } from "react";

type Props = {setSessionLength: Dispatch<SetStateAction<string>>; sessionLength: string | undefined}

const SessionLengthInput = ({setSessionLength, sessionLength}: Props) => {
  const handleSessionLengthChange = (event:React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setSessionLength(event.target.value)
  }
  const label = `call length: ${sessionLength} mins `
  return (
    <>
      <label htmlFor="session-length">{label}</label>
      <input type="range" id="points" step="10" name="session-length" min="20" max="90" value={sessionLength} onChange={handleSessionLengthChange} />
    </>
  )
}

export default SessionLengthInput

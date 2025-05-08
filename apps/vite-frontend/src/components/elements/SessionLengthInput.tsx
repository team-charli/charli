import { Dispatch, SetStateAction } from "react";

type Props = {setSessionLength: Dispatch<SetStateAction<string>>; sessionLength: string | undefined}

const SessionLengthInput = ({setSessionLength, sessionLength}: Props) => {
  const handleSessionLengthChange = (event:React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setSessionLength(event.target.value)
  }
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
        <label 
          htmlFor="session-length" 
          className="block text-sm sm:text-base md:text-lg font-medium text-gray-700 mb-1 sm:mb-0"
        >
          Call Length
        </label>
        <div className="text-sm sm:text-base md:text-lg font-semibold text-blue-600 bg-blue-50 py-1 px-2 sm:px-3 rounded-full">
          {sessionLength} mins
        </div>
      </div>
      
      <div className="mt-1 sm:mt-2 md:mt-3">
        <input 
          type="range" 
          id="session-length" 
          step="10" 
          name="session-length" 
          min="20" 
          max="90" 
          value={sessionLength} 
          onChange={handleSessionLengthChange}
          className="w-full h-2 sm:h-2.5 md:h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        
        <div className="flex justify-between text-xs sm:text-sm text-gray-500 mt-1 px-1">
          <span>20 min</span>
          <span>50 min</span>
          <span>90 min</span>
        </div>
      </div>
    </div>
  )
}

export default SessionLengthInput

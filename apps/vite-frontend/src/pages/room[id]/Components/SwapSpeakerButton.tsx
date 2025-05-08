export const SwapSpeakerButton = () => {
  const switchLearnerTeacher = () => {
    //TODO: implement
  }
  
  return (
    <button 
      onClick={switchLearnerTeacher}
      className="bg-white hover:bg-gray-50 active:bg-gray-100
               rounded-lg shadow-sm border border-gray-200
               px-3 sm:px-4 md:px-5 py-2 sm:py-2.5
               flex items-center gap-2
               transition-colors duration-200
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <div className="relative">
        <span className="text-lg sm:text-xl md:text-2xl">👄</span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      </div>
      
      <span className="text-sm sm:text-base font-medium text-gray-700">Swap Speaker</span>
      
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </button>
  )
}

export default SwapSpeakerButton;

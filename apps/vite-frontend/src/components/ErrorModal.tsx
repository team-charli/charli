interface ErrorModalPropTypes {
  errorText: string,
}

export const ErrorModal = ({errorText}: ErrorModalPropTypes) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg w-11/12 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg shadow-lg border border-gray-200">
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
          <h3 className="text-center font-semibold text-lg sm:text-xl md:text-2xl text-gray-800">Error</h3>
          <p className="text-center text-sm sm:text-base md:text-lg text-red-600 mt-1 sm:mt-2">
            {errorText}
          </p>
          <div className="mt-2 sm:mt-4 md:mt-6 flex justify-center">
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-md text-sm sm:text-base transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

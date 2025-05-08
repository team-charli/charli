//Lounge.tsx
import IconHeader from "@/components/IconHeader";
import { useLangNavDataQuery } from "@/hooks/Lounge/QueriesMutations/useLangNavDataQuery";
import { useState } from "react";
import LangNav from "./Interactions/LangNav";
import DropDownButton from "./Interactions/DropDownButton";
import { UserView } from "./UserView";

export const Lounge = () => {
  const [modeView, setModeView] = useState<"Learn" | "Teach">("Learn");
  const [selectedLang, setSelectedLang] = useState<string>("");
  const { languagesToShow, isLoading, error } = useLangNavDataQuery(modeView, setSelectedLang, selectedLang);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 md:px-8">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full bg-blue-200 mb-4"></div>
        <p className="text-base sm:text-lg md:text-xl text-gray-600">Loading language partners...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 md:px-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 md:p-8 max-w-md w-full">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-red-700 mb-2 sm:mb-3">Error Loading Data</h2>
        <p className="text-sm sm:text-base text-red-600">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 sm:mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm sm:text-base"
        >
          Reload Page
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="w-full bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <IconHeader />
        </div>
      </div>
      
      <div className="w-full bg-white shadow-sm border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <LangNav
            setSelectedLang={setSelectedLang}
            selectedLang={selectedLang}
            languagesToShow={languagesToShow}
          />
        </div>
      </div>
      
      <div className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 md:gap-8 mt-2 sm:mt-4 md:mt-6">
          <div className="md:col-span-3 lg:col-span-2">
            <div className="sticky top-[60px] sm:top-[72px]">
              <DropDownButton modeView={modeView} setModeView={setModeView} />
            </div>
          </div>
          
          <div className="md:col-span-9 lg:col-span-10">
            <UserView modeView={modeView} selectedLang={selectedLang} />
          </div>
        </div>
      </div>
    </div>
  );
};


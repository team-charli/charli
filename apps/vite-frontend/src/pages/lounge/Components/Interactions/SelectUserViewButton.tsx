//SelectUserViewButton.tsx
import React, { useState } from 'react';

export type SelectionType = "Learn" | "Teach" | "All" | "";

interface ToggleButtonProps {
  label: SelectionType;
  onClick: (selection: SelectionType) => void;
}

const Button = ({ label, onClick }: ToggleButtonProps) => {
  const buttonColors = {
    Learn: "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300",
    Teach: "bg-green-100 hover:bg-green-200 text-green-800 border-green-300",
    All: "bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300",
    "": "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
  };

  return (
    <button 
      type="button" 
      onClick={() => onClick(label)}
      className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5
        text-xs sm:text-sm md:text-base font-medium
        rounded-md sm:rounded-lg
        border
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        ${buttonColors[label]}`}
    >
      <span className="flex items-center">
        {label === "Learn" && <span className="mr-1.5">🎓</span>}
        {label === "Teach" && <span className="mr-1.5">🤑</span>}
        {label === "All" && <span className="mr-1.5">👥</span>}
        {label}
      </span>
    </button>
  );
};

const DropDownButton = () => {
  const [selectedOption, setSelectedOption] = useState<SelectionType>("");

  const handleButtonClick = (selection: SelectionType) => {
    setSelectedOption(selection);
  };

  return (
    <div className="my-4 sm:my-6 md:my-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
        <p className="text-sm sm:text-base text-gray-700 mb-3">View users by:</p>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button label="Learn" onClick={handleButtonClick} />
          <Button label="Teach" onClick={handleButtonClick} />
          <Button label="All" onClick={handleButtonClick} />
        </div>
      </div>
      
      {selectedOption && (
        <div className="mt-3 text-sm sm:text-base text-gray-600">
          Currently viewing: <span className="font-medium">{selectedOption}</span>
        </div>
      )}
      {/*<UserList selection={selectedOption} />*/}
    </div>
  );
};

export default DropDownButton;

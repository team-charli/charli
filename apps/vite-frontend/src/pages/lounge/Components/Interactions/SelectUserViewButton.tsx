//SelectUserViewButton.tsx
import React, { useState } from 'react';

export type SelectionType = "Learn" | "Teach" | "All" | "";

interface ToggleButtonProps {
  label: SelectionType;
  onClick: (selection: SelectionType) => void;
}

const Button = ({ label, onClick }: ToggleButtonProps) => {
  return (
    <button type="button" onClick={() => onClick(label)}>
      {label}
    </button>
  );
};

const DropDownButton = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedOption, setSelectedOption] = useState<SelectionType>("");

  const handleButtonClick = (selection: SelectionType) => {
    setSelectedOption(selection);
  };

  return (
    <>
      <div>
        <Button label="Learn" onClick={handleButtonClick} />
        <Button label="Teach" onClick={handleButtonClick} />
        <Button label="All" onClick={handleButtonClick} />
      </div>
      {/*<UserList selection={selectedOption} />*/}
    </>
  );
};

export default DropDownButton;

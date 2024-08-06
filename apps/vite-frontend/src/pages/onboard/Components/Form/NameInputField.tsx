import { NameInputFieldProps } from '@/types/types';
import React from 'react';

const NameInputField = ({ name, onNameChange }: NameInputFieldProps ) => {
  return (
    <div className="__name-input-container__ flex justify-center mt-10 mr-10">
      <label htmlFor="name" className="mr-2">Name:</label>
      <input
        type="text"
        id="name"
        value={name}
        onChange={onNameChange}
        className="border-2 border-black rounded-lg"
      />
    </div>
  );
};

export default NameInputField;

import { NameInputFieldProps } from '@/types/types';
import React from 'react';

const NameInputField = ({ name, onNameChange }: NameInputFieldProps ) => {
  return (
    <div>
      <label htmlFor="name">Name:</label>
      <input
        type="text"
        id="name"
        value={name}
        onChange={onNameChange}
      />
    </div>
  );
};

export default NameInputField;

import { NameInputFieldProps } from '@/types/types';
import React from 'react';

const NameInputField = ({ name, onNameChange }: NameInputFieldProps ) => {
  return (
    <div className="w-full max-w-md mx-auto mt-6 sm:mt-8 md:mt-10 px-4 sm:px-0">
      <div className="flex flex-col">
        <label 
          htmlFor="name" 
          className="block text-sm sm:text-base md:text-lg font-medium text-gray-700 mb-1 sm:mb-2"
        >
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={onNameChange}
          placeholder="Enter your name"
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 
                   border border-gray-300 
                   rounded-md 
                   text-sm sm:text-base 
                   shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          This is how teachers and students will identify you.
        </p>
      </div>
    </div>
  );
};

export default NameInputField;

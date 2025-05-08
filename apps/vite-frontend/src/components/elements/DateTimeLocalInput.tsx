import { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { formatDateTimeLocal } from '../../utils/app';

interface DateTimeLocalInputProps {
  setDateTime: Dispatch<SetStateAction<string>>;
  dateTime: string;
}

const DateTimeLocalInput = ({ setDateTime, dateTime }: DateTimeLocalInputProps) => {

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newDate = new Date(e.target.value);
    setDateTime(formatDateTimeLocal(newDate));
  };

  return (
    <div className="w-full">
      <label htmlFor="datetime-input" className="block text-sm sm:text-base md:text-lg text-gray-700 mb-1 sm:mb-2 font-medium">
        Select Date & Time
      </label>
      <input
        id="datetime-input"
        type="datetime-local"
        name="datetime-local"
        value={dateTime}
        onChange={handleChange}
        className="w-full sm:w-[85%] md:w-[75%] lg:w-[65%] 
                 py-1.5 sm:py-2 md:py-2.5 lg:py-3 
                 px-2 sm:px-3 md:px-4 lg:px-5 
                 border border-gray-300 
                 rounded-md 
                 text-sm sm:text-base md:text-lg 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 bg-white shadow-sm"
      />
      <p className="text-xs sm:text-sm md:text-base text-gray-500 mt-1.5 sm:mt-2">
        Please select a date and time in your local timezone
      </p>
    </div>
  );
};

export default DateTimeLocalInput;

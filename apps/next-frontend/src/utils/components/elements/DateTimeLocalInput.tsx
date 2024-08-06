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
    <input
      type="datetime-local"
      name="datetime-local"
      value={dateTime}
      onChange={handleChange}
    />
  );
};

export default DateTimeLocalInput;

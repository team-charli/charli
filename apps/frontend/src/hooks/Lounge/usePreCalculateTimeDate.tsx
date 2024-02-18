import { useState } from 'react';
import { formatDateTimeLocal } from '../../utils/app';

export const usePreCalculateTimeDate = () => {
  const initialDateTime = formatDateTimeLocal(new Date());

  const [dateTime, setDateTime] = useState(initialDateTime);

  return (
    {dateTime, setDateTime}
  );
};


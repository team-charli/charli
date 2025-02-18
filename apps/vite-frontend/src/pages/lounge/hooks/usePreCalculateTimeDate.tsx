//usePreCalculateTimeDate.tsx
import { formatDateTimeLocal } from '@/utils/app';
import { useState } from 'react';

export const usePreCalculateTimeDate = () => {
  const initialDateTime = formatDateTimeLocal(new Date());
  const [dateTime, setDateTime] = useState(initialDateTime);
  return ( {dateTime, setDateTime});
};


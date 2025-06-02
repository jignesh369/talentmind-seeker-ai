
import { useState } from 'react';

export const useUIState = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return {
    isFilterOpen,
    setIsFilterOpen
  };
};

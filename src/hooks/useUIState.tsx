
import { useState } from 'react';

export const useUIState = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDataCollectionOpen, setIsDataCollectionOpen] = useState(false);

  return {
    isFilterOpen,
    setIsFilterOpen,
    isDataCollectionOpen,
    setIsDataCollectionOpen
  };
};

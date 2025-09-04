'use client';

import React from 'react';
import LocationPromptPopup from '@/components/LocationPromptPopup';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
};

export default function EateryLocationPrompt({ isOpen, onClose, onSkip }: Props) {
  return (
    <LocationPromptPopup
      isOpen={isOpen}
      onClose={onClose}
      onSkip={onSkip}
    />
  );
}


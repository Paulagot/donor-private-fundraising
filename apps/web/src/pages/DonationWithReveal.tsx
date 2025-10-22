import React, { useState } from 'react';
import RevealTransition from './RevealTransition';
import DonateSol from './DonateSol';

const DonationWithReveal: React.FC = () => {
  const [showReveal, setShowReveal] = useState(true);

  return (
    <>
      {showReveal && (
        <RevealTransition onComplete={() => setShowReveal(false)} />
      )}
      {!showReveal && <DonateSol />}
    </>
  );
};

export default DonationWithReveal;
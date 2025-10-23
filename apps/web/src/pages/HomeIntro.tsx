import React from 'react';
import { useNavigate } from 'react-router-dom';
import RevealTransition from './RevealTransition';

const HomeIntro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <RevealTransition
      onComplete={() => {
        // after the animation, send the user to /how-it-works
        navigate('/how-it-works', { replace: true });
      }}
    />
  );
};

export default HomeIntro;

'use client';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

import { getIsMobile } from 'src/utils/is-mobile';

import { HomeHero } from '../home-hero';
export function HomeView() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(getIsMobile());
  }, []);

  return (
    <>
      <HomeHero />
    </>
  );
}

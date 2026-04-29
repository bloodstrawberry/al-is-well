'use client';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

import { getIsMobile } from 'src/utils/is-mobile';

import { HomeLottoDisplay } from '../home-lotto-display';

// ----------------------------------------------------------------------

export function HomeView() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(getIsMobile());
  }, []);

  return (
    <>
      <Stack sx={{ position: 'relative', bgcolor: 'background.default', gap: 3, alignItems: 'center', py: 5 }}>
        <HomeLottoDisplay />
      </Stack>
    </>
  );
}

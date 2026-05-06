'use client';

import Box from '@mui/material/Box';

export function Iconify({ width = 20, height, sx, ...other }: any) {
  return (
    <Box
      component="span"
      sx={[
        {
          width,
          height: height ?? width,
          display: 'inline-flex',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    />
  );
}

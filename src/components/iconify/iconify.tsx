'use client';

import type { BoxProps } from '@mui/material/Box';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';

export type IconifyProps = BoxProps & {
  icon?: string;
};

export function Iconify({ width = 20, height, sx, icon, ...other }: IconifyProps) {
  return (
    <Box
      component="span"
      className="iconify"
      sx={[
        {
          width,
          height: height ?? width,
          display: 'inline-flex',
        },
        ...(Array.isArray(sx) ? sx : [sx as SxProps<Theme>]),
      ]}
      {...other}
    />
  );
}

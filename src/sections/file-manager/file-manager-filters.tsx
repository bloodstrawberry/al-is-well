import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IFileFilters } from 'src/types/file';
import type { IDatePickerControl } from 'src/types/common';

import { useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CardActionArea from '@mui/material/CardActionArea';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IFileFilters>;
};

export function FileManagerFilters({
  filters,
  onResetPage,
}: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );


  const renderFilterName = () => (
    <TextField
      value={currentFilters.name}
      onChange={handleFilterName}
      placeholder="Search..."
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        },
      }}
      sx={{ width: { xs: 1, md: 260 } }}
    />
  );


  return (
    <Box
      sx={{
        gap: 1,
        width: 1,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      {renderFilterName()}
    </Box>
  );
}

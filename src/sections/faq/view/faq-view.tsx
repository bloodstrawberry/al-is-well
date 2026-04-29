'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { FaqHero } from '../faq-hero';
import { FaqList } from '../faq-list';
import { FaqForm } from '../faq-form';
import { FaqCategory } from '../faq-category';

// ----------------------------------------------------------------------

export function FaqView() {
  return (
    <DashboardContent>
      <FaqHero sx={{ mb: { xs: 5, md: 10 } }} />

      <Container sx={{ pb: 10, position: 'relative' }}>
        <FaqCategory />

        <Typography variant="h3" sx={{ my: { xs: 5, md: 10 } }}>
          Frequently asked questions
        </Typography>

        <Box
          sx={{
            gap: 10,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
          }}
        >
          <FaqList />
          <FaqForm />
        </Box>
      </Container>
    </DashboardContent>
  );
}

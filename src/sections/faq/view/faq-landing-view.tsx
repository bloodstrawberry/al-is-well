'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { FaqHero } from '../faq-hero';
import { FaqList } from '../faq-list';
import { FaqForm } from '../faq-form';
import { FaqCategory } from '../faq-category';

// ----------------------------------------------------------------------

export function FaqLandingView() {
  return (
    <>
      <FaqHero />
      <Container component="section" sx={{ pb: 10, position: 'relative', pt: { xs: 10, md: 15 } }}>
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
    </>
  );
}

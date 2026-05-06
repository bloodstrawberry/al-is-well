'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export function HomeHero() {
  return (
    <Box
      component="section"
      sx={{
        py: 20,
        bgcolor: 'background.default',
        flex: '1 1 auto',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <Container>
        <Stack spacing={4}>
          <Typography variant="h1" sx={{ fontSize: { xs: '3rem', md: '5rem' } }}>
            AL is WELL
          </Typography>
          <Typography variant="h4" sx={{ color: 'text.secondary' }}>
            OPIc Script Trainer
          </Typography>
          <Box>
            <Button variant="contained" size="large" color="primary">
              Get Started
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

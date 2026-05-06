'use client';

import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { RouterLink } from 'src/routes/components';

export default function Page() {
  return (
    <Container sx={{ py: 10, textAlign: 'center' }}>
      <Stack spacing={3}>
        <Typography variant="h3">404 Page Not Found</Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Sorry, we couldn’t find the page you’re looking for.
        </Typography>
        <Button component={RouterLink} href="/" variant="contained" size="large">
          Go to Home
        </Button>
      </Stack>
    </Container>
  );
}

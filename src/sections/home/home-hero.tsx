import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useTheme, alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';

import { HeroBackground } from './components/hero-background';

// ----------------------------------------------------------------------

export function HomeHero() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
        pt: { xs: 10, md: 15 },
        pb: { xs: 10, md: 15 },
      }}
    >
      <HeroBackground />

      <Container component={MotionViewport}>
        <Stack
          spacing={5}
          alignItems="center"
          sx={{
            textAlign: 'center',
            position: 'relative',
            zIndex: 9,
          }}
        >
          <m.div variants={varFade('inUp')}>
            <Stack
              spacing={3}
              alignItems="center"
              sx={{
                p: { xs: 4, md: 8 },
                borderRadius: 4,
                position: 'relative',
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                boxShadow: theme.customShadows?.z24 || theme.shadows[24],
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '3.5rem', md: '5.5rem' },
                    fontWeight: 900,
                    letterSpacing: -1,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  AL is WELL
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 'medium',
                    letterSpacing: 6,
                    textTransform: 'uppercase',
                    opacity: 0.8,
                    fontSize: { xs: '1rem', md: '1.5rem' },
                  }}
                >
                  - 스크립트 암기 노트 -
                </Typography>
              </Stack>

              <Box
                sx={{
                  p: 0.5,
                  borderRadius: '50%',
                  border: `dashed 1px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  onClick={() => router.push(paths.dashboard.fileManager)}
                  startIcon={<Iconify icon="eva:arrow-forward-fill" width={24} />}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    borderRadius: 2,
                    boxShadow: `0 8px 16px 0 ${alpha(theme.palette.primary.main, 0.32)}`,
                    '&:hover': {
                      boxShadow: `0 12px 24px 0 ${alpha(theme.palette.primary.main, 0.48)}`,
                      transform: 'translateY(-2px)',
                    },
                    transition: theme.transitions.create(['all']),
                  }}
                >
                  드라이브로 이동
                </Button>
              </Box>
            </Stack>
          </m.div>
        </Stack>
      </Container>
    </Box>
  );
}

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import * as LottoLibrary from 'src/api/lottolibrary';

type Props = {
  results: number[][];
  includedNumbers: number[];
  onShare: () => void;
};

export function DrawingGeneratedResults({ results, includedNumbers, onShare }: Props) {
  if (results.length === 0) return null;

  return (
    <Box sx={{ mt: 8, textAlign: 'center' }}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h5">생성된 추천 번호</Typography>
        <Tooltip title="공유하기">
          <IconButton onClick={onShare}>
            <Iconify icon="mdi:share-variant" width={24} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack spacing={{ xs: 2.5, md: 3 }} sx={{ mt: 2 }}>
        {results.map((result, setIndex) => (
          <Stack key={setIndex} direction="row" spacing={0} justifyContent="center" alignItems="center">
            <Typography
              variant="body2"
              sx={{
                minWidth: { xs: 20, md: 40 },
                textAlign: 'left',
                fontWeight: 'bold',
                color: 'primary.main',
                fontSize: { xs: '0.75rem', md: '1rem' },
              }}
            >
              {String.fromCharCode(65 + setIndex)}
            </Typography>

            {result.map((num) => {
              const ballColor = LottoLibrary.getBallColor(num);
              const isIncluded = includedNumbers.includes(num);

              return (
                <Box
                  key={num}
                  sx={{
                    width: { xs: 48, sm: 72, md: 104 },
                    height: { xs: 48, sm: 72, md: 104 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LottoLibrary.Ball
                    sx={{
                      flexShrink: 0,
                      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%), ${ballColor}`,
                      boxShadow: isIncluded
                        ? {
                            xs: `0 0 0 2px white, 0 0 0 4px ${ballColor}, 0 2px 5px rgba(0,0,0,0.3)`,
                            md: `0 0 0 3px white, 0 0 0 6px ${ballColor}, 0 4px 10px rgba(0,0,0,0.3)`,
                          }
                        : '0 4px 10px rgba(0,0,0,0.2)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {num}
                  </LottoLibrary.Ball>
                </Box>
              );
            })}
          </Stack>
        ))}
      </Stack>

      <Typography variant="caption" sx={{ mt: 3, display: 'block', color: 'text.secondary' }}>
        * 테두리가 있는 공은 사용자가 지정한 포함수입니다.
      </Typography>
    </Box>
  );
}

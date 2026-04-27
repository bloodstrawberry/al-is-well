'use client';

import Stack from '@mui/material/Stack';

import { HomeLottoDisplay } from '../home-lotto-display';

// ----------------------------------------------------------------------

export function HomeView() {
  return (
    <>
      <Stack sx={{ position: 'relative', bgcolor: 'background.default', gap: 3, alignItems: 'center', py: 5 }}>
        <HomeLottoDisplay />
        <div>test</div>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '10px 0' }}>
          <audio controls>
            <source src="https://blog.kakaocdn.net/dna/bslGuq/dJMcaf0pAyQ/AAAAAAAAAAAAAAAAAAAAAP_lQybCarJIDSFTp3KcW1uMuwAPx3N7j2HIBybFJ4uV/tfile.mp3?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1777561199&allow_ip=&allow_referer=&signature=MoYBkOo3zq37WYw%2FmJVdUwFdRKs%3D" type="audio/mp3" />
          </audio>
        </div>
      </Stack>
    </>
  );
}

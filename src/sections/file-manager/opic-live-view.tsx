import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { getFileScript } from 'src/api/indexDB';

// ----------------------------------------------------------------------

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onEdit: () => void;
};

export function OpicLiveView({ fileId, fileName, onBack, onEdit }: Props) {
  const [scriptData, setScriptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScript = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId);
        setScriptData(data);
      } catch (error) {
        console.error('Failed to load script', error);
      } finally {
        setLoading(false);
      }
    };
    loadScript();
  }, [fileId]);

  if (loading) {
    return <Box sx={{ p: 3 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{fileName}</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:pen-bold" />}
          onClick={onEdit}
        >
          Edit Script
        </Button>
      </Stack>

      <Stack spacing={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Question</Typography>
          <Typography variant="h6" sx={{ whiteSpace: 'pre-wrap', fontWeight: 'medium' }}>
            {scriptData?.question || ' '}
          </Typography>
        </Box>

        {scriptData?.audioUrl && (
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Audio Player</Typography>
            <audio controls src={scriptData.audioUrl} style={{ width: '100%', maxWidth: 500 }} />
          </Box>
        )}

        <Stack spacing={2}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Script</Typography>
          {scriptData?.lines?.map((line: any, index: number) => (
            <Box key={index} sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral', border: (theme) => `solid 1px ${theme.vars.palette.divider}` }}>
              <Typography variant="body1" sx={{ color: 'text.primary', mb: 1 }}>{line.ko}</Typography>
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{line.en}</Typography>
            </Box>
          )) || (
            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
              No script lines available.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
